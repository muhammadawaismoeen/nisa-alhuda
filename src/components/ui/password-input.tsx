/**
 * PasswordInput — a password field with an inline eye toggle that lets the
 * user show/hide the typed value. Drop-in replacement for <Input type="password" />.
 *
 * Accepts the full native <input> prop surface so it can be used with both
 * uncontrolled (name-based FormData) and controlled (value/onChange) forms.
 */
"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<
  React.ComponentProps<"input">,
  "type"
>;

export function PasswordInput({
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:text-foreground"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
