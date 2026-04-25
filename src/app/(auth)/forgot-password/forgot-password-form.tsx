"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const supabase = createClient();

    // Note: Supabase substitutes {{ .ConfirmationURL }} or {{ .TokenHash }}
    // in the email template, so the redirectTo here is only used by the
    // legacy PKCE flow. The current template uses a token_hash link that
    // routes through /auth/callback?type=recovery&next=/reset-password,
    // which is scanner-immune and works cross-device.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSentTo(email);
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="py-2 text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="font-heading text-lg font-semibold">
          Check your inbox
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{sentTo}</span>, we&apos;ve
          sent a password reset link. Links expire in 24 hours.
        </p>
        <div className="mt-5 rounded-xl border border-amber-200/60 bg-amber-50/60 p-4 text-left text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-semibold">If the link says &ldquo;expired&rdquo;, try this:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              Open the email in <span className="font-medium">the same browser</span>{" "}
              you used to request the reset (don&apos;t request on phone and click on laptop).
            </li>
            <li>
              If your inbox is corporate/Outlook, the security scanner may
              click the link before you do — request a fresh one and open it
              within 30 seconds.
            </li>
            <li>
              Still stuck? Reply to <span className="font-medium">support@nisaalhuda.org</span>{" "}
              and an admin will reset it manually.
            </li>
          </ul>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Don&apos;t see the email? Check your spam folder or try again in a minute.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="aisha@example.com"
            className="h-11 pl-10"
            required
            autoFocus
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-full text-sm font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Reset Link
          </>
        )}
      </Button>
    </form>
  );
}
