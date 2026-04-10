"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, FileText, Briefcase, Receipt,
  Inbox, LogOut, Menu, X, ChevronDown,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "My Quotes", href: "/portal/quotes", icon: FileText },
  { label: "My Jobs", href: "/portal/jobs", icon: Briefcase },
  { label: "My Invoices", href: "/portal/invoices", icon: Receipt },
  { label: "Request Service", href: "/portal/requests", icon: Inbox },
];

interface PortalShellProps {
  orgName: string;
  user: { email: string; firstName: string; lastName: string };
  clientName: string;
  children: React.ReactNode;
}

export default function PortalShell({ orgName, user, clientName, children }: PortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  const displayName = clientName || user.email;
  const initial = (clientName[0] ?? user.email[0] ?? "?").toUpperCase();

  const NavLinks = (
    <nav className="flex-1 overflow-y-auto py-3 px-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/portal"
            ? pathname === "/portal"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5",
              active
                ? "bg-orange-500/15 text-orange-400 font-medium"
                : "text-[#9ca3af] hover:text-white hover:bg-[#1f1f1f]"
            )}
          >
            <Icon className={cn("w-4 h-4 shrink-0", active ? "text-orange-500" : "")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const Sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1f2937]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">G</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-none">Gritly</p>
            <p className="text-[#4b5563] text-xs mt-0.5 truncate max-w-[140px]">{orgName}</p>
          </div>
        </div>
      </div>

      {NavLinks}

      {/* User */}
      <div className="border-t border-[#1f2937] p-2">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#1f1f1f] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <span className="text-orange-400 text-xs font-semibold">{initial}</span>
            </div>
            <span className="text-sm text-[#d1d5db] truncate flex-1 text-left">{displayName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6b7280] shrink-0" />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-xl py-1 z-50">
              <p className="px-3 py-1.5 text-xs text-[#4b5563] truncate">{user.email}</p>
              <div className="border-t border-[#1f1f1f] mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#9ca3af] hover:text-red-400 hover:bg-red-500/5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-[#0d0d0d] border-r border-[#1f2937] shrink-0">
        {Sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-[#0d0d0d] border-r border-[#1f2937] flex flex-col z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 text-[#6b7280] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {Sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-[#1f2937] flex items-center px-4 gap-3 shrink-0 bg-[#0d0d0d]">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-[#6b7280] hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm text-[#6b7280] lg:hidden font-medium">{orgName}</span>
          <div className="flex-1" />
          <span className="hidden sm:block text-sm text-[#6b7280]">Customer Portal</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
