/**
 * Public site header — glassmorphism navigation bar.
 * Features the official Square Kufic logo and responsive nav.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Logo } from "@/components/layout/logo";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
];

export function Header() {
  const [open, setOpen] = useState(false);

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

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-all"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {open && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-lg">
          <nav className="container mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t my-3" />
            <div className="flex flex-col gap-2 pt-1">
              <LinkButton
                variant="outline"
                href="/login"
                className="w-full justify-center"
                onClick={() => setOpen(false)}
              >
                Log In
              </LinkButton>
              <LinkButton
                href="/register"
                className="w-full justify-center press"
                onClick={() => setOpen(false)}
              >
                Get Started
              </LinkButton>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
