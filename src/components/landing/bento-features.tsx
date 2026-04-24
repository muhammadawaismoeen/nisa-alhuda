"use client";

/**
 * Bento features grid — 5 cells, asymmetric layout.
 *
 * Layout (md+):
 *   ┌────────────┬──────┐
 *   │ live 2x2   │ chat │
 *   │            ├──────┤
 *   │            │ pace │
 *   ├──────┬─────┴──────┤
 *   │ prog │ community  │
 *   └──────┴────────────┘
 *
 * Mobile collapses to a single column. Each cell has a unique visual treatment
 * (the "live" one gets an animated pulse, the "community" one gets marching
 * avatars, etc.) so the grid feels composed rather than repetitive.
 */
import { motion } from "motion/react";
import {
  Video,
  MessageCircle,
  GraduationCap,
  BookOpen,
  Users,
} from "lucide-react";

export function BentoFeatures() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Section intro */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Built for Muslimahs
          </span>
          <h2 className="font-heading mt-3 text-balance text-3xl font-bold sm:text-4xl md:text-5xl">
            Everything you need, in one place
          </h2>
          <p className="mt-4 text-muted-foreground">
            A learning ecosystem that fits around your life — prayer times,
            homeschool, motherhood, and all.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="mx-auto grid max-w-6xl auto-rows-[minmax(200px,auto)] grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-3">
          {/* ─── Cell 1: Live classes (hero cell, 2x2) ─── */}
          <BentoCell className="md:col-span-2 md:row-span-2">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  LIVE
                </div>
                <h3 className="font-heading mt-4 text-2xl font-bold sm:text-3xl">
                  Live classes with qualified instructors
                </h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                  Join real-time sessions, ask questions, and get personal
                  feedback. Every class is recorded — revisit anytime.
                </p>
              </div>

              {/* Decorative mock video tile */}
              <div className="relative mt-6 overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-rose-50 via-background to-rose-100/50 p-5 dark:from-rose-950/20 dark:via-card dark:to-rose-900/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="h-2.5 w-32 rounded-full bg-primary/20" />
                    <div className="mt-1.5 h-2 w-20 rounded-full bg-primary/10" />
                  </div>
                  <div className="flex h-6 items-center rounded-full bg-primary px-2 text-[10px] font-semibold uppercase text-primary-foreground">
                    Join
                  </div>
                </div>
                {/* Equalizer bars hinting at audio */}
                <div className="mt-4 flex items-end gap-1">
                  {[40, 70, 50, 90, 60, 80, 45, 75, 55, 85, 50, 70].map(
                    (h, i) => (
                      <motion.span
                        key={i}
                        className="block w-1 rounded-full bg-primary/60"
                        style={{ height: `${h / 4}px` }}
                        animate={{
                          height: [
                            `${h / 4}px`,
                            `${(h / 4) * 1.6}px`,
                            `${h / 4}px`,
                          ],
                        }}
                        transition={{
                          duration: 1 + (i % 3) * 0.2,
                          repeat: Infinity,
                          delay: i * 0.08,
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </BentoCell>

          {/* ─── Cell 2: Community chat ─── */}
          <BentoCell>
            <div className="flex h-full flex-col">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="font-heading mt-4 text-lg font-semibold">
                Group discussions
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Private chat channels for every course. Ask instructors and
                bond with sisters.
              </p>
              {/* Chat bubble stack */}
              <div className="mt-auto space-y-1.5 pt-4">
                <div className="ml-auto max-w-[75%] rounded-xl rounded-br-sm bg-primary/10 px-3 py-1.5 text-[11px] text-primary">
                  JazakAllah, ustadha 💗
                </div>
                <div className="max-w-[75%] rounded-xl rounded-bl-sm bg-muted px-3 py-1.5 text-[11px] text-muted-foreground">
                  Alhamdulillah, barakAllahu feeki
                </div>
              </div>
            </div>
          </BentoCell>

          {/* ─── Cell 3: Learn at your pace ─── */}
          <BentoCell>
            <div className="flex h-full flex-col">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="font-heading mt-4 text-lg font-semibold">
                Learn at your pace
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Lifetime access to recordings &amp; resources. Rewatch, pause,
                revisit as often as you like.
              </p>
            </div>
          </BentoCell>

          {/* ─── Cell 4: Structured programs ─── */}
          <BentoCell>
            <div className="flex h-full flex-col">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-heading mt-4 text-lg font-semibold">
                Structured curricula
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Fiqh, Arabic, Hadith, and Qur&apos;an — sequenced so each
                lesson builds on the last.
              </p>
            </div>
          </BentoCell>

          {/* ─── Cell 5: Community (wide) ─── */}
          <BentoCell className="md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-heading mt-4 text-lg font-semibold">
                  A sisters-only community
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Safe, private, and moderated. Learn alongside sisters who
                  genuinely want you to succeed.
                </p>
              </div>

              {/* Avatar cluster */}
              <div className="flex shrink-0 -space-x-2">
                {[
                  "bg-rose-200",
                  "bg-rose-300",
                  "bg-rose-400",
                  "bg-rose-500",
                  "bg-rose-600",
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`h-9 w-9 rounded-full border-2 border-background ${c} ring-1 ring-primary/10`}
                  />
                ))}
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground">
                  +
                </div>
              </div>
            </div>
          </BentoCell>
        </div>
      </div>
    </section>
  );
}

/** Single bento cell — glass card with viewport-triggered fade-up. */
function BentoCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${className}`}
    >
      {children}
    </motion.div>
  );
}
