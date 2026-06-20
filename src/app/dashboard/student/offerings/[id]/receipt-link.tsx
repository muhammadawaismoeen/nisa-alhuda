"use client";

import { useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMonthlyReceiptSignedUrl } from "./monthly-payment-actions";

/**
 * Button that generates a 5-minute signed URL for a monthly payment receipt
 * and opens it in a new tab. Avoids storing signed URLs in state between
 * renders — each click triggers a fresh short-lived URL.
 */
export function ReceiptLink({ storagePath }: { storagePath: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await getMonthlyReceiptSignedUrl(storagePath);
      if (!result.success) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to open receipt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 transition-opacity"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Paperclip className="h-3 w-3" />
      )}
      Receipt
    </button>
  );
}
