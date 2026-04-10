/**
 * Decorative Islamic geometric star pattern.
 * Inspired by traditional 8-pointed star (Rub el Hizb) motifs.
 * Used as background decoration on hero and section dividers.
 */

export function IslamicStar({ className = "", size = 200 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer 8-pointed star */}
      <path
        d="M100 10L120 80L190 80L132 120L152 190L100 150L48 190L68 120L10 80L80 80Z"
        fill="currentColor"
        opacity="0.06"
      />
      {/* Inner rotated square */}
      <rect
        x="60"
        y="60"
        width="80"
        height="80"
        transform="rotate(45 100 100)"
        fill="currentColor"
        opacity="0.04"
      />
      {/* Center circle */}
      <circle cx="100" cy="100" r="25" fill="currentColor" opacity="0.06" />
      {/* Concentric ring */}
      <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.05" />
      <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.04" />
    </svg>
  );
}

export function GeometricGrid({ className = "" }: { className?: string }) {
  return (
    <svg
      width="100%"
      height="100%"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <pattern id="kufic-blocks" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          {/* Square Kufic-inspired block pattern */}
          <rect x="0" y="0" width="20" height="20" fill="currentColor" opacity="0.03" />
          <rect x="40" y="0" width="20" height="20" fill="currentColor" opacity="0.02" />
          <rect x="20" y="20" width="20" height="20" fill="currentColor" opacity="0.025" />
          <rect x="0" y="40" width="20" height="20" fill="currentColor" opacity="0.02" />
          <rect x="40" y="40" width="20" height="20" fill="currentColor" opacity="0.03" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kufic-blocks)" />
    </svg>
  );
}
