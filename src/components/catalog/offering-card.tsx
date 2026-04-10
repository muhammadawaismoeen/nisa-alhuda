/**
 * Reusable card component for displaying an offering in the catalog grid.
 */
import Link from "next/link";
import { Calendar, BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/constants";
import type { Offering } from "@/lib/types/database";

// Map offering types to display labels and colors
const typeConfig = {
  program: { label: "Program", variant: "default" as const },
  course: { label: "Course", variant: "secondary" as const },
  workshop: { label: "Workshop", variant: "outline" as const },
};

export function OfferingCard({ offering }: { offering: Offering }) {
  const config = typeConfig[offering.type];

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      {/* Thumbnail placeholder */}
      <div className="aspect-video bg-emerald-50 rounded-t-lg flex items-center justify-center">
        {offering.thumbnail_url ? (
          <img
            src={offering.thumbnail_url}
            alt={offering.title}
            className="w-full h-full object-cover rounded-t-lg"
          />
        ) : (
          <BookOpen className="h-12 w-12 text-emerald-200" />
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={config.variant}>{config.label}</Badge>
          {offering.schedule_start && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(offering.schedule_start).toLocaleDateString("en-PK", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-lg leading-tight line-clamp-2">
          {offering.title}
        </h3>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {offering.short_description || offering.description}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <span className="font-bold text-primary text-lg">
          {formatPrice(offering.price)}
        </span>
        <Button size="sm" render={<Link href={`/offerings/${offering.slug}`} />}>View Details</Button>
      </CardFooter>
    </Card>
  );
}
