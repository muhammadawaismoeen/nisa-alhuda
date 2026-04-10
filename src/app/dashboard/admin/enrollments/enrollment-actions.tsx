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

interface EnrollmentActionsProps {
  enrollmentId: string;
  status: string;
  receiptPath: string;
}

export function EnrollmentActions({
  enrollmentId,
  status,
  receiptPath,
}: EnrollmentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  async function viewReceipt() {
    setLoadingReceipt(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(receiptPath, 300); // 5-minute signed URL

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("enrollments")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", enrollmentId);

      if (error) throw error;

      toast.success("Enrollment approved!");
      router.refresh();
    } catch (error) {
      toast.error("Failed to approve enrollment.");
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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("enrollments")
        .update({
          status: "rejected",
          rejection_reason: rejectReason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", enrollmentId);

      if (error) throw error;

      toast.success("Enrollment rejected.");
      setShowRejectDialog(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to reject enrollment.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* View Receipt */}
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

      {/* Approve / Reject — only show for pending */}
      {status === "pending" && (
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
    </div>
  );
}
