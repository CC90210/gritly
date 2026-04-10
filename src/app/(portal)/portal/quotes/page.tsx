"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PortalQuote {
  id: string;
  quoteNumber: string;
  total: number;
  status: string;
  createdAt: string;
  validUntil: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "text-[#6b7280] bg-[#1f1f1f]",
  sent: "text-blue-400 bg-blue-500/10",
  approved: "text-green-400 bg-green-500/10",
  converted: "text-green-400 bg-green-500/10",
  declined: "text-red-400 bg-red-500/10",
  expired: "text-[#6b7280] bg-[#1f1f1f]",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]")}>
      {status}
    </span>
  );
}

export default function PortalQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<PortalQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/quotes")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json() as Promise<PortalQuote[]>;
      })
      .then((d) => { if (d) setQuotes(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function handleAction(id: string, status: "approved" | "declined") {
    setActionId(id);
    try {
      // Use portal-scoped endpoint — the dashboard /api/quotes/:id route requires
      // manager role and would return 403 for client-role portal users.
      const res = await fetch(`/api/portal/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "approved" ? { approvedAt: new Date().toISOString() } : {}),
        }),
      });
      if (res.ok) {
        setQuotes((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status } : q))
        );
      }
    } catch {
      // silent — UI will reflect unchanged state
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">My Quotes</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">{quotes.length} total</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No quotes yet</p>
          <p className="text-sm text-[#6b7280] max-w-xs">
            Quotes from your service provider will appear here once they send them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const canAct = q.status === "sent";
            const isActing = actionId === q.id;
            return (
              <div
                key={q.id}
                className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 hover:border-[#2d3748] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <p className="text-orange-400 font-semibold text-sm">{q.quoteNumber}</p>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums mb-2">
                      ${q.total.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[#6b7280] flex-wrap">
                      <span>Sent {new Date(q.createdAt).toLocaleDateString()}</span>
                      {q.validUntil && (
                        <span>Valid until {new Date(q.validUntil).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {canAct && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(q.id, "declined")}
                        disabled={isActing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Decline</span>
                      </button>
                      <button
                        onClick={() => handleAction(q.id, "approved")}
                        disabled={isActing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        {isActing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Approve</span>
                      </button>
                    </div>
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
