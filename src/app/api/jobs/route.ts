import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, organizations, clients, quotes } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
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
  const clientId = searchParams.get("clientId");

  const where = clientId
    ? and(eq(jobs.orgId, orgId), eq(jobs.clientId, clientId))
    : eq(jobs.orgId, orgId);

  const rows = await db
    .select()
    .from(jobs)
    .where(where)
    .orderBy(desc(jobs.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

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

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, body.clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 422 });
  }

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

  logAudit({ orgId, userId, action: "create", entityType: "job", entityId: job.id });

  return NextResponse.json(job, { status: 201 });
}
