"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Users,
  Zap,
  WifiOff,
  Camera,
  FileText,
  Route,
  Star,
  RefreshCw,
  Globe,
  Check,
  X,
  ArrowRight,
  Thermometer,
  Wrench,
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
} from "lucide-react";
import { INDUSTRIES } from "@/lib/constants/brand";
import { cn } from "@/lib/utils/cn";

// ─── Animation helpers ────────────────────────────────────────────────────────

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
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerChildren({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        visible: { transition: { staggerChildren: 0.07 } },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Icon map for industries ──────────────────────────────────────────────────

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

// ─── Features data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Users,
    title: "Unlimited Users",
    desc: "Every plan includes your whole team. No per-seat fees, ever.",
  },
  {
    icon: Zap,
    title: "Smart Dispatch",
    desc: "AI-powered scheduling assigns the right tech to the right job.",
  },
  {
    icon: WifiOff,
    title: "Offline Mode",
    desc: "Works in basements, dead zones, and rural properties.",
  },
  {
    icon: Camera,
    title: "Job Photos",
    desc: "GPS-tagged before/after photos. Replaces CompanyCam.",
  },
  {
    icon: FileText,
    title: "One-Click Invoicing",
    desc: "Convert quotes to invoices in seconds. Collect payment on-site.",
  },
  {
    icon: Route,
    title: "Route Optimization",
    desc: "Cut drive time by up to 30%. More jobs, less windshield time.",
  },
  {
    icon: Star,
    title: "Automated Reviews",
    desc: "Request Google reviews automatically after every completed job.",
  },
  {
    icon: RefreshCw,
    title: "Real QuickBooks Sync",
    desc: "Two-way sync that actually works. No duplicate entry.",
  },
  {
    icon: Globe,
    title: "Client Portal",
    desc: "Customers book, approve quotes, and pay from their own portal.",
  },
];

// ─── Comparison data ──────────────────────────────────────────────────────────

const COMPARISON = [
  { feature: "Unlimited Users", gritly: "All plans", jobber: "$29/user extra" },
  { feature: "Offline Mode", gritly: true, jobber: false },
  { feature: "Job Photos", gritly: "Built-in", jobber: "Needs CompanyCam" },
  { feature: "AI Dispatch", gritly: true, jobber: false },
  { feature: "Route Optimization", gritly: "All plans", jobber: "Add-on only" },
  { feature: "Review Automation", gritly: "Built-in", jobber: "$39/mo add-on" },
  { feature: "Starting Price", gritly: "$79/mo", jobber: "$39/mo (1 user)" },
  { feature: "5-Person Team", gritly: "$79/mo", jobber: "$169+/mo" },
  { feature: "10-Person Team", gritly: "$179/mo", jobber: "$349+/mo" },
];

// ─── Tool stack ───────────────────────────────────────────────────────────────

const TOOL_STACK = ["Jobber", "CompanyCam", "QuickBooks", "Google Calendar", "Thumbtack", "Text Messages"];

// ─── Sections ─────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-orange-500/3 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wide uppercase mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          Built for grit.
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white"
        >
          Stop renting software.
          <br />
          <span className="text-orange-500">Start owning</span> your business.
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Gritly replaces Jobber, CompanyCam, and 4 other tools — with{" "}
          <span className="text-white font-semibold">unlimited users</span> on every plan.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02]"
          >
            Start Free Trial
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white border border-white/15 hover:border-white/30 hover:bg-white/5 rounded-xl transition-all duration-150"
          >
            See Pricing
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-5 text-sm text-zinc-600"
        >
          14-day free trial &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Cancel anytime
        </motion.p>

        {/* Industry icons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.6 }}
          className="mt-20 flex flex-wrap items-center justify-center gap-6"
        >
          {INDUSTRIES.slice(0, 8).map((industry) => {
            const Icon = ICON_MAP[industry.icon];
            return (
              <div
                key={industry.slug}
                className="flex flex-col items-center gap-2 group cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center group-hover:border-orange-500/30 group-hover:bg-orange-500/5 transition-all duration-200">
                  {Icon && <Icon size={20} className="text-zinc-500 group-hover:text-orange-400 transition-colors" />}
                </div>
                <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  {industry.name}
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-28 bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
            The problem
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            The average trades business
            <br />
            runs <span className="text-orange-500">4–6 disconnected tools.</span>
          </h2>
          <p className="mt-4 text-zinc-500 text-lg max-w-xl mx-auto">
            Each one has its own login, its own bill, and its own way of breaking at the worst time.
          </p>
        </FadeIn>

        {/* Tool stack */}
        <StaggerChildren className="mt-14 flex flex-wrap items-center justify-center gap-3">
          {TOOL_STACK.map((tool, i) => (
            <StaggerItem key={tool}>
              <div className="flex items-center gap-2">
                <div className="px-4 py-2.5 rounded-lg bg-[#151515] border border-white/8 text-sm font-medium text-zinc-300">
                  {tool}
                </div>
                {i < TOOL_STACK.length - 1 && (
                  <span className="text-zinc-700 font-bold text-lg">+</span>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <FadeIn delay={0.3}>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-zinc-800" />
            <div className="px-5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
              = $500–900/mo in subscriptions
            </div>
            <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-zinc-800" />
          </div>
        </FadeIn>

        {/* The solve */}
        <FadeIn delay={0.4}>
          <div className="mt-16 relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-orange-500/20 to-transparent" />
            <div className="relative rounded-2xl bg-[#111] border border-orange-500/15 p-10">
              <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-3">
                Gritly replaces all of them.
              </p>
              <h3 className="text-3xl sm:text-4xl font-black text-white">
                One platform. One price.
                <br />
                <span className="text-orange-500">Unlimited team.</span>
              </h3>
              <p className="mt-4 text-zinc-400 max-w-md mx-auto">
                CRM, scheduling, invoicing, job photos, route optimization, reviews — all in one place that actually works offline.
              </p>
              <Link
                href="/pricing"
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-lg shadow-orange-500/20"
              >
                See plans starting at $79/mo
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-28 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
            Everything in the box.
            <br />
            <span className="text-zinc-500">Nothing extra to buy.</span>
          </h2>
        </FadeIn>

        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <StaggerItem key={title}>
              <div className="group relative p-6 rounded-2xl bg-[#0f0f0f] border border-white/5 hover:border-orange-500/20 transition-all duration-300 hover:bg-[#111] cursor-default">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/15 transition-colors">
                  <Icon size={20} className="text-orange-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <FadeIn delay={0.2} className="mt-10 text-center">
          <Link
            href="/features"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-400 transition-colors"
          >
            See all features
            <ArrowRight size={16} />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

function IndustrySection() {
  return (
    <section className="py-28 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
            Industries
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
            Built for your trade,
            <br />
            <span className="text-zinc-500">not someone else's.</span>
          </h2>
          <p className="mt-4 text-zinc-500 text-lg max-w-xl mx-auto">
            Select your trade and Gritly configures itself — terminology, modules, and workflows built for how you actually work.
          </p>
        </FadeIn>

        <StaggerChildren className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {INDUSTRIES.map((industry) => {
            const Icon = ICON_MAP[industry.icon];
            return (
              <StaggerItem key={industry.slug}>
                <Link
                  href={`/industries/${industry.slug}`}
                  className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#0f0f0f] border border-white/5 hover:border-orange-500/20 hover:bg-[#111] transition-all duration-200 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-orange-500/10 transition-colors">
                    {Icon && <Icon size={22} className="text-zinc-400 group-hover:text-orange-400 transition-colors" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{industry.name}</p>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        <FadeIn delay={0.3} className="mt-10 text-center">
          <Link
            href="/industries"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-400 transition-colors"
          >
            Browse all industries
            <ArrowRight size={16} />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="py-28 bg-[#080808]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
            The honest comparison
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
            Gritly vs Jobber.
            <br />
            <span className="text-zinc-500">You do the math.</span>
          </h2>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="rounded-2xl overflow-hidden border border-white/8">
            {/* Header */}
            <div className="grid grid-cols-3 bg-[#111] border-b border-white/8">
              <div className="px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wide">Feature</div>
              <div className="px-6 py-4 text-sm font-bold text-orange-400 text-center border-l border-white/5">
                <span className="flex items-center justify-center gap-1.5">
                  Gritly
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                </span>
              </div>
              <div className="px-6 py-4 text-sm font-semibold text-zinc-500 text-center border-l border-white/5">Jobber</div>
            </div>

            {/* Rows */}
            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className={cn(
                  "grid grid-cols-3 border-b border-white/5 last:border-0",
                  i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0d0d0d]"
                )}
              >
                <div className="px-6 py-4 text-sm font-medium text-zinc-300">{row.feature}</div>
                <div className="px-6 py-4 text-sm text-center border-l border-white/5">
                  {row.gritly === true ? (
                    <Check size={18} className="text-orange-500 mx-auto" />
                  ) : (
                    <span className="text-orange-400 font-semibold">{row.gritly}</span>
                  )}
                </div>
                <div className="px-6 py-4 text-sm text-center border-l border-white/5">
                  {row.jobber === false ? (
                    <X size={18} className="text-zinc-700 mx-auto" />
                  ) : (
                    <span className="text-zinc-500">{row.jobber}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.3} className="mt-8 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-xl shadow-orange-500/20"
          >
            Switch to Gritly today
            <ArrowRight size={18} />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

function MigrationSection() {
  const STEPS = [
    { num: "01", title: "Export from Jobber", desc: "One CSV export. Takes 30 seconds." },
    { num: "02", title: "Upload to Gritly", desc: "Drop your file. We handle the mapping." },
    { num: "03", title: "Everything migrated", desc: "Clients, jobs, invoices — all of it." },
  ];

  return (
    <section className="py-28 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
            Migration
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
            Switch from Jobber
            <br />
            <span className="text-orange-500">in 15 minutes.</span>
          </h2>
          <p className="mt-4 text-zinc-500 text-lg max-w-xl mx-auto">
            We&apos;ve done this hundreds of times. Your data comes with you — nothing gets left behind.
          </p>
        </FadeIn>

        <StaggerChildren className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <StaggerItem key={step.num}>
              <div className="relative p-6 rounded-2xl bg-[#0f0f0f] border border-white/5 text-left">
                <span className="text-5xl font-black text-white/5 leading-none block mb-4">
                  {step.num}
                </span>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500">{step.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <FadeIn delay={0.3}>
          <Link
            href="/migration"
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-400 transition-colors"
          >
            See how migration works
            <ArrowRight size={16} />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 bg-[#080808]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-orange-500/8 border border-orange-500/15">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-[#080808]"
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-orange-300">
              Join hundreds of trades businesses already on Gritly
            </p>
          </div>
          <p className="mt-6 text-zinc-600 text-sm">
            Testimonials loading soon. We&apos;re busy building the product.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-orange-500/10 to-[#0a0a0a]" />
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            Your business runs on grit.
            <br />
            <span className="text-orange-500">Your software should too.</span>
          </h2>
          <p className="mt-6 text-xl text-zinc-400 max-w-xl mx-auto">
            14-day free trial. No credit card. Cancel anytime. Your whole team, from day one.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02]"
            >
              Start Free Trial
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/migration"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white border border-white/15 hover:border-white/30 hover:bg-white/5 rounded-xl transition-all duration-150"
            >
              Migrating from Jobber?
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <IndustrySection />
      <ComparisonSection />
      <MigrationSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
