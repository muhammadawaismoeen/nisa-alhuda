/**
 * User Directory — searchable, filterable user list with admin actions.
 * Client component: search, role filter, suspend/unsuspend, login-as-user.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Shield,
  ShieldAlert,
  LogIn,
  Ban,
  CheckCircle,
  Loader2,
  Phone,
  Mail,
  Calendar,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile } from "@/lib/types/database";

interface UserDirectoryProps {
  profiles: Profile[];
  enrollmentCounts: Record<string, { total: number; approved: number }>;
  currentUserId: string;
}

const roleConfig = {
  admin: { label: "Admin", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-950/30", icon: Shield },
  instructor: { label: "Instructor", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950/30", icon: BookOpen },
  student: { label: "Student", color: "text-green-600", bg: "bg-green-100 dark:bg-green-950/30", icon: User },
};

export function UserDirectory({
  profiles,
  enrollmentCounts,
  currentUserId,
}: UserDirectoryProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginTarget, setLoginTarget] = useState<Profile | null>(null);

  // Filter profiles
  const filtered = profiles.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || p.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  async function handleToggleSuspend(profile: Profile) {
    const action = profile.is_suspended ? "unsuspend" : "suspend";
    if (
      !confirm(
        `Are you sure you want to ${action} ${profile.full_name}?${
          action === "suspend"
            ? " They will not be able to access the platform."
            : ""
        }`
      )
    )
      return;

    setSuspendingId(profile.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: !profile.is_suspended })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success(
        profile.is_suspended
          ? `${profile.full_name} has been unsuspended.`
          : `${profile.full_name} has been suspended.`
      );
      router.refresh();
    } catch {
      toast.error(`Failed to ${action} user.`);
    } finally {
      setSuspendingId(null);
    }
  }

  function handleLoginAs(profile: Profile) {
    setLoginTarget(profile);
    setShowLoginDialog(true);
  }

  async function confirmLoginAs() {
    if (!loginTarget) return;
    // Open the login page in a new tab with the user's email pre-filled
    // Admin will need to use Supabase dashboard for actual impersonation
    toast.info(
      `To login as ${loginTarget.full_name}, use Supabase Auth Admin to generate a magic link for their account.`
    );
    setShowLoginDialog(false);

    // Copy email to clipboard for convenience
    try {
      // We don't have the email directly from profiles, but we can show the user ID
      await navigator.clipboard.writeText(loginTarget.id);
      toast.success("User ID copied to clipboard. Use in Supabase Dashboard → Auth → Users to impersonate.");
    } catch {
      // Clipboard might not be available
    }
  }

  return (
    <div>
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "student", "instructor", "admin"].map((role) => (
            <Button
              key={role}
              variant={roleFilter === role ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter(role)}
              className="capitalize"
            >
              {role === "all" ? "All" : role}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-4">
        Showing {filtered.length} of {profiles.length} users
      </p>

      {/* User list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No users match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((profile) => {
            const config = roleConfig[profile.role] || roleConfig.student;
            const RoleIcon = config.icon;
            const enrollInfo = enrollmentCounts[profile.id];
            const isCurrentUser = profile.id === currentUserId;

            return (
              <Card
                key={profile.id}
                className={profile.is_suspended ? "opacity-60 border-red-200" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center shrink-0`}
                    >
                      <RoleIcon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold truncate">
                          {profile.full_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs ${config.color}`}
                        >
                          {config.label}
                        </Badge>
                        {profile.is_suspended && (
                          <Badge variant="destructive" className="text-xs">
                            Suspended
                          </Badge>
                        )}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {profile.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {profile.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined{" "}
                          {new Date(profile.created_at).toLocaleDateString(
                            "en-PK",
                            { day: "numeric", month: "short", year: "numeric" }
                          )}
                        </span>
                        {enrollInfo && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {enrollInfo.approved} enrolled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!isCurrentUser && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Login As */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleLoginAs(profile)}
                          title="Login as this user"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                        </Button>

                        {/* Suspend / Unsuspend */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleToggleSuspend(profile)}
                          disabled={suspendingId === profile.id}
                          title={
                            profile.is_suspended
                              ? "Unsuspend user"
                              : "Suspend user"
                          }
                          className={
                            profile.is_suspended
                              ? "text-green-600 hover:text-green-700"
                              : "text-muted-foreground hover:text-destructive"
                          }
                        >
                          {suspendingId === profile.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : profile.is_suspended ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Login As Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login as {loginTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              This will copy the user&apos;s ID to your clipboard. Use the
              Supabase Dashboard (Auth → Users) to generate a magic link for
              this user to troubleshoot their account.
            </p>
            <div className="p-3 rounded-lg bg-muted text-sm font-mono break-all">
              {loginTarget?.id}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLoginDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={confirmLoginAs}>
                <LogIn className="h-4 w-4 mr-2" />
                Copy ID & Instructions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
