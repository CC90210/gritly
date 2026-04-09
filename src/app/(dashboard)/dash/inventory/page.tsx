"use client";

import { Archive, Plus } from "lucide-react";

export default function InventoryPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventory</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Track parts, materials, and equipment.</p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 bg-[#1f1f1f] text-[#4b5563] font-semibold rounded-xl px-4 py-2 text-sm cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5">
          <Archive className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Inventory tracking coming soon</h2>
        <p className="text-sm text-[#6b7280] max-w-sm mb-8">
          Track stock levels, auto-deduct materials from jobs, and get reorder alerts when supplies run low.
        </p>

        {/* Placeholder table skeleton */}
        <div className="w-full max-w-lg bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-[#1f1f1f]">
            {["Item", "SKU", "Stock", "Value"].map((h) => (
              <div key={h} className="text-xs font-medium text-[#4b5563]">{h}</div>
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-[#1f1f1f]/40 last:border-0">
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="h-3 rounded bg-[#1f1f1f] animate-pulse"
                  style={{ width: `${60 + (j * 10) % 30}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
