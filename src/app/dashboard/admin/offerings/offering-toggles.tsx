/**
 * Offering Toggles — Feature on homepage and Archive actions.
 * Client component for toggling is_featured and status.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Archive, RotateCcw, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface OfferingTogglesProps {
  offeringId: string;
  isFeatured: boolean;
  status: string;
  admissionClosed: boolean;
}

export function OfferingToggles({
  offeringId,
  isFeatured,
  status,
  admissionClosed,
}: OfferingTogglesProps) {
  const router = useRouter();
  const [loadingFeature, setLoadingFeature] = useState(false);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [loadingAdmission, setLoadingAdmission] = useState(false);

  async function toggleFeatured() {
    setLoadingFeature(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("offerings")
        .update({ is_featured: !isFeatured })
        .eq("id", offeringId);

      if (error) throw error;
      toast.success(
        isFeatured ? "Removed from featured" : "Featured on homepage!"
      );
      router.refresh();
    } catch {
      toast.error("Failed to update.");
    } finally {
      setLoadingFeature(false);
    }
  }

  async function toggleArchive() {
    const newStatus = status === "archived" ? "published" : "archived";
    setLoadingArchive(true);
    try {
      const supabase = createClient();
      const update: any = { status: newStatus };
      // Un-feature when archiving
      if (newStatus === "archived") update.is_featured = false;

      const { error } = await supabase
        .from("offerings")
        .update(update)
        .eq("id", offeringId);

      if (error) throw error;
      toast.success(
        newStatus === "archived" ? "Offering archived" : "Offering restored"
      );
      router.refresh();
    } catch {
      toast.error("Failed to update.");
    } finally {
      setLoadingArchive(false);
    }
  }

  async function toggleAdmission() {
    setLoadingAdmission(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("offerings")
        .update({ admission_closed: !admissionClosed })
        .eq("id", offeringId);

      if (error) throw error;
      toast.success(
        admissionClosed ? "Admissions opened" : "Admissions closed"
      );
      router.refresh();
    } catch {
      toast.error("Failed to update.");
    } finally {
      setLoadingAdmission(false);
    }
  }

  return (
    <>
      {/* Feature toggle */}
      {status !== "archived" && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleFeatured}
          disabled={loadingFeature}
          title={isFeatured ? "Remove from featured" : "Feature on homepage"}
          className={isFeatured ? "text-amber-500" : "text-muted-foreground"}
        >
          {loadingFeature ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Star
              className={`h-3.5 w-3.5 ${isFeatured ? "fill-amber-400" : ""}`}
            />
          )}
        </Button>
      )}

      {/* Admission Closed toggle */}
      {status !== "archived" && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleAdmission}
          disabled={loadingAdmission}
          title={admissionClosed ? "Open admissions" : "Close admissions"}
          className={admissionClosed ? "text-destructive" : "text-muted-foreground"}
        >
          {loadingAdmission ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Lock
              className={`h-3.5 w-3.5 ${admissionClosed ? "fill-destructive/20" : ""}`}
            />
          )}
        </Button>
      )}

      {/* Archive / Restore */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleArchive}
        disabled={loadingArchive}
        title={status === "archived" ? "Restore offering" : "Archive offering"}
        className="text-muted-foreground"
      >
        {loadingArchive ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "archived" ? (
          <RotateCcw className="h-3.5 w-3.5" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
      </Button>
    </>
  );
}
