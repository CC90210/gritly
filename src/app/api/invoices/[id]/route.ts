import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

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
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const body = await req.json() as {
    status?: string;
    notes?: string;
    dueDate?: string;
    sentAt?: string;
    paidAt?: string;
    payment?: {
      amount: number;
      method?: string;
      notes?: string;
      stripePaymentId?: string;
    };
  };

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)))
    .limit(1);

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.payment) {
    const { amount, method, notes: paymentNotes, stripePaymentId } = body.payment;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Payment amount must be positive" }, { status: 422 });
    }

    const [paymentRow] = await db.insert(payments).values({
      orgId,
      invoiceId: id,
      amount,
      method: method ?? "credit_card",
      stripePaymentId: stripePaymentId ?? null,
      notes: paymentNotes ?? null,
    }).returning();

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

    logAudit({ orgId, userId, action: "create", entityType: "payment", entityId: paymentRow.id, metadata: { invoiceId: id, amount } });
  }

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

  logAudit({ orgId, userId, action: "update", entityType: "invoice", entityId: id, metadata: rest });

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
