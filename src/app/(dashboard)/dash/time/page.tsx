"use client";

import { useEffect, useState } from "react";
import { useOrgStore } from "@/lib/store/org";
import { Clock, Play, Square, Plus, Loader2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TimeEntryRow {
  id: string;
  teamMemberId: string;
  memberFirstName: string;
  memberLastName: string;
  jobId: string | null;
  jobTitle: string | null;
  jobNumber: string | null;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number | null;
  notes: string | null;
}

interface TeamMemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface JobOption {
  id: string;
  jobNumber: string;
  title: string;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dt: string): string {
  return new Date(dt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TimeTrackingPage() {
  const { industryConfig } = useOrgStore();
  const workerLabel = industryConfig?.terminology.workerPlural ?? "Team Members";

  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [members, setMembers] = useState<TeamMemberOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filterMember, setFilterMember] = useState("");
  const [showClockIn, setShowClockIn] = useState(false);
  const [clockInForm, setClockInForm] = useState({ teamMemberId: "", jobId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [clockingOut, setClockingOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  function loadAll() {
    setLoading(true);
    setFetchError(false);
    Promise.all([
      fetch("/api/time-entries").then((r) => {
        if (r.status === 401) { window.location.href = "/login"; throw new Error("401"); }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
      fetch("/api/team").then((r) => r.json()),
      fetch("/api/jobs").then((r) => r.json()),
    ])
      .then(([entriesData, membersData, jobsData]) => {
        setEntries(Array.isArray(entriesData) ? entriesData : []);
        setMembers(Array.isArray(membersData) ? membersData : []);
        setJobs(Array.isArray(jobsData) ? jobsData : []);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }

  const filtered = filterMember
    ? entries.filter((e) => e.teamMemberId === filterMember)
    : entries;

  // Weekly summary
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEntries = entries.filter((e) => new Date(e.clockIn) >= weekStart);
  const weekMinutes = weekEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  const activeEntries = entries.filter((e) => !e.clockOut);

  async function handleClockIn() {
    if (!clockInForm.teamMemberId) { setError("Select a team member."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamMemberId: clockInForm.teamMemberId,
          jobId: clockInForm.jobId || undefined,
          notes: clockInForm.notes || undefined,
          clockIn: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to clock in.");
        return;
      }
      const updated = await fetch("/api/time-entries").then((r) => r.json());
      setEntries(Array.isArray(updated) ? updated : []);
      setShowClockIn(false);
      setClockInForm({ teamMemberId: "", jobId: "", notes: "" });
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClockOut(id: string) {
    setClockingOut(id);
    try {
      const res = await fetch("/api/time-entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, clockOut: new Date().toISOString() }),
      });
      if (res.ok) {
        const updated = await fetch("/api/time-entries").then((r) => r.json());
        setEntries(Array.isArray(updated) ? updated : []);
      }
    } catch {
      // silently fail — will show stale state, user can retry
    } finally {
      setClockingOut(null);
    }
  }

  const inputClass = "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors";
  const labelClass = "block text-xs font-medium text-[#9ca3af] mb-1.5";

  return (
    <div>
      {/* Clock-in modal */}
      {showClockIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowClockIn(false); setError(null); }} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Play className="w-4 h-4 text-orange-500" />
                Clock In
              </h3>
              <button onClick={() => { setShowClockIn(false); setError(null); }} className="text-[#6b7280] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Team Member *</label>
                <select
                  value={clockInForm.teamMemberId}
                  onChange={(e) => setClockInForm((p) => ({ ...p, teamMemberId: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Job (optional)</label>
                <select
                  value={clockInForm.jobId}
                  onChange={(e) => setClockInForm((p) => ({ ...p, jobId: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">No job selected</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.jobNumber} — {j.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <input
                  type="text"
                  value={clockInForm.notes}
                  onChange={(e) => setClockInForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  className={inputClass}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleClockIn}
                disabled={saving}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  saving ? "bg-orange-500/50 text-white/60" : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Clock In
              </button>
              <button
                onClick={() => { setShowClockIn(false); setError(null); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#9ca3af] bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Time Tracking</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">
            {formatDuration(weekMinutes)} logged this week
          </p>
        </div>
        <button
          onClick={() => setShowClockIn(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Clock In
        </button>
      </div>

      {/* Active clocks */}
      {activeEntries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">Currently Clocked In</h2>
          <div className="space-y-2">
            {activeEntries.map((e) => (
              <div key={e.id} className="bg-orange-500/5 border border-orange-500/20 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{e.memberFirstName} {e.memberLastName}</p>
                  <p className="text-xs text-[#6b7280]">Since {formatTime(e.clockIn)} · {formatDate(e.clockIn)}</p>
                </div>
                <button
                  onClick={() => handleClockOut(e.id)}
                  disabled={clockingOut === e.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 shrink-0"
                >
                  {clockingOut === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                  Clock Out
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          className="bg-[#111111] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
        >
          <option value="">All {workerLabel}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-[#9ca3af]">Failed to load data. Please try again.</p>
          <button onClick={loadAll} className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No time entries yet</p>
          <p className="text-sm text-[#6b7280]">Clock in a team member to start tracking.</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Member</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Job</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Clock In</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Clock Out</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Duration</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-[#1f1f1f]/50 last:border-0 hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3 text-white font-medium">
                      {e.memberFirstName} {e.memberLastName}
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af] hidden sm:table-cell">
                      {e.jobNumber ? (
                        <span className="text-xs">
                          <span className="text-orange-400">{e.jobNumber}</span>
                          {e.jobTitle && <span className="text-[#6b7280] ml-1.5">{e.jobTitle}</span>}
                        </span>
                      ) : <span className="text-[#4b5563]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#d1d5db] text-xs">
                      <div>{formatDate(e.clockIn)}</div>
                      <div className="text-[#6b7280]">{formatTime(e.clockIn)}</div>
                    </td>
                    <td className="px-4 py-3 text-[#d1d5db] text-xs hidden md:table-cell">
                      {e.clockOut ? (
                        <>
                          <div>{formatDate(e.clockOut)}</div>
                          <div className="text-[#6b7280]">{formatTime(e.clockOut)}</div>
                        </>
                      ) : (
                        <span className="text-orange-400 font-medium">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm font-medium", e.clockOut ? "text-white" : "text-orange-400")}>
                        {e.clockOut ? formatDuration(e.durationMinutes) : "Live"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs hidden lg:table-cell max-w-[160px] truncate">
                      {e.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {!e.clockOut && (
                        <button
                          onClick={() => handleClockOut(e.id)}
                          disabled={clockingOut === e.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                        >
                          {clockingOut === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                          Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
