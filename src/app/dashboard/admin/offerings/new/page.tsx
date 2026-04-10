/**
 * New Offering Page — admin creates a new program, course, or workshop.
 */
import { OfferingForm } from "../offering-form";

export default function NewOfferingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Offering</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new program, course, or workshop to your catalog.
        </p>
      </div>

      <OfferingForm />
    </div>
  );
}
