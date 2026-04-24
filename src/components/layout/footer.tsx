import Link from "next/link";
import { Heart, Mail, MapPin } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Public site footer — four-column layout with newsletter-style sign-off.
 * Server component (no interactivity).
 */
export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-border/60 bg-gradient-to-br from-secondary/60 via-background to-secondary/30">
      {/* Kufic watermark top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-primary/5 blur-3xl"
      />

      <div className="container relative mx-auto px-4 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-8">
          {/* Brand + mission */}
          <div className="col-span-2">
            <Logo size="sm" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {APP_TAGLINE} — a sisterhood learning community offering live
              programs, courses, and workshops in Fiqh, Arabic, Hadith, and
              Qur&apos;an.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              <span>Lahore, Pakistan &middot; Serving sisters worldwide</span>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-foreground">
              Explore
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <FooterLink href="/">Home</FooterLink>
              <FooterLink href="/catalog">Browse catalog</FooterLink>
              <FooterLink href="/register">Create account</FooterLink>
              <FooterLink href="/login">Student login</FooterLink>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-foreground">
              Get in touch
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:hello@nisaalhuda.org"
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                  hello@nisaalhuda.org
                </a>
              </li>
              <li className="text-xs text-muted-foreground">
                Sisters-only inquiries welcome. We respond within 24h in sha
                Allah.
              </li>
            </ul>
          </div>
        </div>

        {/* Divider + sign-off */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Built with
            <Heart className="h-3 w-3 fill-primary text-primary" />
            for the Ummah
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-muted-foreground transition-colors hover:text-primary"
      >
        {children}
      </Link>
    </li>
  );
}
