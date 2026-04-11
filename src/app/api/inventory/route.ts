import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { isFiniteNumber, sanitizeText, isValidUuid } from "@/lib/api/validation";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const baseQuery = db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.orgId, orgId))
    .orderBy(asc(inventoryItems.category), asc(inventoryItems.name));

  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await parseBody<{
    name?: string;
    sku?: string;
    quantity?: number;
    minQuantity?: number;
    unitCost?: number;
    location?: string;
    category?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  const name = typeof body.name === "string" ? sanitizeText(body.name, 200) : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 422 });
  }

  if (body.quantity !== undefined && (!Number.isInteger(body.quantity) || body.quantity < 0)) {
    return NextResponse.json({ error: "quantity must be a non-negative integer" }, { status: 422 });
  }

  if (body.minQuantity !== undefined && (!Number.isInteger(body.minQuantity) || body.minQuantity < 0)) {
    return NextResponse.json({ error: "minQuantity must be a non-negative integer" }, { status: 422 });
  }

  if (body.unitCost !== undefined && body.unitCost !== null && (!isFiniteNumber(body.unitCost) || body.unitCost < 0)) {
    return NextResponse.json({ error: "unitCost must be a non-negative number" }, { status: 422 });
  }

  const [row] = await db
    .insert(inventoryItems)
    .values({
      orgId,
      name,
      sku: typeof body.sku === "string" ? sanitizeText(body.sku, 100) : null,
      quantity: body.quantity ?? 0,
      minQuantity: body.minQuantity ?? 0,
      unitCost: body.unitCost ?? null,
      location: typeof body.location === "string" ? sanitizeText(body.location, 200) : null,
      category: typeof body.category === "string" ? sanitizeText(body.category, 100) : null,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "inventory_item", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await parseBody<{
    id?: string;
    name?: string;
    sku?: string;
    quantity?: number;
    minQuantity?: number;
    unitCost?: number | null;
    location?: string;
    category?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.id)) return NextResponse.json({ error: "id is required" }, { status: 422 });

  if (body.quantity !== undefined && (!Number.isInteger(body.quantity) || body.quantity < 0)) {
    return NextResponse.json({ error: "quantity must be a non-negative integer" }, { status: 422 });
  }

  if (body.minQuantity !== undefined && (!Number.isInteger(body.minQuantity) || body.minQuantity < 0)) {
    return NextResponse.json({ error: "minQuantity must be a non-negative integer" }, { status: 422 });
  }

  if (body.unitCost !== undefined && body.unitCost !== null && (!isFiniteNumber(body.unitCost) || body.unitCost < 0)) {
    return NextResponse.json({ error: "unitCost must be a non-negative number" }, { status: 422 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = sanitizeText(body.name, 200);
  if (body.sku !== undefined) updateData.sku = sanitizeText(body.sku, 100);
  if (body.quantity !== undefined) updateData.quantity = body.quantity;
  if (body.minQuantity !== undefined) updateData.minQuantity = body.minQuantity;
  if (body.unitCost !== undefined) updateData.unitCost = body.unitCost;
  if (body.location !== undefined) updateData.location = sanitizeText(body.location, 200);
  if (body.category !== undefined) updateData.category = sanitizeText(body.category, 100);

  const [updated] = await db
    .update(inventoryItems)
    .set(updateData)
    .where(and(eq(inventoryItems.id, body.id), eq(inventoryItems.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "update", entityType: "inventory_item", entityId: body.id });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const id = req.nextUrl.searchParams.get("id");
  if (!isValidUuid(id)) return NextResponse.json({ error: "id is required" }, { status: 422 });

  const [existing] = await db
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.orgId, orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.orgId, orgId)));

  await logAudit({ orgId, userId, action: "delete", entityType: "inventory_item", entityId: id });

  return NextResponse.json({ success: true });
}
