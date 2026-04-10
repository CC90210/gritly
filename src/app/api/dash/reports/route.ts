import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, clients, quotes, jobs, invoices, expenses, payments } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface MonthBucket {
  month: string; // "YYYY-MM"
  revenue: number;
  expenses: number;
}

export async function GET() {
  try {
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

    // Compute the timestamp boundary for 6 months ago (start of that month)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sixMonthsAgoTs = Math.floor(sixMonthsAgo.getTime() / 1000);

    const [
      clientCount,
      quoteCountAll,
      quoteCountApproved,
      jobCountAll,
      invoiceTotals,
      expenseTotals,
      paymentTotal,
      monthlyPayments,
      monthlyExpenses,
    ] = await Promise.all([
      // Total clients
      db.select({ count: sql<number>`count(*)` })
        .from(clients)
        .where(eq(clients.orgId, orgId)),

      // Total quotes ever (for conversion rate denominator)
      db.select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(eq(quotes.orgId, orgId)),

      // Approved quotes (for conversion rate numerator)
      db.select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(and(eq(quotes.orgId, orgId), eq(quotes.status, "approved"))),

      // Total jobs
      db.select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(eq(jobs.orgId, orgId)),

      // Total invoiced (sum of invoice totals for sent/paid invoices)
      db.select({ total: sql<number>`coalesce(sum(total), 0)` })
        .from(invoices)
        .where(and(eq(invoices.orgId, orgId))),

      // Total expenses
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` })
        .from(expenses)
        .where(eq(expenses.orgId, orgId)),

      // Total revenue collected (actual payments)
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` })
        .from(payments)
        .where(eq(payments.orgId, orgId)),

      // Monthly revenue (payments grouped by month) for last 6 months
      // SQLite: strftime('%Y-%m', datetime(created_at, 'unixepoch'))
      db.select({
        month: sql<string>`strftime('%Y-%m', datetime(${payments.createdAt}, 'unixepoch'))`,
        total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      })
        .from(payments)
        .where(
          and(
            eq(payments.orgId, orgId),
            sql`${payments.createdAt} >= ${sixMonthsAgoTs}`
          )
        )
        .groupBy(sql`strftime('%Y-%m', datetime(${payments.createdAt}, 'unixepoch'))`),

      // Monthly expenses grouped by month for last 6 months
      db.select({
        month: sql<string>`strftime('%Y-%m', datetime(${expenses.createdAt}, 'unixepoch'))`,
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      })
        .from(expenses)
        .where(
          and(
            eq(expenses.orgId, orgId),
            sql`${expenses.createdAt} >= ${sixMonthsAgoTs}`
          )
        )
        .groupBy(sql`strftime('%Y-%m', datetime(${expenses.createdAt}, 'unixepoch'))`),
    ]);

    const totalClients = Number(clientCount[0]?.count ?? 0);
    const totalQuotes = Number(quoteCountAll[0]?.count ?? 0);
    const approvedQuotes = Number(quoteCountApproved[0]?.count ?? 0);
    const totalJobs = Number(jobCountAll[0]?.count ?? 0);
    const totalInvoiced = Number(invoiceTotals[0]?.total ?? 0);
    const totalExpenses = Number(expenseTotals[0]?.total ?? 0);
    const totalRevenue = Number(paymentTotal[0]?.total ?? 0);
    const netProfit = totalRevenue - totalExpenses;
    const conversionRate = totalQuotes > 0
      ? Math.round((approvedQuotes / totalQuotes) * 100)
      : 0;

    // Build ordered 6-month buckets even for months with no data
    const revenueByPayment = new Map(monthlyPayments.map((r) => [r.month, Number(r.total)]));
    const expenseByMonth = new Map(monthlyExpenses.map((r) => [r.month, Number(r.total)]));

    const revenueByMonth: MonthBucket[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revenueByMonth.push({
        month: key,
        revenue: revenueByPayment.get(key) ?? 0,
        expenses: expenseByMonth.get(key) ?? 0,
      });
    }

    return NextResponse.json({
      totalClients,
      totalQuotes,
      approvedQuotes,
      totalJobs,
      totalInvoiced,
      totalExpenses,
      totalRevenue,
      netProfit,
      conversionRate,
      revenueByMonth,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
