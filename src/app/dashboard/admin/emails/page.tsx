/**
 * Admin Email Broadcast — pick a template, choose audience, send.
 * Server component that fetches offerings for the audience picker.
 */
import { createClient } from "@/lib/supabase/server";
import { EmailBroadcastForm } from "./email-broadcast-form";

export default async function EmailBroadcastPage() {
  const supabase = await createClient();

  const { data: offerings } = await supabase
    .from("offerings")
    .select("id, title")
    .order("title");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Broadcast</h1>
        <p className="text-muted-foreground">
          Send heartwarming, Emaan-boosting emails to your students.
        </p>
      </div>
      <EmailBroadcastForm offerings={offerings || []} />
    </div>
  );
}
