/**
 * Decorative section divider with Islamic geometric motif.
 * Used between landing page sections for visual flow.
 */

export function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 py-4 ${className}`} aria-hidden="true">
      <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-border" />
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        {/* Small 4-pointed star */}
        <path
          d="M16 4L19 13L28 16L19 19L16 28L13 19L4 16L13 13Z"
          fill="currentColor"
          className="text-primary"
          opacity="0.2"
        />
        <path
          d="M16 8L18 14L24 16L18 18L16 24L14 18L8 16L14 14Z"
          fill="currentColor"
          className="text-primary"
          opacity="0.15"
        />
      </svg>
      <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}

export function WaveDivider({ flip = false, className = "" }: { flip?: boolean; className?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? "rotate-180" : ""} ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="w-full h-8 md:h-12"
      >
        <path
          d="M0,30 C200,50 400,10 600,30 C800,50 1000,10 1200,30 L1200,60 L0,60 Z"
          className="fill-background"
        />
      </svg>
    </div>
  );
}
