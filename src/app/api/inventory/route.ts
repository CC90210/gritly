import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

export async function GET(_req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const rows = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.orgId, orgId))
    .orderBy(asc(inventoryItems.category), asc(inventoryItems.name));

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

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 422 });
  }

  if (body.quantity !== undefined && body.quantity < 0) {
    return NextResponse.json({ error: "quantity cannot be negative" }, { status: 422 });
  }

  const [row] = await db
    .insert(inventoryItems)
    .values({
      orgId,
      name: body.name.trim().slice(0, 200),
      sku: body.sku?.trim().slice(0, 100) ?? null,
      quantity: body.quantity ?? 0,
      minQuantity: body.minQuantity ?? 0,
      unitCost: body.unitCost ?? null,
      location: body.location?.trim().slice(0, 200) ?? null,
      category: body.category?.trim().slice(0, 100) ?? null,
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
    unitCost?: number;
    location?: string;
    category?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 422 });

  if (body.quantity !== undefined && body.quantity < 0) {
    return NextResponse.json({ error: "quantity cannot be negative" }, { status: 422 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name.trim().slice(0, 200);
  if (body.sku !== undefined) updateData.sku = body.sku.trim().slice(0, 100);
  if (body.quantity !== undefined) updateData.quantity = body.quantity;
  if (body.minQuantity !== undefined) updateData.minQuantity = body.minQuantity;
  if (body.unitCost !== undefined) updateData.unitCost = body.unitCost;
  if (body.location !== undefined) updateData.location = body.location.trim().slice(0, 200);
  if (body.category !== undefined) updateData.category = body.category.trim().slice(0, 100);

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
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 422 });

  const [existing] = await db
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.orgId, orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));

  await logAudit({ orgId, userId, action: "delete", entityType: "inventory_item", entityId: id });

  return NextResponse.json({ success: true });
}
