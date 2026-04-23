/**
 * User Directory — searchable, filterable user list with admin actions.
 * Client component: search, role filter, multi-role assign, reset password,
 * suspend/unsuspend, login-as-user helper.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Shield,
  LogIn,
  Ban,
  CheckCircle,
  Loader2,
  Phone,
  Calendar,
  BookOpen,
  Wallet,
  UserCog,
  KeyRound,
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
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile, UserRole } from "@/lib/types/database";
import { updateUserRoles, resetUserPassword } from "./actions";

interface UserDirectoryProps {
  profiles: Profile[];
  enrollmentCounts: Record<string, { total: number; approved: number }>;
  currentUserId: string;
}

const roleConfig: Record<
  UserRole,
  {
    label: string;
    color: string;
    bg: string;
    icon: typeof Shield;
  }
> = {
  admin: { label: "Admin", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-950/30", icon: Shield },
  treasurer: { label: "Treasurer", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950/30", icon: Wallet },
  instructor: { label: "Instructor", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950/30", icon: BookOpen },
  student: { label: "Student", color: "text-green-600", bg: "bg-green-100 dark:bg-green-950/30", icon: User },
};

const ROLE_OPTIONS: UserRole[] = ["student", "instructor", "treasurer", "admin"];

function uniqueRoles(profile: Profile): UserRole[] {
  const set = new Set<UserRole>(profile.roles || []);
  set.add(profile.role);
  return Array.from(set);
}

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

  // Multi-role dialog state
  const [roleDialogTarget, setRoleDialogTarget] = useState<Profile | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<UserRole>>(new Set());
  const [selectedPrimary, setSelectedPrimary] = useState<UserRole>("student");
  const [savingRoles, startSavingRoles] = useTransition();

  // Reset-password dialog state
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [resettingPwd, startResetPwd] = useTransition();

  // Filter profiles — match against primary OR any assigned role.
  const filtered = profiles.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "all" || uniqueRoles(p).includes(roleFilter as UserRole);

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

  function openRoleDialog(profile: Profile) {
    setRoleDialogTarget(profile);
    setSelectedRoles(new Set(uniqueRoles(profile)));
    setSelectedPrimary(profile.role);
  }

  function toggleRole(role: UserRole) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        // Don't allow removing the primary role — user must change primary first.
        if (role === selectedPrimary) return prev;
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  }

  function handlePrimaryChange(role: UserRole) {
    setSelectedPrimary(role);
    // Primary must be in the set.
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      next.add(role);
      return next;
    });
  }

  function confirmRoleChange() {
    if (!roleDialogTarget) return;
    const rolesArr = Array.from(selectedRoles);
    if (rolesArr.length === 0) {
      toast.error("Select at least one role.");
      return;
    }
    if (!rolesArr.includes(selectedPrimary)) rolesArr.push(selectedPrimary);

    startSavingRoles(async () => {
      const res = await updateUserRoles(
        roleDialogTarget.id,
        selectedPrimary,
        rolesArr
      );
      if (!res.success) {
        toast.error(res.error || "Failed to update roles.");
        return;
      }
      const roleLabels = rolesArr
        .map((r) => roleConfig[r]?.label || r)
        .join(", ");
      toast.success(
        `${roleDialogTarget.full_name}: ${roleLabels} (primary: ${
          roleConfig[selectedPrimary]?.label
        })`
      );
      setRoleDialogTarget(null);
      router.refresh();
    });
  }

  function openResetDialog(profile: Profile) {
    setResetTarget(profile);
  }

  function confirmResetPassword() {
    if (!resetTarget) return;
    startResetPwd(async () => {
      const res = await resetUserPassword(resetTarget.id);
      if (!res.success) {
        toast.error(res.error || "Failed to send reset link.");
        return;
      }
      toast.success(
        `Password reset link sent to ${resetTarget.full_name}. Check their email.`
      );
      setResetTarget(null);
    });
  }

  function handleLoginAs(profile: Profile) {
    setLoginTarget(profile);
    setShowLoginDialog(true);
  }

  async function confirmLoginAs() {
    if (!loginTarget) return;
    setShowLoginDialog(false);
    try {
      await navigator.clipboard.writeText(loginTarget.id);
      toast.success(
        "User ID copied. Use Supabase Dashboard → Auth → Users to impersonate."
      );
    } catch {
      toast.info("User ID: " + loginTarget.id);
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
          {["all", "student", "instructor", "treasurer", "admin"].map(
            (role) => (
              <Button
                key={role}
                variant={roleFilter === role ? "default" : "outline"}
                size="sm"
                onClick={() => setRoleFilter(role)}
                className="capitalize"
              >
                {role === "all" ? "All" : role}
              </Button>
            )
          )}
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
            const primaryCfg = roleConfig[profile.role] || roleConfig.student;
            const RoleIcon = primaryCfg.icon;
            const enrollInfo = enrollmentCounts[profile.id];
            const isCurrentUser = profile.id === currentUserId;
            const allRoles = uniqueRoles(profile);
            const additionalRoles = allRoles.filter((r) => r !== profile.role);

            return (
              <Card
                key={profile.id}
                className={
                  profile.is_suspended ? "opacity-60 border-red-200" : ""
                }
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={`h-10 w-10 rounded-full ${primaryCfg.bg} flex items-center justify-center shrink-0`}
                    >
                      <RoleIcon className={`h-4 w-4 ${primaryCfg.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-semibold truncate">
                          {profile.full_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs ${primaryCfg.color}`}
                          title="Primary role"
                        >
                          {primaryCfg.label}
                        </Badge>
                        {additionalRoles.map((r) => {
                          const cfg = roleConfig[r];
                          return (
                            <Badge
                              key={r}
                              variant="secondary"
                              className={`text-xs ${cfg.color}`}
                              title="Additional role"
                            >
                              + {cfg.label}
                            </Badge>
                          );
                        })}
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
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
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
                        {/* Reset Password */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openResetDialog(profile)}
                          title="Send password reset email"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>

                        {/* Change Roles */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openRoleDialog(profile)}
                          title="Edit roles"
                        >
                          <UserCog className="h-3.5 w-3.5" />
                        </Button>

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

      {/* Multi-Role Dialog */}
      <Dialog
        open={!!roleDialogTarget}
        onOpenChange={(open) => !open && !savingRoles && setRoleDialogTarget(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit roles for {roleDialogTarget?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Pick every role this user should hold. The <strong>primary</strong>{" "}
              role (selected on the right) decides which dashboard they land on
              after login — additional roles simply grant extra feature access.
            </p>

            <div className="space-y-2">
              {ROLE_OPTIONS.map((r) => {
                const cfg = roleConfig[r];
                const RoleIcon = cfg.icon;
                const isChecked = selectedRoles.has(r);
                const isPrimary = selectedPrimary === r;
                return (
                  <div
                    key={r}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isChecked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRole(r)}
                      disabled={isPrimary}
                      className="h-4 w-4 rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
                      title={
                        isPrimary
                          ? "Primary role can't be removed — change primary first."
                          : ""
                      }
                    />
                    <div
                      className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}
                    >
                      <RoleIcon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{cfg.label}</p>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="primary-role"
                        checked={isPrimary}
                        onChange={() => handlePrimaryChange(r)}
                        className="h-3.5 w-3.5 accent-primary cursor-pointer"
                      />
                      Primary
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => setRoleDialogTarget(null)}
                disabled={savingRoles}
              >
                Cancel
              </Button>
              <Button onClick={confirmRoleChange} disabled={savingRoles}>
                {savingRoles && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save roles
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && !resettingPwd && setResetTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send password reset email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              A secure one-time link will be emailed to{" "}
              <strong>{resetTarget?.full_name}</strong>. They can use it to set
              a new password. The link expires after one use or 24 hours.
            </p>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <KeyRound className="h-3.5 w-3.5 inline mr-1.5 align-text-bottom" />
              The email comes from <code>noreply@nisaalhuda.org</code>. Ask the
              user to check their spam folder if it doesn't land in Inbox.
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setResetTarget(null)}
                disabled={resettingPwd}
              >
                Cancel
              </Button>
              <Button onClick={confirmResetPassword} disabled={resettingPwd}>
                {resettingPwd && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <KeyRound className="h-4 w-4 mr-2" />
                Send reset email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login As Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login as {loginTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              This copies the user&apos;s ID to your clipboard. Use the Supabase
              Dashboard (Auth → Users) to generate a magic link for this user
              to troubleshoot their account.
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
