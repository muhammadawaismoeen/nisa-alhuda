/**
 * Auth layout — centered card design for login/register.
 */
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-background p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <BookOpen className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold text-primary">{APP_NAME}</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
