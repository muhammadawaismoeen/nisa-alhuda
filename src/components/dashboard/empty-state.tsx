/**
 * EmptyState — unified placeholder used whenever a dashboard page has no
 * records yet. The dashed frame signals "this is empty" without feeling
 * like an error; a soft primary-tinted icon echoes the brand palette.
 */
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-14 px-6 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <Icon className="h-7 w-7 text-primary" />
        </span>
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </CardContent>
    </Card>
  );
}
