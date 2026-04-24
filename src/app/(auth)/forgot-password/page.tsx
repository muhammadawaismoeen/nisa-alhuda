import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={{
        prefix: "Remember your password?",
        label: "Log in",
        href: "/login",
      }}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
