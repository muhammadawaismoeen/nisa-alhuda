"use client";

/**
 * Payment-Due Modal — pops on first dashboard load each session when
 * the sister has at least one unpaid monthly cycle. Mirrors the data
 * shown in the persistent banner below but in a blocking dialog so
 * she sees it immediately instead of relying on scroll/awareness.
 *
 * Suppression: clicking either CTA or the close button writes a flag
 * to sessionStorage so the modal won't re-pop on every page navigation
 * within the same session. Logging out + back in (new session) will
 * pop it again — that's intentional.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMonthlyAmount } from "@/lib/monthly-payments";

export interface DueEntry {
  enrollmentId: string;
  offeringTitle: string;
  amount: number;
  currency: string;
}

interface Props {
  cycleLabel: string;
  entries: DueEntry[];
}

const STORAGE_KEY_PREFIX = "nisa-pay-modal-seen:";

export function PaymentDueModal({ cycleLabel, entries }: Props) {
  const [open, setOpen] = useState(false);

  // Open once per session per cycle — keyed by cycle so a fresh cycle
  // (next month) re-prompts even if the sister had dismissed last month.
  // setState-in-effect is the right pattern here: we can't read
  // sessionStorage during SSR/initial render, so we sync after mount.
  useEffect(() => {
    if (entries.length === 0) return;
    const key = `${STORAGE_KEY_PREFIX}${cycleLabel}`;
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem(key);
    if (seen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [cycleLabel, entries.length]);

  function handleClose() {
    const key = `${STORAGE_KEY_PREFIX}${cycleLabel}`;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(key, "1");
    }
    setOpen(false);
  }

  if (entries.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl">
            {entries.length === 1
              ? `${cycleLabel} fee is due`
              : `${entries.length} monthly fees are due`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Assalamu &apos;alaikum &mdash; please upload your{" "}
          <strong className="text-foreground">{cycleLabel}</strong> payment
          receipt to keep your access active for the new month, in sha Allah.
        </p>

        <div className="mt-2 space-y-2">
          {entries.map((e) => (
            <div
              key={e.enrollmentId}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-amber-900 dark:text-amber-100">
                  {e.offeringTitle}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {formatMonthlyAmount(e.amount, e.currency)} for {cycleLabel}
                </p>
              </div>
              <Link
                href={`/dashboard/student/monthly-payment/${e.enrollmentId}`}
                onClick={handleClose}
                className="press inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Pay Now
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            You can also upload anytime from the banner on your dashboard.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-xs text-muted-foreground"
          >
            Remind me later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
