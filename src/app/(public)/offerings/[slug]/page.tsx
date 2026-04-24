/**
 * Offering detail — revamped.
 *
 * Layout:
 *   - Full-width hero banner with aurora backdrop, type chips, title, subhead
 *   - Two-column body: "About" + subjects/instructor on left, sticky glass
 *     enrollment card on right (floats to top on mobile)
 *   - Subject cards carry a subtle gradient + instructor chip
 *
 * Data fetching is unchanged from the previous version.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  ArrowRight,
  MapPin,
  Wifi,
  Lock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatPriceWithFee } from "@/lib/constants";
import type { Offering, Subject, Profile } from "@/lib/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: offering } = await supabase
    .from("offerings")
    .select("title, short_description")
    .eq("slug", slug)
    .single();

  if (!offering) return { title: "Not Found" };

  return {
    title: offering.title,
    description: offering.short_description || undefined,
  };
}

export default async function OfferingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: offering } = await supabase
    .from("offerings")
    .select("*")
    .eq("slug", slug)
    .in("status", ["published", "archived"])
    .single<Offering>();

  if (!offering) notFound();

  let subjects: (Subject & { instructor: Profile })[] = [];
  if (offering.type === "program") {
    const { data } = await supabase
      .from("subjects")
      .select("*, instructor:profiles!subjects_instructor_id_fkey(*)")
      .eq("offering_id", offering.id)
      .order("sort_order", { ascending: true });
    subjects = (data as (Subject & { instructor: Profile })[]) || [];
  }

  let instructor: Profile | null = null;
  if (offering.instructor_id) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", offering.instructor_id)
      .single<Profile>();
    instructor = data;
  }

  const typeLabels = {
    program: "Program",
    course: "Course",
    workshop: "Workshop",
    class: "Class",
  } as const;

  const modeLabel =
    offering.mode === "onsite"
      ? "Onsite"
      : offering.mode === "hybrid"
      ? "Hybrid"
      : "Online";
  const ModeIcon = offering.mode === "onsite" ? MapPin : Wifi;

  return (
    <div>
      {/* ─── Hero banner ─── */}
      <section className="relative overflow-hidden py-14 md:py-20">
        <div className="absolute inset-0 -z-20 aurora opacity-60" aria-hidden />
        <div className="absolute inset-0 -z-10 grid-fade" aria-hidden />

        <div className="container relative mx-auto px-4">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back to catalog
          </Link>

          <div className="mt-6 max-w-3xl">
            {/* Chips */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge>{typeLabels[offering.type]}</Badge>
              {offering.type === "program" && (
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 dark:text-emerald-400"
                >
                  Age 12+
                </Badge>
              )}
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1"
              >
                <ModeIcon className="h-3 w-3" />
                {modeLabel}
              </Badge>
              {offering.is_new && (
                <Badge className="inline-flex items-center gap-1 bg-amber-500 text-white hover:bg-amber-500">
                  <Sparkles className="h-3 w-3" />
                  New
                </Badge>
              )}
              {offering.is_ongoing && (
                <Badge className="inline-flex items-center gap-1 bg-teal-600 text-white hover:bg-teal-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  On-going
                </Badge>
              )}
              {offering.admission_closed && (
                <Badge className="inline-flex items-center gap-1 bg-destructive text-destructive-foreground hover:bg-destructive">
                  <Lock className="h-3 w-3" />
                  Admission Closed
                </Badge>
              )}
            </div>

            <h1 className="font-heading text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              {offering.title}
            </h1>

            {offering.short_description && (
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                {offering.short_description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ─── Body ─── */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left: content */}
            <div className="space-y-10 lg:col-span-2">
              {/* About */}
              <div>
                <h2 className="font-heading text-2xl font-bold">
                  About this {typeLabels[offering.type].toLowerCase()}
                </h2>
                <div className="mt-4 whitespace-pre-line text-muted-foreground">
                  {offering.description}
                </div>
              </div>

              {/* Subjects (programs) */}
              {offering.type === "program" && subjects.length > 0 && (
                <div>
                  <h2 className="font-heading text-2xl font-bold">
                    Subjects covered
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-primary/30"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading text-base font-semibold">
                              {subject.title}
                            </h3>
                            {subject.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {subject.description}
                              </p>
                            )}
                            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              <Users className="h-3 w-3" />
                              {subject.instructor?.full_name || "Instructor TBA"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructor (non-programs) */}
              {instructor && offering.type !== "program" && (
                <div>
                  <h2 className="font-heading text-2xl font-bold">
                    Your instructor
                  </h2>
                  <div className="mt-4 flex items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-heading text-base font-semibold">
                        {instructor.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Instructor
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* What's included (static quality list) */}
              <div>
                <h2 className="font-heading text-2xl font-bold">
                  What&apos;s included
                </h2>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    "Live classes with recordings",
                    "Lifetime access to resources",
                    "Private sisters-only group chat",
                    "Certificate of completion",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: sticky enrollment card */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <div className="overflow-hidden rounded-3xl border border-primary/15 bg-card/80 shadow-xl shadow-primary/5 backdrop-blur-md">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-rose-100 via-background to-rose-50 kufic-pattern relative">
                    {offering.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={offering.thumbnail_url}
                        alt={offering.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BookOpen className="h-16 w-16 text-primary/25" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 p-6">
                    {/* Price */}
                    <div>
                      <div className="font-heading text-3xl font-bold text-primary">
                        {formatPriceWithFee(offering.price, offering.fee_type)}
                      </div>
                      {offering.fee_type === "monthly" &&
                        offering.price > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Billed monthly
                          </p>
                        )}
                      {offering.price_inr && offering.price_inr > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          🇮🇳 India: ₹
                          {Number(offering.price_inr).toLocaleString("en-IN")}
                          {offering.fee_type === "monthly" ? "/mo" : ""}
                        </p>
                      )}
                      {offering.price_usd && offering.price_usd > 0 && (
                        <p className="text-xs text-muted-foreground">
                          🌍 Intl: $
                          {Number(offering.price_usd).toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}{" "}
                          USD
                          {offering.fee_type === "monthly" ? "/mo" : ""}
                        </p>
                      )}
                    </div>

                    <div className="h-px bg-border/60" />

                    {/* Key details */}
                    <div className="space-y-2.5 text-sm">
                      {offering.schedule_start && (
                        <Row icon={<Calendar className="h-4 w-4" />}>
                          Starts{" "}
                          {new Date(
                            offering.schedule_start
                          ).toLocaleDateString("en-PK", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Row>
                      )}
                      {offering.schedule_end && (
                        <Row icon={<Clock className="h-4 w-4" />}>
                          Ends{" "}
                          {new Date(offering.schedule_end).toLocaleDateString(
                            "en-PK",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </Row>
                      )}
                      {offering.type === "program" && (
                        <Row icon={<BookOpen className="h-4 w-4" />}>
                          {subjects.length} subjects included
                        </Row>
                      )}
                      <Row icon={<ModeIcon className="h-4 w-4" />}>
                        {modeLabel}
                      </Row>
                    </div>

                    {/* CTA */}
                    {offering.admission_closed ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 py-3 text-sm font-semibold text-destructive">
                        <Lock className="h-4 w-4" />
                        Admission Closed
                      </div>
                    ) : (
                      <Link
                        href={`/offerings/${offering.slug}/enroll`}
                        className="group flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
                      >
                        Enroll Now
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    )}

                    <p className="text-center text-[11px] text-muted-foreground">
                      Lifetime access to recordings &amp; resources
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-primary/70">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
