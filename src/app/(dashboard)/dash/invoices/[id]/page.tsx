"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, DollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface InvoiceItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  notes: string | null;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  clientId: string;
  jobId: string | null;
  status: string;
  title: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  items: InvoiceItem[];
  payments: Payment[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "text-[#6b7280] bg-[#1f1f1f]",
  sent: "text-blue-400 bg-blue-500/10",
  partial: "text-yellow-400 bg-yellow-500/10",
  paid: "text-green-400 bg-green-500/10",
  overdue: "text-red-400 bg-red-500/10",
  void: "text-[#4b5563] bg-[#1f1f1f]",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]";
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", color)}>
      {status}
    </span>
  );
}

const PAYMENT_METHODS = ["card", "ach", "cash", "check", "other"];

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((d: InvoiceDetail) => {
        setInvoice(d);
        setPayAmount(d.balanceDue.toFixed(2));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function markSent() {
    setActing("sent");
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (res.ok) {
        setInvoice((prev) => prev ? { ...prev, status: "sent" } : prev);
      }
    } catch { /* silent */ } finally { setActing(null); }
  }

  async function recordPayment() {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    setPayLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment: {
            amount,
            method: payMethod,
            notes: payNotes || undefined,
          },
        }),
      });
      if (res.ok) {
        const updated = await res.json() as InvoiceDetail;
        setInvoice(updated);
        setShowPayModal(false);
        setPayNotes("");
      }
    } catch { /* silent */ } finally { setPayLoading(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-[#6b7280]">Invoice not found.</p>
        <Link href="/dash/invoices" className="text-orange-500 text-sm mt-2 inline-block">Back to Invoices</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Payment modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Record Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="text-[#6b7280] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-7 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Reference #, cheque number..."
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={recordPayment}
                disabled={payLoading}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  payLoading ? "bg-orange-500/50 text-white/60" : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {payLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Payment
              </button>
              <button
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#9ca3af] bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Link href="/dash/invoices" className="text-[#6b7280] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-white">{invoice.invoiceNumber}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-[#6b7280] mt-0.5">
            Created {new Date(invoice.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {invoice.status === "draft" && (
          <button
            onClick={markSent}
            disabled={acting !== null}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium transition-colors"
          >
            {acting === "sent" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Mark Sent
          </button>
        )}
        {(invoice.status === "sent" || invoice.status === "partial" || invoice.status === "overdue") && (
          <button
            onClick={() => setShowPayModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-medium transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Record Payment
          </button>
        )}
      </div>

      {/* Invoice details */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden mb-5">
        <div className="p-5 border-b border-[#1f1f1f]">
          <h2 className="text-sm font-semibold text-white mb-4">Line Items</h2>
          <div className="space-y-0">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[#6b7280] pb-2 border-b border-[#1f1f1f]/50">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {invoice.items.map((item) => {
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

        <div className="p-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7280]">Subtotal</span>
            <span className="text-[#d1d5db]">${invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Discount</span>
              <span className="text-green-400">-${invoice.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7280]">Tax ({invoice.taxRate}%)</span>
            <span className="text-[#d1d5db]">${invoice.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-[#1f1f1f] pt-2">
            <span className="text-white">Total</span>
            <span className="text-white">${invoice.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7280]">Amount Paid</span>
            <span className="text-green-400">${invoice.amountPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-white">Balance Due</span>
            <span className={invoice.balanceDue > 0 ? "text-orange-400" : "text-green-400"}>
              ${invoice.balanceDue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {invoice.payments.length > 0 && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-white mb-4">Payment History</h2>
          <div className="space-y-2">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#1f1f1f]/40 last:border-0">
                <div>
                  <p className="text-sm text-white">${p.amount.toFixed(2)}</p>
                  <p className="text-xs text-[#6b7280]">
                    {p.method} · {new Date(p.paidAt).toLocaleDateString()}
                    {p.notes && ` · ${p.notes}`}
                  </p>
                </div>
                <span className="text-xs text-green-400">Recorded</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 space-y-3">
        {invoice.dueDate && (
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7280]">Due Date</span>
            <span className={cn("text-[#d1d5db]", invoice.status === "overdue" && "text-red-400")}>
              {new Date(invoice.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}
        {invoice.notes && (
          <div>
            <p className="text-xs font-medium text-[#6b7280] mb-1">Notes</p>
            <p className="text-sm text-[#9ca3af]">{invoice.notes}</p>
          </div>
        )}
        <div className="flex gap-4 text-xs border-t border-[#1f1f1f] pt-3">
          <Link href={`/dash/clients/${invoice.clientId}`} className="text-orange-500 hover:underline">View Client</Link>
          {invoice.jobId && (
            <Link href={`/dash/jobs/${invoice.jobId}`} className="text-orange-500 hover:underline">View Job</Link>
          )}
        </div>
      </div>
    </div>
  );
}
