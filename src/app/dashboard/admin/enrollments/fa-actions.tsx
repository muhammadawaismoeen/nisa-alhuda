/**
 * Financial Assistance Review — admin dialog + actions.
 * Shows the FA application (reason, income, offered amount) and lets
 * admin approve with a custom amount, or reject with a reason.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  approveFinancialAssistance,
  rejectFinancialAssistance,
} from "./actions";
import { formatPaidAmount } from "@/lib/constants";
import { toast } from "sonner";

interface FaActionsProps {
  enrollmentId: string;
  faReason: string | null;
  faIncomeRange: string | null;
  faOfferedAmount: number | null;
  /** Full price shown as "original fee" — should already be in paymentCurrency. */
  originalPrice: number;
  /** Student's enrolled currency — drives every amount label/symbol in the dialog. */
  paymentCurrency: "PKR" | "INR" | "USD";
  applicantName: string;
}

export function FaActions({
  enrollmentId,
  faReason,
  faIncomeRange,
  faOfferedAmount,
  originalPrice,
  paymentCurrency,
  applicantName,
}: FaActionsProps) {
  const currencyLabel = paymentCurrency;
  const currencySymbol =
    paymentCurrency === "USD" ? "$" : paymentCurrency === "INR" ? "₹" : "Rs.";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"main" | "reject">("main");
  const [approvedAmount, setApprovedAmount] = useState<string>(
    faOfferedAmount?.toString() || ""
  );
  const [decisionNote, setDecisionNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    const amount = Number(approvedAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Please enter a valid approved amount (0 or more).");
      return;
    }

    setLoading(true);
    try {
      const result = await approveFinancialAssistance(
        enrollmentId,
        amount,
        decisionNote
      );
      if (!result.success) {
        toast.error(result.error || "Failed to approve.");
        return;
      }
      toast.success(
        amount === 0
          ? "FA approved with full waiver. Student enrolled!"
          : `FA approved. Student will be notified to pay ${formatPaidAmount(amount, paymentCurrency)}.`
      );
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }

    setLoading(true);
    try {
      const result = await rejectFinancialAssistance(
        enrollmentId,
        rejectReason
      );
      if (!result.success) {
        toast.error(result.error || "Failed to reject.");
        return;
      }
      toast.success("FA application rejected. Student notified.");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const incomeLabels: Record<string, string> = {
    "0-25k": "Less than 25k PKR / 10k INR",
    "25-50k": "25k–50k PKR / 10k–20k INR",
    "50-100k": "50k–100k PKR / 20k–40k INR",
    "100-200k": "100k–200k PKR / 40k–80k INR",
    "200k+": "More than 200k PKR / 80k INR",
    "no-income": "No current income",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMode("main"); }}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="gap-1.5" />}
      >
        <HeartHandshake className="h-3.5 w-3.5" />
        Review FA
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Financial Assistance Request</DialogTitle>
        </DialogHeader>

        {mode === "main" && (
          <div className="space-y-4">
            {/* ── Applicant details (compact) ── */}
            <div className="rounded-lg bg-secondary/50 p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Applicant
                </p>
                <p className="font-medium">{applicantName}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Original Fee
                </p>
                <p className="font-medium">
                  {formatPaidAmount(originalPrice, paymentCurrency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Student Offered
                </p>
                <p className="font-medium text-primary">
                  {faOfferedAmount !== null
                    ? formatPaidAmount(faOfferedAmount, paymentCurrency)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Income
                </p>
                <p className="font-medium text-xs">
                  {(faIncomeRange && incomeLabels[faIncomeRange]) || faIncomeRange || "—"}
                </p>
              </div>
              {faReason && (
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Reason
                  </p>
                  <p className="whitespace-pre-wrap text-xs">{faReason}</p>
                </div>
              )}
            </div>

            {/* ── Approve with custom amount ── */}
            <div className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="approvedAmount" className="text-sm font-semibold">
                  Approve Amount
                </Label>
                <span className="text-[10px] uppercase tracking-wider font-semibold rounded-md bg-primary/10 text-primary px-2 py-0.5">
                  {currencyLabel}
                </span>
              </div>

              {/* Quick-select preset buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setApprovedAmount("0")}
                >
                  Full Waiver
                </Button>
                {faOfferedAmount !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setApprovedAmount(String(faOfferedAmount))}
                  >
                    Student&apos;s Offer ({formatPaidAmount(faOfferedAmount, paymentCurrency)})
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setApprovedAmount(String(Math.round(originalPrice / 2)))}
                >
                  50% Discount ({formatPaidAmount(Math.round(originalPrice / 2), paymentCurrency)})
                </Button>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  {currencySymbol}
                </span>
                <Input
                  id="approvedAmount"
                  type="number"
                  min="0"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  placeholder={
                    paymentCurrency === "USD"
                      ? "e.g., 8"
                      : paymentCurrency === "INR"
                        ? "e.g., 400"
                        : "e.g., 1500"
                  }
                  className={paymentCurrency === "PKR" ? "pl-10" : "pl-7"}
                />
              </div>

              {/* Visual waiver indicator */}
              {approvedAmount !== "" && Number.isFinite(Number(approvedAmount)) && Number(approvedAmount) >= 0 && (() => {
                const amt = Number(approvedAmount);
                if (amt === 0) {
                  return (
                    <p className="text-xs font-medium text-green-600">
                      Full fee waiver &mdash; student pays nothing
                    </p>
                  );
                }
                if (amt > 0 && amt < originalPrice) {
                  const discountPct = Math.round(((originalPrice - amt) / originalPrice) * 100);
                  const savings = originalPrice - amt;
                  return (
                    <p className="text-xs font-medium text-amber-600">
                      {discountPct}% discount (saves {formatPaidAmount(savings, paymentCurrency)})
                    </p>
                  );
                }
                if (amt === originalPrice) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      No discount &mdash; full fee applies
                    </p>
                  );
                }
                if (amt > originalPrice) {
                  return (
                    <p className="text-xs font-medium text-red-600">
                      Amount exceeds original fee
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* ── Internal note ── */}
            <div className="space-y-1.5">
              <Label htmlFor="decisionNote" className="text-xs">Internal Note (optional)</Label>
              <Textarea
                id="decisionNote"
                rows={2}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Notes for admin reference (not shown to student)"
                className="text-sm"
              />
            </div>

            {/* ── Action buttons ── */}
            <div className="flex gap-2 justify-between pt-1">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setMode("reject")}
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Approve &amp; Notify Student
              </Button>
            </div>
          </div>
        )}

        {mode === "reject" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide a reason — this will be visible to the student.
            </p>

            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reason</Label>
              <Textarea
                id="rejectReason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., We are unable to offer assistance for this batch, please reapply for the next one."
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMode("main")} disabled={loading}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
