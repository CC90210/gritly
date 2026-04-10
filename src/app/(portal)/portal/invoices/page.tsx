"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Loader2, AlertCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
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
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]")}>
      {status}
    </span>
  );
}

export default function PortalInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/invoices")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json() as Promise<PortalInvoice[]>;
      })
      .then((d) => { if (d) setInvoices(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;
  const totalOwed = invoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "void" && inv.status !== "draft")
    .reduce((sum, inv) => sum + (inv.balanceDue ?? 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">My Invoices</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">{invoices.length} total</p>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">
            {overdueCount} overdue invoice{overdueCount > 1 ? "s" : ""} — please contact us to arrange payment.
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
          <p className="text-sm text-[#6b7280] max-w-xs">
            Invoices will appear here after your service is completed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const isOverdue = inv.status === "overdue";
            const isPaid = inv.status === "paid";
            const needsPayment = !isPaid && inv.status !== "void" && inv.status !== "draft" && (inv.balanceDue ?? 0) > 0;

            return (
              <div
                key={inv.id}
                className={cn(
                  "bg-[#111111] border rounded-2xl p-5 transition-colors",
                  isOverdue ? "border-red-500/30" : "border-[#1f1f1f] hover:border-[#2d3748]"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <p className="text-orange-400 font-semibold text-sm">{inv.invoiceNumber}</p>
                      <StatusBadge status={inv.status} />
                    </div>

                    {/* Money details */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] text-[#4b5563] uppercase tracking-wide mb-0.5">Total</p>
                        <p className="text-white font-semibold tabular-nums">${inv.total.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#4b5563] uppercase tracking-wide mb-0.5">Paid</p>
                        <p className="text-green-400 font-semibold tabular-nums">${(inv.amountPaid ?? 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#4b5563] uppercase tracking-wide mb-0.5">Balance</p>
                        <p className={cn("font-semibold tabular-nums", inv.balanceDue > 0 ? "text-red-400" : "text-green-400")}>
                          ${(inv.balanceDue ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#6b7280] flex-wrap">
                      <span>Issued {new Date(inv.createdAt).toLocaleDateString()}</span>
                      {inv.dueDate && (
                        <span className={isOverdue ? "text-red-400" : ""}>
                          Due {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {needsPayment && (
                  <div className="mt-4 pt-4 border-t border-[#1f1f1f] flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                      <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>Contact us to arrange payment</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Total summary */}
          {totalOwed > 0 && (
            <div className="bg-[#111111] border border-orange-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#9ca3af]">Total outstanding</p>
                <p className="text-lg font-bold text-orange-400 tabular-nums">${totalOwed.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
