/**
 * Monthly Payment Actions — receipt viewer + approve/reject buttons for
 * the monthly renewal ledger. Mirrors the initial-payment PaymentActions
 * component but targets the `monthly_payments` table.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
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

interface Props {
  monthlyPaymentId: string;
  status: string;
  receiptPath: string | null;
}

export function MonthlyPaymentActions({
  monthlyPaymentId,
  status,
  receiptPath,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);

  async function viewReceipt() {
    if (!receiptPath) {
      toast.error("No receipt uploaded for this cycle.");
      return;
    }
    if (receiptUrl) {
      setShowLightbox(true);
      return;
    }
    setLoadingReceipt(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(receiptPath, 300);

      if (error) throw error;
      if (data?.signedUrl) {
        setReceiptUrl(data.signedUrl);
        setShowLightbox(true);
      }
    } catch {
      toast.error("Failed to load receipt.");
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
        .from("monthly_payments")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", monthlyPaymentId);

      if (error) throw error;
      toast.success("Monthly payment approved.");
      router.refresh();
    } catch {
      toast.error("Failed to approve.");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setLoading("reject");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("monthly_payments")
        .update({
          status: "rejected",
          rejection_reason: rejectReason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", monthlyPaymentId);

      if (error) throw error;
      toast.success("Monthly payment rejected.");
      setShowRejectDialog(false);
      router.refresh();
    } catch {
      toast.error("Failed to reject.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={viewReceipt}
          disabled={loadingReceipt || !receiptPath}
        >
          {loadingReceipt ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5 hidden sm:inline">Receipt</span>
        </Button>

        {status === "pending" && (
          <>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={loading !== null}
            >
              {loading === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5 hidden sm:inline">Approve</span>
            </Button>

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 h-8 gap-1 px-2.5 text-xs font-medium transition-all">
                <XCircle className="h-3.5 w-3.5" />
                <span className="ml-1 hidden sm:inline">Reject</span>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Monthly Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <p className="text-sm text-muted-foreground">
                    The student will see this reason and can re-upload a
                    corrected receipt for the same month.
                  </p>
                  <Input
                    placeholder="e.g., Amount doesn't match the monthly fee"
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
                      {loading === "reject" && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Full-screen Receipt Lightbox */}
      {showLightbox && receiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => {
            setShowLightbox(false);
            setZoom(1);
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.max(0.5, z - 0.25));
              }}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.min(3, z + 0.25));
              }}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setShowLightbox(false);
                setZoom(1);
              }}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {receiptUrl.includes(".pdf") ? (
            <div
              className="bg-white rounded-lg p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-lg font-medium mb-4">PDF Receipt</p>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Open PDF in new tab
              </a>
            </div>
          ) : (
            <img
              src={receiptUrl}
              alt="Monthly payment receipt"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
