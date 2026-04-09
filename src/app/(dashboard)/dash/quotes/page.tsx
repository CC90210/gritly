"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrgStore } from "@/lib/store/org";
import { FileText, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface QuoteRow {
  id: string;
  quoteNumber: string;
  clientId: string;
  total: number;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "text-[#6b7280] bg-[#1f1f1f]",
  sent: "text-blue-400 bg-blue-500/10",
  approved: "text-green-400 bg-green-500/10",
  converted: "text-green-400 bg-green-500/10",
  declined: "text-red-400 bg-red-500/10",
  expired: "text-red-400 bg-red-500/10",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {status}
    </span>
  );
}

export default function QuotesPage() {
  const { industryConfig } = useOrgStore();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const quoteLabel = industryConfig?.terminology.quote ?? "Quote";

  useEffect(() => {
    fetch("/api/quotes")
      .then((r) => r.json())
      .then((d) => setQuotes(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">{quoteLabel}s</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{quotes.length} total</p>
        </div>
        <Link
          href="/dash/quotes/new"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New {quoteLabel}
        </Link>
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
          <p className="text-white font-medium mb-1">No {quoteLabel.toLowerCase()}s yet</p>
          <p className="text-sm text-[#6b7280] mb-6">Create your first {quoteLabel.toLowerCase()} to send to a client.</p>
          <Link
            href="/dash/quotes/new"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {quoteLabel}
          </Link>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">{quoteLabel} #</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Total</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-[#1f1f1f]/50 hover:bg-[#1a1a1a] cursor-pointer transition-colors last:border-0"
                    onClick={() => window.location.href = `/dash/quotes/${q.id}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">{q.quoteNumber}</td>
                    <td className="px-4 py-3 text-[#9ca3af] hidden sm:table-cell">
                      <span className="text-xs text-[#6b7280]">{q.clientId.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3 text-[#d1d5db]">${q.total.toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs hidden md:table-cell">
                      {new Date(q.createdAt).toLocaleDateString()}
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
