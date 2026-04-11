"use client";

import { useEffect, useState } from "react";
import { Archive, Plus, X, Pencil, Trash2, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  minQuantity: number;
  unitCost: number | null;
  location: string | null;
  category: string | null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toasts, dismiss, success: toastSuccess } = useToast();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    quantity: "0",
    minQuantity: "0",
    unitCost: "",
    location: "",
    category: "",
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAdd() {
    setEditItem(null);
    setForm({ name: "", sku: "", quantity: "0", minQuantity: "0", unitCost: "", location: "", category: "" });
    setError(null);
    setShowModal(true);
  }

  function openEdit(item: InventoryItem) {
    setEditItem(item);
    setForm({
      name: item.name,
      sku: item.sku ?? "",
      quantity: String(item.quantity),
      minQuantity: String(item.minQuantity),
      unitCost: item.unitCost !== null ? String(item.unitCost) : "",
      location: item.location ?? "",
      category: item.category ?? "",
    });
    setError(null);
    setShowModal(true);
  }

  useEffect(() => {
    loadItems();
  }, []);

  function loadItems() {
    setLoading(true);
    setFetchError(false);
    fetch("/api/inventory")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => { if (d) setItems(Array.isArray(d) ? d : []); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }

  const categories = ["all", ...Array.from(new Set(items.map((i) => i.category ?? "Uncategorized")))];
  const filtered = activeCategory === "all"
    ? items
    : items.filter((i) => (i.category ?? "Uncategorized") === activeCategory);

  const lowStockCount = items.filter((i) => i.quantity < i.minQuantity).length;

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      quantity: parseInt(form.quantity) || 0,
      minQuantity: parseInt(form.minQuantity) || 0,
      unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
      location: form.location.trim() || undefined,
      category: form.category.trim() || undefined,
    };

    try {
      if (editItem) {
        const res = await fetch("/api/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editItem.id, ...payload }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError((d as { error?: string }).error ?? "Failed."); return; }
        const updated = await res.json() as InventoryItem;
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        toastSuccess("Item updated");
      } else {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError((d as { error?: string }).error ?? "Failed."); return; }
        const created = await res.json() as InventoryItem;
        setItems((prev) => [created, ...prev]);
        toastSuccess("Item added");
      }
      setShowModal(false);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this inventory item? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        toastSuccess("Item deleted");
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass = "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 transition-colors";
  const labelClass = "block text-xs font-medium text-[#9ca3af] mb-1.5";

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editItem ? "Edit Item" : "Add Item"}</h3>
              <button onClick={() => setShowModal(false)} aria-label="Close" className="text-[#6b7280] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Item Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Refrigerant R-410A"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setField("sku", e.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    placeholder="e.g. Refrigerants"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setField("quantity", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Min Qty (reorder point)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minQuantity}
                    onChange={(e) => setField("minQuantity", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Unit Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitCost}
                    onChange={(e) => setField("unitCost", e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setField("location", e.target.value)}
                    placeholder="e.g. Truck 1, Shelf B"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  saving ? "bg-orange-500/50 text-white/60" : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editItem ? "Save Changes" : "Add Item"}
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
          <h1 className="text-xl font-semibold text-white">Inventory</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && !fetchError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">
            {lowStockCount} item{lowStockCount > 1 ? "s are" : " is"} below minimum quantity — reorder required.
          </p>
        </div>
      )}

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                activeCategory === cat
                  ? "bg-orange-500 text-white"
                  : "bg-[#111111] border border-[#1f1f1f] text-[#6b7280] hover:text-white"
              )}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-[#9ca3af]">Failed to load data. Please try again.</p>
          <button onClick={loadItems} className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Archive className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No items yet</p>
          <p className="text-sm text-[#6b7280] mb-6 max-w-xs">
            Track parts, materials, and supplies. Get alerts when stock runs low.
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Item Name</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">SKU</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Qty</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Min</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Unit Cost</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Category</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isLow = item.quantity < item.minQuantity;
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b border-[#1f1f1f]/50 last:border-0 transition-colors",
                        isLow ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-[#1a1a1a]"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                          <span className={cn("font-medium", isLow ? "text-red-300" : "text-white")}>{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6b7280] text-xs hidden sm:table-cell">
                        {item.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-semibold tabular-nums", isLow ? "text-red-400" : "text-white")}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6b7280] tabular-nums hidden sm:table-cell">
                        {item.minQuantity}
                      </td>
                      <td className="px-4 py-3 text-[#d1d5db] tabular-nums hidden md:table-cell">
                        {item.unitCost !== null ? `$${item.unitCost.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6b7280] text-xs hidden lg:table-cell">
                        {item.location ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {item.category && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-[#1f1f1f] text-[#9ca3af]">
                            {item.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => openEdit(item)}
                            aria-label={`Edit ${item.name}`}
                            className="p-1.5 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#2a2a2a] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            aria-label={`Delete ${item.name}`}
                            className="p-1.5 rounded-lg text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
