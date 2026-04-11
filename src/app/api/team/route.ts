import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
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
    .from(teamMembers)
    .where(eq(teamMembers.orgId, orgId))
    .orderBy(desc(teamMembers.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await parseBody<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    hourlyRate?: number;
    color?: string;
    userId?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.firstName || !body.lastName || !body.email) {
    return NextResponse.json(
      { error: "firstName, lastName, and email are required" },
      { status: 422 }
    );
  }

  const normalizedEmail = body.email.trim().toLowerCase();
  const [existingMember] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.orgId, orgId), sql`lower(${teamMembers.email}) = ${normalizedEmail}`))
    .limit(1);

  if (existingMember) {
    return NextResponse.json(
      { error: "A team member with this email already exists in this organization." },
      { status: 409 }
    );
  }

  const [row] = await db
    .insert(teamMembers)
    .values({
      orgId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: normalizedEmail,
      phone: body.phone ?? null,
      role: body.role ?? "technician",
      hourlyRate: body.hourlyRate ?? null,
      color: body.color ?? "#f97316",
      userId: body.userId ?? null,
      isActive: true,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "team_member", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
