"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Download,
  Upload,
  CheckCircle,
  Users,
  FileText,
  Briefcase,
  ArrowRight,
  Clock,
  ShieldCheck,
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

const MIGRATION_STEPS = [
  {
    num: "01",
    icon: Download,
    title: "Export your data",
    desc: "Go to your current software and export a CSV. In Jobber it takes about 30 seconds. We support exports from Jobber, Housecall Pro, ServiceTitan, and any CSV format.",
    detail: "Settings → Export → Download CSV",
  },
  {
    num: "02",
    icon: Upload,
    title: "Upload to Gritly",
    desc: "Drop your CSV into the Gritly migration tool. Our system automatically maps your columns to the right fields. Preview your data before confirming.",
    detail: "Settings → Import → Upload CSV",
  },
  {
    num: "03",
    icon: CheckCircle,
    title: "Confirm and go live",
    desc: "Review the mapped data, make any corrections, and confirm. Your clients, jobs, and invoices appear instantly. Invite your team and start working.",
    detail: "Review → Confirm → Done",
  },
];

const SUPPORTED_PLATFORMS = [
  { name: "Jobber", time: "10 min" },
  { name: "Housecall Pro", time: "12 min" },
  { name: "ServiceTitan", time: "15 min" },
  { name: "Any CSV export", time: "15 min" },
];

const DATA_TYPES = [
  { icon: Users, label: "Clients & contacts", desc: "Names, phones, emails, addresses, notes" },
  { icon: Briefcase, label: "Job history", desc: "Past jobs, dates, descriptions, statuses" },
  { icon: FileText, label: "Invoices & quotes", desc: "Open invoices, paid history, quote records" },
  { icon: Users, label: "Team members", desc: "Names, roles, contact info" },
];

const FAQ = [
  {
    q: "Will my data be accurate after migration?",
    a: "We map every column to the correct Gritly field and show you a preview before import. You can correct any field before confirming. Most businesses run zero corrections.",
  },
  {
    q: "What if my CSV has extra columns Gritly doesn't support?",
    a: "Extra columns are ignored. You can always add custom fields in Gritly after import if you need to store additional data.",
  },
  {
    q: "Do I have to cancel my old software first?",
    a: "No. Run both systems side by side during your 14-day trial. Switch over when you're confident. Then cancel the old one.",
  },
  {
    q: "What about my historical invoices and payment records?",
    a: "Paid invoices import with their status. Open invoices import as open. Payment history is imported for record-keeping.",
  },
];

export default function MigrationPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24">
      {/* Header */}
      <section className="py-20 text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative">
          <FadeIn>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
              Migration
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
              Switch from Jobber
              <br />
              <span className="text-orange-500">in 15 minutes.</span>
            </h1>
            <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Your clients, jobs, invoices, and team come with you. No data gets left behind.
              No spreadsheet archaeology. Just export, upload, done.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {[
                { icon: Clock, label: "Average 15 min migration" },
                { icon: ShieldCheck, label: "Data stays private" },
                { icon: CheckCircle, label: "Preview before confirming" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Icon size={16} className="text-orange-500" />
                  {label}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white">How it works</h2>
        </FadeIn>

        <div className="relative">
          {/* Connector line — desktop */}
          <div className="hidden lg:block absolute top-12 left-[calc(16.666%+24px)] right-[calc(16.666%+24px)] h-px bg-gradient-to-r from-orange-500/30 via-orange-500/20 to-orange-500/30" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {MIGRATION_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.num} delay={i * 0.1}>
                  <div className="relative flex flex-col items-center lg:items-start text-center lg:text-left p-8 rounded-2xl bg-[#0f0f0f] border border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center mb-5">
                      <Icon size={22} className="text-orange-400" />
                    </div>
                    <span className="text-5xl font-black text-white/5 absolute top-6 right-6 leading-none">
                      {step.num}
                    </span>
                    <h3 className="text-base font-black text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed mb-4">{step.desc}</p>
                    <code className="text-xs text-orange-400/70 bg-orange-500/5 px-3 py-1.5 rounded-lg font-mono">
                      {step.detail}
                    </code>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported platforms */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Supported imports</h2>
          <p className="mt-2 text-zinc-500 text-sm">
            If your platform exports a CSV, Gritly can import it.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SUPPORTED_PLATFORMS.map((platform) => (
              <div
                key={platform.name}
                className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-[#0f0f0f] border border-white/5 text-center"
              >
                <span className="text-base font-bold text-white">{platform.name}</span>
                <span className="text-xs text-orange-400 font-semibold">~{platform.time}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* What migrates */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white">What comes with you</h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DATA_TYPES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-start gap-4 p-6 rounded-2xl bg-[#0f0f0f] border border-white/5"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">{label}</h3>
                  <p className="text-sm text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <FadeIn className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Migration questions</h2>
        </FadeIn>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <FadeIn key={item.q}>
              <div className="rounded-xl bg-[#0f0f0f] border border-white/5 p-6">
                <h3 className="text-sm font-bold text-white mb-2">{item.q}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.a}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4 border-t border-white/5">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to make the move?
          </h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            Start your free trial, import your data, and keep working. No downtime.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 text-base font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-xl shadow-orange-500/20"
          >
            Start Free Trial &amp; Import Data
            <ArrowRight size={18} />
          </Link>
        </FadeIn>
      </section>
    </div>
  );
}
