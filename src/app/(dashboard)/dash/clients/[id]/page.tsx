"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrgStore } from "@/lib/store/org";
import {
  ArrowLeft, Loader2, Pencil, X, Check,
  FileText, Briefcase, Receipt, Phone, Mail, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ClientDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string | null;
  createdAt: string;
}

interface QuoteRow { id: string; quoteNumber: string; total: number; status: string; createdAt: string }
interface JobRow { id: string; jobNumber: string; title: string; status: string; scheduledStart: string | null }
interface InvoiceRow { id: string; invoiceNumber: string; total: number; status: string; dueDate: string | null }

type Tab = "overview" | "quotes" | "jobs" | "invoices";

const STATUS_COLORS: Record<string, string> = {
  draft: "text-[#6b7280] bg-[#1f1f1f]",
  sent: "text-blue-400 bg-blue-500/10",
  approved: "text-green-400 bg-green-500/10",
  converted: "text-green-400 bg-green-500/10",
  declined: "text-red-400 bg-red-500/10",
  expired: "text-red-400 bg-red-500/10",
  pending: "text-yellow-400 bg-yellow-500/10",
  scheduled: "text-blue-400 bg-blue-500/10",
  in_progress: "text-orange-400 bg-orange-500/10",
  completed: "text-green-400 bg-green-500/10",
  cancelled: "text-red-400 bg-red-500/10",
  on_hold: "text-[#6b7280] bg-[#1f1f1f]",
  paid: "text-green-400 bg-green-500/10",
  overdue: "text-red-400 bg-red-500/10",
  partial: "text-yellow-400 bg-yellow-500/10",
  void: "text-[#6b7280] bg-[#1f1f1f]",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "text-[#6b7280] bg-[#1f1f1f]";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { industryConfig } = useOrgStore();
  const labelSingular = industryConfig?.terminology.client ?? "Client";

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClientDetail>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((d: ClientDetail) => {
        setClient(d);
        setEditForm(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === "overview") return;
    setTabLoading(true);

    const endpoints: Record<string, string> = {
      quotes: `/api/quotes?clientId=${id}`,
      jobs: `/api/jobs?clientId=${id}`,
      invoices: `/api/invoices?clientId=${id}`,
    };

    fetch(endpoints[activeTab])
      .then((r) => r.json())
      .then((d) => {
        if (activeTab === "quotes") setQuotes(Array.isArray(d) ? d : []);
        if (activeTab === "jobs") setJobs(Array.isArray(d) ? d : []);
        if (activeTab === "invoices") setInvoices(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => setTabLoading(false));
  }, [activeTab, id]);

  async function handleSave() {
    if (!client) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone,
          company: editForm.company,
          notes: editForm.notes,
        }),
      });
      if (res.ok) {
        const updated = await res.json() as ClientDetail;
        setClient(updated);
        setEditing(false);
      } else {
        setSaveError("Failed to save. Please try again.");
      }
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-[#6b7280]">{labelSingular} not found.</p>
        <Link href="/dash/clients" className="text-orange-500 text-sm mt-2 inline-block">
          Back to {industryConfig?.terminology.clientPlural ?? "Clients"}
        </Link>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: "Overview", icon: FileText },
    { key: "quotes", label: "Quotes", icon: FileText },
    { key: "jobs", label: industryConfig?.terminology.jobPlural ?? "Jobs", icon: Briefcase },
    { key: "invoices", label: "Invoices", icon: Receipt },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dash/clients" className="text-[#6b7280] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">
            {client.firstName} {client.lastName}
          </h1>
          {client.company && (
            <p className="text-sm text-[#6b7280] mt-0.5">{client.company}</p>
          )}
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] border border-[#1f1f1f] text-[#9ca3af] hover:text-white text-sm transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setEditForm(client); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f1f1f] text-[#9ca3af] hover:text-white text-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#111111] border border-[#1f1f1f] rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
                activeTab === tab.key
                  ? "bg-orange-500 text-white"
                  : "text-[#6b7280] hover:text-white"
              )}
            >
              <Icon className="w-3.5 h-3.5 hidden sm:block" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 space-y-5">
          {saveError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
              {saveError}
            </div>
          )}
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Company</label>
                <input
                  type="text"
                  value={editForm.company ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, company: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Notes</label>
                <textarea
                  value={editForm.notes ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </>
          ) : (
            <>
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#4b5563] shrink-0" />
                  <a href={`mailto:${client.email}`} className="text-sm text-orange-400 hover:underline">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#4b5563] shrink-0" />
                  <a href={`tel:${client.phone}`} className="text-sm text-[#d1d5db] hover:text-white">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-[#4b5563] shrink-0" />
                  <span className="text-sm text-[#d1d5db]">{client.company}</span>
                </div>
              )}
              {client.source && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6b7280]">Source:</span>
                  <span className="px-2 py-0.5 bg-[#1f1f1f] rounded-full text-xs text-[#9ca3af]">
                    {client.source.replace(/_/g, " ")}
                  </span>
                </div>
              )}
              {client.notes && (
                <div className="border-t border-[#1f1f1f] pt-4">
                  <p className="text-xs font-medium text-[#6b7280] mb-1">Notes</p>
                  <p className="text-sm text-[#9ca3af] whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
              <div className="border-t border-[#1f1f1f] pt-4">
                <p className="text-xs text-[#4b5563]">
                  Added {new Date(client.createdAt).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quotes tab */}
      {activeTab === "quotes" && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          {tabLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6b7280] text-sm">No quotes for this client.</p>
              <Link
                href={`/dash/quotes/new?clientId=${id}`}
                className="text-orange-500 text-sm mt-2 inline-block hover:underline"
              >
                Create quote
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f1f]">
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Quote #</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Total</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr
                      key={q.id}
                      className="border-b border-[#1f1f1f]/50 hover:bg-[#1a1a1a] cursor-pointer last:border-0"
                      onClick={() => router.push(`/dash/quotes/${q.id}`)}
                    >
                      <td className="px-4 py-3 text-white font-medium">{q.quoteNumber}</td>
                      <td className="px-4 py-3 text-[#9ca3af]">${q.total.toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                      <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell text-xs">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Jobs tab */}
      {activeTab === "jobs" && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          {tabLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6b7280] text-sm">No {(industryConfig?.terminology.jobPlural ?? "jobs").toLowerCase()} for this client.</p>
              <Link
                href={`/dash/jobs/new?clientId=${id}`}
                className="text-orange-500 text-sm mt-2 inline-block hover:underline"
              >
                Create {industryConfig?.terminology.job.toLowerCase() ?? "job"}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f1f]">
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Job #</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Title</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr
                      key={j.id}
                      className="border-b border-[#1f1f1f]/50 hover:bg-[#1a1a1a] cursor-pointer last:border-0"
                      onClick={() => router.push(`/dash/jobs/${j.id}`)}
                    >
                      <td className="px-4 py-3 text-white font-medium">{j.jobNumber}</td>
                      <td className="px-4 py-3 text-[#9ca3af]">{j.title}</td>
                      <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                      <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell text-xs">
                        {j.scheduledStart ? new Date(j.scheduledStart).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices tab */}
      {activeTab === "invoices" && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          {tabLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6b7280] text-sm">No invoices for this client.</p>
              <Link
                href={`/dash/invoices/new?clientId=${id}`}
                className="text-orange-500 text-sm mt-2 inline-block hover:underline"
              >
                Create invoice
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f1f]">
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Invoice #</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Total</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-[#1f1f1f]/50 hover:bg-[#1a1a1a] cursor-pointer last:border-0"
                      onClick={() => router.push(`/dash/invoices/${inv.id}`)}
                    >
                      <td className="px-4 py-3 text-white font-medium">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-[#9ca3af]">${inv.total.toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell text-xs">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
