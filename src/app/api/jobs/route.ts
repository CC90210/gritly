import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, jobs, organizations, quotes } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { clientExists, propertyBelongsToClient, quoteExists, teamMembersExist } from "@/lib/api/tenant";
import { isFiniteNumber, parseIsoDate, toStringArray, isValidUuid } from "@/lib/api/validation";
import { rateLimit } from "@/lib/middleware/rate-limit";

const JOB_STATUSES = new Set(["pending", "scheduled", "in_progress", "completed", "on_hold", "cancelled"]);
const JOB_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (clientId && !isValidUuid(clientId)) {
    return NextResponse.json({ error: "clientId must be a valid UUID" }, { status: 422 });
  }

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const where = clientId
    ? and(eq(jobs.orgId, orgId), eq(jobs.clientId, clientId))
    : eq(jobs.orgId, orgId);

  const baseQuery = db
    .select()
    .from(jobs)
    .where(where)
    .orderBy(desc(jobs.createdAt));

  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 30, 60_000);
  if (limited) return limited;

  const body = await parseBody<{
    clientId?: string;
    title?: string;
    description?: string;
    propertyId?: string | null;
    quoteId?: string | null;
    status?: string;
    priority?: string;
    recurrence?: string;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    assignedTo?: string[];
    notes?: string;
    internalNotes?: string;
    totalCost?: number;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.clientId) || !(await clientExists(orgId, body.clientId))) {
    return NextResponse.json({ error: "Valid clientId is required" }, { status: 422 });
  }
  const clientId = body.clientId;

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 422 });
  }
  const title = body.title.trim().slice(0, 200);

  if (body.propertyId !== undefined && body.propertyId !== null) {
    if (!isValidUuid(body.propertyId) || !(await propertyBelongsToClient(orgId, body.propertyId, clientId))) {
      return NextResponse.json({ error: "propertyId must belong to the same organization client" }, { status: 422 });
    }
  }

  if (body.quoteId !== undefined && body.quoteId !== null) {
    if (!isValidUuid(body.quoteId) || !(await quoteExists(orgId, body.quoteId))) {
      return NextResponse.json({ error: "quoteId must reference a quote in the same organization" }, { status: 422 });
    }
  }

  if (body.status !== undefined && !JOB_STATUSES.has(body.status)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${[...JOB_STATUSES].join(", ")}` }, { status: 422 });
  }

  if (body.priority !== undefined && !JOB_PRIORITIES.has(body.priority)) {
    return NextResponse.json({ error: `Invalid priority. Allowed: ${[...JOB_PRIORITIES].join(", ")}` }, { status: 422 });
  }

  const assignedTo = body.assignedTo === undefined ? [] : toStringArray(body.assignedTo);
  if (assignedTo === null || !(await teamMembersExist(orgId, assignedTo))) {
    return NextResponse.json({ error: "assignedTo must contain valid teamMemberId values" }, { status: 422 });
  }

  const scheduledStart = body.scheduledStart ? parseIsoDate(body.scheduledStart) : null;
  const scheduledEnd = body.scheduledEnd ? parseIsoDate(body.scheduledEnd) : null;
  if (body.scheduledStart && !scheduledStart) {
    return NextResponse.json({ error: "scheduledStart must be a valid ISO date" }, { status: 422 });
  }
  if (body.scheduledEnd && !scheduledEnd) {
    return NextResponse.json({ error: "scheduledEnd must be a valid ISO date" }, { status: 422 });
  }
  if (scheduledStart && scheduledEnd && scheduledEnd < scheduledStart) {
    return NextResponse.json({ error: "scheduledEnd must be after scheduledStart" }, { status: 422 });
  }

  const totalCost = body.totalCost ?? 0;
  if (!isFiniteNumber(totalCost) || totalCost < 0) {
    return NextResponse.json({ error: "totalCost must be a non-negative number" }, { status: 422 });
  }

  const job = await db.transaction(async (tx) => {
    const [org] = await tx
      .update(organizations)
      .set({ jobCounter: sql`job_counter + 1` })
      .where(eq(organizations.id, orgId))
      .returning({ jobCounter: organizations.jobCounter });

    const counter = org?.jobCounter ?? 1000;
    const jobNumber = `J-${String(counter).padStart(5, "0")}`;

    const [newJob] = await tx
      .insert(jobs)
      .values({
        orgId,
        jobNumber,
        clientId,
        title,
        description: typeof body.description === "string" ? body.description.trim().slice(0, 4000) : null,
        propertyId: body.propertyId ?? null,
        quoteId: body.quoteId ?? null,
        status: body.status ?? "pending",
        priority: body.priority ?? "medium",
        recurrence: typeof body.recurrence === "string" ? body.recurrence.trim().slice(0, 50) : "once",
        scheduledStart,
        scheduledEnd,
        assignedTo,
        notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : null,
        internalNotes: typeof body.internalNotes === "string" ? body.internalNotes.trim().slice(0, 4000) : null,
        totalCost,
      })
      .returning();

    return newJob;
  });

  await logAudit({ orgId, userId, action: "create", entityType: "job", entityId: job.id, metadata: { jobNumber: job.jobNumber } });

  return NextResponse.json(job, { status: 201 });
}


