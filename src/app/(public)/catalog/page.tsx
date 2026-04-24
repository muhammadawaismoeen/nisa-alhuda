/**
 * Public catalog page — lists offerings with Active / Archived tabs.
 *
 * Layout upgrade:
 *   - Hero banner with aurora backdrop (matches landing style)
 *   - Sticky tab pill group with animated indicator
 *   - Bigger empty state with a CTA back home
 *   - Uses the unified OfferingCard with border-beam hover
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Archive, BookOpen, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OfferingCard } from "@/components/landing/offering-card";
import { FloatingBlossoms, FloralDivider } from "@/components/landing/florals";
import type { Offering } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Catalog",
  description:
    "Browse our programs, courses, and workshops in Islamic studies.",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const isArchived = tab === "archived";
  const supabase = await createClient();

  const { data: offerings } = await supabase
    .from("offerings")
    .select("*")
    .eq("status", isArchived ? "archived" : "published")
    .order("is_new", { ascending: false })
    .order("schedule_start", { ascending: false, nullsFirst: false });

  const list = (offerings ?? []) as Offering[];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-20">
        <div className="absolute inset-0 -z-20 aurora opacity-60" aria-hidden />
        <div className="absolute inset-0 -z-10 grid-fade" aria-hidden />
        <FloatingBlossoms className="-z-10" />

        <div className="container relative mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/60 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-md dark:bg-card/60">
            <Sparkles className="h-3.5 w-3.5" />
            Current catalog
          </div>
          <h1 className="font-heading mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Find your path of knowledge
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            Browse our programs, courses, and workshops. Every offering is led
            by qualified female instructors and includes lifetime access to
            recordings.
          </p>

          {/* Tabs — animated pill group */}
          <div className="mt-10 inline-flex rounded-full border border-border/60 bg-background/70 p-1 backdrop-blur-md">
            <Link
              href="/catalog"
              className={`inline-flex h-9 items-center rounded-full px-5 text-sm font-medium transition-all ${
                !isArchived
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Active
            </Link>
            <Link
              href="/catalog?tab=archived"
              className={`inline-flex h-9 items-center rounded-full px-5 text-sm font-medium transition-all ${
                isArchived
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archived
            </Link>
          </div>
        </div>
      </section>

      <FloralDivider className="container mx-auto px-4" />

      {/* Grid */}
      <section className="pb-20 pt-4">
        <div className="container mx-auto px-4">
          {list.length === 0 ? (
            <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card/60 px-6 py-16 text-center backdrop-blur-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <h2 className="font-heading mt-5 text-lg font-semibold">
                {isArchived
                  ? "Nothing archived yet"
                  : "New programs coming soon"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isArchived
                  ? "Past cohorts will appear here once they close."
                  : "Check back soon, or create a free account to be notified when enrollment opens."}
              </p>
              {!isArchived && (
                <Link
                  href="/register"
                  className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
                >
                  Create free account
                </Link>
              )}
            </div>
          ) : (
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((offering) => (
                <OfferingCard key={offering.id} offering={offering} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
