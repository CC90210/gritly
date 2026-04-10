"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Check, ArrowRight, Zap } from "lucide-react";
import { PRICING } from "@/lib/constants/brand";
import { cn } from "@/lib/utils/cn";

// Note: metadata is handled via layout.tsx defaults + route-level generateMetadata if needed

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

const PLANS: Array<{
  key: "starter" | "pro" | "business";
  name: string;
  price: number;
  priceAnnual: number;
  users: string;
  description: string;
  cta: string;
  popular?: boolean;
  features: readonly string[];
}> = [
  { key: "starter", ...PRICING.starter },
  { key: "pro", ...PRICING.pro },
  { key: "business", ...PRICING.business },
];

const ALL_FEATURES = [
  { label: "Unlimited users", plans: ["starter", "pro", "business"] },
  { label: "Client management (CRM)", plans: ["starter", "pro", "business"] },
  { label: "Quoting & invoicing", plans: ["starter", "pro", "business"] },
  { label: "Drag-and-drop scheduling", plans: ["starter", "pro", "business"] },
  { label: "Online booking widget", plans: ["starter", "pro", "business"] },
  { label: "Client portal", plans: ["starter", "pro", "business"] },
  { label: "Mobile app (iOS & Android) (Coming soon)", plans: ["starter", "pro", "business"] },
  { label: "GPS job tracking", plans: ["starter", "pro", "business"] },
  { label: "Job photos & documentation", plans: ["starter", "pro", "business"] },
  { label: "Basic reporting", plans: ["starter", "pro", "business"] },
  { label: "Email & SMS reminders", plans: ["starter", "pro", "business"] },
  { label: "Online payments", plans: ["starter", "pro", "business"] },
  { label: "Map view with Google Maps routing", plans: ["pro", "business"] },
  { label: "Smart scheduling & dispatch", plans: ["pro", "business"] },
  { label: "Job costing & profitability", plans: ["pro", "business"] },
  { label: "Flat-rate pricebook", plans: ["pro", "business"] },
  { label: "Two-way SMS inbox", plans: ["pro", "business"] },
  { label: "QuickBooks & Xero sync (Coming soon)", plans: ["pro", "business"] },
  { label: "Time tracking & timesheets", plans: ["pro", "business"] },
  { label: "Custom checklists & forms", plans: ["pro", "business"] },
  { label: "Expense tracking", plans: ["pro", "business"] },
  { label: "Job photos & documentation", plans: ["pro", "business"] },
  { label: "Review request automation", plans: ["pro", "business"] },
  { label: "Offline mobile mode (Coming soon)", plans: ["pro", "business"] },
  { label: "AI receptionist (Coming soon)", plans: ["business"] },
  { label: "Advanced reporting & forecasting", plans: ["business"] },
  { label: "Custom automation builder", plans: ["business"] },
  { label: "Maintenance agreements", plans: ["business"] },
  { label: "Inventory & parts tracking", plans: ["business"] },
  { label: "Subcontractor management", plans: ["business"] },
  { label: "Consumer financing (Coming soon)", plans: ["business"] },
  { label: "API access", plans: ["business"] },
  { label: "Dedicated success manager", plans: ["business"] },
  { label: "Priority support", plans: ["business"] },
];

const FAQ = [
  {
    q: "Is there really no per-user pricing?",
    a: "Correct. Every plan includes unlimited users. Add your whole team, all your technicians, office staff, and subcontractors — no extra charge. This is one of the core reasons Gritly exists.",
  },
  {
    q: "What happens after my free trial?",
    a: "After 14 days, you choose a plan and add a payment method. If you decide Gritly isn't right for you, your data is exportable and we won't charge you a cent.",
  },
  {
    q: "Can I import my data from Jobber or Housecall Pro?",
    a: "Yes. We support CSV imports from Jobber, Housecall Pro, ServiceTitan, and most other platforms. Most businesses are fully migrated in under 15 minutes.",
  },
  {
    q: "Do you offer annual billing discounts?",
    a: "Yes — annual billing saves you roughly 25% compared to monthly. You can toggle between monthly and annual on this page to compare.",
  },
  {
    q: "What's included in the free trial?",
    a: "Your free trial includes full access to the Pro plan features. No credit card required. Cancel anytime with zero friction.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrade or downgrade anytime. Changes take effect at the start of your next billing cycle.",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24">
      {/* Header */}
      <section className="py-20 text-center px-4">
        <FadeIn>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
            Pricing
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            Simple pricing.
            <br />
            <span className="text-zinc-500">No surprises.</span>
          </h1>
          <p className="mt-4 text-zinc-400 text-lg max-w-xl mx-auto">
            Unlimited users on every plan. The more your team grows, the more you save compared to Jobber.
          </p>
        </FadeIn>

        {/* Billing toggle */}
        <FadeIn delay={0.15} className="mt-8 flex items-center justify-center gap-3">
          <span className={cn("text-sm font-medium", !annual ? "text-white" : "text-zinc-500")}>
            Monthly
          </span>
          <button
            type="button"
            onClick={() => setAnnual((v) => !v)}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors duration-200",
              annual ? "bg-orange-500" : "bg-zinc-800"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                annual ? "translate-x-6" : "translate-x-0"
              )}
            />
          </button>
          <span className={cn("text-sm font-medium", annual ? "text-white" : "text-zinc-500")}>
            Annual
            <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500/15 text-orange-400 rounded-full font-semibold">
              Save 25%
            </span>
          </span>
        </FadeIn>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.key} delay={i * 0.1}>
              <div
                className={cn(
                  "relative rounded-2xl p-8 flex flex-col h-full transition-all duration-300",
                  plan.popular
                    ? "bg-gradient-to-b from-orange-500/10 to-[#111] border border-orange-500/30 shadow-2xl shadow-orange-500/10"
                    : "bg-[#0f0f0f] border border-white/8 hover:border-white/15"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg">
                      <Zap size={12} />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">
                      ${annual ? plan.priceAnnual : plan.price}
                    </span>
                    <span className="text-zinc-500 text-sm">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-xs text-zinc-600 mt-1">
                      Billed ${plan.priceAnnual * 12}/year
                    </p>
                  )}
                  <p className="text-xs text-orange-400 font-semibold mt-1.5">
                    Unlimited users included
                  </p>
                </div>

                <Link
                  href="/register"
                  className={cn(
                    "w-full text-center py-3.5 rounded-xl text-sm font-bold transition-all duration-150 mb-8",
                    plan.popular
                      ? "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  )}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check size={15} className={cn("mt-0.5 flex-shrink-0", plan.popular ? "text-orange-400" : "text-zinc-500")} />
                      <span className="text-sm text-zinc-400">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Trust line */}
        <FadeIn delay={0.3} className="mt-10 text-center">
          <p className="text-sm text-zinc-600">
            14-day free trial on all plans &nbsp;·&nbsp; No credit card required &nbsp;·&nbsp; Cancel anytime
          </p>
        </FadeIn>
      </section>

      {/* Feature comparison table */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <FadeIn className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Compare all features</h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="rounded-2xl overflow-hidden border border-white/8">
            {/* Header */}
            <div className="grid grid-cols-4 bg-[#111] border-b border-white/8">
              <div className="px-6 py-4 text-sm font-semibold text-zinc-500">Feature</div>
              {PLANS.map((plan) => (
                <div
                  key={plan.key}
                  className={cn(
                    "px-6 py-4 text-center text-sm font-bold border-l border-white/5",
                    plan.popular ? "text-orange-400" : "text-zinc-300"
                  )}
                >
                  {plan.name}
                </div>
              ))}
            </div>

            {ALL_FEATURES.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-4 border-b border-white/5 last:border-0",
                  i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0c0c0c]"
                )}
              >
                <div className="px-6 py-3.5 text-sm text-zinc-400">{row.label}</div>
                {PLANS.map((plan) => (
                  <div key={plan.key} className="px-6 py-3.5 flex justify-center border-l border-white/5">
                    {row.plans.includes(plan.key) ? (
                      <Check size={16} className={cn(plan.popular ? "text-orange-400" : "text-zinc-500")} />
                    ) : (
                      <span className="w-4 h-px bg-zinc-800 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <FadeIn className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Pricing questions</h2>
        </FadeIn>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className="rounded-xl bg-[#0f0f0f] border border-white/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                >
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  <ArrowRight
                    size={16}
                    className={cn(
                      "text-zinc-500 flex-shrink-0 transition-transform duration-200",
                      openFaq === i ? "rotate-90" : ""
                    )}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-zinc-400 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 text-center px-4 border-t border-white/5">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to make the switch?
          </h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            Start your free trial today. No credit card, no commitment.
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
