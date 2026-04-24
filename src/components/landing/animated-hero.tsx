"use client";

/**
 * Animated hero — the first impression.
 *
 * Composition:
 *   - Aurora blob backdrop + grid-fade + Kufic pattern (layered, all CSS).
 *   - "Badge" pill with dot pulse.
 *   - H1 with a rotating keyword (`Fiqh → Arabic → Hadith → Qur'an`) using
 *     motion's AnimatePresence — springs in vertically, fades out up.
 *   - Staggered paragraph + dual CTA.
 *   - Trust strip (counts) just below CTAs — tiny, unobtrusive.
 *
 * All animations respect `prefers-reduced-motion` via motion's built-in handling.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { FloatingBlossoms, SparkleBurst } from "./florals";

const ROTATING_WORDS = ["Fiqh", "Arabic", "Hadith", "Qur'an"] as const;

export function AnimatedHero() {
  const [wordIndex, setWordIndex] = useState(0);

  // Cycle keyword every 2.4s — long enough to read, short enough to feel alive.
  useEffect(() => {
    const t = setInterval(
      () => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length),
      2400
    );
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative overflow-hidden py-20 md:py-28 lg:py-36">
      {/* Background layers (farthest → nearest) */}
      <div className="absolute inset-0 -z-30 aurora" aria-hidden />
      <div className="absolute inset-0 -z-20 grid-fade" aria-hidden />
      <div className="absolute inset-0 -z-10 kufic-pattern opacity-40" aria-hidden />

      {/* Drifting blossoms — decorative, hugging the edges so they don't crowd the headline */}
      <FloatingBlossoms className="-z-10" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/60 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-md shadow-sm dark:bg-card/60"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Sparkles className="h-3.5 w-3.5" />
            <span>A Sisterhood Learning Community</span>
          </motion.div>

          {/* Headline with rotating keyword */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="font-heading relative mt-7 text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            <SparkleBurst className="-top-4 left-1/2 -translate-x-[18rem] sm:-top-6" />
            Deepen your understanding of
            <span className="relative mt-3 block h-[1.15em] overflow-hidden text-primary">
              <AnimatePresence mode="wait">
                <motion.span
                  key={ROTATING_WORDS[wordIndex]}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-110%", opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {ROTATING_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Live programs, courses, and workshops led by qualified instructors —
            designed exclusively for sisters seeking authentic Islamic education.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/catalog"
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center">
                Explore Programs
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
              {/* Shimmer overlay */}
              <span className="absolute inset-0 shimmer opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background/60 px-7 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-muted active:scale-[0.98]"
            >
              Create Free Account
            </Link>
          </motion.div>

          {/* Trust micro-strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-primary/60" />
              Live classes with recordings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-primary/60" />
              Qualified female instructors
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-primary/60" />
              Private sisters-only community
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
