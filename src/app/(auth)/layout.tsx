/**
 * Auth layout — centered card design for login/register.
 * Features the Kufic pattern background and official logo.
 */
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-rose-50 to-background kufic-pattern p-4">
      <div className="mb-8">
        <Logo size="default" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
