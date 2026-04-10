import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceItems } from "@/lib/db/schema";
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

  const [row] = await db
    .select()
    .from(serviceItems)
    .where(and(eq(serviceItems.id, id), eq(serviceItems.orgId, orgId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
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
    name?: string;
    description?: string;
    defaultPrice?: number;
    unit?: string;
    category?: string;
    isActive?: boolean;
    sortOrder?: number;
  };

  const allowed = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.defaultPrice !== undefined && { defaultPrice: body.defaultPrice }),
    ...(body.unit !== undefined && { unit: body.unit }),
    ...(body.category !== undefined && { category: body.category }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
  };

  const [updated] = await db
    .update(serviceItems)
    .set(allowed)
    .where(and(eq(serviceItems.id, id), eq(serviceItems.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "update", entityType: "service_item", entityId: id, metadata: body });

  return NextResponse.json(updated);
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

  const [deleted] = await db
    .delete(serviceItems)
    .where(and(eq(serviceItems.id, id), eq(serviceItems.orgId, orgId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "delete", entityType: "service_item", entityId: id });

  return NextResponse.json({ success: true });
}
