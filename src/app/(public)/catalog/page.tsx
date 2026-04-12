/**
 * Public Catalog Page — lists offerings with Active/Archived tabs.
 * Server Component: fetches data on the server for fast load + SEO.
 */
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { OfferingCard } from "@/components/catalog/offering-card";
import { LinkButton } from "@/components/ui/link-button";
import { Archive } from "lucide-react";
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

  const { data: offerings, error } = await supabase
    .from("offerings")
    .select("*")
    .eq("status", isArchived ? "archived" : "published")
    .order("is_new", { ascending: false })
    .order("schedule_start", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Error fetching offerings:", error);
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">Our Catalog</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Explore our programs, courses, and workshops. Find the right path for
          your Islamic learning journey.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        <LinkButton
          href="/catalog"
          variant={!isArchived ? "default" : "outline"}
          size="sm"
        >
          Active
        </LinkButton>
        <LinkButton
          href="/catalog?tab=archived"
          variant={isArchived ? "default" : "outline"}
          size="sm"
        >
          <Archive className="h-3.5 w-3.5 mr-1.5" />
          Archived
        </LinkButton>
      </div>

      {!offerings || offerings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            {isArchived
              ? "No archived offerings yet."
              : "New programs are coming soon. Please check back later!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offerings.map((offering: Offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </div>
      )}
    </div>
  );
}
