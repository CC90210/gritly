"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/lib/store/org";
import {
  DollarSign, FileText, Briefcase, AlertCircle,
  Calendar, Inbox, Users, Plus, ArrowRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DashStats {
  revenue: number;
  openQuotes: number;
  activeJobs: number;
  overdueInvoices: number;
  upcomingJobs: number;
  recentRequests: number;
  totalClients: number;
}

const WIDGET_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; format: (v: number) => string; color: string }
> = {
  revenue: {
    label: "Revenue This Month",
    icon: DollarSign,
    format: (v) => `$${v.toLocaleString()}`,
    color: "text-green-400",
  },
  openQuotes: {
    label: "Open Quotes",
    icon: FileText,
    format: (v) => String(v),
    color: "text-blue-400",
  },
  activeJobs: {
    label: "Active Jobs",
    icon: Briefcase,
    format: (v) => String(v),
    color: "text-orange-400",
  },
  overdueInvoices: {
    label: "Overdue Invoices",
    icon: AlertCircle,
    format: (v: number) => String(v),
    color: "text-red-400",
  },
  upcomingJobs: {
    label: "Upcoming This Week",
    icon: Calendar,
    format: (v) => String(v),
    color: "text-purple-400",
  },
  recentRequests: {
    label: "New Requests",
    icon: Inbox,
    format: (v) => String(v),
    color: "text-yellow-400",
  },
  todaysRoute: {
    label: "Today's Route",
    icon: Calendar,
    format: (v) => `${v} stops`,
    color: "text-orange-400",
  },
  recurringJobs: {
    label: "Recurring Jobs",
    icon: Briefcase,
    format: (v) => String(v),
    color: "text-green-400",
  },
};

function StatCard({
  widgetKey,
  value,
}: {
  widgetKey: string;
  value: number;
}) {
  const config = WIDGET_CONFIG[widgetKey];
  if (!config) return null;

  const Icon = config.icon;
  const color =
    typeof config.color === "function"
      ? (config.color as (v: number) => string)(value)
      : config.color;

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 hover:border-[#2d3748] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wide">
          {config.label}
        </p>
        <div className={cn("w-8 h-8 rounded-lg bg-[#0a0a0a] flex items-center justify-center", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", color)}>
        {config.format(value)}
      </p>
    </div>
  );
}

function EmptyState({ terminology }: { terminology: { clientPlural: string; jobPlural: string; quote: string } }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">G</span>
        </div>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">
        Welcome to Gritly.
      </h2>
      <p className="text-[#6b7280] text-sm max-w-sm mb-8">
        Let&apos;s get your first client set up. It takes under 2 minutes.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dash/clients/new"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add first {terminology.clientPlural.slice(0, -1).toLowerCase()}
        </Link>
        <Link
          href="/dash/import"
          className="flex items-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-[#d1d5db] font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
        >
          Import from Jobber
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function DashPage() {
  const { org, industryConfig } = useOrgStore();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    if (!org) return;
    fetchStats();
  }, [org]);

  async function fetchStats() {
    if (!org) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const orgId = org.id;

      const [
        clientsRes,
        quotesRes,
        jobsRes,
        invoicesRes,
        requestsRes,
        paymentsRes,
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "sent"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["scheduled", "in_progress"]),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "overdue"),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "new"),
        supabase
          .from("payments")
          .select("amount")
          .eq("org_id", orgId)
          .eq("status", "completed")
          .gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      const totalClients = clientsRes.count ?? 0;

      if (totalClients === 0) {
        setIsEmpty(true);
        setLoading(false);
        return;
      }

      const revenue = (paymentsRes.data ?? []).reduce(
        (sum, p) => sum + (p.amount as number),
        0
      );

      // Upcoming jobs this week
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const upcomingRes = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "scheduled")
        .lte("scheduled_start", weekEnd.toISOString());

      setStats({
        revenue,
        openQuotes: quotesRes.count ?? 0,
        activeJobs: jobsRes.count ?? 0,
        overdueInvoices: invoicesRes.count ?? 0,
        upcomingJobs: upcomingRes.count ?? 0,
        recentRequests: requestsRes.count ?? 0,
        totalClients,
      });

      setIsEmpty(false);
    } catch {
      // Stats failure is non-fatal — show empty state
      setIsEmpty(true);
    } finally {
      setLoading(false);
    }
  }

  const widgets = industryConfig?.defaultWidgets ?? [
    "revenue", "openQuotes", "activeJobs", "overdueInvoices", "upcomingJobs", "recentRequests",
  ];

  const terminology = industryConfig?.terminology ?? {
    worker: "Technician",
    workerPlural: "Technicians",
    job: "Job",
    clientPlural: "Clients",
    jobPlural: "Jobs",
    client: "Client",
    quote: "Quote",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState terminology={terminology} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">
          {org?.name ?? "Your business"} overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {widgets.map((key) => (
          <StatCard
            key={key}
            widgetKey={key}
            value={stats ? (stats[key as keyof DashStats] as number ?? 0) : 0}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `New ${terminology.clientPlural.slice(0, -1)}`, href: "/dash/clients/new", icon: Users },
          { label: `New ${terminology.quote}`, href: "/dash/quotes/new", icon: FileText },
          { label: `New ${terminology.job}`, href: "/dash/jobs/new", icon: Briefcase },
          { label: "New Invoice", href: "/dash/invoices/new", icon: DollarSign },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#374151] rounded-xl px-3 py-3 text-sm text-[#9ca3af] hover:text-white transition-all"
            >
              <Icon className="w-4 h-4 text-orange-500 shrink-0" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
