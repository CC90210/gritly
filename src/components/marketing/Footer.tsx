import Link from "next/link";
import { BRAND } from "@/lib/constants/brand";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Industries", href: "/industries" },
    { label: "Migration", href: "/migration" },
    { label: "Changelog", href: "/changelog" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Security", href: "/security" },
  ],
} as const;

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand column */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-1 group w-fit">
              <span className="text-xl font-black tracking-tight text-white">
                Gritly
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mb-3 group-hover:scale-125 transition-transform" />
            </Link>
            <p className="mt-4 text-sm text-zinc-500 max-w-xs leading-relaxed">
              {BRAND.description}
            </p>
            <p className="mt-6 text-xs text-zinc-600">
              {BRAND.tagline}
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Gritly. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600">
            Powered by{" "}
            <a
              href={BRAND.parentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-orange-500 transition-colors"
            >
              {BRAND.parent}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
