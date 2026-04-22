/**
 * Admin Credentials — send password setup / reset emails to enrolled students,
 * course by course. Useful when a student forgets their password or when a
 * guest-enrolled learner needs to claim their account.
 */
import { createClient } from "@/lib/supabase/server";
import { CredentialsForm } from "./credentials-form";

export default async function CredentialsPage() {
  const supabase = await createClient();

  const { data: offerings } = await supabase
    .from("offerings")
    .select("id, title")
    .order("title");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Send Credentials</h1>
        <p className="text-muted-foreground">
          Manually send password setup or reset links to students of a specific
          course.
        </p>
      </div>
      <CredentialsForm offerings={offerings || []} />
    </div>
  );
}
