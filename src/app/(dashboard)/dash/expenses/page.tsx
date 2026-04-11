"use client";

import { useEffect, useState } from "react";
import { DollarSign, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

interface Expense {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  date: string;
  receiptUrl: string | null;
  createdAt: string;
}

const EXPENSE_CATEGORIES = [
  "Materials", "Fuel", "Tools & Equipment", "Subcontractor",
  "Vehicle", "Office", "Software", "Insurance", "Marketing", "Other",
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, dismiss, success: toastSuccess } = useToast();

  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  function loadExpenses() {
    setLoading(true);
    setFetchError(false);
    fetch("/api/expenses")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => { if (d) setExpenses(Array.isArray(d) ? d : []); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  async function handleAdd() {
    if (!form.description || !form.amount) {
      setError("Description and amount are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          category: form.category || "Other",
          amount: parseFloat(form.amount),
          createdAt: new Date(form.date).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to add expense.");
        return;
      }
      const created = await res.json() as Expense;
      setExpenses((prev) => [created, ...prev]);
      setShowModal(false);
      setForm({ description: "", category: "", amount: "", date: new Date().toISOString().split("T")[0] });
      toastSuccess("Expense added");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Add Expense</h3>
              <button onClick={() => setShowModal(false)} className="text-[#6b7280] hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Description *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="e.g. HVAC parts from supplier"
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">— select category —</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-7 pr-4 py-2 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
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
                Add Expense
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
          <h1 className="text-xl font-semibold text-white">Expenses</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">
            {expenses.length} entries · ${totalExpenses.toFixed(2)} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
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
          <button onClick={loadExpenses} className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No expenses yet</p>
          <p className="text-sm text-[#6b7280] mb-6">Track materials, fuel, and other business costs.</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Description</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3 text-[#6b7280] font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-[#1f1f1f]/50 last:border-0">
                    <td className="px-4 py-3 text-[#6b7280] text-xs whitespace-nowrap">
                      {new Date(expense.date || expense.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-[#d1d5db]">{expense.description}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {expense.category ? (
                        <span className="px-2 py-0.5 bg-[#1f1f1f] rounded-full text-xs text-[#9ca3af]">
                          {expense.category}
                        </span>
                      ) : (
                        <span className="text-[#4b5563]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      ${expense.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#1f1f1f]">
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-[#6b7280]">Total</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-orange-400">
                    ${totalExpenses.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
