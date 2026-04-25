/**
 * Resources moved into Subject folders.
 *
 * Resources (PDFs, slides, recordings) are now managed inside each Class,
 * which lives inside its parent Subject — opening a subject shows every
 * Class with an inline upload zone per Class. This standalone page is
 * kept only as a redirect so any old bookmarks or in-app links land on
 * the new entry point (the Subjects list).
 */
import { redirect } from "next/navigation";

export default function ResourcesRedirectPage() {
  redirect("/dashboard/instructor");
}
