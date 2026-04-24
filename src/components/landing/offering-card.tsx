/**
 * Upgraded offering card — server component (no client JS until hover).
 *
 * Visual upgrade over the previous card:
 *   - Rotating conic-gradient border beam on hover (via .border-beam util)
 *   - Mode chip inside a subtle outline pill
 *   - Price + CTA in a footer strip separated by a hairline
 *   - "New" ribbon corner mark when is_new
 *   - Overflow-safe title (line-clamp-2) so grid stays even
 *
 * Used in both the landing preview grid and the /catalog page.
 */
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  MapPin,
  Sparkles,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sprig } from "./florals";
import { formatPriceWithFee } from "@/lib/constants";
import type { Offering } from "@/lib/types/database";

interface OfferingCardProps {
  offering: Offering;
}

export function OfferingCard({ offering }: OfferingCardProps) {
  const typeLabel =
    offering.type === "program"
      ? "Program"
      : offering.type === "course"
      ? "Course"
      : offering.type === "workshop"
      ? "Workshop"
      : "Class";

  const ModeIcon = offering.mode === "onsite" ? MapPin : Wifi;
  const modeLabel =
    offering.mode === "onsite"
      ? "Onsite"
      : offering.mode === "hybrid"
      ? "Hybrid"
      : "Online";

  return (
    <Link
      href={`/offerings/${offering.slug}`}
      className="border-beam group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
    >
      {/* Floral corner mark — fades in on hover so cards stay calm at rest */}
      <Sprig
        size={44}
        className="pointer-events-none absolute -right-2 -top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-70"
      />

      {/* "New" ribbon */}
      {offering.is_new && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
          <Sparkles className="h-2.5 w-2.5" />
          New
        </div>
      )}

      {/* Meta chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-[11px] font-medium">
          {typeLabel}
        </Badge>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          <ModeIcon className="h-2.5 w-2.5" />
          {modeLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-heading mt-3 line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
        {offering.title}
      </h3>

      {/* Description */}
      {offering.short_description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {offering.short_description}
        </p>
      )}

      {/* Start date */}
      {offering.schedule_start && (
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Starts{" "}
          {new Date(offering.schedule_start).toLocaleDateString("en-PK", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      )}

      {/* Footer: price + arrow */}
      <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
        <span className="font-heading text-sm font-bold text-primary">
          {formatPriceWithFee(offering.price, offering.fee_type)}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
          View details
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
