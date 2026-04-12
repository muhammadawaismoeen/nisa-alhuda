/**
 * New Offering Page — admin creates a new program, course, or workshop.
 */
import { createClient } from "@/lib/supabase/server";
import { OfferingForm } from "../offering-form";

export default async function NewOfferingPage() {
  const supabase = await createClient();

  // Fetch instructors for the subject assignment dropdown
  const { data: instructors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "instructor")
    .order("full_name");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Offering</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new program, course, or workshop to your catalog.
        </p>
      </div>

      <OfferingForm instructors={instructors || []} />
    </div>
  );
}
