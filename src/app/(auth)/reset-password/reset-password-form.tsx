"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

/**
 * Password reset form. Expects the user to land here with an active
 * recovery session — which is only true if they came through
 * /auth/callback (which exchanges the ?code= for a session). If no
 * session exists we show an expired-link error instead of a form that
 * would silently fail on submit.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState<
    "checking" | "ready" | "missing"
  >("checking");

  // Verify a session exists before showing the form. If not, the user
  // probably clicked an expired/invalid link or the callback failed.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionState(data.session ? "ready" : "missing");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      toast.error("Passwords do not match.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Password updated successfully!");
    router.push("/dashboard");
    router.refresh();
  }

  if (sessionState === "checking") {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Verifying reset link...
      </div>
    );
  }

  if (sessionState === "missing") {
    return (
      <div className="space-y-4 py-4">
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-destructive">
              This reset link is invalid or has expired.
            </p>
            <p className="text-sm text-muted-foreground">
              Reset links expire after one use or 24 hours. Request a new one
              below — or ask an admin to re-send it.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/forgot-password"
            className={buttonVariants({ className: "flex-1" })}
          >
            Request new link
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", className: "flex-1" })}
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="At least 8 characters"
          required
          autoFocus
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm New Password</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          placeholder="Confirm your new password"
          required
          minLength={8}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}
