import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * Stripe webhook handler.
 * Signature verification uses the raw request body — Next.js must NOT parse it first.
 * This route opts out of body parsing by reading the raw bytes.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const reqHeaders = await headers();
  const sig = reqHeaders.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const invoiceId = session.metadata?.invoiceId;
    const orgId = session.metadata?.orgId;

    if (!invoiceId || !orgId) {
      // Not a payment we initiated — ignore
      return NextResponse.json({ received: true });
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
      .limit(1);

    if (!invoice) {
      // Idempotency: invoice may have been deleted — return 200 so Stripe stops retrying
      return NextResponse.json({ received: true });
    }

    // amount_total is in cents
    const amountPaid = (session.amount_total ?? 0) / 100;
    const stripePaymentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

    if (stripePaymentId) {
      const existingPayment = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.stripePaymentId, stripePaymentId))
        .limit(1);

      if (existingPayment.length > 0) {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
    }

    await db.insert(payments).values({
      orgId,
      invoiceId,
      amount: amountPaid,
      method: "credit_card",
      stripePaymentId,
      notes: `Stripe checkout session ${session.id}`,
    });

    const allPayments = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId));

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const invoiceTotal = invoice.total ?? 0;
    const newStatus = totalPaid >= invoiceTotal - 0.005 ? "paid" : "partial";

    await db
      .update(invoices)
      .set({
        amountPaid: totalPaid,
        status: newStatus,
        paidAt: newStatus === "paid" ? new Date() : invoice.paidAt,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
  }

  return NextResponse.json({ received: true });
}
