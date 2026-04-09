import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, clients, quotes, jobs, invoices, serviceRequests, payments } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRows = await db.select({ orgId: users.orgId }).from(users).where(eq(users.id, session.user.id)).limit(1);
    const orgId = userRows[0]?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No org" }, { status: 400 });
    }

    const [clientCount, quoteCount, jobCount, invoiceCount, requestCount, paymentSum] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.orgId, orgId)),
      db.select({ count: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.orgId, orgId), eq(quotes.status, "sent"))),
      db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.orgId, orgId), inArray(jobs.status, ["scheduled", "in_progress"]))),
      db.select({ count: sql<number>`count(*)` }).from(invoices).where(and(eq(invoices.orgId, orgId), eq(invoices.status, "overdue"))),
      db.select({ count: sql<number>`count(*)` }).from(serviceRequests).where(and(eq(serviceRequests.orgId, orgId), eq(serviceRequests.status, "new"))),
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments).where(eq(payments.orgId, orgId)),
    ]);

    return NextResponse.json({
      totalClients: clientCount[0]?.count ?? 0,
      openQuotes: quoteCount[0]?.count ?? 0,
      activeJobs: jobCount[0]?.count ?? 0,
      overdueInvoices: invoiceCount[0]?.count ?? 0,
      recentRequests: requestCount[0]?.count ?? 0,
      revenue: paymentSum[0]?.total ?? 0,
      upcomingJobs: 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
