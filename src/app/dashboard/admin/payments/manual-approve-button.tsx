"use client";

/**
 * Manual Monthly Approval — admin-side button + dialog.
 *
 * Approves a single monthly cycle WITHOUT requiring a receipt. Used when
 * a sister paid offline (cash, JazzCash, bank transfer without uploading).
 * One-time override — future cycles continue to bill normally.
 *
 * Two ways to call:
 *   - by `monthlyPaymentId`: target an existing 'owed' / 'rejected' row
 *   - by `enrollmentId + cycleMonth`: create a fresh row (no placeholder yet)
 *
 * Server-side guard: `approveMonthlyPaymentManually` refuses if a pending
 * receipt exists for the cycle. UI also hides the button when pending.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { approveMonthlyPaymentManually } from "./actions";
import { formatMonthlyAmount } from "@/lib/monthly-payments";
import { toast } from "sonner";

interface Props {
  /** Existing row to update (preferred when cron has created an 'owed' placeholder). */
  monthlyPaymentId?: string;
  /** Used only when no row exists yet — inserts a fresh one. */
  enrollmentId?: string;
  /** Required with enrollmentId — cycle-start date YYYY-MM-DD (27th of month). */
  cycleMonth?: string;
  /** Default amount to pre-fill (sister's full monthly fee, FA-adjusted). */
  defaultAmount: number;
  currency: string;
  /** Display-only — shown in dialog header. */
  studentName: string;
  cycleLabel: string;
  /** Button label override (default "Approve manually"). */
  label?: string;
  /** Button variant override (default outline). */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Compact mode for tight rows (smaller padding + no leading icon). */
  size?: "default" | "sm";
  className?: string;
  /** Called after successful approval. Defaults to router.refresh(). */
  onApproved?: () => void;
}

export function ManualApproveButton({
  monthlyPaymentId,
  enrollmentId,
  cycleMonth,
  defaultAmount,
  currency,
  studentName,
  cycleLabel,
  label = "Approve manually",
  variant = "outline",
  size = "sm",
  className,
  onApproved,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(String(defaultAmount || 0));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Enter a valid non-negative amount.");
      return;
    }

    setBusy(true);
    try {
      const result = await approveMonthlyPaymentManually({
        monthlyPaymentId,
        enrollmentId,
        cycleMonth,
        amount: parsed,
        note,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to approve.");
        return;
      }
      toast.success(`${cycleLabel} marked paid for ${studentName}.`);
      setOpen(false);
      setNote("");
      if (onApproved) onApproved();
      else router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to approve."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          setAmount(String(defaultAmount || 0));
          setNote("");
          setOpen(true);
        }}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        <span className="ml-1.5">{label}</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve manually — {cycleLabel}</DialogTitle>
            <DialogDescription>
              Marks <span className="font-medium">{studentName}</span>&apos;s
              {" "}{cycleLabel} cycle as paid without a receipt. One-time
              override; future cycles continue to bill normally.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="manual-amount">Amount received</Label>
              <Input
                id="manual-amount"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                Default is her full monthly fee (
                {formatMonthlyAmount(defaultAmount, currency)}). Edit for
                partial offline payments.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manual-note">Note (optional)</Label>
              <Textarea
                id="manual-note"
                placeholder="e.g. Paid cash in person, JazzCash transfer to 03xx..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                Saved to the audit trail. Never shown to the sister.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark Paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
