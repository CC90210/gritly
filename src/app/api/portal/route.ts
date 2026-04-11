import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, jobs, organizations, quotes } from "@/lib/db/schema";
import { and, count, eq, inArray } from "drizzle-orm";
import { requirePortalClient } from "@/lib/api/portal-context";
import { rateLimit } from "@/lib/middleware/rate-limit";

export async function GET() {
  const portalContext = await requirePortalClient();
  if (portalContext instanceof NextResponse) return portalContext;
  const { orgId, userId, client } = portalContext;

  const limited = rateLimit(`portal:${userId}`, 60, 60_000);
  if (limited) return limited;

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const [activeJobsResult, pendingQuotesResult, outstandingInvoicesResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(jobs)
      .where(
        and(
          eq(jobs.orgId, orgId),
          eq(jobs.clientId, client.id),
          inArray(jobs.status, ["scheduled", "in_progress"]),
        ),
      ),
    db
      .select({ count: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.orgId, orgId),
          eq(quotes.clientId, client.id),
          inArray(quotes.status, ["draft", "sent"]),
        ),
      ),
    db
      .select({ count: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.clientId, client.id),
          inArray(invoices.status, ["sent", "overdue", "partial"]),
        ),
      ),
  ]);

  return NextResponse.json({
    client,
    orgName: org?.name ?? "",
    stats: {
      activeJobs: activeJobsResult[0]?.count ?? 0,
      pendingQuotes: pendingQuotesResult[0]?.count ?? 0,
      outstandingInvoices: outstandingInvoicesResult[0]?.count ?? 0,
    },
  });
}
