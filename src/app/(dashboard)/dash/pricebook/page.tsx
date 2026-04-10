"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, X, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: number | null;
  unit: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const UNITS = ["each", "hour", "sqft", "linear ft", "lb", "gallon", "trip charge", "flat rate"];

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  return `$${price.toFixed(2)}`;
}

export default function PricebookPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    defaultPrice: "",
    unit: "each",
    category: "",
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAdd() {
    setEditItem(null);
    setForm({ name: "", description: "", defaultPrice: "", unit: "each", category: "" });
    setError(null);
    setShowModal(true);
  }

  function openEdit(item: ServiceItem) {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      defaultPrice: item.defaultPrice !== null ? String(item.defaultPrice) : "",
      unit: item.unit ?? "each",
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
    fetch("/api/service-items")
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

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      defaultPrice: form.defaultPrice ? parseFloat(form.defaultPrice) : undefined,
      unit: form.unit,
      category: form.category.trim() || undefined,
    };

    try {
      if (editItem) {
        const res = await fetch("/api/service-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editItem.id, ...payload }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError((d as { error?: string }).error ?? "Failed."); return; }
        const updated = await res.json() as ServiceItem;
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const res = await fetch("/api/service-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError((d as { error?: string }).error ?? "Failed."); return; }
        const created = await res.json() as ServiceItem;
        setItems((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service item? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/service-items?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
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
      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editItem ? "Edit Service" : "Add Service"}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#6b7280] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. HVAC Tune-Up"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className={cn(inputClass, "resize-none")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Default Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.defaultPrice}
                    onChange={(e) => setField("defaultPrice", e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <select value={form.unit} onChange={(e) => setField("unit", e.target.value)} className={inputClass}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  placeholder="e.g. HVAC, Plumbing, Labor..."
                  className={inputClass}
                />
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
                {editItem ? "Save Changes" : "Add Service"}
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
          <h1 className="text-xl font-semibold text-white">Pricebook</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{items.length} service{items.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

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
            <BookOpen className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No services yet</p>
          <p className="text-sm text-[#6b7280] mb-6 max-w-xs">
            Add services to your pricebook to quickly populate quotes.
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Price</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Unit</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Category</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-[#1f1f1f]/50 last:border-0 hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{item.name}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs max-w-[200px] hidden md:table-cell">
                      <span className="line-clamp-2">{item.description ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-orange-400 font-medium tabular-nums">
                      {formatPrice(item.defaultPrice)}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs hidden sm:table-cell">
                      {item.unit ?? "each"}
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
                          className="p-1.5 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#2a2a2a] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
