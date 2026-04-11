/**
 * Settings Page — profile editing, avatar upload, and password change.
 * Accessible to all authenticated users.
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { AvatarUpload } from "./avatar-upload";
import type { Profile } from "@/lib/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and account preferences.
        </p>
      </div>

      <div className="space-y-8">
        {/* Avatar Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Profile Photo</h2>
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            fullName={profile.full_name}
          />
        </section>

        <div className="border-t" />

        {/* Profile Info Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <ProfileForm
            userId={profile.id}
            initialName={profile.full_name}
            initialPhone={profile.phone || ""}
            email={user.email || ""}
          />
        </section>

        <div className="border-t" />

        {/* Password Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
