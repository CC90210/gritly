import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Thermometer,
  Wrench,
  Zap,
  Paintbrush,
  TreePine,
  Home,
  Sparkles,
  Building,
  HardHat,
  Bug,
  Waves,
  Droplets,
  Maximize,
  Hammer,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { INDUSTRIES, type IndustrySlug } from "@/lib/constants/brand";
import { INDUSTRY_CONFIGS } from "@/lib/industry/config";

const ICON_MAP: Record<string, React.ElementType> = {
  Thermometer,
  Wrench,
  Zap,
  Paintbrush,
  TreePine,
  Home,
  Sparkles,
  Building,
  HardHat,
  Bug,
  Waves,
  Droplets,
  Maximize,
  Hammer,
};

// What Gritly replaces for each trade
const REPLACES_MAP: Record<IndustrySlug, string[]> = {
  hvac: ["Jobber", "ServiceTitan", "CompanyCam", "Wintac", "Paper service logs"],
  plumbing: ["Jobber", "Housecall Pro", "CompanyCam", "Google Calendar", "Paper invoices"],
  electrical: ["Jobber", "Housecall Pro", "CompanyCam", "Permit tracking spreadsheets"],
  painting: ["Jobber", "CompanyCam", "Estimate Rocket", "Color tracking spreadsheets"],
  landscaping: ["Jobber", "LawnPro", "Route planning apps", "Chemical tracking logs"],
  roofing: ["JobNimbus", "AccuLynx", "CompanyCam", "Aerial measurement tools"],
  "cleaning-residential": ["Jobber", "ZenMaid", "Housecall Pro", "Recurring billing apps"],
  "cleaning-commercial": ["Jobber", "Aspire", "Shift scheduling tools", "Inspection apps"],
  "general-contracting": ["Jobber", "BuilderTrend", "CompanyCam", "Progress billing tools"],
  "pest-control": ["PestRoutes", "ServSuite", "Route planning apps", "Chemical logs"],
  "pool-service": ["Skimmer", "Jobber", "Water chemistry logs", "Route planning apps"],
  "pressure-washing": ["Jobber", "Housecall Pro", "CompanyCam", "Area calculation tools"],
  "window-cleaning": ["Jobber", "Housecall Pro", "Route planning apps", "Pane counting tools"],
  handyman: ["Jobber", "Housecall Pro", "CompanyCam", "Time tracking apps"],
};

export async function generateStaticParams() {
  return INDUSTRIES.map((industry) => ({ slug: industry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = INDUSTRIES.find((i) => i.slug === slug);
  if (!industry) return { title: "Industry Not Found" };
  return {
    title: `${industry.name} Field Service Software | Gritly`,
    description: industry.tagline,
  };
}

export default async function IndustrySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = INDUSTRIES.find((i) => i.slug === slug);

  if (!industry) notFound();

  const config = INDUSTRY_CONFIGS[industry.slug as IndustrySlug];
  const Icon = ICON_MAP[industry.icon];
  const replaces = REPLACES_MAP[industry.slug as IndustrySlug] ?? [];

  // Get enabled non-base modules
  const specialModules = Object.entries(config.modules)
    .filter(([key, mod]) => {
      const baseKeys = ["crm", "scheduling", "quoting", "invoicing", "payments", "jobPhotos", "customChecklists", "gpsTracking", "jobCosting", "reviewAutomation"];
      return mod.enabled && !baseKeys.includes(key);
    })
    .map(([, mod]) => mod);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24">
      {/* Back */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          href="/industries"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          All Industries
        </Link>
      </div>

      {/* Hero */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              {Icon && <Icon size={28} className="text-orange-400" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-1">
                {industry.name}
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                Gritly for {industry.name}
              </h1>
            </div>
          </div>

          <p className="text-xl text-zinc-400 max-w-3xl leading-relaxed">{industry.tagline}</p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-xl shadow-orange-500/20"
            >
              Start Free Trial
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white border border-white/15 hover:border-white/25 hover:bg-white/5 rounded-xl transition-all duration-150"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Content grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terminology card */}
        <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-8">
          <h2 className="text-lg font-black text-white mb-1">Speaks your language</h2>
          <p className="text-sm text-zinc-500 mb-6">
            The platform uses your trade&apos;s actual terminology — no translating from generic software.
          </p>
          <div className="space-y-3">
            {[
              { label: "Your workers are called", value: config.terminology.workerPlural },
              { label: "Jobs are called", value: config.terminology.jobPlural },
              { label: "Quotes are called", value: `${config.terminology.quote}s` },
              { label: "Clients are called", value: config.terminology.clientPlural },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <span className="text-sm text-zinc-500">{row.label}</span>
                <span className="text-sm font-bold text-orange-400">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What it replaces */}
        <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-8">
          <h2 className="text-lg font-black text-white mb-1">Replaces these tools</h2>
          <p className="text-sm text-zinc-500 mb-6">
            What {industry.name.toLowerCase()} businesses typically replace when they switch to Gritly.
          </p>
          <ul className="space-y-3">
            {replaces.map((tool) => (
              <li key={tool} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-400 text-xs font-bold">✕</span>
                </div>
                <span className="text-sm text-zinc-400">{tool}</span>
              </li>
            ))}
            <li className="flex items-center gap-3 pt-2 mt-2 border-t border-white/5">
              <div className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Check size={11} className="text-orange-400" />
              </div>
              <span className="text-sm font-semibold text-orange-400">Gritly replaces all of them</span>
            </li>
          </ul>
        </div>

        {/* Core modules (always on) */}
        <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-8">
          <h2 className="text-lg font-black text-white mb-1">Always included</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Core modules every {industry.name.toLowerCase()} business gets out of the box.
          </p>
          <ul className="space-y-2.5">
            {[
              config.modules.crm,
              config.modules.scheduling,
              config.modules.quoting,
              config.modules.invoicing,
              config.modules.payments,
              config.modules.jobPhotos,
              config.modules.gpsTracking,
              config.modules.reviewAutomation,
            ].map((mod) => (
              <li key={mod.label} className="flex items-start gap-2.5">
                <Check size={14} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-semibold text-white">{mod.label}</span>
                  <span className="text-sm text-zinc-500"> — {mod.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Trade-specific modules */}
        {specialModules.length > 0 && (
          <div className="rounded-2xl bg-[#0f0f0f] border border-orange-500/15 p-8">
            <h2 className="text-lg font-black text-white mb-1">
              Built for {industry.name}
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              Trade-specific modules that activate when you select {industry.name.toLowerCase()}.
            </p>
            <ul className="space-y-2.5">
              {specialModules.map((mod) => (
                <li key={mod.label} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={10} className="text-orange-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">{mod.label}</span>
                    <span className="text-sm text-zinc-500"> — {mod.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4 border-t border-white/5">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          Ready to try Gritly for {industry.name}?
        </h2>
        <p className="text-zinc-500 mb-8 max-w-md mx-auto">
          14-day free trial. No credit card. Set up in under 15 minutes.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-10 py-4 text-base font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-xl shadow-orange-500/20"
        >
          Start Free Trial
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
