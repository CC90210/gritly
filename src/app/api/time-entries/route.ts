import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeEntries, teamMembers, jobs } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId } = authResult;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const teamMemberId = searchParams.get("teamMemberId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const conditions: ReturnType<typeof eq>[] = [eq(timeEntries.orgId, orgId)];
  if (jobId) conditions.push(eq(timeEntries.jobId, jobId));
  if (teamMemberId) conditions.push(eq(timeEntries.teamMemberId, teamMemberId));
  if (startDate) conditions.push(gte(timeEntries.clockIn, new Date(startDate)));
  if (endDate) conditions.push(lte(timeEntries.clockIn, new Date(endDate)));

  const rows = await db
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

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const body = await parseBody<{
    teamMemberId?: string;
    jobId?: string;
    visitId?: string;
    clockIn?: string;
    clockOut?: string;
    notes?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.teamMemberId || !body.clockIn) {
    return NextResponse.json(
      { error: "teamMemberId and clockIn are required" },
      { status: 422 }
    );
  }

  if (isNaN(Date.parse(body.clockIn))) {
    return NextResponse.json({ error: "clockIn must be a valid ISO date string" }, { status: 422 });
  }

  // Verify team member belongs to org
  const [member] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.id, body.teamMemberId), eq(teamMembers.orgId, orgId)))
    .limit(1);
  if (!member) {
    return NextResponse.json({ error: "Invalid teamMemberId" }, { status: 422 });
  }

  const [existingOpenEntry] = await db
    .select({ id: timeEntries.id, clockIn: timeEntries.clockIn })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.orgId, orgId),
        eq(timeEntries.teamMemberId, body.teamMemberId),
        isNull(timeEntries.clockOut)
      )
    )
    .limit(1);

  if (existingOpenEntry) {
    return NextResponse.json(
      {
        error: "This team member already has an open time entry. Close it before starting a new one.",
        existingEntryId: existingOpenEntry.id,
      },
      { status: 409 }
    );
  }

  const clockIn = new Date(body.clockIn);
  const clockOut = body.clockOut ? new Date(body.clockOut) : null;

  // Auto-calculate duration
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
      notes: body.notes ?? null,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "time_entry", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}

// PATCH removed from collection route — use /api/time-entries/[id] instead.
// The collection-level PATCH was redundant and lacked proper org-scoping on the update.
