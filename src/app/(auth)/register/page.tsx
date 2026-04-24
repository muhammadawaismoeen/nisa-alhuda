import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join our sisterhood learning community — it only takes a minute."
      footer={{
        prefix: "Already have an account?",
        label: "Log in",
        href: "/login",
      }}
    >
      <RegisterForm />
    </AuthShell>
  );
}
