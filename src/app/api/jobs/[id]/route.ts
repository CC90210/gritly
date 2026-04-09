import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, jobVisits, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

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

  // Whitelist allowed fields — never allow id, orgId, jobNumber, or counters from request body
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  const { id } = await params;

  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.orgId, orgId)))
    .limit(1);

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete child visits first
  await db.delete(jobVisits).where(eq(jobVisits.jobId, id));
  await db.delete(jobs).where(eq(jobs.id, id));

  return NextResponse.json({ success: true });
}
