/**
 * Full-page lockout screen shown to students who haven't paid their
 * monthly fee >= BLOCK_AFTER_DAYS into the cycle. Replaces the entire
 * dashboard chrome — no sidebar, no nav links, just the message + the
 * paths she can still use: pay her fee, or log out.
 *
 * Wording for the headline is fixed by spec — do not soften it without
 * checking with the admin first.
 */
import { AlertOctagon, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Logo } from "@/components/layout/logo";
import { DashboardLogout } from "./logout-button";
import { formatMonthlyAmount } from "@/lib/monthly-payments";
import type { BlockingDebt } from "@/lib/payment-block";

interface Props {
  debt: BlockingDebt;
  fullName: string;
}

export function BlockedScreen({ debt, fullName }: Props) {
  const showCombinedTotal =
    debt.currencies.length === 1 && debt.entries.length > 1;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:px-8">
        <Logo size="sm" />
        <div className="w-32">
          <DashboardLogout />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-lg">
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-6 md:p-8">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                  <AlertOctagon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                    Account locked
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    Assalamu alaikum, {fullName || "Sister"}
                  </p>
                </div>
              </div>

              <h1 className="mb-3 font-heading text-xl font-semibold leading-snug">
                Your account has been blocked due to not paying Fee after
                multiple reminders
              </h1>

              <p className="mb-5 text-sm text-muted-foreground">
                Submit your receipt for the outstanding cycle below to restore
                access immediately. If you&apos;ve already paid, please use the
                same page to upload the proof — admin will approve it shortly,
                in sha Allah.
              </p>

              <div className="mb-5 space-y-2">
                {debt.entries.map((entry) => (
                  <div
                    key={entry.enrollmentId}
                    className="rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900/60 dark:bg-red-950/20"
                  >
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold">
                        {entry.offeringTitle}
                      </p>
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/60 dark:text-red-300">
                        {entry.daysOverdue}d overdue
                      </span>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      You owe{" "}
                      <span className="font-semibold text-foreground">
                        {formatMonthlyAmount(entry.amount, entry.currency)}
                      </span>{" "}
                      for {entry.cycleLabel}.
                    </p>
                    <LinkButton
                      size="sm"
                      href={`/dashboard/student/monthly-payment/${entry.enrollmentId}`}
                      className="press w-full rounded-full"
                    >
                      <Wallet className="mr-1.5 h-3.5 w-3.5" />
                      Pay now — {entry.cycleLabel}
                    </LinkButton>
                  </div>
                ))}
              </div>

              {showCombinedTotal && (
                <p className="mb-1 text-center text-xs text-muted-foreground">
                  Total owed:{" "}
                  <span className="font-semibold text-foreground">
                    {formatMonthlyAmount(debt.totalAmount, debt.currencies[0])}
                  </span>
                </p>
              )}

              <p className="mt-4 border-t pt-4 text-center text-xs text-muted-foreground">
                Need help? Email{" "}
                <a
                  href="mailto:support@nisaalhuda.org"
                  className="font-medium underline"
                >
                  support@nisaalhuda.org
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
