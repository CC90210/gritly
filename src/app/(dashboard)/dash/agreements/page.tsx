"use client";

import { useEffect, useState } from "react";
import { FileCheck, Plus, X, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Agreement {
  id: string;
  clientId: string;
  name: string;
  frequency: string;
  price: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

const FREQUENCIES = ["weekly", "bi-weekly", "monthly", "quarterly", "semi-annual", "annual"];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientId: "",
    name: "",
    frequency: "monthly",
    price: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/maintenance-agreements").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([agData, clientData]) => {
        setAgreements(Array.isArray(agData) ? agData : []);
        setClients(Array.isArray(clientData) ? clientData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Upcoming renewals: agreements ending within 30 days
  const upcomingRenewals = agreements.filter((a) => {
    if (!a.endDate || !a.isActive) return false;
    const days = daysUntil(a.endDate);
    return days !== null && days >= 0 && days <= 30;
  });

  async function handleAdd() {
    if (!form.clientId) { setError("Select a client."); return; }
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { setError("Valid price is required."); return; }
    if (!form.startDate) { setError("Start date is required."); return; }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/maintenance-agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          name: form.name.trim(),
          frequency: form.frequency,
          price: parseFloat(form.price),
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to create agreement.");
        return;
      }

      const created = await res.json() as Agreement;
      setAgreements((prev) => [created, ...prev]);
      setShowModal(false);
      setForm({ clientId: "", name: "", frequency: "monthly", price: "", startDate: new Date().toISOString().split("T")[0], endDate: "", notes: "" });
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(agreement: Agreement) {
    setTogglingId(agreement.id);
    try {
      const res = await fetch(`/api/maintenance-agreements/${agreement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !agreement.isActive }),
      });
      if (res.ok) {
        setAgreements((prev) =>
          prev.map((a) => a.id === agreement.id ? { ...a, isActive: !a.isActive } : a)
        );
      }
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  }

  function getClientName(id: string): string {
    const c = clients.find((c) => c.id === id);
    if (!c) return id.slice(0, 8) + "…";
    return `${c.firstName} ${c.lastName}`;
  }

  const inputClass = "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 transition-colors";
  const labelClass = "block text-xs font-medium text-[#9ca3af] mb-1.5";

  return (
    <div>
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowModal(false); setError(null); }} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">New Agreement</h3>
              <button onClick={() => { setShowModal(false); setError(null); }} className="text-[#6b7280] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Client *</label>
                <select value={form.clientId} onChange={(e) => setField("clientId", e.target.value)} className={inputClass}>
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Agreement Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Annual HVAC Maintenance Plan"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Frequency</label>
                  <select value={form.frequency} onChange={(e) => setField("frequency", e.target.value)} className={inputClass}>
                    {FREQUENCIES.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Price ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className={cn(inputClass, "resize-none")}
                />
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
                Create Agreement
              </button>
              <button
                onClick={() => { setShowModal(false); setError(null); }}
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
          <h1 className="text-xl font-semibold text-white">Maintenance Agreements</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{agreements.length} total</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(null); }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Agreement
        </button>
      </div>

      {/* Upcoming renewals banner */}
      {upcomingRenewals.length > 0 && (
        <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-yellow-400 font-medium">
              {upcomingRenewals.length} agreement{upcomingRenewals.length > 1 ? "s" : ""} renewing within 30 days
            </p>
            <p className="text-xs text-yellow-400/70 mt-0.5">
              {upcomingRenewals.map((a) => getClientName(a.clientId)).join(", ")}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : agreements.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <FileCheck className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No agreements yet</p>
          <p className="text-sm text-[#6b7280] mb-6 max-w-xs">
            Create recurring maintenance agreements to lock in predictable revenue.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Agreement
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Frequency</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Price</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Start</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">End</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {agreements.map((a) => {
                  const days = daysUntil(a.endDate);
                  const nearExpiry = days !== null && days >= 0 && days <= 30;
                  return (
                    <tr key={a.id} className="border-b border-[#1f1f1f]/50 last:border-0 hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{getClientName(a.clientId)}</td>
                      <td className="px-4 py-3 text-[#d1d5db]">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 text-[#4b5563] shrink-0" />
                          {a.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell capitalize">{a.frequency}</td>
                      <td className="px-4 py-3 text-orange-400 font-medium tabular-nums">${a.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-[#6b7280] text-xs hidden md:table-cell">
                        {new Date(a.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs hidden md:table-cell">
                        {a.endDate ? (
                          <span className={nearExpiry ? "text-yellow-400" : "text-[#6b7280]"}>
                            {new Date(a.endDate).toLocaleDateString()}
                            {nearExpiry && <span className="ml-1">({days}d)</span>}
                          </span>
                        ) : <span className="text-[#4b5563]">Ongoing</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          a.isActive ? "text-orange-400 bg-orange-500/10" : "text-[#6b7280] bg-[#1f1f1f]"
                        )}>
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(a)}
                          disabled={togglingId === a.id}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
                            a.isActive
                              ? "text-[#6b7280] bg-[#1f1f1f] hover:text-red-400 hover:bg-red-500/10"
                              : "text-[#6b7280] bg-[#1f1f1f] hover:text-green-400 hover:bg-green-500/10"
                          )}
                        >
                          {togglingId === a.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : a.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
