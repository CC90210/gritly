"use client";

import { useState } from "react";
import { useOrgStore } from "@/lib/store/org";
import { Settings, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type SettingsTab = "company" | "billing" | "integrations";

export default function SettingsPage() {
  const { org } = useOrgStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const settings = org?.settings;

  const [form, setForm] = useState({
    businessName: org?.name ?? "",
    phone: settings?.phone ?? "",
    address: settings?.address ?? "",
    city: settings?.city ?? "",
    state: settings?.state ?? "",
    zip: settings?.zip ?? "",
    taxRate: String(settings?.taxRate ?? 13),
    taxName: settings?.taxName ?? "HST",
    website: settings?.website ?? "",
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    // Settings save would go to a /api/me/org or /api/settings endpoint
    // For now, simulate success after a short delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const TABS: { key: SettingsTab; label: string }[] = [
    { key: "company", label: "Company" },
    { key: "billing", label: "Billing" },
    { key: "integrations", label: "Integrations" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">Manage your account and preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#111111] border border-[#1f1f1f] rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-orange-500 text-white"
                : "text-[#6b7280] hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "company" && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">Company Information</h2>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Business Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setField("businessName", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setField("website", e.target.value)}
              placeholder="https://yourcompany.com"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Street Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="123 Main St"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Province/State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Postal Code</label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setField("zip", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="border-t border-[#1f1f1f] pt-5">
            <h3 className="text-sm font-semibold text-white mb-4">Tax Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Tax Name</label>
                <input
                  type="text"
                  value={form.taxName}
                  onChange={(e) => setField("taxName", e.target.value)}
                  placeholder="HST, GST, VAT..."
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.taxRate}
                  onChange={(e) => setField("taxRate", e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                saved
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : saving
                  ? "bg-orange-500/50 text-white/60 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              )}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saved && <Check className="w-4 h-4" />}
              {saved ? "Saved" : saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Billing & Plan</h2>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <Settings className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-white font-medium capitalize">{org?.plan ?? "starter"} Plan</p>
              <p className="text-xs text-[#6b7280]">Manage your subscription</p>
            </div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
            <p className="text-sm text-[#6b7280]">
              Billing management is handled through your Stripe customer portal. Contact support to upgrade or modify your plan.
            </p>
          </div>
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white mb-4">Integrations</h2>

          {[
            { name: "Stripe Payments", description: "Accept card payments on invoices", status: "available" },
            { name: "Google Business", description: "Sync reviews and local profile", status: "coming_soon" },
            { name: "QuickBooks", description: "Sync invoices and expenses", status: "coming_soon" },
            { name: "Mailchimp", description: "Email marketing for clients", status: "coming_soon" },
          ].map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between py-3 border-b border-[#1f1f1f] last:border-0"
            >
              <div>
                <p className="text-sm text-white font-medium">{integration.name}</p>
                <p className="text-xs text-[#6b7280]">{integration.description}</p>
              </div>
              {integration.status === "available" ? (
                <button className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium transition-colors">
                  Connect
                </button>
              ) : (
                <span className="px-3 py-1 rounded-full bg-[#1f1f1f] text-[#4b5563] text-xs">
                  Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
