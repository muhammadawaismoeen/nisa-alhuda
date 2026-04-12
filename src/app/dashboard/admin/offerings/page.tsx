/**
 * Course Management — list all offerings with feature/archive capabilities.
 * Admin can feature courses on homepage or archive old ones.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { formatPriceWithFee } from "@/lib/constants";
import { Plus, BookOpen, Pencil } from "lucide-react";
import { DeleteOffering } from "./delete-offering";
import { OfferingToggles } from "./offering-toggles";
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
  class: "Class",
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

  const published = (offerings || []).filter((o: any) => o.status === "published").length;
  const featured = (offerings || []).filter((o: any) => o.is_featured).length;
  const archived = (offerings || []).filter((o: any) => o.status === "archived").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Course Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage programs, courses, and workshops. Feature on homepage or
            archive old ones.
          </p>
        </div>
        <LinkButton href="/dashboard/admin/offerings/new" className="press">
          <Plus className="h-4 w-4 mr-1.5" />
          New Offering
        </LinkButton>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Badge variant="outline" className="text-sm py-1 px-3">
          {(offerings || []).length} total
        </Badge>
        <Badge variant="default" className="text-sm py-1 px-3">
          {published} published
        </Badge>
        {featured > 0 && (
          <Badge
            variant="outline"
            className="text-sm py-1 px-3 text-amber-600 border-amber-300"
          >
            {featured} featured
          </Badge>
        )}
        {archived > 0 && (
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {archived} archived
          </Badge>
        )}
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
          {offerings.map((offering: any) => {
            const status = statusConfig[offering.status as keyof typeof statusConfig] || statusConfig.draft;
            return (
              <Card
                key={offering.id}
                className={offering.status === "archived" ? "opacity-60" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Thumbnail placeholder */}
                    <div className="h-16 w-24 rounded-lg bg-secondary kufic-pattern flex items-center justify-center shrink-0 relative">
                      <BookOpen className="h-6 w-6 text-primary/20" />
                      {offering.is_featured && (
                        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold">
                          ★
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {offering.title}
                        </h3>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[offering.type as keyof typeof typeLabels]}
                        </Badge>
                        {offering.is_featured && (
                          <Badge
                            variant="outline"
                            className="text-xs text-amber-600 border-amber-300"
                          >
                            Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {offering.short_description || offering.description}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{formatPriceWithFee(offering.price, offering.fee_type)}</span>
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
                    <div className="flex items-center gap-2 shrink-0">
                      <OfferingToggles
                        offeringId={offering.id}
                        isFeatured={offering.is_featured || false}
                        status={offering.status}
                      />
                      <LinkButton
                        variant="outline"
                        size="sm"
                        href={`/dashboard/admin/offerings/${offering.id}/edit`}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </LinkButton>
                      <DeleteOffering
                        offeringId={offering.id}
                        offeringTitle={offering.title}
                      />
                    </div>
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
