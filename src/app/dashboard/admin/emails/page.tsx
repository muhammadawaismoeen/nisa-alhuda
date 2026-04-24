/**
 * Admin Email Broadcast — pick a template, choose audience, send.
 * Server component that fetches offerings for the audience picker.
 */
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmailBroadcastForm } from "./email-broadcast-form";

export default async function EmailBroadcastPage() {
  const supabase = await createClient();

  const { data: offerings } = await supabase
    .from("offerings")
    .select("id, title")
    .order("title");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Mail}
        title="Email Broadcast"
        subtitle="Send heartwarming, Emaan-boosting emails to your students."
      />
      <EmailBroadcastForm offerings={offerings || []} />
    </div>
  );
}
