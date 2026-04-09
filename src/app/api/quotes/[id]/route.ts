import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, quoteItems, users } from "@/lib/db/schema";
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
    validUntil?: string;
    taxRate?: number;
    depositRequired?: number;
    propertyId?: string;
    approvedAt?: string;
    sentAt?: string;
  };

  const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };

  // Handle timestamp conversions for date strings
  if (body.approvedAt) updateData.approvedAt = new Date(body.approvedAt);
  if (body.sentAt) updateData.sentAt = new Date(body.sentAt);

  const [updated] = await db
    .update(quotes)
    .set(updateData)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // Verify ownership before cascading delete of items
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .limit(1);

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
  await db.delete(quotes).where(eq(quotes.id, id));

  return NextResponse.json({ success: true });
}
