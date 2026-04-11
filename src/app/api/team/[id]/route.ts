import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers, timeEntries, expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const { id } = await params;

  const body = await parseBody<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    hourlyRate?: number;
    color?: string;
    isActive?: boolean;
  }>(req);
  if (body instanceof NextResponse) return body;

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

  await logAudit({ orgId, userId, action: "update", entityType: "team_member", entityId: id, metadata: body });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const { id } = await params;

  // Prevent deletion if time entries or expenses reference this team member.
  // Instruct callers to deactivate instead (set isActive: false via PATCH).
  const [timeRef] = await db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(and(eq(timeEntries.teamMemberId, id), eq(timeEntries.orgId, orgId)))
    .limit(1);
  const [expRef] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.teamMemberId, id), eq(expenses.orgId, orgId)))
    .limit(1);

  if (timeRef || expRef) {
    return NextResponse.json(
      { error: "Cannot delete team member with time entries or expenses. Deactivate them instead." },
      { status: 422 }
    );
  }

  const [deleted] = await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.orgId, orgId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "delete", entityType: "team_member", entityId: id });

  return NextResponse.json({ success: true });
}


