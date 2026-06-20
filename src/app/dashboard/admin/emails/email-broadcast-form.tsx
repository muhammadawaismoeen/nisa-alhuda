/**
 * Email Broadcast Form — template picker, audience selector, custom message, send.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Heart,
  Star,
  BookOpen,
  Clock,
  Moon,
  Gift,
  Sparkles,
  Trophy,
  Users,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TEMPLATES = {
  welcome: {
    label: "Welcome to the Family",
    description: "Warm welcome for new students joining the platform",
    icon: Heart,
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  encouragement: {
    label: "Keep Going, Sister!",
    description: "Motivational boost for students mid-course",
    icon: Sparkles,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  milestone: {
    label: "Milestone Celebration",
    description: "Celebrate a student achievement or progress",
    icon: Trophy,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  reminder_gentle: {
    label: "Gentle Study Reminder",
    description: "Soft, caring nudge to continue learning",
    icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  dua_friday: {
    label: "Jumu'ah Blessings",
    description: "Friday blessings and motivational message",
    icon: Star,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  ramadan: {
    label: "Ramadan Greetings",
    description: "Special Ramadan blessings and encouragement",
    icon: Moon,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  gratitude: {
    label: "Thank You / Jazakillah",
    description: "Express gratitude to students for their journey",
    icon: Gift,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  new_course: {
    label: "New Course Announcement",
    description: "Exciting announcement about a new offering",
    icon: BookOpen,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

interface EmailBroadcastFormProps {
  offerings: { id: string; title: string }[];
}

export function EmailBroadcastForm({ offerings }: EmailBroadcastFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<TemplateKey | null>(null);
  const [audience, setAudience] = useState<"all" | "offering">("all");
  const [offeringId, setOfferingId] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSend() {
    if (!selected) {
      toast.error("Please select a template first.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast",
          templateKey: selected,
          customMessage: customMessage.trim() || null,
          audience,
          offeringId: audience === "offering" ? offeringId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      if (data.failed > 0) {
        toast.warning(`Sent to ${data.sent}, failed for ${data.failed} recipient${data.failed !== 1 ? "s" : ""}.`);
      } else {
        toast.success(`Emails sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}!`);
      }
      setShowConfirm(false);
      setSelected(null);
      setCustomMessage("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send emails."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Step 1: Pick Template */}
      <div>
        <h2 className="text-lg font-semibold mb-1">1. Choose a Template</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Each template comes with a beautiful, Emaan-boosting design.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.entries(TEMPLATES) as [TemplateKey, (typeof TEMPLATES)[TemplateKey]][]).map(
            ([key, tpl]) => {
              const Icon = tpl.icon;
              const isSelected = selected === key;
              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? "ring-2 ring-primary border-primary/50 shadow-md"
                      : "hover:border-primary/30"
                  }`}
                  onClick={() => setSelected(key)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg ${tpl.bg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`h-5 w-5 ${tpl.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{tpl.label}</p>
                        {isSelected && (
                          <Badge className="text-[10px] px-1.5 py-0">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tpl.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      </div>

      {/* Step 2: Audience */}
      {selected && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-lg font-semibold mb-1">2. Select Audience</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Who should receive this email?
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setAudience("all");
                setOfferingId("");
              }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                audience === "all"
                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Globe className="h-4 w-4" />
              All Students
            </button>
            <button
              type="button"
              onClick={() => setAudience("offering")}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                audience === "offering"
                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Users className="h-4 w-4" />
              Specific Course
            </button>
          </div>

          {audience === "offering" && (
            <div className="mt-3 max-w-sm">
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                value={offeringId}
                onChange={(e) => setOfferingId(e.target.value)}
              >
                <option value="">Select a course...</option>
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Custom Message */}
      {selected && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-lg font-semibold mb-1">
            3. Add a Personal Touch{" "}
            <span className="text-muted-foreground font-normal text-sm">
              (optional)
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            This message will appear inside the template as a highlighted section.
          </p>
          <textarea
            className="flex min-h-[100px] w-full max-w-lg rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none resize-y"
            placeholder="e.g., We noticed you've been making great progress this week! Keep it up..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
        </div>
      )}

      {/* Step 4: Review & Send */}
      {selected && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!showConfirm ? (
            <Button
              size="lg"
              onClick={() => {
                if (audience === "offering" && !offeringId) {
                  toast.error("Please select a course.");
                  return;
                }
                setShowConfirm(true);
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Review & Send
            </Button>
          ) : (
            <Card className="border-primary/30 bg-primary/[0.02] max-w-lg">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">Confirm Email Broadcast</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template:</span>
                    <span className="font-medium">
                      {TEMPLATES[selected].label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audience:</span>
                    <span className="font-medium">
                      {audience === "all"
                        ? "All Students"
                        : offerings.find((o) => o.id === offeringId)?.title ||
                          "—"}
                    </span>
                  </div>
                  {customMessage && (
                    <div>
                      <span className="text-muted-foreground">
                        Custom message:
                      </span>
                      <p className="mt-1 text-xs bg-muted p-2 rounded">
                        {customMessage.length > 150
                          ? customMessage.slice(0, 150) + "..."
                          : customMessage}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirm(false)}
                    disabled={sending}
                  >
                    Go Back
                  </Button>
                  <Button size="sm" onClick={handleSend} disabled={sending}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {sending ? "Sending..." : "Send Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
