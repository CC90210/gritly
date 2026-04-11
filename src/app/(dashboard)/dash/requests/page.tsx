"use client";

import { useEffect, useState } from "react";
import { Inbox, Loader2, UserPlus, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";

interface ServiceRequest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  serviceType: string | null;
  preferredDate: string | null;
  message: string | null;
  address: string | null;
  status: string;
  convertedToClientId: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "text-orange-400 bg-orange-500/10",
  reviewing: "text-blue-400 bg-blue-500/10",
  scheduled: "text-green-400 bg-green-500/10",
  declined: "text-red-400 bg-red-500/10",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {status}
    </span>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const { toasts, dismiss, success, error: toastError } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  function loadRequests() {
    setLoading(true);
    setError(false);
    fetch("/api/requests")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => { if (d) setRequests(Array.isArray(d) ? d : []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  async function convertToClient(requestId: string) {
    setConverting(requestId);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convertToClient: true, status: "scheduled" }),
      });
      if (res.ok) {
        const updated = await res.json() as { request: ServiceRequest };
        setRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, ...updated.request } : r)
        );
        success("Request converted to client");
      } else {
        toastError("Failed to convert. Please try again.");
      }
    } catch {
      toastError("Network error. Please try again.");
    } finally {
      setConverting(null);
    }
  }

  const newCount = requests.filter((r) => r.status === "new").length;

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Service Requests</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">
            {requests.length} total
            {newCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-orange-500/15 text-orange-400 text-xs rounded-full">
                {newCount} new
              </span>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-[#9ca3af]">Failed to load data. Please try again.</p>
          <button onClick={loadRequests} className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Inbox className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No requests yet</p>
          <p className="text-sm text-[#6b7280]">
            Service requests from your booking widget will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          {requests.map((req, idx) => (
            <div
              key={req.id}
              className={cn(
                "border-b border-[#1f1f1f]",
                idx === requests.length - 1 && "border-0"
              )}
            >
              {/* Row */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                onClick={() => setExpanded(expanded === req.id ? null : req.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-white font-medium">{req.name}</p>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-[#6b7280] mt-0.5 truncate">
                    {req.serviceType ?? "Service request"} · {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {!req.convertedToClientId && req.status !== "declined" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); void convertToClient(req.id); }}
                    disabled={converting === req.id}
                    aria-label={`Convert ${req.name} to client`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium transition-colors shrink-0 min-h-[44px]"
                  >
                    {converting === req.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <UserPlus className="w-3.5 h-3.5" />
                    }
                    Convert
                  </button>
                )}
                {req.convertedToClientId && (
                  <span className="text-xs text-green-400 shrink-0">Converted</span>
                )}

                {expanded === req.id
                  ? <ChevronUp className="w-4 h-4 text-[#4b5563] shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-[#4b5563] shrink-0" />
                }
              </div>

              {/* Expanded detail */}
              {expanded === req.id && (
                <div className="px-4 pb-4 border-t border-[#1f1f1f]/50 bg-[#0d0d0d]">
                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    {req.email && (
                      <div>
                        <p className="text-xs font-medium text-[#6b7280] mb-1">Email</p>
                        <a href={`mailto:${req.email}`} className="text-sm text-orange-400 hover:underline break-all">
                          {req.email}
                        </a>
                      </div>
                    )}
                    {req.phone && (
                      <div>
                        <p className="text-xs font-medium text-[#6b7280] mb-1">Phone</p>
                        <a href={`tel:${req.phone}`} className="text-sm text-[#d1d5db]">{req.phone}</a>
                      </div>
                    )}
                    {req.address && (
                      <div>
                        <p className="text-xs font-medium text-[#6b7280] mb-1">Address</p>
                        <p className="text-sm text-[#d1d5db]">{req.address}</p>
                      </div>
                    )}
                    {req.preferredDate && (
                      <div>
                        <p className="text-xs font-medium text-[#6b7280] mb-1">Preferred Date</p>
                        <p className="text-sm text-[#d1d5db]">
                          {new Date(req.preferredDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {req.message && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-[#6b7280] mb-1">Message</p>
                      <p className="text-sm text-[#9ca3af] whitespace-pre-wrap">{req.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
