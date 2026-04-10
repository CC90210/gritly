interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Gritly SVG logo component.
 *
 * Shield design featuring:
 * - Navy/dark blue shield outline (#1e293b)
 * - Wrench (left) and hammer (right) crossing diagonally
 * - Gear/cog in the center
 * - Orange lightning bolt (#f97316) through the gear
 * - Orange accent arc on lower-left of shield
 * - Cityscape silhouette at the bottom inside the shield
 *
 * Variants:
 * - "icon"  — shield only, no wordmark (default for tight spaces)
 * - "full"  — shield + "GRITLY" wordmark beside it
 */
export default function Logo({
  variant = "full",
  className,
  width,
  height,
}: LogoProps) {
  if (variant === "icon") {
    const w = width ?? 32;
    const h = height ?? 36;
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 64 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Gritly"
        role="img"
      >
        <ShieldContents />
      </svg>
    );
  }

  // full variant: shield + wordmark
  const w = width ?? 120;
  const h = height ?? 36;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 240 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Gritly"
      role="img"
    >
      <ShieldContents />
      {/* Wordmark — positioned to the right of the 64-wide shield */}
      <text
        x="76"
        y="50"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="32"
        fontWeight="900"
        letterSpacing="-1"
        fill="#ffffff"
      >
        GRITLY
      </text>
    </svg>
  );
}

/**
 * Inner shield SVG contents — reused in both variants.
 * Coordinate space: 64 × 72 viewBox.
 */
function ShieldContents() {
  return (
    <>
      {/* ── Shield body ────────────────────────────────────────────── */}
      <path
        d="M32 2 L60 14 L60 42 Q60 58 32 70 Q4 58 4 42 L4 14 Z"
        fill="#0f172a"
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* ── Orange accent arc — lower-left ─────────────────────────── */}
      <path
        d="M6 50 Q8 62 20 68"
        stroke="#f97316"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Gear / cog (center, 10-tooth) ──────────────────────────── */}
      <g transform="translate(32,34)">
        {/* Gear ring */}
        <circle r="9" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <circle r="5" fill="none" stroke="#94a3b8" strokeWidth="2" />
        {/* 8 gear teeth */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = Math.cos(rad) * 9;
          const y1 = Math.sin(rad) * 9;
          const x2 = Math.cos(rad) * 12.5;
          const y2 = Math.sin(rad) * 12.5;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* ── Orange lightning bolt (through gear center) ─────────────── */}
      <path
        d="M33 22 L27 35 L31.5 35 L30 46 L37 33 L32.5 33 Z"
        fill="#f97316"
      />

      {/* ── Wrench — left side, diagonal ───────────────────────────── */}
      <g transform="translate(15,34) rotate(-35)">
        {/* Handle */}
        <rect x="-2" y="-14" width="4" height="18" rx="2" fill="#64748b" />
        {/* Head — open-end wrench fork */}
        <path
          d="M-4 4 Q-6 8 -3 11 L0 9 L3 11 Q6 8 4 4 Z"
          fill="#64748b"
        />
      </g>

      {/* ── Hammer — right side, diagonal ──────────────────────────── */}
      <g transform="translate(49,34) rotate(35)">
        {/* Handle */}
        <rect x="-2" y="-14" width="4" height="18" rx="2" fill="#64748b" />
        {/* Head */}
        <rect x="-6" y="-20" width="12" height="7" rx="2" fill="#64748b" />
      </g>

      {/* ── Cityscape silhouette (bottom of shield) ─────────────────── */}
      <path
        d="M14 58 L14 53 L18 53 L18 51 L20 51 L20 53 L24 53 L24 50
           L26 50 L26 48 L28 48 L28 50 L30 50 L30 53 L34 53 L34 50
           L36 50 L36 48 L38 48 L38 50 L40 50 L40 53 L44 53 L44 51
           L46 51 L46 53 L50 53 L50 58 Z"
        fill="#1e3a5f"
        opacity="0.8"
      />
    </>
  );
}
