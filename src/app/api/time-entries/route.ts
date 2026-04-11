import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeEntries, teamMembers, jobs } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { jobExists, teamMemberExists, visitExists } from "@/lib/api/tenant";
import { isValidUuid, parseIsoDate, sanitizeText } from "@/lib/api/validation";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const jobId = req.nextUrl.searchParams.get("jobId");
  const teamMemberId = req.nextUrl.searchParams.get("teamMemberId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");

  if (jobId && (!isValidUuid(jobId) || !(await jobExists(orgId, jobId)))) {
    return NextResponse.json({ error: "jobId must belong to the same organization" }, { status: 422 });
  }

  if (teamMemberId && (!isValidUuid(teamMemberId) || !(await teamMemberExists(orgId, teamMemberId)))) {
    return NextResponse.json(
      { error: "teamMemberId must belong to the same organization" },
      { status: 422 },
    );
  }

  const parsedStart = startDate ? parseIsoDate(startDate) : null;
  if (startDate && !parsedStart) {
    return NextResponse.json({ error: "startDate must be a valid date" }, { status: 422 });
  }

  const parsedEnd = endDate ? parseIsoDate(endDate) : null;
  if (endDate && !parsedEnd) {
    return NextResponse.json({ error: "endDate must be a valid date" }, { status: 422 });
  }

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const conditions = [eq(timeEntries.orgId, orgId)];
  if (jobId) conditions.push(eq(timeEntries.jobId, jobId));
  if (teamMemberId) conditions.push(eq(timeEntries.teamMemberId, teamMemberId));
  if (parsedStart) conditions.push(gte(timeEntries.clockIn, parsedStart));
  if (parsedEnd) conditions.push(lte(timeEntries.clockIn, parsedEnd));

  const baseQuery = db
    .select({
      id: timeEntries.id,
      teamMemberId: timeEntries.teamMemberId,
      memberFirstName: teamMembers.firstName,
      memberLastName: teamMembers.lastName,
      jobId: timeEntries.jobId,
      jobTitle: jobs.title,
      jobNumber: jobs.jobNumber,
      clockIn: timeEntries.clockIn,
      clockOut: timeEntries.clockOut,
      durationMinutes: timeEntries.durationMinutes,
      notes: timeEntries.notes,
    })
    .from(timeEntries)
    .innerJoin(teamMembers, eq(timeEntries.teamMemberId, teamMembers.id))
    .leftJoin(jobs, eq(timeEntries.jobId, jobs.id))
    .where(and(...conditions))
    .orderBy(desc(timeEntries.clockIn));

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
    teamMemberId?: string;
    jobId?: string | null;
    visitId?: string | null;
    clockIn?: string;
    clockOut?: string | null;
    notes?: string | null;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.teamMemberId) || !(await teamMemberExists(orgId, body.teamMemberId))) {
    return NextResponse.json(
      { error: "teamMemberId must belong to the same organization" },
      { status: 422 },
    );
  }

  if (body.jobId !== undefined && body.jobId !== null) {
    if (!isValidUuid(body.jobId) || !(await jobExists(orgId, body.jobId))) {
      return NextResponse.json({ error: "jobId must belong to the same organization" }, { status: 422 });
    }
  }

  if (body.visitId !== undefined && body.visitId !== null) {
    if (!isValidUuid(body.visitId) || !(await visitExists(orgId, body.visitId))) {
      return NextResponse.json({ error: "visitId must belong to the same organization" }, { status: 422 });
    }
  }

  const clockIn = body.clockIn ? parseIsoDate(body.clockIn) : null;
  if (!clockIn) {
    return NextResponse.json({ error: "clockIn must be a valid ISO date string" }, { status: 422 });
  }

  const clockOut = body.clockOut ? parseIsoDate(body.clockOut) : null;
  if (body.clockOut && !clockOut) {
    return NextResponse.json({ error: "clockOut must be a valid ISO date string" }, { status: 422 });
  }

  const [existingOpenEntry] = await db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.orgId, orgId),
        eq(timeEntries.teamMemberId, body.teamMemberId),
        isNull(timeEntries.clockOut),
      ),
    )
    .limit(1);

  if (existingOpenEntry) {
    return NextResponse.json(
      {
        error: "This team member already has an open time entry. Close it before starting a new one.",
        existingEntryId: existingOpenEntry.id,
      },
      { status: 409 },
    );
  }

  let durationMinutes: number | null = null;
  if (clockOut) {
    durationMinutes = Math.round((clockOut.getTime() - clockIn.getTime()) / 60_000);
    if (durationMinutes < 0) {
      return NextResponse.json({ error: "clockOut must be after clockIn" }, { status: 422 });
    }
  }

  const [row] = await db
    .insert(timeEntries)
    .values({
      orgId,
      teamMemberId: body.teamMemberId,
      jobId: body.jobId ?? null,
      visitId: body.visitId ?? null,
      clockIn,
      clockOut,
      durationMinutes,
      notes: typeof body.notes === "string" ? sanitizeText(body.notes, 4000) : null,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "time_entry", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
