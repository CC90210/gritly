"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrgStore } from "@/lib/store/org";
import {
  ArrowLeft, Loader2, Pencil, X, Check,
  FileText, Briefcase, Receipt, Phone, Mail, Building2,
  MessageSquare, Mail as MailIcon, PhoneCall, StickyNote, Trash2, Plus,
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
interface CommunicationRow {
  id: string;
  type: string;
  direction: string;
  subject: string | null;
  body: string;
  createdAt: string;
}

type Tab = "overview" | "quotes" | "jobs" | "invoices" | "comms";

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
  const [comms, setComms] = useState<CommunicationRow[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Add note modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteType, setNoteType] = useState("note");
  const [noteSubject, setNoteSubject] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [deletingCommId, setDeletingCommId] = useState<string | null>(null);

  // Cache for tab data — only fetch each tab once per page load
  const tabCache = useRef<Partial<Record<Tab, true>>>({});

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
    // Skip if already fetched
    if (tabCache.current[activeTab]) return;

    setTabLoading(true);
    tabCache.current[activeTab] = true;

    const endpoints: Record<string, string> = {
      quotes: `/api/quotes?clientId=${id}`,
      jobs: `/api/jobs?clientId=${id}`,
      invoices: `/api/invoices?clientId=${id}`,
      comms: `/api/communications?clientId=${id}`,
    };

    fetch(endpoints[activeTab])
      .then((r) => r.json())
      .then((d) => {
        if (activeTab === "quotes") setQuotes(Array.isArray(d) ? d : []);
        if (activeTab === "jobs") setJobs(Array.isArray(d) ? d : []);
        if (activeTab === "invoices") setInvoices(Array.isArray(d) ? d : []);
        if (activeTab === "comms") setComms(Array.isArray(d) ? d : []);
      })
      .catch(() => {
        // Reset cache entry on failure so user can retry by switching tabs
        delete tabCache.current[activeTab];
      })
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

  async function saveNote() {
    if (!noteBody.trim()) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: id,
          type: noteType,
          direction: "outbound",
          subject: noteSubject.trim() || undefined,
          body: noteBody.trim(),
        }),
      });
      if (res.ok) {
        const newComm = await res.json() as CommunicationRow;
        setComms((prev) => [newComm, ...prev]);
        setShowNoteModal(false);
        setNoteBody("");
        setNoteSubject("");
        setNoteType("note");
        // Reset cache so next tab switch re-fetches
        delete tabCache.current["comms"];
      } else {
        const err = await res.json() as { error?: string };
        setNoteError(err.error ?? "Failed to save. Please try again.");
      }
    } catch {
      setNoteError("Failed to save. Please try again.");
    } finally {
      setNoteSaving(false);
    }
  }

  async function deleteComm(commId: string) {
    setDeletingCommId(commId);
    try {
      await fetch(`/api/communications/${commId}`, { method: "DELETE" });
      setComms((prev) => prev.filter((c) => c.id !== commId));
    } catch {
      // Non-fatal: UI stays consistent
    } finally {
      setDeletingCommId(null);
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: "Overview", icon: FileText },
    { key: "quotes", label: "Quotes", icon: FileText },
    { key: "jobs", label: industryConfig?.terminology.jobPlural ?? "Jobs", icon: Briefcase },
    { key: "invoices", label: "Invoices", icon: Receipt },
    { key: "comms", label: "Comms", icon: MessageSquare },
  ];

  const COMM_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    email: MailIcon,
    sms: MessageSquare,
    phone: PhoneCall,
    note: StickyNote,
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Add Note modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNoteModal(false)} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Add Communication</h3>
              <button onClick={() => setShowNoteModal(false)} className="text-[#6b7280] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Type</label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="note">Note</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="phone">Phone Call</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Subject (optional)</label>
                <input
                  type="text"
                  value={noteSubject}
                  onChange={(e) => setNoteSubject(e.target.value)}
                  placeholder="Subject..."
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Notes</label>
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={4}
                  placeholder="What happened..."
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
              {noteError && (
                <p className="text-xs text-red-400">{noteError}</p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={saveNote}
                disabled={noteSaving || !noteBody.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
              >
                {noteSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#9ca3af] bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Communications tab */}
      {activeTab === "comms" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#6b7280]">{comms.length} entries</p>
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </button>
          </div>
          {tabLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : comms.length === 0 ? (
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl text-center py-12">
              <MessageSquare className="w-8 h-8 text-[#4b5563] mx-auto mb-3" />
              <p className="text-[#6b7280] text-sm">No communications logged yet.</p>
              <button
                onClick={() => setShowNoteModal(true)}
                className="text-orange-500 text-sm mt-2 inline-block hover:underline"
              >
                Add the first note
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {comms.map((comm) => {
                const TypeIcon = COMM_TYPE_ICONS[comm.type] ?? StickyNote;
                return (
                  <div
                    key={comm.id}
                    className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-4 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TypeIcon className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">
                          {comm.type}
                        </span>
                        <span className="text-xs text-[#4b5563]">·</span>
                        <span className="text-xs text-[#4b5563] capitalize">{comm.direction}</span>
                        <span className="text-xs text-[#4b5563]">·</span>
                        <span className="text-xs text-[#4b5563]">
                          {new Date(comm.createdAt).toLocaleDateString()} {new Date(comm.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {comm.subject && (
                        <p className="text-sm font-semibold text-white mb-0.5">{comm.subject}</p>
                      )}
                      <p className="text-sm text-[#9ca3af] whitespace-pre-wrap break-words">{comm.body}</p>
                    </div>
                    <button
                      onClick={() => deleteComm(comm.id)}
                      disabled={deletingCommId === comm.id}
                      className="text-[#4b5563] hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      {deletingCommId === comm.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
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
