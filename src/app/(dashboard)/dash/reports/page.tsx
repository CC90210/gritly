"use client";

import { useEffect, useState } from "react";
import { useOrgStore } from "@/lib/store/org";
import {
  DollarSign, FileText, Briefcase, Users,
  AlertCircle, TrendingUp, Loader2, TrendingDown,
  BarChart2, Star,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ReportsData {
  totalClients: number;
  totalQuotes: number;
  approvedQuotes: number;
  totalJobs: number;
  totalInvoiced: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  conversionRate: number;
  avgJobValue: number;
  avgQuoteValue: number;
  revenueByMonth: { month: string; revenue: number; expenses: number }[];
  topClients: { name: string; total: number }[];
  topServices: { name: string; count: number; totalRevenue: number }[];
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtext?: string;
}

function StatCard({ label, value, icon: Icon, color, subtext }: StatCardProps) {
  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wide">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg bg-[#0a0a0a] flex items-center justify-center", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
      {subtext && <p className="text-xs text-[#4b5563] mt-1">{subtext}</p>}
    </div>
  );
}

function formatMoney(n: number) {
  return `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonth(ym: string) {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });
}

export default function ReportsPage() {
  const { org, industryConfig } = useOrgStore();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const terminology = industryConfig?.terminology ?? {
    client: "Client",
    clientPlural: "Clients",
    job: "Job",
    jobPlural: "Jobs",
    quote: "Quote",
    quotePlural: "Quotes",
    worker: "Technician",
    workerPlural: "Technicians",
  };

  useEffect(() => {
    if (!org) return;
    fetch("/api/dash/reports")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load reports");
        return r.json() as Promise<ReportsData>;
      })
      .then((d) => setData(d))
      .catch(() => setError("Could not load report data."))
      .finally(() => setLoading(false));
  }, [org]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Reports</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">Business overview for {org?.name}</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue section */}
          <div>
            <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">Revenue</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Total Collected"
                value={formatMoney(data?.totalRevenue ?? 0)}
                icon={DollarSign}
                color="text-green-400"
                subtext="Payments received"
              />
              <StatCard
                label="Total Invoiced"
                value={formatMoney(data?.totalInvoiced ?? 0)}
                icon={FileText}
                color="text-blue-400"
                subtext="Across all invoices"
              />
              <StatCard
                label="Total Expenses"
                value={formatMoney(data?.totalExpenses ?? 0)}
                icon={TrendingDown}
                color="text-red-400"
                subtext="All recorded expenses"
              />
              <StatCard
                label="Net Profit"
                value={formatMoney(data?.netProfit ?? 0)}
                icon={TrendingUp}
                color={(data?.netProfit ?? 0) >= 0 ? "text-green-400" : "text-red-400"}
                subtext="Collected minus expenses"
              />
            </div>
          </div>

          {/* Pipeline section */}
          <div>
            <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">Pipeline</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label={`Total ${terminology.clientPlural}`}
                value={String(data?.totalClients ?? 0)}
                icon={Users}
                color="text-blue-400"
              />
              <StatCard
                label={`Total ${"quotePlural" in terminology ? String(terminology.quotePlural) : `${terminology.quote}s`}`}
                value={String(data?.totalQuotes ?? 0)}
                icon={FileText}
                color="text-blue-400"
                subtext={`${data?.approvedQuotes ?? 0} approved`}
              />
              <StatCard
                label={`Total ${terminology.jobPlural}`}
                value={String(data?.totalJobs ?? 0)}
                icon={Briefcase}
                color="text-orange-400"
              />
              <StatCard
                label="Conversion Rate"
                value={`${data?.conversionRate ?? 0}%`}
                icon={TrendingUp}
                color="text-orange-400"
                subtext={`${terminology.quote}s approved`}
              />
            </div>
          </div>

          {/* Averages section */}
          <div>
            <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">Averages</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label={`Avg ${terminology.job} Value`}
                value={formatMoney(data?.avgJobValue ?? 0)}
                icon={BarChart2}
                color="text-purple-400"
                subtext="Avg invoice per job"
              />
              <StatCard
                label={`Avg ${terminology.quote} Value`}
                value={formatMoney(data?.avgQuoteValue ?? 0)}
                icon={BarChart2}
                color="text-purple-400"
                subtext={`Avg quote total`}
              />
            </div>
          </div>

          {/* Revenue by month table */}
          <div>
            <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">
              Revenue by Month (Last 6 Months)
            </h2>
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f1f]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide">Month</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide">Revenue</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide">Expenses</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.revenueByMonth ?? []).map((row) => {
                    const net = row.revenue - row.expenses;
                    return (
                      <tr key={row.month} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#0d0d0d] transition-colors">
                        <td className="px-5 py-3.5 text-white font-medium">{formatMonth(row.month)}</td>
                        <td className="px-5 py-3.5 text-right text-green-400 tabular-nums">{formatMoney(row.revenue)}</td>
                        <td className="px-5 py-3.5 text-right text-red-400 tabular-nums">{formatMoney(row.expenses)}</td>
                        <td className={cn("px-5 py-3.5 text-right tabular-nums font-semibold", net >= 0 ? "text-green-400" : "text-red-400")}>
                          {formatMoney(net)}
                        </td>
                      </tr>
                    );
                  })}

                  {(data?.revenueByMonth ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-[#4b5563] text-sm">
                        No data for the last 6 months yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top clients and services side by side */}
          {((data?.topClients?.length ?? 0) > 0 || (data?.topServices?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top clients */}
              {(data?.topClients?.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">
                    Top 5 {terminology.clientPlural} by Revenue
                  </h2>
                  <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1f1f1f]">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide">{terminology.client}</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.topClients ?? []).map((c, i) => (
                          <tr key={i} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#4b5563] font-mono w-4 text-center">#{i + 1}</span>
                                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                                  <Star className="w-3 h-3 text-orange-400" />
                                </div>
                                <span className="text-white font-medium">{c.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-green-400 tabular-nums font-semibold">
                              {formatMoney(c.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top services */}
              {(data?.topServices?.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">
                    Top 5 Services by Frequency
                  </h2>
                  <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1f1f1f]">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide">Service</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide">Times</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#4b5563] uppercase tracking-wide hidden sm:table-cell">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.topServices ?? []).map((s, i) => (
                          <tr key={i} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#4b5563] font-mono w-4 text-center">#{i + 1}</span>
                                <span className="text-white font-medium truncate max-w-[140px]">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-orange-400 font-semibold tabular-nums">
                              {s.count}x
                            </td>
                            <td className="px-4 py-3 text-right text-green-400 tabular-nums hidden sm:table-cell">
                              {formatMoney(s.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {data?.totalClients === 0 && (
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-8 text-center">
              <p className="text-[#6b7280] text-sm">
                Reports will populate as you add {terminology.clientPlural.toLowerCase()}, {terminology.jobPlural.toLowerCase()}, and invoices.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
