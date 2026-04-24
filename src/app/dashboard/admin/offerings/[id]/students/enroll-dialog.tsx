"use client";

/**
 * "Manually enroll student" dialog — sits on the course roster page.
 *
 * Handles both cases in one form:
 *   - Existing user (matched by email) → links enrollment to their profile.
 *   - New person → creates a guest enrollment with the name stashed so the
 *     roster isn't blank, and optionally fires a welcome/credentials email.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Mail } from "lucide-react";
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
import { toast } from "sonner";
import { enrollByEmail } from "./actions";

interface EnrollDialogProps {
  offeringId: string;
  offeringTitle: string;
}

export function EnrollDialog({ offeringId, offeringTitle }: EnrollDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);

  function reset() {
    setEmail("");
    setFullName("");
    setSendInvite(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await enrollByEmail(
        offeringId,
        email,
        fullName,
        sendInvite
      );
      if (!res.success) {
        toast.error(res.error || "Failed to enroll.");
        return;
      }

      const parts = [
        `Enrolled ${email}`,
        res.isGuest ? "(new guest account)" : "(existing user)",
      ];
      if (res.emailSent) parts.push("— welcome email sent.");
      toast.success(parts.join(" "));
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors press">
        <UserPlus className="h-4 w-4 mr-1.5" />
        Manually enroll student
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll a student in {offeringTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Enter the student&apos;s email. If they already have an account
            we&apos;ll link to it; otherwise a new guest account is created
            and a welcome email (with a password-setup link) is sent.
          </p>

          <div className="space-y-2">
            <Label htmlFor="enroll-email">Email</Label>
            <Input
              id="enroll-email"
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enroll-name">
              Full name <span className="text-muted-foreground">(optional for existing users)</span>
            </Label>
            <Input
              id="enroll-name"
              type="text"
              placeholder="e.g. Sana Ahmed"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-input p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="h-4 w-4 mt-0.5 accent-primary cursor-pointer"
            />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Mail className="h-3.5 w-3.5" />
                Send welcome / password setup email now
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Uncheck if you&apos;ll send credentials manually later.
              </span>
            </span>
          </label>

          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Enroll student
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
