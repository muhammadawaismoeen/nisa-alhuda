"use client";

/**
 * Registration form — creates a new student account via Supabase signUp.
 * Adds a live password-strength meter so sisters know at a glance when their
 * password is acceptable (≥ 6 chars enforced, good practice encouraged).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("full_name") as string;
    const email = formData.get("email") as string;
    const pwd = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (pwd.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (pwd !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! Please check your email to verify.");
    router.push("/login");
  }

  const strength = passwordStrength(password);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="full_name"
            name="full_name"
            placeholder="Aisha Ahmed"
            className="h-11 pl-10"
            required
            autoFocus
          />
        </div>
      </div>

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
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <PasswordInput
            id="password"
            name="password"
            placeholder="At least 6 characters"
            className="h-11 pl-10"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {/* Strength meter — only renders once the user starts typing */}
        {password.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex h-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i < strength.score
                      ? strength.color
                      : "bg-muted"
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
        <Label htmlFor="confirm_password">Confirm password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <PasswordInput
            id="confirm_password"
            name="confirm_password"
            placeholder="Repeat your password"
            className="h-11 pl-10"
            required
            minLength={6}
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
            Creating account…
          </>
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Create Account
          </>
        )}
      </Button>
    </form>
  );
}

/**
 * Lightweight password strength scoring — intentionally simple, not zxcvbn.
 * Score range 0–4 drives how many bars fill in the meter.
 */
function passwordStrength(p: string) {
  let score = 0;
  if (p.length >= 6) score++;
  if (p.length >= 10) score++;
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
