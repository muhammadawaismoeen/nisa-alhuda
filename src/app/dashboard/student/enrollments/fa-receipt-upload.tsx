/**
 * FA Receipt Upload — student-facing dialog shown after admin partially approves FA.
 * Shows the approved reduced amount + bank details + file upload.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  HeartHandshake,
  CheckCircle,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadFaReceipt } from "./actions";
import { toast } from "sonner";

interface FaReceiptUploadProps {
  enrollmentId: string;
  approvedAmount: number;
  offeringTitle: string;
}

export function FaReceiptUpload({
  enrollmentId,
  approvedAmount,
  offeringTitle,
}: FaReceiptUploadProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paymentRegion, setPaymentRegion] = useState<"pk" | "in">("pk");
  const [senderName, setSenderName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(selected.type)) {
      toast.error("Please upload an image (JPG/PNG/WebP) or PDF.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      return;
    }

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
  }

  async function handleSubmit() {
    if (!senderName.trim()) {
      toast.error("Please enter the sender name used on the payment.");
      return;
    }
    if (!file) {
      toast.error("Please upload your payment receipt.");
      return;
    }

    setLoading(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await uploadFaReceipt({
        enrollmentId,
        receiptBase64: base64,
        receiptFileName: file.name,
        senderName: senderName.trim(),
      });

      if (!result.success) {
        toast.error(result.error || "Failed to upload receipt.");
        return;
      }

      toast.success("Receipt uploaded! Admin will verify and approve shortly.");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          />
        }
      >
        <Upload className="h-3.5 w-3.5" />
        Upload Receipt
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-amber-600" />
            Upload Payment Receipt (FA Approved)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* FA Approval Notice */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">
                  Financial Assistance Approved
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Your reduced fee for <strong>{offeringTitle}</strong> is{" "}
                  <strong>
                    PKR {Number(approvedAmount).toLocaleString()}
                  </strong>
                  . Please transfer this amount and upload your receipt below.
                </p>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="rounded-xl border bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Bank Details</h3>
              <div className="flex rounded-md bg-background p-1 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentRegion("pk")}
                  className={`px-2 py-1 rounded transition-colors ${
                    paymentRegion === "pk"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🇵🇰 PK
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentRegion("in")}
                  className={`px-2 py-1 rounded transition-colors ${
                    paymentRegion === "in"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🇮🇳 IN
                </button>
              </div>
            </div>

            {paymentRegion === "pk" ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Bank</p>
                  <p className="font-medium">Bank Alfalah</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium">Sana Ahmed</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account #</p>
                  <p className="font-medium font-mono text-xs">56185002604899</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IBAN</p>
                  <p className="font-medium font-mono text-xs">
                    PK81ALFH5618005002604899
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Bank</p>
                  <p className="font-medium">HDFC Bank</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium">Kareemunnisa Shaik</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account #</p>
                  <p className="font-medium font-mono text-xs">50100433613784</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IFSC</p>
                  <p className="font-medium font-mono text-xs">HDFC0009377</p>
                </div>
              </div>
            )}
          </div>

          {/* Sender Name */}
          <div className="space-y-2">
            <Label htmlFor="senderName">Sender Name (on payment)</Label>
            <Input
              id="senderName"
              placeholder="Name used in the bank transfer"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Receipt Screenshot / PDF</Label>

            {!file ? (
              <label
                htmlFor="fa-receipt"
                className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border bg-secondary/40 hover:bg-secondary/60 cursor-pointer transition-colors"
              >
                <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                <p className="text-sm text-muted-foreground">
                  Click to upload (JPG, PNG, WebP, PDF &middot; max 5MB)
                </p>
                <input
                  id="fa-receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="relative rounded-xl border bg-secondary/40 p-3">
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 hover:bg-background flex items-center justify-center transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="w-full max-h-48 object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex items-center gap-2 py-6">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Upload Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
