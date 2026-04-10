/**
 * Public Catalog Page — lists all published offerings.
 * Server Component: fetches data on the server for fast load + SEO.
 */
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { OfferingCard } from "@/components/catalog/offering-card";
import type { Offering } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Catalog",
  description:
    "Browse our programs, courses, and workshops in Islamic studies.",
};

export default async function CatalogPage() {
  const supabase = await createClient();

  // Fetch all published offerings, newest first
  const { data: offerings, error } = await supabase
    .from("offerings")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching offerings:", error);
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">Our Catalog</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Explore our programs, courses, and workshops. Find the right path for
          your Islamic learning journey.
        </p>
      </div>

      {!offerings || offerings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            New programs are coming soon. Please check back later!
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
