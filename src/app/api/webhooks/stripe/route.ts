import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const invoiceId = session.metadata?.invoiceId;
  const orgId = session.metadata?.orgId;

  if (!invoiceId || !orgId) {
    return NextResponse.json({ received: true });
  }

  const amountPaid = (session.amount_total ?? 0) / 100;
  const stripePaymentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
  let paymentCreated = false;

  try {
    await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select({
          id: invoices.id,
          total: invoices.total,
          paidAt: invoices.paidAt,
        })
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
        .limit(1);

      if (!invoice) {
        return;
      }

      if (stripePaymentId) {
        const [existingPayment] = await tx
          .select({ id: payments.id })
          .from(payments)
          .where(and(eq(payments.orgId, orgId), eq(payments.stripePaymentId, stripePaymentId)))
          .limit(1);

        if (existingPayment) {
          return;
        }
      }

      await tx.insert(payments).values({
        orgId,
        invoiceId,
        amount: amountPaid,
        method: "credit_card",
        stripePaymentId,
        notes: `Stripe checkout session ${session.id}`,
      });
      paymentCreated = true;

      const allPayments = await tx
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(eq(payments.invoiceId, invoiceId), eq(payments.orgId, orgId)));

      const totalPaid = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const newStatus = totalPaid >= (invoice.total ?? 0) - 0.005 ? "paid" : "partial";

      await tx
        .update(invoices)
        .set({
          amountPaid: totalPaid,
          status: newStatus,
          paidAt: newStatus === "paid" ? new Date(event.created * 1000) : invoice.paidAt,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("UNIQUE constraint failed")) {
      throw error;
    }
  }

  if (paymentCreated) {
    await logAudit({
      orgId,
      action: "create",
      entityType: "payment",
      entityId: stripePaymentId ?? session.id,
      metadata: { invoiceId, stripePaymentId, source: "stripe_webhook" },
    });
    await logAudit({
      orgId,
      action: "update",
      entityType: "invoice",
      entityId: invoiceId,
      metadata: { source: "stripe_webhook" },
    });
  }

  return NextResponse.json({ received: true, duplicate: !paymentCreated });
}
