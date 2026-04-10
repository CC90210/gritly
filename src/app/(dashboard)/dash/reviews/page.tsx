"use client";

import { useEffect, useState } from "react";
import { Star, Plus, Loader2, X, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ReviewRequest {
  id: string;
  clientId: string;
  jobId: string | null;
  sentVia: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-500/10",
  sent: "text-blue-400 bg-blue-500/10",
  clicked: "text-orange-400 bg-orange-500/10",
  reviewed: "text-green-400 bg-green-500/10",
};

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  other: "Other",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {status}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientMap, setClientMap] = useState<Map<string, string>>(new Map());

  // Client selector
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [platform, setPlatform] = useState("google");

  useEffect(() => {
    loadReviews();
    // Pre-fetch all clients for the name lookup map
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        const map = new Map<string, string>();
        (Array.isArray(d) ? d : []).forEach((c: ClientOption) =>
          map.set(c.id, `${c.firstName} ${c.lastName}`)
        );
        setClientMap(map);
      })
      .catch(() => {});
  }, []);

  function loadReviews() {
    setLoading(true);
    setFetchError(false);
    fetch("/api/reviews")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => { if (d) setReviews(Array.isArray(d) ? d : []); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (clientSearch.length < 2) { setClientOptions([]); return; }
    const t = setTimeout(() => {
      setClientLoading(true);
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`)
        .then((r) => r.json())
        .then((d) => setClientOptions(Array.isArray(d) ? d.slice(0, 6) : []))
        .catch(() => {})
        .finally(() => setClientLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  async function handleSend() {
    if (!selectedClient) { setError("Please select a client."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          sentVia: platform,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to send request.");
        return;
      }
      const created = await res.json() as ReviewRequest;
      setReviews((prev) => [created, ...prev]);
      // Update client map with the new client if needed
      setClientMap((prev) => {
        const next = new Map(prev);
        next.set(selectedClient.id, `${selectedClient.firstName} ${selectedClient.lastName}`);
        return next;
      });
      setShowModal(false);
      setSelectedClient(null);
      setClientSearch("");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Send Review Request</h3>
              <button onClick={() => setShowModal(false)} className="text-[#6b7280] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Client</label>
                {selectedClient ? (
                  <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5">
                    <span className="text-sm text-white">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </span>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="text-[#6b7280] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                    />
                    {clientLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
                    )}
                    {clientOptions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#111111] border border-[#1f1f1f] rounded-xl z-10 overflow-hidden shadow-xl">
                        {clientOptions.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedClient(c); setClientSearch(""); setClientOptions([]); }}
                            className="w-full px-3 py-2.5 text-left text-sm text-white hover:bg-[#1f1f1f] transition-colors"
                          >
                            {c.firstName} {c.lastName}
                            {c.company && <span className="text-[#6b7280] ml-1">· {c.company}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Platform</label>
                <div className="flex gap-2">
                  {["google", "facebook", "other"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                        platform === p
                          ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                          : "bg-[#0a0a0a] border-[#1f1f1f] text-[#9ca3af] hover:border-[#374151]"
                      )}
                    >
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSend}
                disabled={saving}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  saving ? "bg-orange-500/50 text-white/60" : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Request
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
          <h1 className="text-xl font-semibold text-white">Reviews</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{reviews.length} requests sent</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Send Request
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
          <button onClick={loadReviews} className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Star className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No review requests yet</p>
          <p className="text-sm text-[#6b7280] mb-6">
            Send review requests to clients after completing jobs.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Send Request
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Platform</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Sent</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-[#1f1f1f]/50 last:border-0">
                    <td className="px-4 py-3 text-[#9ca3af] text-xs">
                      {clientMap.get(r.clientId) ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="px-2 py-0.5 bg-[#1f1f1f] rounded-full text-xs text-[#9ca3af]">
                        {PLATFORM_LABELS[r.sentVia] ?? r.sentVia}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs hidden md:table-cell">
                      {r.sentAt ? new Date(r.sentAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs hidden lg:table-cell">
                      {new Date(r.createdAt).toLocaleDateString()}
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
