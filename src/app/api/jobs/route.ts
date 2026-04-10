import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, organizations, clients, quotes } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId } = authResult;

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

  const body = await parseBody<{
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
  }>(req);
  if (body instanceof NextResponse) return body;

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

  // Wrap counter increment and insert in a transaction to prevent number gaps on failure
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
        clientId: body.clientId!,
        title: body.title!,
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

    return newJob;
  });

  await logAudit({ orgId, userId, action: "create", entityType: "job", entityId: job.id });

  return NextResponse.json(job, { status: 201 });
}
