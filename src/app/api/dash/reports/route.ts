import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, quotes, jobs, invoices, expenses, payments, quoteItems, serviceItems } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";

interface MonthBucket {
  month: string;
  revenue: number;
  expenses: number;
}

export async function GET() {
  try {
    const authResult = await requireRole("technician");
    if (!isAuthorized(authResult)) return authResult;
    const { orgId } = authResult;

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
      topClientsByRevenue,
      topServicesByFrequency,
      avgQuoteResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(clients)
        .where(eq(clients.orgId, orgId)),
      db.select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(eq(quotes.orgId, orgId)),
      db.select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(and(eq(quotes.orgId, orgId), eq(quotes.status, "approved"))),
      db.select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(eq(jobs.orgId, orgId)),
      db.select({ total: sql<number>`coalesce(sum(total), 0)` })
        .from(invoices)
        .where(and(eq(invoices.orgId, orgId))),
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` })
        .from(expenses)
        .where(eq(expenses.orgId, orgId)),
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` })
        .from(payments)
        .where(eq(payments.orgId, orgId)),
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

      // Top 5 clients by total revenue paid
      db.select({
        clientId: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      })
        .from(payments)
        .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .where(eq(payments.orgId, orgId))
        .groupBy(clients.id, clients.firstName, clients.lastName)
        .orderBy(desc(sql`sum(${payments.amount})`))
        .limit(5),

      // Top 5 services by quote line item frequency
      db.select({
        serviceId: quoteItems.serviceId,
        name: serviceItems.name,
        count: sql<number>`count(*)`,
        totalRevenue: sql<number>`coalesce(sum(${quoteItems.total}), 0)`,
      })
        .from(quoteItems)
        .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
        .leftJoin(serviceItems, eq(quoteItems.serviceId, serviceItems.id))
        .where(eq(quotes.orgId, orgId))
        .groupBy(quoteItems.serviceId, serviceItems.name)
        .orderBy(desc(sql`count(*)`))
        .limit(5),

      // Average quote value — now runs in parallel with the rest
      db.select({ avg: sql<number>`coalesce(avg(total), 0)` })
        .from(quotes)
        .where(eq(quotes.orgId, orgId)),
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

    const avgJobValue = totalJobs > 0 ? totalInvoiced / totalJobs : 0;
    const avgQuoteValue = totalQuotes > 0 ? (Number(avgQuoteResult[0]?.avg ?? 0)) : 0;

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
      avgJobValue,
      avgQuoteValue,
      revenueByMonth,
      topClients: topClientsByRevenue.map((r) => ({
        name: `${r.firstName} ${r.lastName}`.trim(),
        total: Number(r.total),
      })),
      topServices: topServicesByFrequency.map((r) => ({
        name: r.name ?? "Custom item",
        count: Number(r.count),
        totalRevenue: Number(r.totalRevenue),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

