/**
 * Edit Offering Page — admin edits an existing offering.
 */
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <PageHeader
        icon={Pencil}
        eyebrow="Courses"
        title="Edit offering"
        subtitle={`Update the details of "${offering.title}".`}
      />

      <OfferingForm
        offering={offering}
        existingSubjects={subjects}
        instructors={instructors || []}
      />
    </div>
  );
}
