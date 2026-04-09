"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Wrench, Zap, Users } from "lucide-react";
import { BRAND } from "@/lib/constants/brand";

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

const VALUES = [
  {
    icon: Wrench,
    title: "Built for people who build things.",
    desc: "Trades businesses are the backbone of the economy. They deserve software as tough and reliable as they are — not watered-down enterprise tools with confusing pricing.",
  },
  {
    icon: Zap,
    title: "Complexity is the enemy.",
    desc: "Every feature we ship makes something easier. If a feature makes the product harder to use, it doesn't ship. Simplicity is a product decision, not a design decision.",
  },
  {
    icon: Users,
    title: "Whole-team pricing, always.",
    desc: "Per-seat pricing punishes growth. We decided from day one that unlimited users on every plan wasn't a marketing hook — it was a founding principle.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24">
      {/* Header */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative max-w-4xl mx-auto">
          <FadeIn>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
              About
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
              We build tools
              <br />
              <span className="text-zinc-500">for people who build things.</span>
            </h1>
          </FadeIn>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-8 sm:p-12">
            <h2 className="text-2xl font-black text-white mb-6">Why Gritly exists</h2>
            <div className="space-y-4 text-zinc-400 text-base leading-relaxed">
              <p>
                Field service businesses are running 4–6 tools held together with group texts and Google Sheets.
                Jobber, CompanyCam, QuickBooks, Google Calendar, a review app, a scheduling app — each with its
                own login, its own bill, its own way of not syncing with the others.
              </p>
              <p>
                The software that exists either charges per seat (so you hide your team from the system) or requires
                a six-month onboarding contract and a dedicated implementation team. Neither works for a 3-person
                HVAC shop or a 15-person landscaping crew.
              </p>
              <p>
                Gritly is built to replace that entire stack — with one platform, one price, unlimited team members,
                and software that actually works offline when your tech is in a basement with no signal.
              </p>
              <p className="text-white font-semibold">
                We built Gritly for businesses that run on grit. Not on venture funding. Not on SaaS jargon.
                On showing up, doing the work, and getting paid.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Values */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white">What we believe</h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALUES.map(({ icon: Icon, title, desc }, i) => (
            <FadeIn key={title} delay={i * 0.1}>
              <div className="p-8 rounded-2xl bg-[#0f0f0f] border border-white/5 h-full">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-5">
                  <Icon size={20} className="text-orange-400" />
                </div>
                <h3 className="text-base font-black text-white mb-3">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* OASIS credit */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="rounded-2xl bg-gradient-to-b from-orange-500/8 to-[#0f0f0f] border border-orange-500/15 p-8 sm:p-10 text-center">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
              Built by
            </p>
            <h2 className="text-2xl font-black text-white mb-3">{BRAND.parent}</h2>
            <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
              {BRAND.parent} builds AI-powered software for service businesses. Gritly is our flagship
              field service platform — the result of working directly with tradespeople to understand
              what software they actually need.
            </p>
            <a
              href={BRAND.parentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-400 transition-colors"
            >
              Visit {BRAND.parent}
              <ArrowRight size={14} />
            </a>
          </div>
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4 border-t border-white/5">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to try it?
          </h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            14-day free trial. No credit card. No pitch call required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 text-base font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all duration-150 shadow-xl shadow-orange-500/20"
            >
              Start Free Trial
              <ArrowRight size={18} />
            </Link>
            <a
              href={`mailto:${BRAND.email}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Or email us at {BRAND.email}
            </a>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
