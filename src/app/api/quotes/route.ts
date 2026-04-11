import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, organizations, properties, quoteItems, quotes } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { clientExists, propertyBelongsToClient, serviceItemsExist } from "@/lib/api/tenant";
import { isFiniteNumber, isPositiveFiniteNumber, sanitizeText, isValidUuid } from "@/lib/api/validation";
import { rateLimit } from "@/lib/middleware/rate-limit";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (clientId && !isValidUuid(clientId)) {
    return NextResponse.json({ error: "clientId must be a valid UUID" }, { status: 422 });
  }

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const where = clientId
    ? and(eq(quotes.orgId, orgId), eq(quotes.clientId, clientId))
    : eq(quotes.orgId, orgId);

  const baseQuery = db
    .select()
    .from(quotes)
    .where(where)
    .orderBy(desc(quotes.createdAt));

  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 30, 60_000);
  if (limited) return limited;

  const body = await parseBody<{
    clientId?: string;
    propertyId?: string | null;
    taxRate?: number;
    notes?: string;
    validUntil?: string;
    depositRequired?: number;
    items?: {
      description?: string;
      quantity?: number;
      unitPrice?: number;
      serviceId?: string;
      isOptional?: boolean;
      sortOrder?: number;
    }[];
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.clientId) || !(await clientExists(orgId, body.clientId))) {
    return NextResponse.json({ error: "Valid clientId is required" }, { status: 422 });
  }

  const clientId = body.clientId;

  if (body.propertyId !== undefined && body.propertyId !== null) {
    if (!isValidUuid(body.propertyId) || !(await propertyBelongsToClient(orgId, body.propertyId, clientId))) {
      return NextResponse.json({ error: "propertyId must belong to the same organization client" }, { status: 422 });
    }
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 200) {
    return NextResponse.json({ error: "A quote may not contain more than 200 items" }, { status: 422 });
  }

  const serviceIds = items.flatMap((item) => (typeof item.serviceId === "string" ? [item.serviceId] : []));
  if (!(await serviceItemsExist(orgId, serviceIds))) {
    return NextResponse.json({ error: "One or more serviceId values are invalid" }, { status: 422 });
  }

  const normalizedItems = items.map((item, index) => {
    const description = typeof item.description === "string" ? sanitizeText(item.description, 500) : "";
    const quantity = item.quantity ?? 1;
    const unitPrice = item.unitPrice;

    if (!description) {
      throw new Error(`Item ${index + 1}: description is required`);
    }

    if (!isPositiveFiniteNumber(quantity)) {
      throw new Error(`Item ${index + 1}: quantity must be a positive number`);
    }

    if (!isFiniteNumber(unitPrice) || unitPrice < 0) {
      throw new Error(`Item ${index + 1}: unitPrice must be a non-negative number`);
    }

    return {
      description,
      quantity,
      unitPrice,
      serviceId: typeof item.serviceId === "string" ? item.serviceId : null,
      isOptional: item.isOptional ?? false,
      sortOrder: Number.isInteger(item.sortOrder) ? item.sortOrder : index,
      total: unitPrice * quantity,
    };
  });

  const taxRate = body.taxRate ?? 0.13;
  if (!isFiniteNumber(taxRate) || taxRate < 0 || taxRate > 1) {
    return NextResponse.json({ error: "taxRate must be a number between 0 and 1" }, { status: 422 });
  }

  const depositRequired = body.depositRequired ?? 0;
  if (!isFiniteNumber(depositRequired) || depositRequired < 0) {
    return NextResponse.json({ error: "depositRequired must be a non-negative number" }, { status: 422 });
  }

  try {
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const quote = await db.transaction(async (tx) => {
      const [org] = await tx
        .update(organizations)
        .set({ quoteCounter: sql`quote_counter + 1` })
        .where(eq(organizations.id, orgId))
        .returning({ quoteCounter: organizations.quoteCounter });

      const counter = org?.quoteCounter ?? 1000;
      const quoteNumber = `Q-${String(counter).padStart(5, "0")}`;

      const [newQuote] = await tx
        .insert(quotes)
        .values({
          orgId,
          quoteNumber,
          clientId,
          propertyId: body.propertyId ?? null,
          taxRate,
          subtotal,
          taxAmount,
          total,
          depositRequired,
          notes: typeof body.notes === "string" ? sanitizeText(body.notes, 4000) : null,
          validUntil: typeof body.validUntil === "string" ? body.validUntil : null,
          status: "draft",
        })
        .returning();

      if (normalizedItems.length > 0) {
        await tx.insert(quoteItems).values(
          normalizedItems.map((item) => ({
            quoteId: newQuote.id,
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            isOptional: item.isOptional,
            sortOrder: item.sortOrder,
          })),
        );
      }

      return newQuote;
    });

    const insertedItems = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quote.id));

    await logAudit({
      orgId,
      userId,
      action: "create",
      entityType: "quote",
      entityId: quote.id,
      metadata: { quoteNumber: quote.quoteNumber, itemCount: insertedItems.length },
    });

    return NextResponse.json({ ...quote, items: insertedItems }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create quote";
    const status = message.startsWith("Item ") ? 422 : 500;
    return NextResponse.json({ error: status === 422 ? message : "Internal error" }, { status });
  }
}


