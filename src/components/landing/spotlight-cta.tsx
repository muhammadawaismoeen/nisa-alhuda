"use client";

/**
 * Spotlight CTA — cursor-follow radial glow behind the closing call-to-action.
 * The `--x`/`--y` CSS variables get updated on mousemove so the radial-gradient
 * in `.spotlight` tracks the cursor. On touch (no pointer) the gradient centers.
 */
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SpotlightCTA() {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  return (
    <section className="px-4 py-20 md:py-28">
      <div
        ref={ref}
        onMouseMove={handleMove}
        className="spotlight relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-rose-700 px-6 py-16 text-center text-primary-foreground sm:px-12 sm:py-20 md:px-16 md:py-24"
      >
        {/* Decorative grid overlay */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Kufic corner mark (top-left) */}
        <div
          aria-hidden
          className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -right-8 -bottom-8 h-56 w-56 rounded-full bg-rose-300/20 blur-3xl"
        />

        <div className="relative">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
            Ready when you are
          </span>
          <h2 className="font-heading mt-5 text-balance text-3xl font-bold sm:text-4xl md:text-5xl">
            Begin your journey of knowledge
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/90 sm:text-base">
            Join our sisterhood and take the first step toward deepening your
            understanding of the Deen — with teachers who care and a community
            that keeps you going.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/catalog"
              className="group inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-primary shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              View available programs
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-7 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
