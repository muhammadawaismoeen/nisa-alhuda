/**
 * PageHeader — unified page title + subtitle + optional action slot
 * for every page inside the dashboard shell. Used across student,
 * instructor, and shared pages so the whole app feels cohesive.
 */
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  eyebrow,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary/80">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:inline-flex">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:ml-[52px]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
