import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, clients, jobs, quotes, invoices, organizations } from "@/lib/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user?.orgId) {
    return NextResponse.json({ error: "No org" }, { status: 400 });
  }

  // Find client record by userId first, fall back to email match
  const clientRows = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  let client = clientRows[0];

  if (!client && user.email) {
    const byEmail = await db
      .select()
      .from(clients)
      .where(and(eq(clients.email, user.email), eq(clients.orgId, user.orgId)))
      .limit(1);
    client = byEmail[0];
  }

  if (!client) {
    return NextResponse.json({ error: "Client record not found" }, { status: 404 });
  }

  // Org name
  const orgRows = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .limit(1);
  const orgName = orgRows[0]?.name ?? "";

  // Stats: active jobs
  const activeJobsResult = await db
    .select({ count: count() })
    .from(jobs)
    .where(and(eq(jobs.clientId, client.id), inArray(jobs.status, ["scheduled", "in_progress"])));
  const activeJobs = activeJobsResult[0]?.count ?? 0;

  // Stats: pending quotes
  const pendingQuotesResult = await db
    .select({ count: count() })
    .from(quotes)
    .where(and(eq(quotes.clientId, client.id), inArray(quotes.status, ["draft", "sent"])));
  const pendingQuotes = pendingQuotesResult[0]?.count ?? 0;

  // Stats: outstanding invoices (sent or overdue)
  const outstandingInvoicesResult = await db
    .select({ count: count() })
    .from(invoices)
    .where(and(eq(invoices.clientId, client.id), inArray(invoices.status, ["sent", "overdue", "partial"])));
  const outstandingInvoices = outstandingInvoicesResult[0]?.count ?? 0;

  return NextResponse.json({
    client,
    orgName,
    stats: {
      activeJobs,
      pendingQuotes,
      outstandingInvoices,
    },
  });
}
