"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PortalJob {
  id: string;
  jobNumber: string;
  title: string;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  completedAt: string | null;
  createdAt: string;
}

const STATUS_STEPS = [
  { key: "scheduled", label: "Scheduled" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  unscheduled: "text-[#6b7280] bg-[#1f1f1f]",
  scheduled: "text-blue-400 bg-blue-500/10",
  in_progress: "text-orange-400 bg-orange-500/10",
  completed: "text-green-400 bg-green-500/10",
  on_hold: "text-yellow-400 bg-yellow-500/10",
  cancelled: "text-red-400 bg-red-500/10",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const stepIndex = STATUS_STEPS.findIndex((s) => s.key === status);
  // For non-standard statuses (unscheduled, on_hold, cancelled) don't show timeline
  if (stepIndex === -1 && status !== "unscheduled") return null;
  const activeIndex = stepIndex === -1 ? -1 : stepIndex;

  return (
    <div className="flex items-center gap-1 mt-3">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= activeIndex;
        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  done ? "bg-orange-500" : "bg-[#1f1f1f]"
                )}
              />
              <span className={cn("text-[10px] mt-0.5 hidden sm:block", done ? "text-orange-400" : "text-[#4b5563]")}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={cn("h-px flex-1 mb-2.5", done && i < activeIndex ? "bg-orange-500" : "bg-[#1f1f1f]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PortalJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<PortalJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/jobs")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json() as Promise<PortalJob[]>;
      })
      .then((d) => { if (d) setJobs(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">My Jobs</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">{jobs.length} total</p>
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
          <p className="text-white font-medium mb-1">No jobs yet</p>
          <p className="text-sm text-[#6b7280] max-w-xs">
            Jobs scheduled for you will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 hover:border-[#2d3748] transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <p className="text-orange-400 font-semibold text-sm">{job.jobNumber}</p>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="text-white font-medium">{job.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#6b7280] flex-wrap mt-2">
                {job.scheduledStart && (
                  <span>
                    Scheduled: {new Date(job.scheduledStart).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                {job.completedAt && (
                  <span className="text-green-400">
                    Completed: {new Date(job.completedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <StatusTimeline status={job.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
