"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Password reset form. Two paths to a usable session:
 *   1. Link path — user clicked the reset email and /auth/callback
 *      verified a token, leaving an active recovery session in cookies.
 *   2. Code path — user pastes the 6-digit code from the email plus
 *      their email address. We call verifyOtp({ type: 'recovery' })
 *      directly, which works regardless of which device/browser the
 *      email was opened in and is immune to email-scanner pre-clicks.
 *
 * If neither path produced a session yet, we show the code-entry form
 * instead of a dead-end "expired" error.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [sessionState, setSessionState] = useState<
    "checking" | "ready" | "missing"
  >("checking");

  // Code-entry path (only used when sessionState === "missing").
  const [codeEmail, setCodeEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionState(data.session ? "ready" : "missing");
    });
  }, []);

  async function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = code.trim().replace(/\s+/g, "");
    if (!codeEmail.trim() || !trimmed) {
      toast.error("Please enter both your email and the 6-digit code.");
      return;
    }
    setVerifyingCode(true);
    try {
      const supabase = createClient();
      // verifyOtp with type "recovery" creates a session bound to the
      // user. If it succeeds we flip into the password form below; if it
      // fails the toast tells the user to request a fresh email.
      const { error } = await supabase.auth.verifyOtp({
        type: "recovery",
        email: codeEmail.trim(),
        token: trimmed,
      });
      if (error) {
        toast.error(
          error.message ||
            "That code didn't work. Request a fresh email and try again."
        );
        return;
      }
      setSessionState("ready");
      toast.success("Code accepted — set your new password.");
    } finally {
      setVerifyingCode(false);
    }
  }

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
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground">
            Enter the 6-digit code from your reset email.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The link in the email may have been pre-clicked by your inbox&apos;s
            spam scanner — entering the code below works regardless.
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="codeEmail">Your email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="codeEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="aisha@example.com"
                className="h-11 pl-10"
                value={codeEmail}
                onChange={(e) => setCodeEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code">6-digit code from email</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="h-11 tracking-[0.4em] text-center font-mono text-base"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Open the reset email — the code is shown right under the
              &ldquo;Reset password&rdquo; button.
            </p>
          </div>

          <Button
            type="submit"
            disabled={verifyingCode}
            className="h-11 w-full rounded-full text-sm font-semibold"
          >
            {verifyingCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Verify code
              </>
            )}
          </Button>
        </form>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Link
            href="/forgot-password"
            className={buttonVariants({
              variant: "outline",
              className: "h-10 flex-1 rounded-full text-sm font-medium",
            })}
          >
            Send a fresh email
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
              className: "h-10 flex-1 rounded-full text-sm font-medium",
            })}
          >
            Back to login
          </Link>
        </div>

        <details className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            <AlertCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            Why doesn&apos;t the link in the email just work?
          </summary>
          <ul className="mt-2 space-y-1.5 pl-4 list-disc">
            <li>
              Outlook and corporate Gmail accounts &ldquo;pre-click&rdquo; links
              to scan for malware — using up the one-time token before you do.
            </li>
            <li>
              Opening the email on a different device than where you requested
              the reset.
            </li>
            <li>The link is older than 24 hours.</li>
          </ul>
          <p className="mt-2">
            The 6-digit code path above bypasses all three. Still stuck? Email{" "}
            <a
              href="mailto:support@nisaalhuda.org"
              className="font-medium text-primary hover:underline"
            >
              support@nisaalhuda.org
            </a>
            .
          </p>
        </details>
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
