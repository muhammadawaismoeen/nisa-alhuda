/**
 * Edit Offering Page — admin edits an existing offering.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OfferingForm } from "../../offering-form";
import type { Offering, Subject } from "@/lib/types/database";

export default async function EditOfferingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the offering
  const { data: offering } = await supabase
    .from("offerings")
    .select("*")
    .eq("id", id)
    .single<Offering>();

  if (!offering) notFound();

  // Fetch subjects if it's a program
  let subjects: Subject[] = [];
  if (offering.type === "program") {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("offering_id", offering.id)
      .order("sort_order", { ascending: true });

    subjects = (data as Subject[]) || [];
  }

  // Fetch instructors for the subject assignment dropdown
  const { data: instructors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "instructor")
    .order("full_name");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Offering</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update the details of &ldquo;{offering.title}&rdquo;.
        </p>
      </div>

      <OfferingForm
        offering={offering}
        existingSubjects={subjects}
        instructors={instructors || []}
      />
    </div>
  );
}
