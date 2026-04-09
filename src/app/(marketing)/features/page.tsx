"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  Smartphone,
  BarChart3,
  MessageSquare,
  Plug,
  Check,
  ArrowRight,
  Map,
  Camera,
  WifiOff,
  Star,
  Zap,
  Clock,
  Route,
  Package,
} from "lucide-react";

function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FEATURE_CATEGORIES = [
  {
    id: "crm",
    icon: Users,
    title: "Client Management (CRM)",
    description:
      "Every client. Every property. Every job history. In one place that actually keeps up with your business.",
    features: [
      "Full client profiles with contact history",
      "Property records with photos and notes",
      "Tag clients by source, status, or type",
      "Job history per client and per property",
      "Automated follow-up sequences",
      "Client portal for self-service booking",
      "Online booking widget for your website",
      "Lead pipeline management",
    ],
    badge: "Core",
  },
  {
    id: "scheduling",
    icon: Calendar,
    title: "Scheduling & Dispatch",
    description:
      "Drag-and-drop scheduling for your whole team. AI that fills gaps. Emergency dispatch that moves fast.",
    features: [
      "Drag-and-drop calendar interface",
      "AI-powered smart dispatch suggestions",
      "Emergency priority job insertion",
      "Crew and technician assignment",
      "Multi-day job scheduling",
      "Recurring job automation",
      "Customer appointment reminders (SMS + email)",
      "Technician mobile notifications",
    ],
    badge: "Core",
  },
  {
    id: "quoting",
    icon: FileText,
    title: "Quoting & Estimating",
    description:
      "Professional quotes in minutes. Flat-rate pricebook. Good-better-best options. Follow-ups that close deals.",
    features: [
      "Professional quote templates",
      "Flat-rate pricebook with categories",
      "Good-better-best option presentation",
      "Automated quote follow-up reminders",
      "Digital client approval (e-sign)",
      "Photo and attachment support",
      "Instant convert to invoice",
      "Quote tracking and analytics",
    ],
    badge: "Core",
  },
  {
    id: "invoicing",
    icon: CreditCard,
    title: "Invoicing & Payments",
    description:
      "Invoice on-site. Collect payment in the driveway. Chase fewer unpaid invoices.",
    features: [
      "One-click quote-to-invoice conversion",
      "Online payment (card, ACH, Apple Pay)",
      "In-person payment via mobile",
      "Automated invoice reminders",
      "Batch invoicing for recurring clients",
      "Progress billing for large projects",
      "Consumer financing via Wisetack",
      "QuickBooks & Xero two-way sync",
    ],
    badge: "Core",
  },
  {
    id: "field",
    icon: Smartphone,
    title: "Field Operations",
    description:
      "Your techs stay productive even in dead zones. GPS tracking, photos, checklists — all offline-ready.",
    features: [
      "Offline mobile mode (iOS & Android)",
      "GPS-tagged job photos",
      "Before/after photo comparison",
      "Custom checklists and inspection forms",
      "Real-time GPS team tracking",
      "Time tracking and timesheets",
      "Expense tracking with receipt photos",
      "Route optimization (cut drive time 30%+)",
    ],
    badge: "Field",
  },
  {
    id: "reporting",
    icon: BarChart3,
    title: "Reporting & Analytics",
    description:
      "Know exactly what's profitable. See where leads come from. Forecast next month before it arrives.",
    features: [
      "Revenue and job volume dashboards",
      "Job costing and profitability by job",
      "Technician performance reporting",
      "Lead source and marketing attribution",
      "Invoice aging and cash flow forecasting",
      "Custom report builder (Business plan)",
      "Team capacity and utilization views",
      "Export to CSV or direct QuickBooks sync",
    ],
    badge: "Growth",
  },
  {
    id: "communication",
    icon: MessageSquare,
    title: "Communication",
    description:
      "Two-way SMS from a business number. Automated reminders. Review requests that actually get responses.",
    features: [
      "Two-way SMS business inbox",
      "Automated appointment reminders",
      "Automated invoice reminders",
      "Review request automation (Google)",
      "Email campaigns to client lists",
      "AI receptionist (answers calls + texts)",
      "Automated quote follow-up sequences",
      "Missed call text-back",
    ],
    badge: "Growth",
  },
  {
    id: "integrations",
    icon: Plug,
    title: "Integrations",
    description:
      "Plays well with the tools you already use. Replaces the ones you don't need anymore.",
    features: [
      "QuickBooks Online (two-way sync)",
      "Xero (two-way sync)",
      "Google Calendar sync",
      "Wisetack consumer financing",
      "Stripe payment processing",
      "Zapier (1,000+ app connections)",
      "REST API access (Business plan)",
      "CSV import from any platform",
    ],
    badge: "Platform",
  },
];

const BADGE_COLORS: Record<string, string> = {
  Core: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Field: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Growth: "bg-green-500/10 text-green-400 border-green-500/20",
  Platform: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24">
      {/* Header */}
      <section className="py-20 text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="relative">
          <FadeIn>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
              Features
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
              Everything you need.
              <br />
              <span className="text-zinc-500">Nothing you don&apos;t.</span>
            </h1>
            <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Gritly is built for how field service businesses actually run — not how SaaS companies
              think they should. Every feature is in the box. No add-on fees.
            </p>
          </FadeIn>

          {/* Quick stats */}
          <FadeIn delay={0.2} className="mt-12 flex flex-wrap items-center justify-center gap-8">
            {[
              { icon: Users, label: "Unlimited users on every plan" },
              { icon: WifiOff, label: "Full offline mode built-in" },
              { icon: Star, label: "Review automation included" },
              { icon: Route, label: "Route optimization included" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-zinc-400">
                <Icon size={16} className="text-orange-500" />
                {label}
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* Feature categories */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 space-y-6">
        {FEATURE_CATEGORIES.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <FadeIn key={cat.id} delay={i * 0.05}>
              <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 overflow-hidden hover:border-white/10 transition-colors">
                <div className="p-8 sm:p-10">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Icon size={22} className="text-orange-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h2 className="text-xl font-black text-white">{cat.title}</h2>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full ${BADGE_COLORS[cat.badge]}`}
                        >
                          {cat.badge}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                        {cat.description}
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-8">
                        {cat.features.map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check size={14} className="text-orange-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-zinc-400">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4 border-t border-white/5">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            See it for yourself.
          </h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            14-day free trial. Full Pro access. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 text-base font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-xl shadow-orange-500/20"
          >
            Start Free Trial
            <ArrowRight size={18} />
          </Link>
        </FadeIn>
      </section>
    </div>
  );
}
