"use client";

/**
 * Floral flourishes — shared SVG primitives used across the site.
 *
 * Design philosophy: these should feel like embroidery on a silk scarf, not
 * Instagram stickers. Everything is pure SVG (no image deps), strokes stay
 * thin, and motion is slow + cyclic (drifting petals, gentle sway) so the
 * page feels alive without being distracting.
 *
 * Exports:
 *   - <FloatingBlossoms />   Scatters 8 blossoms that drift independently
 *                            across a relative parent. Purely decorative.
 *   - <FloralDivider />      Horizontal divider with a centered bloom —
 *                            splits sections elegantly.
 *   - <SparkleBurst />       3 tiny sparkles that pulse. Sits near headings.
 *   - <Bloom />              Single blossom SVG. Reusable inline accent.
 *   - <Sprig />              Small leafy sprig SVG. Corner mark on cards.
 *
 * All components accept `className` for positioning / sizing overrides.
 */
import { motion } from "motion/react";

/* ─── Single bloom SVG primitive ──────────────────────────────── */
export function Bloom({
  className = "",
  size = 28,
  tone = "primary",
}: {
  className?: string;
  size?: number;
  tone?: "primary" | "soft" | "accent";
}) {
  // Each "tone" pulls from the dusty-rose palette so flowers blend with the brand.
  const fill =
    tone === "primary"
      ? "rgba(197, 91, 122, 0.55)"
      : tone === "soft"
      ? "rgba(232, 181, 168, 0.55)"
      : "rgba(154, 61, 94, 0.5)";
  const core = "rgba(255, 240, 237, 0.9)";
  const stroke = "rgba(197, 91, 122, 0.35)";

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
    >
      {/* 5 petals, arranged 72° apart, each an ellipse — classic cherry-blossom shape */}
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse
          key={r}
          cx="20"
          cy="10"
          rx="5.5"
          ry="9"
          fill={fill}
          stroke={stroke}
          strokeWidth="0.5"
          transform={`rotate(${r} 20 20)`}
        />
      ))}
      {/* Tiny center cluster */}
      <circle cx="20" cy="20" r="3" fill={core} stroke={stroke} strokeWidth="0.5" />
      <circle cx="20" cy="20" r="1" fill={fill} />
    </svg>
  );
}

/* ─── Leafy sprig SVG primitive (corner marks, section ends) ──── */
export function Sprig({
  className = "",
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M6 34 C 14 22, 22 14, 34 6"
        stroke="rgba(197, 91, 122, 0.5)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Leaves budding from the stem */}
      {[
        { x: 12, y: 28, r: -35 },
        { x: 19, y: 21, r: 45 },
        { x: 26, y: 14, r: -30 },
      ].map((l, i) => (
        <ellipse
          key={i}
          cx={l.x}
          cy={l.y}
          rx="3.5"
          ry="2"
          fill="rgba(197, 91, 122, 0.25)"
          stroke="rgba(197, 91, 122, 0.45)"
          strokeWidth="0.5"
          transform={`rotate(${l.r} ${l.x} ${l.y})`}
        />
      ))}
    </svg>
  );
}

/* ─── Scattered floating blossoms ─────────────────────────────── */
/**
 * Place 8 blossoms at fixed % positions, each with its own drift + sway +
 * rotation loop. Positions are hand-picked so blossoms don't overlap the
 * headline / primary CTA — they hug the edges.
 *
 * Parent must be `relative overflow-hidden`.
 */
const BLOSSOMS = [
  { top: "8%",  left: "6%",  size: 36, tone: "primary" as const, dur: 9,  delay: 0    },
  { top: "15%", left: "88%", size: 28, tone: "soft" as const,    dur: 11, delay: 1.2  },
  { top: "70%", left: "4%",  size: 32, tone: "accent" as const,  dur: 10, delay: 0.6  },
  { top: "78%", left: "92%", size: 26, tone: "primary" as const, dur: 12, delay: 2    },
  { top: "35%", left: "2%",  size: 22, tone: "soft" as const,    dur: 13, delay: 3    },
  { top: "48%", left: "94%", size: 30, tone: "primary" as const, dur: 10, delay: 1.6  },
  { top: "88%", left: "18%", size: 24, tone: "soft" as const,    dur: 11, delay: 2.4  },
  { top: "20%", left: "70%", size: 20, tone: "accent" as const,  dur: 14, delay: 0.3  },
];

export function FloatingBlossoms({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {BLOSSOMS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: b.top, left: b.left }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: [0, 0.9, 0.8, 0.9],
            y: [0, -12, 0, -8, 0],
            x: [0, 6, -4, 2, 0],
            rotate: [0, 8, -6, 4, 0],
            scale: [0.6, 1, 0.95, 1, 0.95],
          }}
          transition={{
            duration: b.dur,
            delay: b.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Bloom size={b.size} tone={b.tone} />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Horizontal floral divider ───────────────────────────────── */
/**
 * A thin hairline with a centered bloom and two leaves flanking it.
 * Use between sections to signal a "chapter break" without heavy padding.
 */
export function FloralDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 py-4 ${className}`}
      aria-hidden
    >
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-primary/30 sm:w-24" />
      <Sprig size={22} className="-scale-x-100 opacity-70" />
      <motion.span
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <Bloom size={22} tone="primary" />
      </motion.span>
      <Sprig size={22} className="opacity-70" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-primary/30 sm:w-24" />
    </div>
  );
}

/* ─── Sparkle burst (heading accent) ─────────────────────────── */
/**
 * 3 tiny sparkles that pulse out-of-sync. Absolute-positioned inside a
 * relative parent. Used to crown a heading without drawing too much eye.
 */
export function SparkleBurst({ className = "" }: { className?: string }) {
  const sparkles = [
    { x: 0,  y: 0,  size: 10, delay: 0   },
    { x: 18, y: -6, size: 6,  delay: 0.4 },
    { x: -6, y: 14, size: 7,  delay: 0.8 },
  ];
  return (
    <span
      className={`pointer-events-none absolute ${className}`}
      aria-hidden
    >
      {sparkles.map((s, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          width={s.size}
          height={s.size}
          fill="currentColor"
          className="absolute text-primary/70"
          style={{ left: s.x, top: s.y }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.7, 1.2, 0.7],
            rotate: [0, 45, 0],
          }}
          transition={{
            duration: 2.4,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* 4-pointed star — crisper than a 5-pointer at small sizes */}
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
        </motion.svg>
      ))}
    </span>
  );
}
