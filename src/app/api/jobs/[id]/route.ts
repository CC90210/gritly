import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobVisits, jobs } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { propertyBelongsToClient, quoteExists, teamMembersExist } from "@/lib/api/tenant";
import { isFiniteNumber, parseIsoDate, toStringArray } from "@/lib/api/validation";

const JOB_STATUSES = new Set(["pending", "scheduled", "in_progress", "completed", "on_hold", "cancelled"]);
const JOB_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.orgId, orgId)))
    .limit(1);

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visits = await db
    .select()
    .from(jobVisits)
    .where(and(eq(jobVisits.jobId, id), eq(jobVisits.orgId, orgId)));

  return NextResponse.json({ ...job, visits });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 30, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const body = await parseBody<{
    status?: string;
    title?: string;
    description?: string;
    propertyId?: string | null;
    quoteId?: string | null;
    priority?: string;
    assignedTo?: string[];
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    completedAt?: string | null;
    notes?: string;
    internalNotes?: string;
    totalCost?: number;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (body.status !== undefined && !JOB_STATUSES.has(body.status)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${[...JOB_STATUSES].join(", ")}` }, { status: 422 });
  }

  if (body.priority !== undefined && !JOB_PRIORITIES.has(body.priority)) {
    return NextResponse.json({ error: `Invalid priority. Allowed: ${[...JOB_PRIORITIES].join(", ")}` }, { status: 422 });
  }

  const [existingJob] = await db
    .select({
      id: jobs.id,
      clientId: jobs.clientId,
      status: jobs.status,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.orgId, orgId)))
    .limit(1);

  if (!existingJob) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.propertyId !== undefined && body.propertyId !== null) {
    if (!(await propertyBelongsToClient(orgId, body.propertyId, existingJob.clientId))) {
      return NextResponse.json({ error: "propertyId must belong to the job client" }, { status: 422 });
    }
  }

  if (body.quoteId !== undefined && body.quoteId !== null && !(await quoteExists(orgId, body.quoteId))) {
    return NextResponse.json({ error: "quoteId must reference a quote in the same organization" }, { status: 422 });
  }

  let assignedTo: string[] | undefined;
  if (body.assignedTo !== undefined) {
    assignedTo = toStringArray(body.assignedTo) ?? undefined;
    if (!assignedTo || !(await teamMembersExist(orgId, assignedTo))) {
      return NextResponse.json({ error: "assignedTo must contain valid teamMemberId values" }, { status: 422 });
    }
  }

  if (body.totalCost !== undefined && (!isFiniteNumber(body.totalCost) || body.totalCost < 0)) {
    return NextResponse.json({ error: "totalCost must be a non-negative number" }, { status: 422 });
  }

  const scheduledStart = body.scheduledStart === undefined
    ? undefined
    : body.scheduledStart
      ? parseIsoDate(body.scheduledStart)
      : null;
  const scheduledEnd = body.scheduledEnd === undefined
    ? undefined
    : body.scheduledEnd
      ? parseIsoDate(body.scheduledEnd)
      : null;
  const completedAt = body.completedAt === undefined
    ? undefined
    : body.completedAt
      ? parseIsoDate(body.completedAt)
      : null;

  if (body.scheduledStart !== undefined && body.scheduledStart && !scheduledStart) {
    return NextResponse.json({ error: "scheduledStart must be a valid ISO date" }, { status: 422 });
  }
  if (body.scheduledEnd !== undefined && body.scheduledEnd && !scheduledEnd) {
    return NextResponse.json({ error: "scheduledEnd must be a valid ISO date" }, { status: 422 });
  }
  if (body.completedAt !== undefined && body.completedAt && !completedAt) {
    return NextResponse.json({ error: "completedAt must be a valid ISO date" }, { status: 422 });
  }
  if (scheduledStart && scheduledEnd && scheduledEnd < scheduledStart) {
    return NextResponse.json({ error: "scheduledEnd must be after scheduledStart" }, { status: 422 });
  }

  const updateData: Partial<typeof jobs.$inferInsert> = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.title !== undefined) updateData.title = body.title.trim().slice(0, 200);
  if (body.description !== undefined) updateData.description = body.description?.trim().slice(0, 4000) ?? null;
  if (body.propertyId !== undefined) updateData.propertyId = body.propertyId;
  if (body.quoteId !== undefined) updateData.quoteId = body.quoteId;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
  if (body.notes !== undefined) updateData.notes = body.notes?.trim().slice(0, 4000) ?? null;
  if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes?.trim().slice(0, 4000) ?? null;
  if (body.totalCost !== undefined) updateData.totalCost = body.totalCost;
  if (scheduledStart !== undefined) updateData.scheduledStart = scheduledStart;
  if (scheduledEnd !== undefined) updateData.scheduledEnd = scheduledEnd;
  if (completedAt !== undefined) updateData.completedAt = completedAt;
  if (body.status === "completed" && existingJob.status !== "completed" && body.completedAt === undefined) {
    updateData.completedAt = new Date();
  }

  const optimisticGuard = existingJob.updatedAt
    ? eq(jobs.updatedAt, existingJob.updatedAt)
    : isNull(jobs.updatedAt);

  const [updated] = await db
    .update(jobs)
    .set(updateData)
    .where(and(eq(jobs.id, id), eq(jobs.orgId, orgId), optimisticGuard))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Job was updated by another request. Reload and try again." },
      { status: 409 },
    );
  }

  await logAudit({ orgId, userId, action: "update", entityType: "job", entityId: id, metadata: body });

  const visits = await db
    .select()
    .from(jobVisits)
    .where(and(eq(jobVisits.jobId, id), eq(jobVisits.orgId, orgId)));

  return NextResponse.json({ ...updated, visits });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 30, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [job] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.orgId, orgId)))
    .limit(1);

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(jobVisits).where(and(eq(jobVisits.jobId, id), eq(jobVisits.orgId, orgId)));
  await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.orgId, orgId)));

  await logAudit({ orgId, userId, action: "delete", entityType: "job", entityId: id });

  return NextResponse.json({ success: true });
}
