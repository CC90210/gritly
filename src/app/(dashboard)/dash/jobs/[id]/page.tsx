"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrgStore } from "@/lib/store/org";
import { ArrowLeft, Loader2, Receipt, CheckCircle, Clock, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface JobVisit {
  id: string;
  technicianId: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
}

interface JobDetail {
  id: string;
  jobNumber: string;
  title: string;
  description: string | null;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  assignedTo: string[];
  instructions: string | null;
  internalNotes: string | null;
  clientId: string;
  quoteId: string | null;
  createdAt: string;
  visits: JobVisit[];
}

const STATUS_COLORS: Record<string, string> = {
  unscheduled: "text-[#6b7280] bg-[#1f1f1f]",
  scheduled: "text-blue-400 bg-blue-500/10",
  in_progress: "text-orange-400 bg-orange-500/10",
  completed: "text-green-400 bg-green-500/10",
  on_hold: "text-yellow-400 bg-yellow-500/10",
  cancelled: "text-red-400 bg-red-500/10",
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; icon: React.ComponentType<{ className?: string }> }> = {
  unscheduled: { label: "Schedule", next: "scheduled", icon: Clock },
  scheduled: { label: "Start Job", next: "in_progress", icon: Play },
  in_progress: { label: "Complete", next: "completed", icon: CheckCircle },
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]";
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", color)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { industryConfig } = useOrgStore();
  const jobLabel = industryConfig?.terminology.job ?? "Job";

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((d: JobDetail) => {
        setJob(d);
        setNotes(d.internalNotes ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function advanceStatus() {
    if (!job) return;
    const next = STATUS_TRANSITIONS[job.status];
    if (!next) return;
    setActing(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next.next }),
      });
      if (res.ok) {
        setJob((prev) => prev ? { ...prev, status: next.next } : prev);
      }
    } catch {
      // silent
    } finally {
      setActing(false);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: notes }),
      });
      if (res.ok) {
        setJob((prev) => prev ? { ...prev, internalNotes: notes } : prev);
      }
    } catch {
      // silent
    } finally {
      setSavingNotes(false);
    }
  }

  function createInvoice() {
    if (!job) return;
    router.push(`/dash/invoices/new?clientId=${job.clientId}&jobId=${job.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-[#6b7280]">{jobLabel} not found.</p>
        <Link href="/dash/jobs" className="text-orange-500 text-sm mt-2 inline-block">
          Back to {industryConfig?.terminology.jobPlural ?? "Jobs"}
        </Link>
      </div>
    );
  }

  const transition = STATUS_TRANSITIONS[job.status];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dash/jobs" className="text-[#6b7280] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-white">{job.jobNumber}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-[#6b7280] mt-0.5">{job.title}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {transition && (
          <button
            onClick={() => void advanceStatus()}
            disabled={acting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <transition.icon className="w-4 h-4" />}
            {transition.label}
          </button>
        )}
        {job.status === "completed" && (
          <button
            onClick={createInvoice}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-medium transition-colors"
          >
            <Receipt className="w-4 h-4" />
            Create Invoice
          </button>
        )}
      </div>

      {/* Job info */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 mb-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Details</h2>

        {job.description && (
          <div>
            <p className="text-xs font-medium text-[#6b7280] mb-1">Description</p>
            <p className="text-sm text-[#9ca3af] whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {(job.scheduledStart || job.scheduledEnd) && (
          <div className="grid grid-cols-2 gap-4">
            {job.scheduledStart && (
              <div>
                <p className="text-xs font-medium text-[#6b7280] mb-1">Scheduled Start</p>
                <p className="text-sm text-[#d1d5db]">
                  {new Date(job.scheduledStart).toLocaleString()}
                </p>
              </div>
            )}
            {job.scheduledEnd && (
              <div>
                <p className="text-xs font-medium text-[#6b7280] mb-1">Scheduled End</p>
                <p className="text-sm text-[#d1d5db]">
                  {new Date(job.scheduledEnd).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {job.instructions && (
          <div>
            <p className="text-xs font-medium text-[#6b7280] mb-1">Instructions for Team</p>
            <p className="text-sm text-[#9ca3af] whitespace-pre-wrap">{job.instructions}</p>
          </div>
        )}

        <div className="flex gap-4 text-xs text-[#4b5563] border-t border-[#1f1f1f] pt-3">
          <Link href={`/dash/clients/${job.clientId}`} className="text-orange-500 hover:underline">
            View Client
          </Link>
          {job.quoteId && (
            <Link href={`/dash/quotes/${job.quoteId}`} className="text-orange-500 hover:underline">
              View Quote
            </Link>
          )}
        </div>
      </div>

      {/* Visits */}
      {job.visits.length > 0 && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            Visits ({job.visits.length})
          </h2>
          <div className="space-y-3">
            {job.visits.map((visit) => (
              <div key={visit.id} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3">
                <div className="flex items-center justify-between text-xs text-[#6b7280]">
                  <span>Check-in: {visit.checkInAt ? new Date(visit.checkInAt).toLocaleString() : "—"}</span>
                  <span>Check-out: {visit.checkOutAt ? new Date(visit.checkOutAt).toLocaleString() : "—"}</span>
                </div>
                {visit.notes && (
                  <p className="text-xs text-[#9ca3af] mt-2">{visit.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internal notes */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Internal Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes visible to your team only..."
          rows={4}
          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 resize-none mb-3"
        />
        <button
          onClick={saveNotes}
          disabled={savingNotes || notes === (job.internalNotes ?? "")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            savingNotes || notes === (job.internalNotes ?? "")
              ? "bg-[#1f1f1f] text-[#4b5563] cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          )}
        >
          {savingNotes && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Notes
        </button>
      </div>
    </div>
  );
}
