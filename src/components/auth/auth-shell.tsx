"use client";

/**
 * AuthShell — split-screen layout used by all auth pages.
 *
 * Desktop (lg+):
 *   ┌─────────────────────┬──────────────────┐
 *   │  Decorative panel   │  Form            │
 *   │  (aurora + florals  │  (glass card)    │
 *   │   + rotating ayah)  │                  │
 *   └─────────────────────┴──────────────────┘
 *
 * Mobile: panel collapses to a compact 24vh top banner so the form has
 * enough room above the fold.
 *
 * Props let individual pages customize title/subtitle/footer link text
 * while the shell owns the visual framing + animations.
 */
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import {
  FloatingBlossoms,
  Bloom,
  Sprig,
} from "@/components/landing/florals";
import { APP_TAGLINE } from "@/lib/constants";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Link shown at the bottom of the form card, e.g. { label: "Register", href: "/register", prefix: "Don't have an account?" } */
  footer?: {
    prefix: string;
    label: string;
    href: string;
  };
}

/**
 * Rotated Qur'anic verses shown on the decorative panel. Keeps the auth
 * experience feeling spiritually grounded. We don't rotate these client-side
 * (would require JS + state) — instead, a random one is picked at render and
 * that's fine because SSR means each page load gets fresh content.
 */
const VERSES = [
  {
    arabic: "وَقُل رَّبِّ زِدْنِى عِلْمًۭا",
    translation: "My Lord, increase me in knowledge.",
    ref: "Surah Ta-Ha (20:114)",
  },
  {
    arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا",
    translation: "Indeed, with hardship comes ease.",
    ref: "Surah Ash-Sharh (94:6)",
  },
  {
    arabic: "وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥٓ",
    translation:
      "Whoever places their trust in Allah, He is sufficient for them.",
    ref: "Surah At-Talaq (65:3)",
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  // Deterministic-ish pick based on title so page reloads don't always
  // flash a different verse (still varies across different auth pages).
  const verse = VERSES[title.length % VERSES.length];

  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* ─── Decorative panel ─── */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-[#C55B7A] via-[#B55A75] to-[#7A3E55] px-8 py-10 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-12 lg:py-16">
        {/* Layered decoration */}
        <div className="absolute inset-0 opacity-[0.08]" aria-hidden>
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>
        <div
          aria-hidden
          className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-rose-300/20 blur-3xl"
        />
        <FloatingBlossoms />

        {/* Top row: back-to-home link */}
        <div className="relative flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to home
          </Link>
          <div className="hidden lg:block">
            <Sprig size={28} className="opacity-60 [&_*]:!stroke-white/70" />
          </div>
        </div>

        {/* Middle: inspirational content (hidden on mobile so banner stays compact) */}
        <div className="relative mt-8 hidden lg:mt-0 lg:block">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider backdrop-blur-sm">
              <Bloom size={14} tone="soft" />
              A space to learn
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            dir="rtl"
            lang="ar"
            className="font-heading mt-8 text-3xl leading-loose md:text-4xl"
          >
            {verse.arabic}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mt-4 text-base italic text-white/90 md:text-lg"
          >
            &ldquo;{verse.translation}&rdquo;
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-white/70"
          >
            {verse.ref}
          </motion.p>
        </div>

        {/* Bottom: tagline */}
        <div className="relative mt-6 hidden lg:block">
          <div className="flex items-center gap-3 text-sm text-white/80">
            <Sprig size={24} className="-scale-x-100 opacity-60 [&_*]:!stroke-white/70" />
            {APP_TAGLINE}
            <Sprig size={24} className="opacity-60 [&_*]:!stroke-white/70" />
          </div>
        </div>
      </aside>

      {/* ─── Form side ─── */}
      <main className="relative flex min-h-[70vh] items-center justify-center px-4 py-10 sm:px-8 lg:min-h-screen lg:py-16">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 -z-10 grid-fade opacity-70" aria-hidden />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo (mobile only, since the panel shows it on desktop indirectly via branding) */}
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo size="sm" />
          </div>

          {/* Title */}
          <div className="mb-7 text-center">
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2.5 text-sm text-muted-foreground sm:text-base">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form body */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-lg shadow-primary/5 backdrop-blur-sm sm:p-8">
            {children}
          </div>

          {/* Footer link */}
          {footer && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footer.prefix}{" "}
              <Link
                href={footer.href}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {footer.label}
              </Link>
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
