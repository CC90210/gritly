import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, quoteItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

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
    validUntil?: string;
    taxRate?: number;
    depositRequired?: number;
    propertyId?: string;
    approvedAt?: string;
    sentAt?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  const QUOTE_STATUSES = new Set(["draft", "sent", "approved", "declined", "expired"]);
  if (body.status !== undefined && !QUOTE_STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${[...QUOTE_STATUSES].join(", ")}` },
      { status: 422 }
    );
  }

  const [existingQuote] = await db
    .select({ id: quotes.id, status: quotes.status })
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .limit(1);

  if (!existingQuote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.validUntil !== undefined) updateData.validUntil = body.validUntil;
  if (body.taxRate !== undefined) updateData.taxRate = body.taxRate;
  if (body.depositRequired !== undefined) updateData.depositRequired = body.depositRequired;
  if (body.propertyId !== undefined) updateData.propertyId = body.propertyId;
  if (body.approvedAt) updateData.approvedAt = new Date(body.approvedAt);
  if (body.sentAt) updateData.sentAt = new Date(body.sentAt);
  if (body.status === "approved" && existingQuote.status !== "approved" && body.approvedAt === undefined) {
    updateData.approvedAt = new Date();
  }
  if (body.status === "sent" && existingQuote.status !== "sent" && body.sentAt === undefined) {
    updateData.sentAt = new Date();
  }

  const [updated] = await db
    .update(quotes)
    .set(updateData)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "update", entityType: "quote", entityId: id, metadata: body });

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id));

  return NextResponse.json({ ...updated, items });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("admin");
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

  await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
  await db.delete(quotes).where(eq(quotes.id, id));

  await logAudit({ orgId, userId, action: "delete", entityType: "quote", entityId: id });

  return NextResponse.json({ success: true });
}
