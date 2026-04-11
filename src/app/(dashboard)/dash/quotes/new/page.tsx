"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOrgStore } from "@/lib/store/org";
import { ArrowLeft, Plus, Trash2, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
}

const DEFAULT_TAX = 13;

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { industryConfig } = useOrgStore();
  const quoteLabel = industryConfig?.terminology.quote ?? "Quote";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client selector
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const clientAbortRef = useRef<AbortController | null>(null);

  // Form state
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  // Pre-fill client from query param
  useEffect(() => {
    const preClientId = searchParams.get("clientId");
    if (!preClientId) return;
    fetch(`/api/clients/${preClientId}`)
      .then((r) => r.json())
      .then((d: ClientOption) => setSelectedClient(d))
      .catch(() => {});
  }, [searchParams]);

  // Debounced client search with AbortController to prevent stale results
  useEffect(() => {
    if (clientSearch.length < 2) { setClientOptions([]); return; }
    const t = setTimeout(() => {
      clientAbortRef.current?.abort();
      clientAbortRef.current = new AbortController();
      setClientLoading(true);
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`, { signal: clientAbortRef.current.signal })
        .then((r) => r.json())
        .then((d) => setClientOptions(Array.isArray(d) ? d.slice(0, 8) : []))
        .catch((e) => { if (e.name !== "AbortError") setClientOptions([]); })
        .finally(() => setClientLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleSelectClient = useCallback((c: ClientOption) => {
    setSelectedClient(c);
    setClientSearch("");
    setClientOptions([]);
    setShowClientDropdown(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) { setError("Please select a client."); return; }
    if (items.every((item) => !item.description)) { setError("Add at least one line item."); return; }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          taxRate,
          notes: notes || undefined,
          validUntil: validUntil || undefined,
          items: items
            .filter((item) => item.description)
            .map((item, idx) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              sortOrder: idx,
            })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to create quote.");
        return;
      }

      const created = await res.json() as { id: string };
      router.push(`/dash/quotes/${created.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dash/quotes" aria-label="Back to quotes" className="text-[#6b7280] hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">New {quoteLabel}</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Build a {quoteLabel.toLowerCase()} for a client.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Client selector */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Client</h2>
          {selectedClient ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">
                  {selectedClient.firstName} {selectedClient.lastName}
                </p>
                {selectedClient.company && (
                  <p className="text-xs text-[#6b7280]">{selectedClient.company}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="text-[#6b7280] hover:text-white text-xs transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                />
                {clientLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
                )}
              </div>
              {showClientDropdown && clientOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-xl z-20 overflow-hidden">
                  {clientOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#1f1f1f] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                        <span className="text-orange-400 text-xs font-semibold">
                          {c.firstName[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-white">{c.firstName} {c.lastName}</p>
                        {c.company && <p className="text-xs text-[#6b7280]">{c.company}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Line Items</h2>
          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[#6b7280]">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-3">Unit Price</div>
              <div className="col-span-1" />
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <input
                    type="text"
                    placeholder="Service description"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-2.5 py-2 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4b5563] text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg pl-6 pr-2 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-[#4b5563] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add line item
          </button>

          {/* Totals */}
          <div className="mt-5 border-t border-[#1f1f1f] pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Subtotal</span>
              <span className="text-[#d1d5db]">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[#6b7280]">Tax</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-2 py-0.5 text-xs text-white text-center focus:outline-none focus:border-orange-500"
                />
                <span className="text-[#6b7280]">%</span>
              </div>
              <span className="text-[#d1d5db]">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-[#1f1f1f] pt-2">
              <span className="text-white">Total</span>
              <span className="text-orange-400">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Options</h2>
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Valid Until</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Notes (shown on quote)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, scope details..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 px-1">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              saving
                ? "bg-orange-500/50 text-white/60 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            )}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Creating..." : `Create ${quoteLabel}`}
          </button>
          <Link
            href="/dash/quotes"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#9ca3af] hover:text-white bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
