/**
 * Enrollment Form — handles receipt upload and enrollment submission.
 * Client Component: manages file state, upload progress, and submission.
 */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileImage, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface EnrollmentFormProps {
  offeringId: string;
  offeringPrice: number;
  userId: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function EnrollmentForm({
  offeringId,
  offeringPrice,
  userId,
}: EnrollmentFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [senderName, setSenderName] = useState("");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error("Please upload a JPG, PNG, WebP image or PDF file.");
      return;
    }

    // Validate file size
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setFile(selected);

    // Create preview for images
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      toast.error("Please upload your payment receipt.");
      return;
    }

    if (!senderName.trim()) {
      toast.error("Please enter the sender name on the payment.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Upload receipt to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${offeringId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Get the file URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("payment-receipts").getPublicUrl(filePath);

      // 3. Create enrollment record
      const { error: enrollError } = await supabase.from("enrollments").insert({
        student_id: userId,
        offering_id: offeringId,
        payment_receipt_url: filePath, // Store the path, not public URL (bucket is private)
        payment_amount: offeringPrice,
        payment_method: "bank_transfer",
      });

      if (enrollError) {
        // Clean up uploaded file if enrollment fails
        await supabase.storage.from("payment-receipts").remove([filePath]);
        throw new Error(`Enrollment failed: ${enrollError.message}`);
      }

      toast.success(
        "Enrollment submitted! We'll review your payment and get back to you soon."
      );
      router.push("/dashboard/student");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sender Name */}
      <div className="space-y-2">
        <Label htmlFor="senderName">Sender Name (on payment)</Label>
        <Input
          id="senderName"
          placeholder="Name used in bank transfer"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          The name that appears on the payment transaction.
        </p>
      </div>

      {/* File Upload Area */}
      <div className="space-y-2">
        <Label>Payment Receipt Screenshot</Label>

        {!file ? (
          <label
            htmlFor="receipt"
            className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP or PDF — Max 5MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              id="receipt"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        ) : (
          <div className="relative p-4 border border-border rounded-xl bg-secondary/20">
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>

            {preview ? (
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full max-h-48 object-contain rounded-lg"
              />
            ) : (
              <div className="flex items-center gap-3 py-2">
                <FileImage className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!file || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          "Submit Enrollment"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your enrollment will be reviewed within 24-48 hours.
      </p>
    </form>
  );
}
