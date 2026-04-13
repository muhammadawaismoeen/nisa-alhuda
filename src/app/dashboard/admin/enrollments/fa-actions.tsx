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
import { toast } from "sonner";

interface FaActionsProps {
  enrollmentId: string;
  faReason: string | null;
  faIncomeRange: string | null;
  faOfferedAmount: number | null;
  originalPrice: number;
  applicantName: string;
}

export function FaActions({
  enrollmentId,
  faReason,
  faIncomeRange,
  faOfferedAmount,
  originalPrice,
  applicantName,
}: FaActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "approve" | "reject">("view");
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
          : `FA approved. Student will be notified to pay ${amount}.`
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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMode("view"); }}>
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

        {mode === "view" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/50 p-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                  Applicant
                </p>
                <p className="font-medium">{applicantName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                  Original Fee
                </p>
                <p className="font-medium">{originalPrice}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                  Amount Offered by Student
                </p>
                <p className="font-medium text-primary">
                  {faOfferedAmount !== null ? faOfferedAmount : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                  Household Monthly Income
                </p>
                <p className="font-medium">
                  {(faIncomeRange && incomeLabels[faIncomeRange]) || faIncomeRange || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                  Reason
                </p>
                <p className="whitespace-pre-wrap">{faReason || "—"}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setMode("reject")}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
              <Button size="sm" onClick={() => setMode("approve")}>
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
            </div>
          </div>
        )}

        {mode === "approve" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set the amount <strong>{applicantName}</strong> will be charged.
              If the approved amount is greater than 0, they&apos;ll be notified
              to upload a receipt for the reduced fee.
            </p>

            <div className="space-y-2">
              <Label htmlFor="approvedAmount">Approved Amount</Label>
              <Input
                id="approvedAmount"
                type="number"
                min="0"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                placeholder="e.g., 1500"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Student offered: {faOfferedAmount ?? "—"} &middot; Original: {originalPrice}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decisionNote">Internal Note (optional)</Label>
              <Textarea
                id="decisionNote"
                rows={2}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Notes for admin reference (not shown to student)"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMode("view")} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleApprove} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Approval
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
              <Button variant="outline" onClick={() => setMode("view")} disabled={loading}>
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
