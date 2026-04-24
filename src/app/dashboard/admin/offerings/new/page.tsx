/**
 * New Offering Page — admin creates a new program, course, or workshop.
 */
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <PageHeader
        icon={Plus}
        eyebrow="Courses"
        title="Create new offering"
        subtitle="Add a new program, course, or workshop to your catalog."
      />

      <OfferingForm instructors={instructors || []} />
    </div>
  );
}
