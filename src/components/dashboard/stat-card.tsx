/**
 * StatCard — compact KPI tile for the top of dashboard landings.
 * Single-number + label + icon; a quiet accent rail on the left
 * gives it a sense of importance without being loud.
 */
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  /** Tailwind text color class for the icon + accent rail. */
  accent?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "text-primary",
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm">
      <span
        className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-current ${accent} opacity-70`}
      />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
            {value}
          </p>
          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 break-words">
              {hint}
            </p>
          )}
        </div>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/5 ${accent}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
    </div>
  );
}
