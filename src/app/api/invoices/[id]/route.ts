import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems, payments, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  const { id } = await params;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)))
    .limit(1);

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id));

  const invoicePayments = await db
    .select()
    .from(payments)
    .where(and(eq(payments.invoiceId, id), eq(payments.orgId, orgId)));

  return NextResponse.json({ ...invoice, items, payments: invoicePayments });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  const { id } = await params;

  const body = await req.json() as {
    status?: string;
    notes?: string;
    dueDate?: string;
    sentAt?: string;
    paidAt?: string;
    // Payment recording
    payment?: {
      amount: number;
      method?: string;
      notes?: string;
      stripePaymentId?: string;
    };
  };

  // Verify ownership
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)))
    .limit(1);

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Record payment if provided
  if (body.payment) {
    const { amount, method, notes: paymentNotes, stripePaymentId } = body.payment;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Payment amount must be positive" }, { status: 422 });
    }

    await db.insert(payments).values({
      orgId,
      invoiceId: id,
      amount,
      method: method ?? "credit_card",
      stripePaymentId: stripePaymentId ?? null,
      notes: paymentNotes ?? null,
    });

    // Recalculate amountPaid from all payments
    const allPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id));

    const amountPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const newStatus = amountPaid >= (invoice.total ?? 0) ? "paid" : "partial";

    await db
      .update(invoices)
      .set({
        amountPaid,
        status: newStatus,
        paidAt: newStatus === "paid" ? new Date() : invoice.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));
  }

  // Apply other field updates — whitelist allowed fields, never allow id, orgId, or counter fields
  const { payment: _payment, ...rest } = body;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (rest.status !== undefined) updateData.status = rest.status;
  if (rest.notes !== undefined) updateData.notes = rest.notes;
  if (rest.dueDate !== undefined) updateData.dueDate = rest.dueDate;
  if (rest.sentAt) updateData.sentAt = new Date(rest.sentAt);
  if (rest.paidAt) updateData.paidAt = new Date(rest.paidAt);

  if (Object.keys(rest).length > 0) {
    await db
      .update(invoices)
      .set(updateData)
      .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));
  }

  const [updated] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id));

  const invoicePayments = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, id));

  return NextResponse.json({ ...updated, items, payments: invoicePayments });
}
