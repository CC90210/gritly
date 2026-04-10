"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrgStore } from "@/lib/store/org";
import { Users, Plus, Search, Loader2, AlertCircle } from "lucide-react";

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  createdAt: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const { industryConfig } = useOrgStore();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const label = industryConfig?.terminology.clientPlural ?? "Clients";
  const labelSingular = industryConfig?.terminology.client ?? "Client";

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    loadClients();
  }, [query]);

  function loadClients() {
    setLoading(true);
    setError(false);
    const url = query ? `/api/clients?search=${encodeURIComponent(query)}` : "/api/clients";
    fetch(url)
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        if (d) setClients(Array.isArray(d) ? d : (d.clients ?? []));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">{label}</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{clients.length} total</p>
        </div>
        <Link
          href="/dash/clients/new"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {labelSingular}
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
        <input
          type="text"
          placeholder={`Search ${label.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111111] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#4b5563] focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-[#9ca3af]">Failed to load data. Please try again.</p>
          <button
            onClick={loadClients}
            className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-white font-medium mb-1">No {label.toLowerCase()} yet</p>
          <p className="text-sm text-[#6b7280] mb-6">Add your first {labelSingular.toLowerCase()} to get started.</p>
          <Link
            href="/dash/clients/new"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add {labelSingular}
          </Link>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Company</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Source</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#1f1f1f]/50 hover:bg-[#1a1a1a] cursor-pointer transition-colors last:border-0"
                    onClick={() => router.push(`/dash/clients/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">
                        {c.firstName} {c.lastName}
                      </p>
                      {c.company && (
                        <p className="text-xs text-[#6b7280] sm:hidden">{c.company}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af] hidden sm:table-cell">
                      {c.email ?? <span className="text-[#4b5563]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af] hidden md:table-cell">
                      {c.phone ?? <span className="text-[#4b5563]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af] hidden lg:table-cell">
                      {c.company ?? <span className="text-[#4b5563]">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {c.source ? (
                        <span className="px-2 py-0.5 bg-[#1f1f1f] rounded-full text-xs text-[#9ca3af]">
                          {c.source}
                        </span>
                      ) : (
                        <span className="text-[#4b5563]">—</span>
                      )}
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
