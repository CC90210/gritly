import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

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
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    hourlyRate?: number;
    color?: string;
    isActive?: boolean;
  };

  const allowed = {
    ...(body.firstName !== undefined && { firstName: body.firstName }),
    ...(body.lastName !== undefined && { lastName: body.lastName }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.role !== undefined && { role: body.role }),
    ...(body.hourlyRate !== undefined && { hourlyRate: body.hourlyRate }),
    ...(body.color !== undefined && { color: body.color }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  };

  const [updated] = await db
    .update(teamMembers)
    .set(allowed)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "update", entityType: "team_member", entityId: id, metadata: body });

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
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.orgId, orgId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "delete", entityType: "team_member", entityId: id });

  return NextResponse.json({ success: true });
}
