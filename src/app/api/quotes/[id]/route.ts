import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, jobs, quoteItems, quotes } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { propertyBelongsToClient } from "@/lib/api/tenant";
import { isFiniteNumber } from "@/lib/api/validation";

const QUOTE_STATUSES = new Set(["draft", "sent", "approved", "declined", "expired"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .limit(1);

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id));

  return NextResponse.json({ ...quote, items });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 30, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const body = await parseBody<{
    status?: string;
    notes?: string;
    validUntil?: string | null;
    taxRate?: number;
    depositRequired?: number;
    propertyId?: string | null;
    approvedAt?: string | null;
    sentAt?: string | null;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (body.status !== undefined && !QUOTE_STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${[...QUOTE_STATUSES].join(", ")}` },
      { status: 422 },
    );
  }

  const [existingQuote] = await db
    .select({
      id: quotes.id,
      status: quotes.status,
      clientId: quotes.clientId,
      updatedAt: quotes.updatedAt,
    })
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .limit(1);

  if (!existingQuote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.propertyId !== undefined && body.propertyId !== null) {
    const validProperty = await propertyBelongsToClient(orgId, body.propertyId, existingQuote.clientId);
    if (!validProperty) {
      return NextResponse.json({ error: "propertyId must belong to the quote client" }, { status: 422 });
    }
  }

  if (body.taxRate !== undefined && (!isFiniteNumber(body.taxRate) || body.taxRate < 0 || body.taxRate > 1)) {
    return NextResponse.json({ error: "taxRate must be a number between 0 and 1" }, { status: 422 });
  }

  if (body.depositRequired !== undefined && (!isFiniteNumber(body.depositRequired) || body.depositRequired < 0)) {
    return NextResponse.json({ error: "depositRequired must be a non-negative number" }, { status: 422 });
  }

  const updateData: Partial<typeof quotes.$inferInsert> = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.validUntil !== undefined) updateData.validUntil = body.validUntil;
  if (body.taxRate !== undefined) updateData.taxRate = body.taxRate;
  if (body.depositRequired !== undefined) updateData.depositRequired = body.depositRequired;
  if (body.propertyId !== undefined) updateData.propertyId = body.propertyId;
  if (body.approvedAt !== undefined) updateData.approvedAt = body.approvedAt ? new Date(body.approvedAt) : null;
  if (body.sentAt !== undefined) updateData.sentAt = body.sentAt ? new Date(body.sentAt) : null;
  if (body.status === "approved" && existingQuote.status !== "approved" && body.approvedAt === undefined) {
    updateData.approvedAt = new Date();
  }
  if (body.status === "sent" && existingQuote.status !== "sent" && body.sentAt === undefined) {
    updateData.sentAt = new Date();
  }

  const optimisticGuard = existingQuote.updatedAt
    ? eq(quotes.updatedAt, existingQuote.updatedAt)
    : isNull(quotes.updatedAt);

  const [updated] = await db
    .update(quotes)
    .set(updateData)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId), optimisticGuard))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Quote was updated by another request. Reload and try again." },
      { status: 409 },
    );
  }

  await logAudit({ orgId, userId, action: "update", entityType: "quote", entityId: id, metadata: body });

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id));

  return NextResponse.json({ ...updated, items });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 30, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [quote] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .limit(1);

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [jobRef, invoiceRef] = await Promise.all([
    db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.quoteId, id), eq(jobs.orgId, orgId))).limit(1),
    db.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.quoteId, id), eq(invoices.orgId, orgId))).limit(1),
  ]);

  if (jobRef[0] || invoiceRef[0]) {
    return NextResponse.json(
      { error: "Cannot delete a quote that is already linked to a job or invoice" },
      { status: 422 },
    );
  }

  await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
  await db.delete(quotes).where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)));

  await logAudit({ orgId, userId, action: "delete", entityType: "quote", entityId: id });

  return NextResponse.json({ success: true });
}
