"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import { useOrgStore } from "@/lib/store/org";
import type { Organization } from "@/lib/types/database";
import type { IndustryConfig } from "@/lib/industry/config";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, Calendar, Users, FileText, Receipt,
  Briefcase, Map, Camera, UserCog, Clock, BarChart2,
  Settings, Upload, ChevronDown, LogOut, Menu, X,
  Wrench, Flame, Thermometer, Droplets, Zap, Beaker,
  ShieldCheck, Palette, Archive, Star, RefreshCw, Layers,
  BookOpen, FileCheck,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: keyof IndustryConfig["modules"];
}

const CORE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dash", icon: LayoutDashboard },
  { label: "Schedule", href: "/dash/schedule", icon: Calendar },
];

const SALES_NAV: NavItem[] = [
  { label: "Clients", href: "/dash/clients", icon: Users },
  { label: "Quotes", href: "/dash/quotes", icon: FileText },
  { label: "Invoices", href: "/dash/invoices", icon: Receipt },
];

const OPS_NAV: NavItem[] = [
  { label: "Jobs", href: "/dash/jobs", icon: Briefcase },
  { label: "Map", href: "/dash/map", icon: Map },
  { label: "Photos", href: "/dash/photos", icon: Camera },
];

const TEAM_NAV: NavItem[] = [
  { label: "Team", href: "/dash/team", icon: UserCog },
  { label: "Time Tracking", href: "/dash/time", icon: Clock },
  { label: "Pricebook", href: "/dash/pricebook", icon: BookOpen },
  { label: "Agreements", href: "/dash/agreements", icon: FileCheck },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "Reports", href: "/dash/reports", icon: BarChart2 },
  { label: "Import Data", href: "/dash/import", icon: Upload },
  { label: "Settings", href: "/dash/settings", icon: Settings },
];

// Industry-specific module nav items
const INDUSTRY_MODULE_NAV: Partial<Record<keyof IndustryConfig["modules"], NavItem>> = {
  refrigerantTracking: { label: "Refrigerant Log", href: "/dash/refrigerant", icon: Thermometer, moduleKey: "refrigerantTracking" },
  chemicalTracking: { label: "Chemical Log", href: "/dash/chemicals", icon: Beaker, moduleKey: "chemicalTracking" },
  waterChemistry: { label: "Water Chemistry", href: "/dash/water-chemistry", icon: Droplets, moduleKey: "waterChemistry" },
  permitTracking: { label: "Permits", href: "/dash/permits", icon: ShieldCheck, moduleKey: "permitTracking" },
  panelDocumentation: { label: "Panel Docs", href: "/dash/panels", icon: Zap, moduleKey: "panelDocumentation" },
  colorFinishTracking: { label: "Colors & Finishes", href: "/dash/colors", icon: Palette, moduleKey: "colorFinishTracking" },
  inventoryTracking: { label: "Inventory", href: "/dash/inventory", icon: Archive, moduleKey: "inventoryTracking" },
  maintenanceAgreements: { label: "Service Plans", href: "/dash/service-plans", icon: RefreshCw, moduleKey: "maintenanceAgreements" },
  seasonalContracts: { label: "Seasonal Contracts", href: "/dash/seasonal", icon: Flame, moduleKey: "seasonalContracts" },
  trapMonitoring: { label: "Trap Monitoring", href: "/dash/traps", icon: Layers, moduleKey: "trapMonitoring" },
  aerialMeasurements: { label: "Aerial Measurements", href: "/dash/aerial", icon: Map, moduleKey: "aerialMeasurements" },
  subcontractorMgmt: { label: "Subcontractors", href: "/dash/subcontractors", icon: Wrench, moduleKey: "subcontractorMgmt" },
  reviewAutomation: { label: "Reviews", href: "/dash/reviews", icon: Star, moduleKey: "reviewAutomation" },
};

function NavGroup({
  label,
  items,
  pathname,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      {label && (
        <p className="text-[10px] uppercase tracking-wider text-[#4b5563] font-semibold px-3 mb-1 mt-4">
          {label}
        </p>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/dash"
            ? pathname === "/dash"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all mx-1",
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
    </div>
  );
}

interface DashboardShellProps {
  org: Organization;
  industryConfig: IndustryConfig;
  user: { email: string; firstName: string; lastName: string };
  children: React.ReactNode;
}

export function DashboardShell({
  org,
  industryConfig,
  user,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { setOrg, setIndustryConfig } = useOrgStore();

  // Hydrate the org store synchronously before paint so child components
  // that read from the store don't see null on their first render.
  const hydratedRef = useRef(false);
  if (!hydratedRef.current) {
    setOrg(org);
    setIndustryConfig(industryConfig);
    hydratedRef.current = true;
  }

  // Keep the store in sync if props change (e.g. layout re-renders with new org data)
  useLayoutEffect(() => {
    setOrg(org);
    setIndustryConfig(industryConfig);
  }, [org, industryConfig, setOrg, setIndustryConfig]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  // Build industry-specific nav items from enabled modules
  const industryItems: NavItem[] = Object.entries(INDUSTRY_MODULE_NAV)
    .filter(([moduleKey]) => {
      const key = moduleKey as keyof IndustryConfig["modules"];
      return industryConfig.modules[key]?.enabled === true;
    })
    .map(([, item]) => ({
      ...item,
      label: industryConfig.modules[item.moduleKey!]?.label ?? item.label,
    }));

  // Override terminology for client-facing labels
  const salesNav = SALES_NAV.map((item) => {
    if (item.label === "Clients") {
      return { ...item, label: industryConfig.terminology.clientPlural };
    }
    if (item.label === "Quotes") {
      return { ...item, label: industryConfig.terminology.quote + "s" };
    }
    return item;
  });

  const opsNav = OPS_NAV.filter((item) => {
    if (item.label === "Photos") return industryConfig.modules.jobPhotos.enabled;
    return true;
  });

  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  const displayName =
    user.firstName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.email;

  const Sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1f2937]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">G</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Gritly</p>
            <p className="text-[#4b5563] text-xs mt-0.5 truncate max-w-[140px]">{org.name}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <NavGroup items={CORE_NAV} pathname={pathname} />
        <NavGroup label="Sales" items={salesNav} pathname={pathname} />
        <NavGroup label="Operations" items={opsNav} pathname={pathname} />
        <NavGroup label="Team" items={TEAM_NAV} pathname={pathname} />
        {industryItems.length > 0 && (
          <NavGroup label={industryConfig.name} items={industryItems} pathname={pathname} />
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#1f2937] py-2">
        <NavGroup items={BOTTOM_NAV} pathname={pathname} />

        {/* User */}
        <div className="relative mx-1 mt-1" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1f1f1f] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <span className="text-orange-400 text-xs font-semibold">
                {(user.firstName?.[0] ?? user.email[0] ?? "?").toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-[#d1d5db] truncate flex-1 text-left">
              {displayName}
            </span>
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
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
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

          <div className="flex-1" />

          {/* Org name (desktop) */}
          <span className="hidden sm:block text-sm text-[#6b7280]">{org.name}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
