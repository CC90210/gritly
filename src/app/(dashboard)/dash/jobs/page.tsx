"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrgStore } from "@/lib/store/org";
import { Briefcase, Plus, Loader2, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface JobRow {
  id: string;
  jobNumber: string;
  title: string;
  status: string;
  scheduledStart: string | null;
  clientId: string;
  createdAt: string;
}

const STATUS_ORDER = ["unscheduled", "scheduled", "in_progress", "completed", "on_hold", "cancelled"];

const STATUS_COLORS: Record<string, { badge: string; column: string }> = {
  unscheduled: { badge: "text-[#6b7280] bg-[#1f1f1f]", column: "border-[#1f1f1f]" },
  scheduled: { badge: "text-blue-400 bg-blue-500/10", column: "border-blue-500/30" },
  in_progress: { badge: "text-orange-400 bg-orange-500/10", column: "border-orange-500/30" },
  completed: { badge: "text-green-400 bg-green-500/10", column: "border-green-500/30" },
  on_hold: { badge: "text-yellow-400 bg-yellow-500/10", column: "border-yellow-500/30" },
  cancelled: { badge: "text-red-400 bg-red-500/10", column: "border-red-500/30" },
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status]?.badge ?? "text-[#6b7280] bg-[#1f1f1f]";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function JobsPage() {
  const { industryConfig } = useOrgStore();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");

  const jobLabel = industryConfig?.terminology.job ?? "Job";
  const jobLabelPlural = industryConfig?.terminology.jobPlural ?? "Jobs";

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byStatus = STATUS_ORDER.reduce<Record<string, JobRow[]>>((acc, status) => {
    acc[status] = jobs.filter((j) => j.status === status);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">{jobLabelPlural}</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{jobs.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[#111111] border border-[#1f1f1f] rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-1.5 rounded transition-colors",
                view === "list" ? "bg-orange-500 text-white" : "text-[#6b7280] hover:text-white"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "p-1.5 rounded transition-colors",
                view === "kanban" ? "bg-orange-500 text-white" : "text-[#6b7280] hover:text-white"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Link
            href="/dash/jobs/new"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {jobLabel}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No {jobLabelPlural.toLowerCase()} yet</p>
          <p className="text-sm text-[#6b7280] mb-6">Create your first {jobLabel.toLowerCase()} to track work.</p>
          <Link
            href="/dash/jobs/new"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {jobLabel}
          </Link>
        </div>
      ) : view === "list" ? (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Job #</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr
                    key={j.id}
                    className="border-b border-[#1f1f1f]/50 hover:bg-[#1a1a1a] cursor-pointer transition-colors last:border-0"
                    onClick={() => window.location.href = `/dash/jobs/${j.id}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">{j.jobNumber}</td>
                    <td className="px-4 py-3 text-[#d1d5db]">{j.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs hidden md:table-cell">
                      {j.scheduledStart ? new Date(j.scheduledStart).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban */
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-x-auto">
          {["unscheduled", "scheduled", "in_progress", "completed"].map((status) => {
            const color = STATUS_COLORS[status]?.column ?? "border-[#1f1f1f]";
            return (
              <div key={status} className={cn("bg-[#111111] border rounded-2xl overflow-hidden flex flex-col", color)}>
                <div className="px-3 py-2.5 border-b border-[#1f1f1f] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">
                    {status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-[#4b5563]">{byStatus[status]?.length ?? 0}</span>
                </div>
                <div className="p-2 space-y-2 flex-1">
                  {(byStatus[status] ?? []).map((j) => (
                    <Link
                      key={j.id}
                      href={`/dash/jobs/${j.id}`}
                      className="block bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3 hover:border-[#374151] transition-colors"
                    >
                      <p className="text-xs font-medium text-orange-500 mb-0.5">{j.jobNumber}</p>
                      <p className="text-sm text-white font-medium leading-snug">{j.title}</p>
                      {j.scheduledStart && (
                        <p className="text-xs text-[#6b7280] mt-1">
                          {new Date(j.scheduledStart).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))}
                  {(byStatus[status] ?? []).length === 0 && (
                    <p className="text-xs text-[#4b5563] text-center py-4">No {jobLabelPlural.toLowerCase()}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
