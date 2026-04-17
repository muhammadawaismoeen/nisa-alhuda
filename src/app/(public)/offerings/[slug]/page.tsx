/**
 * Offering Detail Page — shows full info about a program/course/workshop.
 * Dynamic route: /offerings/[slug]
 * Server Component with data fetching.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, Clock, Users, BookOpen, ArrowRight, MapPin, Wifi, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPriceWithFee } from "@/lib/constants";
import type { Offering, Subject, Profile } from "@/lib/types/database";

// Generate dynamic metadata for SEO
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

  // Fetch the offering
  const { data: offering } = await supabase
    .from("offerings")
    .select("*")
    .eq("slug", slug)
    .in("status", ["published", "archived"])
    .single<Offering>();

  if (!offering) notFound();

  // If it's a program, also fetch its subjects with instructor info
  let subjects: (Subject & { instructor: Profile })[] = [];
  if (offering.type === "program") {
    const { data } = await supabase
      .from("subjects")
      .select("*, instructor:profiles!subjects_instructor_id_fkey(*)")
      .eq("offering_id", offering.id)
      .order("sort_order", { ascending: true });

    subjects = (data as (Subject & { instructor: Profile })[]) || [];
  }

  // For courses/workshops, fetch the instructor
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
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* ─── Main Content (left 2/3) ─── */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8 order-2 lg:order-1">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge>{typeLabels[offering.type]}</Badge>
              {offering.type === "program" && (
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400">
                  Age 12+
                </Badge>
              )}
              <Badge variant="outline">
                {offering.mode === "onsite" ? <MapPin className="h-3 w-3 mr-1" /> : <Wifi className="h-3 w-3 mr-1" />}
                {offering.mode === "onsite" ? "Onsite" : offering.mode === "hybrid" ? "Hybrid" : "Online"}
              </Badge>
              {offering.is_new && (
                <Badge className="bg-amber-500 hover:bg-amber-500 text-white">New</Badge>
              )}
              {offering.is_ongoing && (
                <Badge className="bg-teal-600 hover:bg-teal-600 text-white inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  On-going
                </Badge>
              )}
              {offering.admission_closed && (
                <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Admission Closed
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {offering.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {offering.short_description}
            </p>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold mb-4">About This {typeLabels[offering.type]}</h2>
            <div className="prose prose-rose max-w-none text-muted-foreground whitespace-pre-line">
              {offering.description}
            </div>
          </div>

          {/* Subjects (for programs only) */}
          {offering.type === "program" && subjects.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Subjects Covered</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((subject) => (
                  <Card key={subject.id}>
                    <CardHeader className="pb-2">
                      <h3 className="font-semibold">{subject.title}</h3>
                    </CardHeader>
                    <CardContent>
                      {subject.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {subject.description}
                        </p>
                      )}
                      <p className="text-sm font-medium text-primary">
                        Instructor: {subject.instructor?.full_name || "TBA"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Instructor (for courses/workshops only — programs show per-subject instructors) */}
          {instructor && offering.type !== "program" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Instructor</h2>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{instructor.full_name}</p>
                  <p className="text-sm text-muted-foreground">Instructor</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Sidebar (right 1/3) ─── */}
        <div className="order-1 lg:order-2">
          <Card className="lg:sticky lg:top-24">
            {/* Thumbnail */}
            <div className="aspect-video bg-secondary kufic-pattern rounded-t-lg flex items-center justify-center">
              {offering.thumbnail_url ? (
                <img
                  src={offering.thumbnail_url}
                  alt={offering.title}
                  className="w-full h-full object-cover rounded-t-lg"
                />
              ) : (
                <BookOpen className="h-16 w-16 text-primary/20" />
              )}
            </div>

            <CardContent className="p-6 space-y-4">
              {/* Price */}
              <div className="text-3xl font-bold text-primary">
                {formatPriceWithFee(offering.price, offering.fee_type)}
              </div>
              {offering.fee_type === "monthly" && offering.price > 0 && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Billed monthly
                </p>
              )}
              {offering.price_inr && offering.price_inr > 0 && (
                <p className="text-xs text-muted-foreground -mt-2">
                  🇮🇳 India: ₹{Number(offering.price_inr).toLocaleString("en-IN")}
                  {offering.fee_type === "monthly" ? "/mo" : ""}
                </p>
              )}
              {offering.price_usd && offering.price_usd > 0 && (
                <p className="text-xs text-muted-foreground -mt-2">
                  🌍 International: ${Number(offering.price_usd).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 0, maximumFractionDigits: 2 }
                  )} USD
                  {offering.fee_type === "monthly" ? "/mo" : ""}
                </p>
              )}

              {/* Key Details */}
              <div className="space-y-3 text-sm">
                {offering.schedule_start && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Starts{" "}
                      {new Date(offering.schedule_start).toLocaleDateString(
                        "en-PK",
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </span>
                  </div>
                )}
                {offering.schedule_end && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Ends{" "}
                      {new Date(offering.schedule_end).toLocaleDateString(
                        "en-PK",
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </span>
                  </div>
                )}
                {offering.type === "program" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{subjects.length} subjects included</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  {offering.mode === "onsite" ? <MapPin className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                  <span>{offering.mode === "onsite" ? "Onsite" : offering.mode === "hybrid" ? "Hybrid" : "Online"}</span>
                </div>
              </div>

              {/* Enroll CTA */}
              {offering.admission_closed ? (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg py-3 text-center font-semibold flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" />
                  Admission Closed!
                </div>
              ) : (
                <LinkButton className="w-full" size="lg" href={`/offerings/${offering.slug}/enroll`}>
                    Enroll Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                </LinkButton>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Lifetime access to recordings & resources
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
