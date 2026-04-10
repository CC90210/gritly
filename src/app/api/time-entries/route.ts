import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeEntries, teamMembers, jobs } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

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

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await req.json() as {
    teamMemberId?: string;
    jobId?: string;
    visitId?: string;
    clockIn?: string;
    clockOut?: string;
    notes?: string;
  };

  if (!body.teamMemberId || !body.clockIn) {
    return NextResponse.json(
      { error: "teamMemberId and clockIn are required" },
      { status: 422 }
    );
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

  logAudit({ orgId, userId, action: "create", entityType: "time_entry", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await req.json() as { id?: string; clockOut?: string; notes?: string };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 422 });

  const [existing] = await db
    .select({ clockIn: timeEntries.clockIn, teamMemberId: timeEntries.teamMemberId, orgId: timeEntries.orgId })
    .from(timeEntries)
    .where(and(eq(timeEntries.id, body.id), eq(timeEntries.orgId, orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clockOut = body.clockOut ? new Date(body.clockOut) : new Date();
  const durationMinutes = Math.max(
    0,
    Math.round((clockOut.getTime() - existing.clockIn.getTime()) / 60_000)
  );

  const updateData: Record<string, unknown> = { clockOut, durationMinutes };
  if (body.notes !== undefined) updateData.notes = body.notes;

  const [updated] = await db
    .update(timeEntries)
    .set(updateData)
    .where(eq(timeEntries.id, body.id))
    .returning();

  logAudit({ orgId, userId, action: "update", entityType: "time_entry", entityId: body.id });

  return NextResponse.json(updated);
}
