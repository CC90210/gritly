"use client";

import { useEffect, useState } from "react";
import { useOrgStore } from "@/lib/store/org";
import { UserCog, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  hourlyRate: number | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
}

const TEAM_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7",
  "#ef4444", "#eab308", "#14b8a6", "#ec4899",
];

export default function TeamPage() {
  const { industryConfig } = useOrgStore();
  const workerLabel = industryConfig?.terminology.workerPlural ?? "Team Members";
  const workerSingular = industryConfig?.terminology.worker ?? "Team Member";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, dismiss, success: toastSuccess } = useToast();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "technician",
    hourlyRate: "",
    color: TEAM_COLORS[0],
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    loadTeam();
  }, []);

  function loadTeam() {
    setLoading(true);
    setFetchError(false);
    fetch("/api/team")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => { if (d) setMembers(Array.isArray(d) ? d : []); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }

  async function handleAdd() {
    if (!form.firstName || !form.lastName || !form.email) {
      setError("First name, last name, and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
          color: form.color,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to add member.");
        return;
      }
      const created = await res.json() as TeamMember;
      setMembers((prev) => [created, ...prev]);
      setShowModal(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", role: "technician", hourlyRate: "", color: TEAM_COLORS[0] });
      toastSuccess(`${workerSingular} added`);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Add member modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Add {workerSingular}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#6b7280] hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">First Name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setField("role", e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="technician">Technician</option>
                    <option value="manager">Manager</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Hourly Rate ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={form.hourlyRate}
                    onChange={(e) => setField("hourlyRate", e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-2">Calendar Color</label>
                <div className="flex gap-2 flex-wrap">
                  {TEAM_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setField("color", color)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-all",
                        form.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#111111]" : ""
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleAdd}
                disabled={saving}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  saving ? "bg-orange-500/50 text-white/60" : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add {workerSingular}
              </button>
              <button
                onClick={() => setShowModal(false)}
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
          <h1 className="text-xl font-semibold text-white">{workerLabel}</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{members.length} active</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {workerSingular}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-[#9ca3af]">Failed to load data. Please try again.</p>
          <button onClick={loadTeam} className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <UserCog className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No {workerLabel.toLowerCase()} yet</p>
          <p className="text-sm text-[#6b7280] mb-6">Add your first {workerSingular.toLowerCase()} to assign jobs.</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add {workerSingular}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 hover:border-[#2d3748] transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                  style={{ backgroundColor: member.color ?? "#f97316" }}
                >
                  {member.firstName[0]?.toUpperCase()}{member.lastName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-[#6b7280] capitalize">{member.role}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-[#6b7280]">
                <p className="truncate">{member.email}</p>
                {member.phone && <p>{member.phone}</p>}
                {member.hourlyRate !== null && (
                  <p className="text-orange-400">${member.hourlyRate.toFixed(2)}/hr</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
