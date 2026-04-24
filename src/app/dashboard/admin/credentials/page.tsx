/**
 * Admin Credentials — send password setup / reset emails to enrolled students,
 * course by course. Useful when a student forgets their password or when a
 * guest-enrolled learner needs to claim their account.
 */
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { CredentialsForm } from "./credentials-form";

export default async function CredentialsPage() {
  const supabase = await createClient();

  const { data: offerings } = await supabase
    .from("offerings")
    .select("id, title")
    .order("title");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={KeyRound}
        title="Send Credentials"
        subtitle="Manually send password setup or reset links to students of a specific course."
      />
      <CredentialsForm offerings={offerings || []} />
    </div>
  );
}
