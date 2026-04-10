"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Plus, X, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ServiceRequest {
  id: string;
  serviceType: string;
  description: string;
  status: string;
  preferredDate: string | null;
  preferredTime: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "text-blue-400 bg-blue-500/10",
  in_review: "text-yellow-400 bg-yellow-500/10",
  scheduled: "text-orange-400 bg-orange-500/10",
  completed: "text-green-400 bg-green-500/10",
  cancelled: "text-red-400 bg-red-500/10",
};

const SERVICE_TYPES = [
  "General Maintenance",
  "Repair",
  "Installation",
  "Inspection",
  "Emergency Service",
  "Estimate / Quote",
  "Other",
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function PortalRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    serviceType: "",
    description: "",
    address: "",
    preferredDate: "",
    preferredTime: "",
    notes: "",
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    fetch("/api/portal/requests")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json() as Promise<ServiceRequest[]>;
      })
      .then((d) => { if (d) setRequests(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.serviceType) { setError("Please select a service type."); return; }
    if (!form.description.trim()) { setError("Please describe what you need."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/portal/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: form.serviceType,
          description: form.description,
          address: form.address || undefined,
          preferredDate: form.preferredDate || undefined,
          preferredTime: form.preferredTime || undefined,
          notes: form.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to submit request.");
        return;
      }

      const created = await res.json() as ServiceRequest;
      setRequests((prev) => [created, ...prev]);
      setSuccess(true);
      setShowForm(false);
      setForm({ serviceType: "", description: "", address: "", preferredDate: "", preferredTime: "", notes: "" });
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 transition-colors";
  const labelClass = "block text-xs font-medium text-[#9ca3af] mb-1.5";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Request Service</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{requests.length} previous request{requests.length !== 1 ? "s" : ""}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-5">
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400">Your request has been submitted. We&apos;ll be in touch soon.</p>
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">New Service Request</h2>
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="text-[#6b7280] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Service Type *</label>
              <select
                value={form.serviceType}
                onChange={(e) => setField("serviceType", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a service type...</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Please describe what you need help with..."
                rows={4}
                className={cn(inputClass, "resize-none")}
              />
            </div>

            <div>
              <label className={labelClass}>Service Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Address (if different from your primary)"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Preferred Date</label>
                <input
                  type="date"
                  value={form.preferredDate}
                  onChange={(e) => setField("preferredDate", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Preferred Time</label>
                <select
                  value={form.preferredTime}
                  onChange={(e) => setField("preferredTime", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Any time</option>
                  <option value="morning">Morning (8am – 12pm)</option>
                  <option value="afternoon">Afternoon (12pm – 5pm)</option>
                  <option value="evening">Evening (5pm – 8pm)</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Additional Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Anything else we should know?"
                rows={2}
                className={cn(inputClass, "resize-none")}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-red-400 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  saving ? "bg-orange-500/50 text-white/60" : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#9ca3af] bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Previous requests */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : requests.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Inbox className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No requests yet</p>
          <p className="text-sm text-[#6b7280] mb-6 max-w-xs">
            Submit a service request and we&apos;ll get back to you quickly.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      ) : requests.length > 0 ? (
        <div>
          {!showForm && <h2 className="text-xs font-semibold text-[#4b5563] uppercase tracking-wider mb-3">Previous Requests</h2>}
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-white font-medium">{req.serviceType}</p>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-sm text-[#9ca3af] line-clamp-2 mb-3">{req.description}</p>
                <div className="flex items-center gap-4 text-xs text-[#6b7280] flex-wrap">
                  <span>Submitted {new Date(req.createdAt).toLocaleDateString()}</span>
                  {req.preferredDate && (
                    <span>Preferred: {new Date(req.preferredDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
