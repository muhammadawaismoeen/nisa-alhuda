"use client";

/**
 * Public site header.
 *
 * UX upgrades over the previous header:
 *   - Scroll-tightened: glass density + tighter height after 10px scroll
 *   - Desktop nav link has an underline indicator that slides in on hover
 *   - Active route gets the underline permanently
 *   - Mobile sheet animates in from the top with a stagger
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Logo } from "@/components/layout/logo";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-sm"
          : "bg-background/40 backdrop-blur-md"
      }`}
    >
      <div
        className={`container mx-auto flex items-center justify-between px-4 transition-all duration-300 ${
          scrolled ? "h-14" : "h-16"
        }`}
      >
        <Logo size="sm" />

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative px-3 py-1.5 text-sm font-medium transition-colors"
              >
                <span
                  className={
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  }
                >
                  {link.label}
                </span>
                {/* Underline indicator */}
                <span
                  className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary transition-all duration-300 ${
                    isActive
                      ? "scale-x-100 opacity-100"
                      : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-60"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Auth buttons */}
        <div className="hidden items-center gap-2 md:flex">
          <LinkButton variant="ghost" href="/login" size="sm">
            Log In
          </LinkButton>
          <Link
            href="/register"
            className="group relative inline-flex h-9 items-center overflow-hidden rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30 active:scale-[0.97]"
          >
            <span className="relative z-10">Get Started</span>
            <span className="absolute inset-0 shimmer opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </header>

      {/* Mobile drawer — slides in from the right.
          Rendered OUTSIDE the <header> because <header>'s backdrop-blur creates
          a containing block for position:fixed children, which would clip the
          drawer to the header's ~64px height. */}
      <AnimatePresence>
        {open && (
          <>
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md md:hidden"
            />

            {/* Drawer panel */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 right-0 z-50 flex h-full w-[85%] max-w-sm flex-col border-l border-border bg-white shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
                <Logo size="sm" />
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
                {navLinks.map((link, i) => {
                  const isActive =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.href);
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04 }}
                    >
                      <Link
                        href={link.href}
                        className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <div className="border-t border-border/60 bg-white p-4">
                <div className="flex flex-col gap-2">
                  <LinkButton
                    variant="outline"
                    href="/login"
                    className="w-full justify-center"
                  >
                    Log In
                  </LinkButton>
                  <LinkButton
                    href="/register"
                    className="press w-full justify-center"
                  >
                    Get Started
                  </LinkButton>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
