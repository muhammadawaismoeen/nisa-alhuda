/**
 * Admin Offerings Page — lists all offerings with management actions.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { formatPrice } from "@/lib/constants";
import { Plus, BookOpen, Pencil } from "lucide-react";
import type { Offering } from "@/lib/types/database";

const statusConfig = {
  draft: { label: "Draft", variant: "outline" as const },
  published: { label: "Published", variant: "default" as const },
  archived: { label: "Archived", variant: "secondary" as const },
};

const typeLabels = {
  program: "Program",
  course: "Course",
  workshop: "Workshop",
};

export default async function AdminOfferingsPage() {
  const supabase = await createClient();

  const { data: offerings, error } = await supabase
    .from("offerings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching offerings:", error);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Offerings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your programs, courses, and workshops.
          </p>
        </div>
        <LinkButton href="/dashboard/admin/offerings/new" className="press">
          <Plus className="h-4 w-4 mr-1.5" />
          New Offering
        </LinkButton>
      </div>

      {!offerings || offerings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              No offerings yet
            </p>
            <LinkButton href="/dashboard/admin/offerings/new">
              Create Your First Offering
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offerings.map((offering: Offering) => {
            const status = statusConfig[offering.status];
            return (
              <Card key={offering.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Thumbnail placeholder */}
                    <div className="h-16 w-24 rounded-lg bg-secondary kufic-pattern flex items-center justify-center shrink-0">
                      <BookOpen className="h-6 w-6 text-primary/20" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {offering.title}
                        </h3>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[offering.type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {offering.short_description || offering.description}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{formatPrice(offering.price)}</span>
                        {offering.schedule_start && (
                          <span>
                            Starts{" "}
                            {new Date(
                              offering.schedule_start
                            ).toLocaleDateString("en-PK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        <span>/offerings/{offering.slug}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <LinkButton
                      variant="outline"
                      size="sm"
                      href={`/dashboard/admin/offerings/${offering.id}/edit`}
                      className="shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </LinkButton>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
