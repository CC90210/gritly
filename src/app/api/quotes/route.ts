import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, quoteItems, organizations, users, clients } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const where = clientId
    ? and(eq(quotes.orgId, orgId), eq(quotes.clientId, clientId))
    : eq(quotes.orgId, orgId);

  const rows = await db
    .select()
    .from(quotes)
    .where(where)
    .orderBy(desc(quotes.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
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

  const body = await req.json() as {
    clientId?: string;
    propertyId?: string;
    taxRate?: number;
    notes?: string;
    validUntil?: string;
    depositRequired?: number;
    items?: {
      description: string;
      quantity?: number;
      unitPrice: number;
      serviceId?: string;
      isOptional?: boolean;
      sortOrder?: number;
    }[];
  };

  if (!body.clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 422 });
  }

  // Verify clientId belongs to the same org — prevents cross-org data access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, body.clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 422 });
  }

  // Atomically increment quote counter to prevent duplicate numbers under concurrency
  const [org] = await db
    .update(organizations)
    .set({ quoteCounter: sql`quote_counter + 1` })
    .where(eq(organizations.id, orgId))
    .returning({ quoteCounter: organizations.quoteCounter });

  const quoteNumber = `Q-${String(org.quoteCounter).padStart(5, "0")}`;

  // Calculate totals from items
  const items = body.items ?? [];
  const taxRate = body.taxRate ?? 0.13;
  const subtotal = items.reduce(
    (sum, item) => sum + (item.unitPrice * (item.quantity ?? 1)),
    0
  );
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const [quote] = await db
    .insert(quotes)
    .values({
      orgId,
      quoteNumber,
      clientId: body.clientId,
      propertyId: body.propertyId ?? null,
      taxRate,
      subtotal,
      taxAmount,
      total,
      depositRequired: body.depositRequired ?? 0,
      notes: body.notes ?? null,
      validUntil: body.validUntil ?? null,
      status: "draft",
    })
    .returning();

  if (items.length > 0) {
    await db.insert(quoteItems).values(
      items.map((item, i) => ({
        quoteId: quote.id,
        serviceId: item.serviceId ?? null,
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice,
        total: item.unitPrice * (item.quantity ?? 1),
        isOptional: item.isOptional ?? false,
        sortOrder: item.sortOrder ?? i,
      }))
    );
  }

  const insertedItems = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quote.id));

  return NextResponse.json({ ...quote, items: insertedItems }, { status: 201 });
}
