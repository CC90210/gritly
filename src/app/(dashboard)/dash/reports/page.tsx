"use client";

import { useEffect, useState } from "react";
import { useOrgStore } from "@/lib/store/org";
import {
  DollarSign, FileText, Briefcase, Users,
  AlertCircle, Inbox, TrendingUp, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DashStats {
  revenue: number;
  openQuotes: number;
  activeJobs: number;
  overdueInvoices: number;
  recentRequests: number;
  totalClients: number;
  upcomingJobs: number;
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

export default function ReportsPage() {
  const { org, industryConfig } = useOrgStore();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  const terminology = industryConfig?.terminology ?? {
    client: "Client",
    clientPlural: "Clients",
    job: "Job",
    jobPlural: "Jobs",
    quote: "Quote",
    worker: "Technician",
    workerPlural: "Technicians",
  };

  useEffect(() => {
    if (!org) return;
    fetch("/api/dash/stats")
      .then((r) => r.json())
      .then((d: DashStats) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [org]);

  const conversionRate =
    stats && stats.openQuotes > 0
      ? Math.round((stats.activeJobs / (stats.openQuotes + stats.activeJobs)) * 100)
      : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Reports</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">Business overview for {org?.name}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary stats */}
          <div>
            <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">Revenue</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                label="Total Revenue"
                value={`$${(stats?.revenue ?? 0).toLocaleString()}`}
                icon={DollarSign}
                color="text-green-400"
                subtext="All time payments recorded"
              />
              <StatCard
                label="Overdue Invoices"
                value={String(stats?.overdueInvoices ?? 0)}
                icon={AlertCircle}
                color={stats?.overdueInvoices ? "text-red-400" : "text-[#6b7280]"}
                subtext="Requires follow up"
              />
              <StatCard
                label="Conversion Rate"
                value={`${conversionRate}%`}
                icon={TrendingUp}
                color="text-orange-400"
                subtext={`${terminology.quote}s to ${terminology.jobPlural.toLowerCase()}`}
              />
            </div>
          </div>

          {/* Pipeline */}
          <div>
            <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">Pipeline</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label={`Total ${terminology.clientPlural}`}
                value={String(stats?.totalClients ?? 0)}
                icon={Users}
                color="text-blue-400"
              />
              <StatCard
                label={`Open ${terminology.quote}s`}
                value={String(stats?.openQuotes ?? 0)}
                icon={FileText}
                color="text-blue-400"
              />
              <StatCard
                label={`Active ${terminology.jobPlural}`}
                value={String(stats?.activeJobs ?? 0)}
                icon={Briefcase}
                color="text-orange-400"
              />
              <StatCard
                label="New Requests"
                value={String(stats?.recentRequests ?? 0)}
                icon={Inbox}
                color="text-yellow-400"
              />
            </div>
          </div>

          {/* Empty state prompt */}
          {stats?.totalClients === 0 && (
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-8 text-center">
              <p className="text-[#6b7280] text-sm">
                Reports will populate with real data as you add {terminology.clientPlural.toLowerCase()}, {terminology.jobPlural.toLowerCase()}, and invoices.
              </p>
            </div>
          )}

          {/* Placeholder for future charts */}
          <div className="bg-[#111111] border border-[#1f1f1f] border-dashed rounded-2xl p-8 text-center">
            <TrendingUp className="w-8 h-8 text-[#2d3748] mx-auto mb-3" />
            <p className="text-sm text-[#4b5563]">Revenue charts coming in a future update.</p>
          </div>
        </div>
      )}
    </div>
  );
}
