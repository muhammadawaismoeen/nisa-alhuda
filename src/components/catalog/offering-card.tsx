/**
 * Reusable card component for displaying an offering in the catalog grid.
 */
import { Calendar, BookOpen, MapPin, Wifi } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { formatPriceWithFee } from "@/lib/constants";
import type { Offering } from "@/lib/types/database";

// Map offering types to display labels and colors
const typeConfig = {
  program: { label: "Program", variant: "default" as const },
  course: { label: "Course", variant: "secondary" as const },
  workshop: { label: "Workshop", variant: "outline" as const },
  class: { label: "Class", variant: "secondary" as const },
};

const modeConfig = {
  online: { label: "Online", icon: Wifi },
  onsite: { label: "Onsite", icon: MapPin },
  hybrid: { label: "Hybrid", icon: Wifi },
};

export function OfferingCard({ offering }: { offering: Offering }) {
  const config = typeConfig[offering.type];
  const modeInfo = modeConfig[offering.mode] || modeConfig.online;
  const ModeIcon = modeInfo.icon;

  return (
    <Card className="flex flex-col hover-lift glass overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-[16/10] bg-secondary rounded-t-lg flex items-center justify-center kufic-pattern">
        {offering.thumbnail_url ? (
          <img
            src={offering.thumbnail_url}
            alt={offering.title}
            className="w-full h-full object-cover rounded-t-lg"
          />
        ) : (
          <BookOpen className="h-10 w-10 text-primary/20" />
        )}
      </div>

      <CardHeader className="px-4 py-3 pb-1">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <Badge variant={config.variant} className="text-xs px-2 py-0">
            {config.label}
          </Badge>
          {offering.type === "program" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700 dark:text-emerald-400">
              Age 12+
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <ModeIcon className="h-2.5 w-2.5 mr-0.5" />
            {modeInfo.label}
          </Badge>
          {offering.is_new && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500 text-white">
              New
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-base leading-tight line-clamp-2">
          {offering.title}
        </h3>
      </CardHeader>

      <CardContent className="flex-1 px-4 py-2">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {offering.short_description || offering.description}
        </p>
        {offering.schedule_start && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1.5">
            <Calendar className="h-3 w-3" />
            {new Date(offering.schedule_start).toLocaleDateString("en-PK", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between px-4 py-3 pt-1">
        <span className="font-bold text-primary text-sm">
          {formatPriceWithFee(offering.price, offering.fee_type)}
        </span>
        <LinkButton size="sm" href={`/offerings/${offering.slug}`} className="text-xs h-7 px-3">
          View Details
        </LinkButton>
      </CardFooter>
    </Card>
  );
}
