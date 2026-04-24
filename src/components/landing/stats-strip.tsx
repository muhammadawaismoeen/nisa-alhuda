"use client";

/**
 * Animated stats strip — number counters that tick up on scroll into view.
 * Intentionally light-touch: no giant hero numbers, just a trust quilt.
 *
 * Uses IntersectionObserver → raf counter. No external lib needed.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 12, suffix: "+", label: "Active programs" },
  { value: 500, suffix: "+", label: "Sisters enrolled" },
  { value: 15, suffix: "+", label: "Countries" },
  { value: 98, suffix: "%", label: "Completion rate" },
];

export function StatsStrip() {
  return (
    <section className="relative border-y border-primary/10 bg-gradient-to-br from-secondary/40 via-background to-secondary/30">
      <div className="container mx-auto px-4 py-14 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((s, i) => (
            <StatCell key={s.label} stat={s} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCell({ stat, delay }: { stat: Stat; delay: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const duration = 1400;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              // easeOutCubic
              const eased = 1 - Math.pow(1 - t, 3);
              setValue(Math.round(stat.value * eased));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stat.value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="font-heading text-3xl font-bold tabular-nums text-primary sm:text-4xl md:text-5xl">
        {value.toLocaleString()}
        {stat.suffix}
      </div>
      <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
        {stat.label}
      </div>
    </motion.div>
  );
}
