"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
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
  ArrowRight,
} from "lucide-react";
import { INDUSTRIES } from "@/lib/constants/brand";

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
      variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
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
        hidden: { opacity: 0, y: 18 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24">
      {/* Header */}
      <section className="py-20 text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative">
          <FadeIn>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-4">
              Industries
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
              Built for your trade,
              <br />
              <span className="text-zinc-500">not someone else&apos;s.</span>
            </h1>
            <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Select your trade and Gritly configures itself. Terminology, modules, dashboard
              widgets — all adapted to how your specific business works.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <FadeIn>
          <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-8 flex flex-col sm:flex-row gap-8 items-center text-center sm:text-left">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Wrench size={26} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white mb-2">
                Every trade gets a different experience.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                When you complete onboarding and select your trade, Gritly activates the right modules
                and hides what you don&apos;t need. An HVAC company sees refrigerant tracking and emergency
                dispatch. A painter sees room-by-room estimating and color records. Same platform,
                totally different product.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Industries grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {INDUSTRIES.map((industry) => {
            const Icon = ICON_MAP[industry.icon];
            return (
              <StaggerItem key={industry.slug}>
                <Link
                  href={`/industries/${industry.slug}`}
                  className="group flex flex-col gap-4 p-6 rounded-2xl bg-[#0f0f0f] border border-white/5 hover:border-orange-500/20 hover:bg-[#111] transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-orange-500/10 transition-colors">
                    {Icon && (
                      <Icon
                        size={22}
                        className="text-zinc-400 group-hover:text-orange-400 transition-colors"
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-orange-50 transition-colors">
                      {industry.name}
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{industry.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-orange-500 group-hover:text-orange-400 transition-colors mt-auto">
                    See how it works
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4 border-t border-white/5">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Don&apos;t see your trade?
          </h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            Gritly works for any field service business. Start a free trial and configure it for your workflow.
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
