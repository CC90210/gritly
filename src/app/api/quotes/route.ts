import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, quoteItems, organizations, clients } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

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
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

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

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, body.clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 422 });
  }

  const [org] = await db
    .update(organizations)
    .set({ quoteCounter: sql`quote_counter + 1` })
    .where(eq(organizations.id, orgId))
    .returning({ quoteCounter: organizations.quoteCounter });

  const quoteNumber = `Q-${String(org.quoteCounter).padStart(5, "0")}`;

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

  logAudit({ orgId, userId, action: "create", entityType: "quote", entityId: quote.id });

  return NextResponse.json({ ...quote, items: insertedItems }, { status: 201 });
}
