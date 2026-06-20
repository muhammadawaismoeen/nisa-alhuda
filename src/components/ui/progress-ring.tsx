"use client";

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** Completion percentage 0–100. */
  pct: number;
  /** Outer diameter in pixels (default 40). */
  size?: number;
  /** Ring stroke thickness in pixels (default 3.5). */
  strokeWidth?: number;
  /** Text rendered in the centre. Defaults to `{pct}%`. Pass `null` to hide. */
  label?: string | null;
  /** Extra class on the wrapping <svg>. */
  className?: string;
  /** Completed colour — defaults to hsl(var(--primary)). */
  color?: string;
  /** Track colour — defaults to hsl(var(--muted)). */
  trackColor?: string;
}

export function ProgressRing({
  pct,
  size = 40,
  strokeWidth = 3.5,
  label,
  className,
  color = "hsl(var(--primary))",
  trackColor = "hsl(var(--muted))",
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const centre = size / 2;

  const displayLabel = label === undefined ? `${clamped}%` : label;

  // Pick a colour variant when complete
  const fillColor = clamped === 100 ? "hsl(142 71% 45%)" : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0 -rotate-90", className)}
      aria-label={`Progress: ${clamped}%`}
      role="img"
    >
      {/* Track */}
      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Fill */}
      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        stroke={fillColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      {/* Centre label — rotated back upright */}
      {displayLabel !== null && (
        <text
          x={centre}
          y={centre}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.22}
          fontWeight="600"
          fill="currentColor"
          className="rotate-90 origin-center fill-foreground"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${centre}px ${centre}px` }}
        >
          {displayLabel}
        </text>
      )}
    </svg>
  );
}
