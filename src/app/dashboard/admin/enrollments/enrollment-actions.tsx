/**
 * Enrollment Actions — approve/reject buttons + receipt viewer.
 * Client Component: handles Supabase mutations and dialog for receipt.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { deleteEnrollment } from "./actions";
import {
  approveEnrollmentWithCredentials,
  rejectEnrollment,
} from "../payments/actions";

interface EnrollmentActionsProps {
  enrollmentId: string;
  status: string;
  receiptPath: string | null;
  /**
   * "delete-only" hides approve/reject/receipt so the row only shows the delete button.
   * Useful next to FaActions, which owns its own approve/reject flow.
   */
  mode?: "full" | "delete-only";
  /**
   * When true (passed in the instructor viewing context), hide payment
   * receipt + approve/reject buttons — those tasks are admin/treasurer
   * scope. Instructor keeps Delete because removing a stray enrollment
   * isn't a financial decision.
   */
  hideFinance?: boolean;
}

export function EnrollmentActions({
  enrollmentId,
  status,
  receiptPath,
  mode = "full",
  hideFinance = false,
}: EnrollmentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | "delete" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  async function viewReceipt() {
    setLoadingReceipt(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(receiptPath!, 300); // 5-minute signed URL

      if (error) throw error;
      if (data?.signedUrl) {
        setReceiptUrl(data.signedUrl);
      }
    } catch (error) {
      toast.error("Failed to load receipt. Please try again.");
    } finally {
      setLoadingReceipt(false);
    }
  }

  async function handleApprove() {
    setLoading("approve");
    try {
      // Single server-side action does it all: ensure auth account exists →
      // reset password to the shared default → link enrollment.student_id →
      // mark approved → email credentials. Replaces the previous
      // direct-DB-update + fire-and-forget /api/email call so every approval
      // path provisions credentials consistently.
      const result = await approveEnrollmentWithCredentials(enrollmentId);
      if (!result.success) {
        toast.error(result.error || "Failed to approve enrollment.");
        return;
      }
      if (result.emailSent === false) {
        toast.warning(
          result.error || "Approved, but credentials email failed to send."
        );
      } else {
        toast.success("Enrollment approved — credentials emailed.");
      }
      router.refresh();
    } catch {
      toast.error("Failed to approve enrollment.");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    setLoading("delete");
    try {
      const result = await deleteEnrollment(enrollmentId);
      if (!result.success) {
        toast.error(result.error || "Failed to delete enrollment.");
        return;
      }
      toast.success("Enrollment deleted.");
      setShowDeleteDialog(false);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setLoading("reject");
    try {
      const result = await rejectEnrollment(enrollmentId, rejectReason);
      if (!result.success) {
        toast.error(result.error || "Failed to reject enrollment.");
        return;
      }
      toast.success("Enrollment rejected.");
      // Best-effort student notification — reject path doesn't carry
      // credentials, so the old /api/email endpoint still fits the bill.
      fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "enrollment_rejected",
          enrollmentId,
          reason: rejectReason,
        }),
      }).catch(() => {});
      setShowRejectDialog(false);
      router.refresh();
    } catch {
      toast.error("Failed to reject enrollment.");
    } finally {
      setLoading(null);
    }
  }

  const fullMode = mode === "full";

  return (
    <div className="flex items-center gap-2">
      {/* View Receipt — only show if receipt exists */}
      {fullMode && !hideFinance && receiptPath && (
      <Dialog>
        <DialogTrigger
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-7 gap-1 px-2.5 text-[0.8rem] font-medium transition-all"
          onClick={viewReceipt}
        >
          {loadingReceipt ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="ml-1.5 hidden sm:inline">Receipt</span>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {receiptUrl ? (
              receiptUrl.includes(".pdf") ? (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Open PDF Receipt
                </a>
              ) : (
                <img
                  src={receiptUrl}
                  alt="Payment receipt"
                  className="w-full rounded-lg"
                />
              )
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Approve / Reject — only show for pending */}
      {fullMode && !hideFinance && status === "pending" && (
        <>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={loading !== null}
          >
            {loading === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Approve</span>
          </Button>

          {/* Reject Dialog */}
          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <DialogTrigger
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 h-7 gap-1 px-2.5 text-[0.8rem] font-medium transition-all disabled:pointer-events-none disabled:opacity-50"
              disabled={loading !== null}
            >
              <XCircle className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Reject</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Enrollment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Please provide a reason for rejecting this enrollment. The
                  student will be able to see this reason.
                </p>
                <Input
                  placeholder="e.g., Payment amount doesn't match"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={loading === "reject"}
                  >
                    {loading === "reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Delete — always available to admin */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogTrigger
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 h-7 gap-1 px-2.5 text-[0.8rem] font-medium transition-all disabled:pointer-events-none disabled:opacity-50"
          disabled={loading !== null}
          aria-label="Delete enrollment"
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">Delete</span>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Enrollment?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              This permanently removes the enrollment record and any uploaded
              receipt. The student will no longer see this enrollment in their
              dashboard. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={loading === "delete"}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading === "delete"}
              >
                {loading === "delete" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Confirm Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
