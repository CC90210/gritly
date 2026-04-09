import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, organizations, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
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

  const rows = await db
    .select()
    .from(jobs)
    .where(eq(jobs.orgId, orgId))
    .orderBy(desc(jobs.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
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

  const body = await req.json() as {
    clientId?: string;
    title?: string;
    description?: string;
    propertyId?: string;
    quoteId?: string;
    status?: string;
    priority?: string;
    recurrence?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    assignedTo?: string[];
    notes?: string;
    internalNotes?: string;
    totalCost?: number;
  };

  if (!body.clientId || !body.title) {
    return NextResponse.json(
      { error: "clientId and title are required" },
      { status: 422 }
    );
  }

  // Auto-increment job counter
  const [org] = await db
    .select({ jobCounter: organizations.jobCounter })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const newCounter = (org?.jobCounter ?? 1000) + 1;
  await db
    .update(organizations)
    .set({ jobCounter: newCounter })
    .where(eq(organizations.id, orgId));

  const jobNumber = `J-${String(newCounter).padStart(5, "0")}`;

  const [job] = await db
    .insert(jobs)
    .values({
      orgId,
      jobNumber,
      clientId: body.clientId,
      title: body.title,
      description: body.description ?? null,
      propertyId: body.propertyId ?? null,
      quoteId: body.quoteId ?? null,
      status: body.status ?? "pending",
      priority: body.priority ?? "medium",
      recurrence: body.recurrence ?? "once",
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
      assignedTo: body.assignedTo ?? [],
      notes: body.notes ?? null,
      internalNotes: body.internalNotes ?? null,
      totalCost: body.totalCost ?? 0,
    })
    .returning();

  return NextResponse.json(job, { status: 201 });
}
