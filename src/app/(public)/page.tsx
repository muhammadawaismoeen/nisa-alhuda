/**
 * Landing page — the first thing visitors see.
 *
 * Architecture:
 *   - Server component fetches featured offerings
 *   - All visual components are imported from /components/landing
 *   - Sections ordered to guide the eye: hook → proof → offer → features →
 *     testimonials → close
 */
import { createClient } from "@/lib/supabase/server";
import type { Offering } from "@/lib/types/database";

import { AnimatedHero } from "@/components/landing/animated-hero";
import { StatsStrip } from "@/components/landing/stats-strip";
import { BentoFeatures } from "@/components/landing/bento-features";
import { TestimonialsMarquee } from "@/components/landing/testimonials-marquee";
import { SpotlightCTA } from "@/components/landing/spotlight-cta";
import { OfferingCard } from "@/components/landing/offering-card";
import { FloralDivider } from "@/components/landing/florals";
import { LinkButton } from "@/components/ui/link-button";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: offerings } = await supabase
    .from("offerings")
    .select("*")
    .eq("status", "published")
    .order("is_new", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const list = (offerings ?? []) as Offering[];

  return (
    <div>
      {/* ─── Hero ─── */}
      <AnimatedHero />

      {/* ─── Trust: social proof stats ─── */}
      <StatsStrip />

      <FloralDivider className="container mx-auto px-4" />

      {/* ─── Qur'anic Ayah ─── */}
      <section className="relative overflow-hidden py-16">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/20 to-background"
        />
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              From the Noble Qur&apos;an
            </span>
            <p
              className="font-heading mt-5 text-xl leading-loose text-foreground/90 md:text-2xl lg:text-3xl"
              dir="rtl"
              lang="ar"
            >
              يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ إِذَا قِيلَ لَكُمْ تَفَسَّحُوا۟
              فِى ٱلْمَجَـٰلِسِ فَٱفْسَحُوا۟ يَفْسَحِ ٱللَّهُ لَكُمْ ۖ وَإِذَا
              قِيلَ ٱنشُزُوا۟ فَٱنشُزُوا۟ يَرْفَعِ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟
              مِنكُمْ وَٱلَّذِينَ أُوتُوا۟ ٱلْعِلْمَ دَرَجَـٰتٍۢ
            </p>
            <p className="mt-5 text-base italic leading-relaxed text-muted-foreground md:text-lg">
              &ldquo;Allah will raise those who have believed among you and
              those who were given knowledge, by degrees.&rdquo;
            </p>
            <p className="mt-3 text-sm font-medium text-primary">
              Surah Al-Mujadila (58:11)
            </p>
          </div>
        </div>
      </section>

      {/* ─── Available offerings ─── */}
      {list.length > 0 && (
        <section className="relative py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Start learning today
              </span>
              <h2 className="font-heading mt-3 text-balance text-3xl font-bold sm:text-4xl md:text-5xl">
                Programs open for enrollment
              </h2>
              <p className="mt-4 text-muted-foreground">
                New cohorts are added every month. Reserve your seat before
                registration closes.
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((offering) => (
                <OfferingCard key={offering.id} offering={offering} />
              ))}
            </div>

            <div className="mt-10 text-center">
              <LinkButton
                variant="outline"
                href="/catalog"
                className="press rounded-full"
              >
                View full catalog
                <ArrowRight className="ml-2 h-4 w-4" />
              </LinkButton>
            </div>
          </div>
        </section>
      )}

      <FloralDivider className="container mx-auto px-4" />

      {/* ─── Bento features ─── */}
      <BentoFeatures />

      {/* ─── Hadith ─── */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl rounded-3xl border border-primary/10 bg-card/60 px-6 py-12 backdrop-blur-sm sm:px-10">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Prophetic Wisdom
            </span>
            <p
              className="font-heading mt-5 text-2xl leading-relaxed text-foreground/90 md:text-3xl"
              dir="rtl"
              lang="ar"
            >
              طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ
            </p>
            <p className="mt-5 text-base italic leading-relaxed text-muted-foreground md:text-lg">
              &ldquo;Seeking knowledge is an obligation upon every Muslim.&rdquo;
            </p>
            <p className="mt-3 text-sm font-medium text-primary">
              Sunan Ibn Majah 224 &middot; Graded Sahih by Al-Albani
            </p>
          </div>
        </div>
      </section>

      <FloralDivider className="container mx-auto px-4" />

      {/* ─── Testimonials ─── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Student voices
            </span>
            <h2 className="font-heading mt-3 text-balance text-3xl font-bold sm:text-4xl md:text-5xl">
              Loved by sisters worldwide
            </h2>
            <p className="mt-4 text-muted-foreground">
              Real stories from students who have transformed their lives
              through knowledge.
            </p>
          </div>
        </div>
        <TestimonialsMarquee />
      </section>

      {/* ─── Closing CTA ─── */}
      <SpotlightCTA />
    </div>
  );
}
