/**
 * Profile Form — edit name, phone number.
 * Email is shown read-only (managed by auth).
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ProfileFormProps {
  userId: string;
  initialName: string;
  initialPhone: string;
  email: string;
}

export function ProfileForm({
  userId,
  initialName,
  initialPhone,
  email,
}: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  const hasChanges = fullName !== initialName || phone !== initialPhone;

  async function handleSave() {
    if (!fullName.trim()) {
      toast.error("Name is required.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw new Error(error.message);

      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Email</Label>
          <Input value={email} disabled className="bg-muted/50 opacity-70" />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed. Contact admin for assistance.
          </p>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 1234567"
          />
        </div>

        {/* Save */}
        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="press"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
