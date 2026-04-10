import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, jobVisits } from "@/lib/db/schema";
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
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const body = await req.json() as {
    status?: string;
    title?: string;
    description?: string;
    priority?: string;
    assignedTo?: string[];
    scheduledStart?: string;
    scheduledEnd?: string;
    completedAt?: string;
    notes?: string;
    internalNotes?: string;
    totalCost?: number;
  };

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes;
  if (body.totalCost !== undefined) updateData.totalCost = body.totalCost;
  if (body.scheduledStart) updateData.scheduledStart = new Date(body.scheduledStart);
  if (body.scheduledEnd) updateData.scheduledEnd = new Date(body.scheduledEnd);
  if (body.completedAt) updateData.completedAt = new Date(body.completedAt);

  const [updated] = await db
    .update(jobs)
    .set(updateData)
    .where(and(eq(jobs.id, id), eq(jobs.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "update", entityType: "job", entityId: id, metadata: body });

  const visits = await db
    .select()
    .from(jobVisits)
    .where(and(eq(jobVisits.jobId, id), eq(jobVisits.orgId, orgId)));

  return NextResponse.json({ ...updated, visits });
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

  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.orgId, orgId)))
    .limit(1);

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(jobVisits).where(eq(jobVisits.jobId, id));
  await db.delete(jobs).where(eq(jobs.id, id));

  logAudit({ orgId, userId, action: "delete", entityType: "job", entityId: id });

  return NextResponse.json({ success: true });
}
