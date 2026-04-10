/**
 * Recording Updater — inline form to add a recording URL to a lesson.
 * Client component used in the Live Hub pending recordings section.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface RecordingUpdaterProps {
  lessonId: string;
}

export function RecordingUpdater({ lessonId }: RecordingUpdaterProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!url.trim()) {
      toast.error("Please enter a recording URL.");
      return;
    }

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      toast.error("Please enter a valid URL.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("lessons")
        .update({ recording_url: url.trim() })
        .eq("id", lessonId);

      if (error) throw new Error(error.message);

      toast.success("Recording URL saved!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save recording URL."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 ml-13">
      <div className="relative flex-1">
        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="url"
          placeholder="https://drive.google.com/... or https://youtube.com/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="pl-9 h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
          }}
        />
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || !url.trim()}
        className="press shrink-0"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <Check className="h-3.5 w-3.5 mr-1" />
            Save
          </>
        )}
      </Button>
    </div>
  );
}
