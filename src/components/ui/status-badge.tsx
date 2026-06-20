import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  HeartHandshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StatusKey =
  | "pending"
  | "approved"
  | "rejected"
  | "owed"
  | "paid"
  | "unpaid"
  | "fa-pending"
  | "fa-awaiting-receipt"
  | "fa-receipt-review"
  | "fa-waived"
  | "fa-partial";

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Classes applied to the <Badge> pill */
  badgeClass: string;
  /** Background for the large icon bubble used on some card layouts */
  bubbleBg: string;
  /** Icon colour for the large icon bubble */
  bubbleColor: string;
}

export const STATUS_CONFIG: Record<StatusKey, StatusMeta> = {
  pending: {
    label: "Pending Review",
    icon: Clock,
    badgeClass: "border-amber-300 text-amber-700 dark:text-amber-400",
    bubbleBg: "bg-amber-50 dark:bg-amber-950/20",
    bubbleColor: "text-amber-600",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    badgeClass:
      "bg-green-600 hover:bg-green-600 border-green-600 text-white",
    bubbleBg: "bg-green-50 dark:bg-green-950/20",
    bubbleColor: "text-green-600",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    badgeClass:
      "bg-destructive hover:bg-destructive border-destructive text-destructive-foreground",
    bubbleBg: "bg-red-50 dark:bg-red-950/20",
    bubbleColor: "text-red-600",
  },
  owed: {
    label: "Owed",
    icon: AlertCircle,
    badgeClass:
      "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400",
    bubbleBg: "bg-slate-50 dark:bg-slate-900/20",
    bubbleColor: "text-slate-500",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle,
    badgeClass:
      "bg-green-600 hover:bg-green-600 border-green-600 text-white",
    bubbleBg: "bg-green-50 dark:bg-green-950/20",
    bubbleColor: "text-green-600",
  },
  unpaid: {
    label: "Unpaid",
    icon: AlertCircle,
    badgeClass: "border-amber-300 text-amber-600 dark:text-amber-400",
    bubbleBg: "bg-amber-50 dark:bg-amber-950/20",
    bubbleColor: "text-amber-600",
  },
  "fa-pending": {
    label: "FA Under Review",
    icon: HeartHandshake,
    badgeClass: "border-amber-300 text-amber-700 dark:text-amber-400",
    bubbleBg: "bg-amber-50 dark:bg-amber-950/20",
    bubbleColor: "text-amber-600",
  },
  "fa-awaiting-receipt": {
    label: "FA Approved — Upload Receipt",
    icon: HeartHandshake,
    badgeClass: "border-amber-300 text-amber-700 dark:text-amber-400",
    bubbleBg: "bg-amber-50 dark:bg-amber-950/20",
    bubbleColor: "text-amber-600",
  },
  "fa-receipt-review": {
    label: "Receipt Under Review",
    icon: Clock,
    badgeClass: "border-amber-300 text-amber-700 dark:text-amber-400",
    bubbleBg: "bg-amber-50 dark:bg-amber-950/20",
    bubbleColor: "text-amber-600",
  },
  "fa-waived": {
    label: "FA Fully Waived",
    icon: HeartHandshake,
    badgeClass: "border-green-300 text-green-700 dark:text-green-400",
    bubbleBg: "bg-green-50 dark:bg-green-950/20",
    bubbleColor: "text-green-600",
  },
  "fa-partial": {
    label: "FA Approved",
    icon: HeartHandshake,
    badgeClass: "border-amber-300 text-amber-700 dark:text-amber-400",
    bubbleBg: "bg-amber-50 dark:bg-amber-950/20",
    bubbleColor: "text-amber-600",
  },
};

interface StatusBadgeProps {
  status: StatusKey;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, icon: Icon, badgeClass } = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={badgeClass}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
