"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOrgStore } from "@/lib/store/org";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  color: string | null;
}

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { industryConfig } = useOrgStore();
  const jobLabel = industryConfig?.terminology.job ?? "Job";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client selector
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const clientAbortRef = useRef<AbortController | null>(null);

  // Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    scheduledStart: "",
    scheduledEnd: "",
    notes: "",
  });

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Pre-fill client
  useEffect(() => {
    const preClientId = searchParams.get("clientId");
    if (!preClientId) return;
    fetch(`/api/clients/${preClientId}`)
      .then((r) => r.json())
      .then((d: ClientOption) => setSelectedClient(d))
      .catch(() => {});
  }, [searchParams]);

  // Load team members
  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setTeamMembers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Debounced client search with AbortController to prevent stale results
  useEffect(() => {
    if (clientSearch.length < 2) { setClientOptions([]); return; }
    const t = setTimeout(() => {
      clientAbortRef.current?.abort();
      clientAbortRef.current = new AbortController();
      setClientLoading(true);
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`, { signal: clientAbortRef.current.signal })
        .then((r) => r.json())
        .then((d) => setClientOptions(Array.isArray(d) ? d.slice(0, 8) : []))
        .catch((e) => { if (e.name !== "AbortError") setClientOptions([]); })
        .finally(() => setClientLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  const handleSelectClient = useCallback((c: ClientOption) => {
    setSelectedClient(c);
    setClientSearch("");
    setClientOptions([]);
    setShowClientDropdown(false);
  }, []);

  function toggleAssign(memberId: string) {
    setAssignedTo((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) { setError("Please select a client."); return; }
    if (!form.title) { setError("Job title is required."); return; }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          title: form.title,
          description: form.description || undefined,
          priority: form.priority,
          scheduledStart: form.scheduledStart || undefined,
          scheduledEnd: form.scheduledEnd || undefined,
          assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
          notes: form.notes || undefined,
          status: "unscheduled",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to create job.");
        return;
      }

      const created = await res.json() as { id: string };
      router.push(`/dash/jobs/${created.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dash/jobs" className="text-[#6b7280] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">New {jobLabel}</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Schedule a {jobLabel.toLowerCase()} for a client.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Client selector */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Client</h2>
          {selectedClient ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">
                  {selectedClient.firstName} {selectedClient.lastName}
                </p>
                {selectedClient.company && (
                  <p className="text-xs text-[#6b7280]">{selectedClient.company}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="text-[#6b7280] hover:text-white text-xs transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                />
                {clientLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
                )}
              </div>
              {showClientDropdown && clientOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-xl z-20 overflow-hidden">
                  {clientOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#1f1f1f] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                        <span className="text-orange-400 text-xs font-semibold">
                          {c.firstName[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-white">{c.firstName} {c.lastName}</p>
                        {c.company && <p className="text-xs text-[#6b7280]">{c.company}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Job details */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">{jobLabel} Details</h2>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={`e.g. Annual HVAC Tune-Up`}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Scope of work, client instructions..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Start Date/Time</label>
              <input
                type="datetime-local"
                value={form.scheduledStart}
                onChange={(e) => set("scheduledStart", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">End Date/Time</label>
              <input
                type="datetime-local"
                value={form.scheduledEnd}
                onChange={(e) => set("scheduledEnd", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Team assignment */}
        {teamMembers.length > 0 && (
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">
              Assign {industryConfig?.terminology.workerPlural ?? "Team Members"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((member) => {
                const selected = assignedTo.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAssign(member.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all border",
                      selected
                        ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                        : "bg-[#0a0a0a] border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151]"
                    )}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: member.color ?? "#f97316" }}
                    >
                      {member.firstName[0]}
                    </div>
                    {member.firstName} {member.lastName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Internal Notes</h2>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Notes visible to your team only..."
            rows={2}
            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-400 px-1">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              saving
                ? "bg-orange-500/50 text-white/60 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            )}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Creating..." : `Create ${jobLabel}`}
          </button>
          <Link
            href="/dash/jobs"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#9ca3af] hover:text-white bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
