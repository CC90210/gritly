import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parseIsoDate, sanitizeText } from "@/lib/api/validation";

const INVOICE_STATUSES = new Set(["draft", "sent", "partial", "paid", "overdue", "void"]);

async function getInvoicePayload(orgId: string, id: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)))
    .limit(1);

  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id));

  const invoicePayments = await db
    .select()
    .from(payments)
    .where(and(eq(payments.invoiceId, id), eq(payments.orgId, orgId)));

  return { ...invoice, items, payments: invoicePayments };
}

function buildInvoiceUpdateData(
  invoiceStatus: string,
  body: {
    status?: string;
    notes?: string;
    dueDate?: string;
    sentAt?: string;
    paidAt?: string;
  },
): Record<string, unknown> | NextResponse {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.status !== undefined) {
    if (!INVOICE_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${[...INVOICE_STATUSES].join(", ")}` },
        { status: 422 },
      );
    }
    updateData.status = body.status;
  }

  if (body.notes !== undefined) updateData.notes = sanitizeText(body.notes, 4000);
  if (body.dueDate !== undefined) updateData.dueDate = sanitizeText(body.dueDate, 50);

  if (body.sentAt !== undefined) {
    const sentAt = parseIsoDate(body.sentAt);
    if (!sentAt) return NextResponse.json({ error: "sentAt must be a valid ISO date string" }, { status: 422 });
    updateData.sentAt = sentAt;
  }

  if (body.paidAt !== undefined) {
    const paidAt = parseIsoDate(body.paidAt);
    if (!paidAt) return NextResponse.json({ error: "paidAt must be a valid ISO date string" }, { status: 422 });
    updateData.paidAt = paidAt;
  }

  if (body.status === "sent" && invoiceStatus !== "sent" && body.sentAt === undefined) {
    updateData.sentAt = new Date();
  }

  if (body.status === "paid" && invoiceStatus !== "paid" && body.paidAt === undefined) {
    updateData.paidAt = new Date();
  }

  return updateData;
}

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
  const payload = await getInvoicePayload(orgId, id);

  if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payload);
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

  const body = await parseBody<{
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
  }>(req);
  if (body instanceof NextResponse) return body;

  const invoicePayload = await getInvoicePayload(orgId, id);
  if (!invoicePayload) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.payment) {
    if (invoicePayload.status === "void" || invoicePayload.status === "draft") {
      return NextResponse.json(
        { error: `Cannot record payment on a ${invoicePayload.status} invoice` },
        { status: 422 },
      );
    }

    const amount = body.payment.amount;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Payment amount must be a positive finite number" }, { status: 422 });
    }

    const stripePaymentId =
      typeof body.payment.stripePaymentId === "string"
        ? sanitizeText(body.payment.stripePaymentId, 255)
        : null;

    if (stripePaymentId) {
      const [existingPayment] = await db
        .select({ id: payments.id, invoiceId: payments.invoiceId })
        .from(payments)
        .where(and(eq(payments.orgId, orgId), eq(payments.stripePaymentId, stripePaymentId)))
        .limit(1);

      if (existingPayment && existingPayment.invoiceId !== id) {
        return NextResponse.json(
          { error: "stripePaymentId has already been used for another invoice" },
          { status: 409 },
        );
      }

      if (existingPayment && existingPayment.invoiceId === id) {
        return NextResponse.json(await getInvoicePayload(orgId, id));
      }
    }

    const balanceDue = (invoicePayload.total ?? 0) - (invoicePayload.amountPaid ?? 0);
    if (amount > balanceDue + 0.005) {
      return NextResponse.json(
        { error: `Payment amount (${amount}) exceeds balance due (${balanceDue.toFixed(2)})` },
        { status: 422 },
      );
    }

    const { paymentRow } = await db.transaction(async (tx) => {
      const [pRow] = await tx
        .insert(payments)
        .values({
          orgId,
          invoiceId: id,
          amount,
          method: typeof body.payment?.method === "string" ? sanitizeText(body.payment.method, 50) : "credit_card",
          stripePaymentId,
          notes: typeof body.payment?.notes === "string" ? sanitizeText(body.payment.notes, 1000) : null,
        })
        .returning();

      const allPayments = await tx
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(eq(payments.invoiceId, id), eq(payments.orgId, orgId)));

      const paid = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const status = paid >= (invoicePayload.total ?? 0) ? "paid" : "partial";

      await tx
        .update(invoices)
        .set({
          amountPaid: paid,
          status,
          paidAt: status === "paid" ? new Date() : invoicePayload.paidAt,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));

      return { paymentRow: pRow };
    });

    await logAudit({
      orgId,
      userId,
      action: "create",
      entityType: "payment",
      entityId: paymentRow.id,
      metadata: { invoiceId: id, amount },
    });

    const { payment: _payment, ...invoiceRest } = body;
    if (Object.keys(invoiceRest).length > 0) {
      const updateData = buildInvoiceUpdateData(invoicePayload.status, invoiceRest);
      if (updateData instanceof NextResponse) return updateData;

      if (Object.keys(updateData).length > 1) {
        await db
          .update(invoices)
          .set(updateData)
          .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));

        await logAudit({
          orgId,
          userId,
          action: "update",
          entityType: "invoice",
          entityId: id,
          metadata: invoiceRest,
        });
      }
    }

    return NextResponse.json(await getInvoicePayload(orgId, id));
  }

  const { payment: _payment, ...rest } = body;
  const updateData = buildInvoiceUpdateData(invoicePayload.status, rest);
  if (updateData instanceof NextResponse) return updateData;

  if (Object.keys(updateData).length === 1) {
    return NextResponse.json({ error: "No fields to update" }, { status: 422 });
  }

  await db
    .update(invoices)
    .set(updateData)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));

  await logAudit({ orgId, userId, action: "update", entityType: "invoice", entityId: id, metadata: rest });

  return NextResponse.json(await getInvoicePayload(orgId, id));
}
