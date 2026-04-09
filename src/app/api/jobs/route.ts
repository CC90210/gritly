import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, organizations, users, clients, quotes } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

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

  // Verify clientId belongs to the same org — prevents cross-org data access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, body.clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 422 });
  }

  // Verify quoteId belongs to the same org if provided
  if (body.quoteId) {
    const [quote] = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(and(eq(quotes.id, body.quoteId), eq(quotes.orgId, orgId)))
      .limit(1);
    if (!quote) {
      return NextResponse.json({ error: "Invalid quoteId" }, { status: 422 });
    }
  }

  // Atomically increment job counter to prevent duplicate numbers under concurrency
  const [org] = await db
    .update(organizations)
    .set({ jobCounter: sql`job_counter + 1` })
    .where(eq(organizations.id, orgId))
    .returning({ jobCounter: organizations.jobCounter });

  const jobNumber = `J-${String(org.jobCounter).padStart(5, "0")}`;

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
