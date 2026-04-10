/**
 * Public site header — glassmorphism navigation bar.
 * Features the official Square Kufic logo and responsive nav.
 */
import Link from "next/link";
import { Menu } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Logo size="sm" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <LinkButton variant="ghost" href="/login">
            Log In
          </LinkButton>
          <LinkButton href="/register" className="press">
            Get Started
          </LinkButton>
        </div>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger className="md:hidden inline-flex shrink-0 items-center justify-center rounded-lg size-8 hover:bg-accent transition-all">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle>
              <Logo size="sm" />
            </SheetTitle>
            <nav className="flex flex-col gap-4 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium font-heading hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-border" />
              <LinkButton variant="ghost" className="justify-start" href="/login">
                Log In
              </LinkButton>
              <LinkButton href="/register" className="press">
                Get Started
              </LinkButton>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
