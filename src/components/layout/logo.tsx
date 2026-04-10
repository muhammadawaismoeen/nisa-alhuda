/**
 * Brand Logo component.
 * Uses the official Nisa Al-Huda Square Kufic calligraphy SVG.
 * The SVG is 801x465 (roughly 1.72:1 aspect ratio).
 */
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "default" | "lg";
  linkTo?: string;
}

// Height-based sizing to fit in containers, width auto-calculated
const sizeMap = {
  sm: 40,      // header
  default: 56, // auth pages
  lg: 80,      // splash/about
};

export function Logo({ size = "default", linkTo = "/" }: LogoProps) {
  const height = sizeMap[size];
  // Maintain aspect ratio: 801/465 ≈ 1.72
  const width = Math.round(height * 1.72);

  const logo = (
    <Image
      src="/logo.svg"
      alt="Nisa Al-Huda — Women of Guidance"
      width={width}
      height={height}
      priority
    />
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="flex items-center">
        {logo}
      </Link>
    );
  }

  return logo;
}
