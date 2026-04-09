"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, Plus, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  clientId: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
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
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {status}
    </span>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Invoices</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{invoices.length} total</p>
        </div>
        <Link
          href="/dash/invoices/new"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">
            {overdueCount} overdue invoice{overdueCount > 1 ? "s" : ""} — follow up required.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Receipt className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No invoices yet</p>
          <p className="text-sm text-[#6b7280] mb-6">Create your first invoice to start getting paid.</p>
          <Link
            href="/dash/invoices/new"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Link>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Invoice #</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Total</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Paid</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={cn(
                      "border-b border-[#1f1f1f]/50 hover:bg-[#1a1a1a] cursor-pointer transition-colors last:border-0",
                      inv.status === "overdue" && "bg-red-500/5"
                    )}
                    onClick={() => window.location.href = `/dash/invoices/${inv.id}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs hidden sm:table-cell">
                      {inv.clientId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-[#d1d5db]">${inv.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-green-400 hidden md:table-cell">
                      ${inv.amountPaid.toFixed(2)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs hidden lg:table-cell">
                      {inv.dueDate ? (
                        <span className={inv.status === "overdue" ? "text-red-400" : ""}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      ) : "—"}
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
