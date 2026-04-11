import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { isFiniteNumber, isValidUuid, normalizeEmail, sanitizeText } from "@/lib/api/validation";
import { userBelongsToOrg } from "@/lib/api/tenant";

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
    .from(teamMembers)
    .where(eq(teamMembers.orgId, orgId))
    .orderBy(desc(teamMembers.createdAt));

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
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    hourlyRate?: number | null;
    color?: string;
    userId?: string | null;
  }>(req);
  if (body instanceof NextResponse) return body;

  const firstName = typeof body.firstName === "string" ? sanitizeText(body.firstName, 100) : "";
  const lastName = typeof body.lastName === "string" ? sanitizeText(body.lastName, 100) : "";
  const email = typeof body.email === "string" ? normalizeEmail(body.email).slice(0, 254) : "";
  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "firstName, lastName, and email are required" }, { status: 422 });
  }

  if (body.hourlyRate !== undefined && body.hourlyRate !== null && (!isFiniteNumber(body.hourlyRate) || body.hourlyRate < 0)) {
    return NextResponse.json({ error: "hourlyRate must be a non-negative number" }, { status: 422 });
  }

  if (body.userId !== undefined && body.userId !== null) {
    if (!isValidUuid(body.userId) || !(await userBelongsToOrg(orgId, body.userId))) {
      return NextResponse.json({ error: "userId must belong to the same organization" }, { status: 422 });
    }
  }

  const [existingMember] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.orgId, orgId), sql`lower(${teamMembers.email}) = ${email}`))
    .limit(1);

  if (existingMember) {
    return NextResponse.json(
      { error: "A team member with this email already exists in this organization." },
      { status: 409 },
    );
  }

  const [row] = await db
    .insert(teamMembers)
    .values({
      orgId,
      firstName,
      lastName,
      email,
      phone: typeof body.phone === "string" ? sanitizeText(body.phone, 30) : null,
      role: typeof body.role === "string" ? sanitizeText(body.role, 50) : "technician",
      hourlyRate: body.hourlyRate ?? null,
      color: typeof body.color === "string" ? sanitizeText(body.color, 20) : "#f97316",
      userId: body.userId ?? null,
      isActive: true,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "team_member", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
