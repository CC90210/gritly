"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase, FileText, Receipt, Inbox, ArrowRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PortalStats {
  activeJobs: number;
  pendingQuotes: number;
  outstandingInvoices: number;
}

interface PortalData {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  orgName: string;
  stats: PortalStats;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 hover:border-[#2d3748] transition-colors block"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wide">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg bg-[#0a0a0a] flex items-center justify-center", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
    </Link>
  );
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        if (!r.ok) throw new Error("Failed");
        return r.json() as Promise<PortalData>;
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
          <Briefcase className="w-6 h-6 text-orange-500" />
        </div>
        <p className="text-white font-medium mb-1">Welcome to your portal</p>
        <p className="text-sm text-[#6b7280] mb-6 max-w-sm">
          Your account is being set up. Contact us if you have any questions.
        </p>
      </div>
    );
  }

  const { client, orgName, stats } = data;
  const name = `${client.firstName} ${client.lastName}`.trim();

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">
          Welcome back, {client.firstName}.
        </h1>
        <p className="text-sm text-[#6b7280] mt-0.5">
          Your account with {orgName}
        </p>
      </div>

      {/* Stats */}
      {(stats.activeJobs > 0 || stats.pendingQuotes > 0 || stats.outstandingInvoices > 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <StatCard
            label="Active Jobs"
            value={stats.activeJobs}
            icon={Briefcase}
            color="text-orange-400"
            href="/portal/jobs"
          />
          <StatCard
            label="Pending Quotes"
            value={stats.pendingQuotes}
            icon={FileText}
            color="text-blue-400"
            href="/portal/quotes"
          />
          <StatCard
            label="Outstanding Invoices"
            value={stats.outstandingInvoices}
            icon={Receipt}
            color={stats.outstandingInvoices > 0 ? "text-red-400" : "text-green-400"}
            href="/portal/invoices"
          />
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-8 text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4 mx-auto">
            <Briefcase className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">You&apos;re all caught up</p>
          <p className="text-sm text-[#6b7280]">No active jobs or pending items right now.</p>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/portal/requests"
            className="flex items-center justify-between bg-[#111111] border border-[#1f1f1f] hover:border-orange-500/40 rounded-2xl px-5 py-4 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Inbox className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Request Service</p>
                <p className="text-xs text-[#6b7280]">Submit a new service request</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#4b5563] group-hover:text-orange-400 transition-colors" />
          </Link>

          <Link
            href="/portal/invoices"
            className="flex items-center justify-between bg-[#111111] border border-[#1f1f1f] hover:border-orange-500/40 rounded-2xl px-5 py-4 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">View Invoices</p>
                <p className="text-xs text-[#6b7280]">Check balances and payment history</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#4b5563] group-hover:text-orange-400 transition-colors" />
          </Link>
        </div>
      </div>

      {/* Client info footer */}
      <div className="mt-8 pt-6 border-t border-[#1f1f1f]">
        <p className="text-xs text-[#4b5563]">
          Logged in as <span className="text-[#6b7280]">{name}</span>
          {client.email ? ` · ${client.email}` : ""}
        </p>
      </div>
    </div>
  );
}
