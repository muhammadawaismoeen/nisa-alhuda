"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Loader2, Lock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
  const [password, setPassword] = useState("");
  const [sessionState, setSessionState] = useState<
    "checking" | "ready" | "missing"
  >("checking");

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
    const pwd = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (pwd.length < 8) {
      toast.error("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (pwd !== confirm) {
      toast.error("Passwords do not match.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwd });

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
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Verifying reset link…
      </div>
    );
  }

  if (sessionState === "missing") {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/forgot-password"
            className={buttonVariants({
              className: "h-11 flex-1 rounded-full text-sm font-semibold",
            })}
          >
            Request new link
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              variant: "outline",
              className: "h-11 flex-1 rounded-full text-sm font-semibold",
            })}
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  const strength = passwordStrength(password);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <PasswordInput
            id="password"
            name="password"
            placeholder="At least 8 characters"
            className="h-11 pl-10"
            required
            autoFocus
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {password.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex h-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i < strength.score ? strength.color : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className={`text-[11px] ${strength.textColor}`}>
              {strength.label}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm new password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <PasswordInput
            id="confirm"
            name="confirm"
            placeholder="Repeat your new password"
            className="h-11 pl-10"
            required
            minLength={8}
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
            Updating…
          </>
        ) : (
          <>
            <KeyRound className="mr-2 h-4 w-4" />
            Update Password
          </>
        )}
      </Button>
    </form>
  );
}

/**
 * Same scoring as the register form so both flows feel consistent.
 * Reset requires 8+ chars (vs. 6 for signup) so we mark anything under
 * 8 as weak regardless of composition.
 */
function passwordStrength(p: string) {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;

  if (score <= 1)
    return {
      score,
      label: "Weak — add length or symbols.",
      color: "bg-destructive/70",
      textColor: "text-destructive/80",
    };
  if (score === 2)
    return {
      score,
      label: "Okay — consider a longer password.",
      color: "bg-amber-500",
      textColor: "text-amber-700 dark:text-amber-400",
    };
  if (score === 3)
    return {
      score,
      label: "Good — strong enough.",
      color: "bg-emerald-500",
      textColor: "text-emerald-700 dark:text-emerald-400",
    };
  return {
    score,
    label: "Excellent — very secure.",
    color: "bg-emerald-600",
    textColor: "text-emerald-700 dark:text-emerald-400",
  };
}
