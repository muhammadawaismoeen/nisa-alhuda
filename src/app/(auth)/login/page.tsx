import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log In",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: redirectTo, error } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your journey of knowledge."
      footer={{
        prefix: "New here?",
        label: "Create an account",
        href: "/register",
      }}
    >
      {error === "auth_callback_failed" && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          The verification link has expired or is invalid. Please try again.
        </div>
      )}
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
