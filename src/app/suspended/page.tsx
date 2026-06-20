import { Logo } from "@/components/layout/logo";
import { DashboardLogout } from "@/app/dashboard/logout-button";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/20 p-6">
      <Logo size="lg" />
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-2xl">
            🔒
          </span>
        </div>
        <h1 className="mb-2 text-xl font-semibold">Account Suspended</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Your account has been temporarily suspended. Please contact the admin
          team to resolve this.
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          Reach out via WhatsApp or email and mention your registered email
          address.
        </p>
        <DashboardLogout />
      </div>
    </div>
  );
}
