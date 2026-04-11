/**
 * Avatar Upload — profile photo upload with preview.
 * Uploads to Supabase storage 'thumbnails' bucket (public).
 */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  fullName,
}: AvatarUploadProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Get public URL for current avatar
  const displayUrl = previewUrl || (currentAvatarUrl ? getPublicUrl(currentAvatarUrl) : null);

  function getPublicUrl(path: string) {
    // If it's already a full URL, return as-is
    if (path.startsWith("http")) return path;
    const supabase = createClient();
    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    return data.publicUrl;
  }

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB.");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const filePath = `avatars/${userId}.${ext}`;

      // Upload to thumbnails bucket (public)
      const { error: uploadError } = await supabase.storage
        .from("thumbnails")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: filePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw new Error(updateError.message);

      toast.success("Profile photo updated!");
      router.refresh();
    } catch (error) {
      setPreviewUrl(null);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo."
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!currentAvatarUrl) return;

    setRemoving(true);
    try {
      const supabase = createClient();

      // Remove from storage
      if (!currentAvatarUrl.startsWith("http")) {
        await supabase.storage.from("thumbnails").remove([currentAvatarUrl]);
      }

      // Clear avatar_url in profile
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw new Error(error.message);

      setPreviewUrl(null);
      toast.success("Profile photo removed.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove photo."
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          {/* Avatar preview */}
          <div className="relative">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={fullName}
                className="h-20 w-20 rounded-full object-cover border-2 border-muted"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center border-2 border-muted">
                <span className="text-xl font-semibold text-primary">
                  {initials}
                </span>
              </div>
            )}

            {/* Upload overlay */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>
          </div>

          <div className="flex-1">
            <p className="font-medium">{fullName}</p>
            <p className="text-xs text-muted-foreground mb-3">
              JPG, PNG or WebP. Max 2MB.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                )}
                {currentAvatarUrl ? "Change Photo" : "Upload Photo"}
              </Button>
              {currentAvatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={removing}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {removing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Remove
                </Button>
              )}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}
