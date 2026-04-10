"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrgStore } from "@/lib/store/org";
import { ArrowLeft, Loader2, Send, CheckCircle, XCircle, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface QuoteItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
}

interface QuoteDetail {
  id: string;
  quoteNumber: string;
  clientId: string;
  status: string;
  title: string | null;
  message: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  items: QuoteItem[];
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
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", color)}>
      {status}
    </span>
  );
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { industryConfig } = useOrgStore();
  const quoteLabel = industryConfig?.terminology.quote ?? "Quote";

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d: QuoteDetail) => setQuote(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function patchStatus(status: string) {
    setActing(status);
    setSaveError(null);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json() as QuoteDetail;
        setQuote((prev) => prev ? { ...prev, status: updated.status ?? status } : prev);
      } else {
        setSaveError("Failed to save. Please try again.");
      }
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setActing(null);
    }
  }

  async function convertToJob() {
    setActing("convert");
    setSaveError(null);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convertToJob: true }),
      });
      if (res.ok) {
        const data = await res.json() as { jobId?: string };
        if (data.jobId) {
          router.push(`/dash/jobs/${data.jobId}`);
        }
      } else {
        setSaveError("Failed to convert to job. Please try again.");
      }
    } catch {
      setSaveError("Failed to convert to job. Please try again.");
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-20">
        <p className="text-[#6b7280]">{quoteLabel} not found.</p>
        <Link href="/dash/quotes" className="text-orange-500 text-sm mt-2 inline-block">
          Back to {quoteLabel}s
        </Link>
      </div>
    );
  }

  const canSend = quote.status === "draft";
  const canApprove = quote.status === "sent";
  const canDecline = quote.status === "sent" || quote.status === "draft";
  const canConvert = quote.status === "approved";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dash/quotes" className="text-[#6b7280] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-white">{quote.quoteNumber}</h1>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-sm text-[#6b7280] mt-0.5">
            Created {new Date(quote.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400 mb-4">
          {saveError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {canSend && (
          <button
            onClick={() => patchStatus("sent")}
            disabled={acting !== null}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium transition-colors"
          >
            {acting === "sent" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Mark Sent
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => patchStatus("approved")}
            disabled={acting !== null}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-medium transition-colors"
          >
            {acting === "approved" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
        )}
        {canDecline && (
          <button
            onClick={() => patchStatus("declined")}
            disabled={acting !== null}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
          >
            {acting === "declined" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Decline
          </button>
        )}
        {canConvert && (
          <button
            onClick={convertToJob}
            disabled={acting !== null}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            {acting === "convert" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            Convert to {industryConfig?.terminology.job ?? "Job"}
          </button>
        )}
      </div>

      {/* Quote details */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden mb-5">
        {/* Line items */}
        <div className="p-5 border-b border-[#1f1f1f]">
          <h2 className="text-sm font-semibold text-white mb-4">Line Items</h2>
          <div className="space-y-0">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[#6b7280] pb-2 border-b border-[#1f1f1f]/50">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {quote.items.map((item) => {
              const lineTotal = item.quantity * item.unitPrice;
              return (
                <div key={item.id} className="grid grid-cols-12 gap-2 py-2.5 border-b border-[#1f1f1f]/30 last:border-0">
                  <div className="col-span-6">
                    <p className="text-sm text-white">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-[#6b7280] mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-sm text-[#9ca3af]">{item.quantity}</div>
                  <div className="col-span-2 text-right text-sm text-[#9ca3af]">${item.unitPrice.toFixed(2)}</div>
                  <div className="col-span-2 text-right text-sm text-white">${lineTotal.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="p-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7280]">Subtotal</span>
            <span className="text-[#d1d5db]">${quote.subtotal.toFixed(2)}</span>
          </div>
          {quote.discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Discount</span>
              <span className="text-green-400">-${quote.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7280]">Tax ({quote.taxRate}%)</span>
            <span className="text-[#d1d5db]">${quote.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-[#1f1f1f] pt-2">
            <span className="text-white">Total</span>
            <span className="text-orange-400">${quote.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 space-y-3">
        {quote.validUntil && (
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7280]">Valid until</span>
            <span className="text-[#d1d5db]">{new Date(quote.validUntil).toLocaleDateString()}</span>
          </div>
        )}
        {quote.notes && (
          <div>
            <p className="text-xs font-medium text-[#6b7280] mb-1">Notes</p>
            <p className="text-sm text-[#9ca3af] whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
        <div className="flex justify-between text-xs text-[#4b5563] pt-2 border-t border-[#1f1f1f]">
          <Link href={`/dash/clients/${quote.clientId}`} className="text-orange-500 hover:underline">
            View Client
          </Link>
          <span>Created {new Date(quote.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
