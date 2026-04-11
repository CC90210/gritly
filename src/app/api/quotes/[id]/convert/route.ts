import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, organizations, quotes } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const { id } = await params;

  const [quote] = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      clientId: quotes.clientId,
      propertyId: quotes.propertyId,
      status: quotes.status,
      total: quotes.total,
      notes: quotes.notes,
    })
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .limit(1);

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved quotes can be converted to jobs" },
      { status: 422 }
    );
  }

  const [existingJob] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.orgId, orgId), eq(jobs.quoteId, id)))
    .limit(1);

  if (existingJob) {
    return NextResponse.json(
      { error: "Quote has already been converted to a job", jobId: existingJob.id },
      { status: 409 }
    );
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
        clientId: quote.clientId,
        propertyId: quote.propertyId ?? null,
        quoteId: quote.id,
        status: "pending",
        title: `Job from ${quote.quoteNumber}`,
        description: quote.notes ?? `Converted from quote ${quote.quoteNumber}`,
        totalCost: quote.total ?? 0,
      })
      .returning();

    return newJob;
  });

  await logAudit({
    orgId,
    userId,
    action: "create",
    entityType: "job",
    entityId: job.id,
    metadata: { quoteId: quote.id, convertedFromQuote: true },
  });

  return NextResponse.json(job, { status: 201 });
}
