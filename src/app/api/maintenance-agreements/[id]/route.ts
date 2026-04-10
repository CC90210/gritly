import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceAgreements } from "@/lib/db/schema";
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
    .from(maintenanceAgreements)
    .where(and(eq(maintenanceAgreements.id, id), eq(maintenanceAgreements.orgId, orgId)))
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
    frequency?: string;
    price?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    notes?: string;
  };

  const allowed = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.frequency !== undefined && { frequency: body.frequency }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.startDate !== undefined && { startDate: body.startDate }),
    ...(body.endDate !== undefined && { endDate: body.endDate }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.notes !== undefined && { notes: body.notes }),
  };

  const [updated] = await db
    .update(maintenanceAgreements)
    .set(allowed)
    .where(and(eq(maintenanceAgreements.id, id), eq(maintenanceAgreements.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "update", entityType: "maintenance_agreement", entityId: id, metadata: body });

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
    .delete(maintenanceAgreements)
    .where(and(eq(maintenanceAgreements.id, id), eq(maintenanceAgreements.orgId, orgId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "delete", entityType: "maintenance_agreement", entityId: id });

  return NextResponse.json({ success: true });
}
