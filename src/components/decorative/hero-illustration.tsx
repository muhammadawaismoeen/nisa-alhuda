/**
 * Hero illustration — aesthetic composition of Islamic learning elements.
 * Faceless design: shows a scene from behind/above — books, lantern, geometric art.
 * All vector art, no faces per brand guidelines.
 */

export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 400"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Background glow */}
      <ellipse cx="250" cy="300" rx="200" ry="60" fill="#C55B7A" opacity="0.04" />

      {/* ─── Open Book / Quran ─── */}
      <g transform="translate(150, 180)">
        {/* Left page */}
        <path
          d="M100 10C70 10 10 20 5 30L5 140C10 132 70 125 100 125Z"
          fill="#FFF8F6"
          stroke="#F0D4CC"
          strokeWidth="1.5"
        />
        {/* Right page */}
        <path
          d="M100 10C130 10 190 20 195 30L195 140C190 132 130 125 100 125Z"
          fill="#FDFBF7"
          stroke="#F0D4CC"
          strokeWidth="1.5"
        />
        {/* Spine */}
        <line x1="100" y1="10" x2="100" y2="125" stroke="#E8B5A8" strokeWidth="1" />
        {/* Text lines - left page */}
        <line x1="25" y1="45" x2="85" y2="42" stroke="#D4778F" strokeWidth="1" opacity="0.3" />
        <line x1="25" y1="58" x2="80" y2="55" stroke="#D4778F" strokeWidth="1" opacity="0.25" />
        <line x1="25" y1="71" x2="85" y2="68" stroke="#D4778F" strokeWidth="1" opacity="0.3" />
        <line x1="25" y1="84" x2="75" y2="82" stroke="#D4778F" strokeWidth="1" opacity="0.2" />
        <line x1="25" y1="97" x2="85" y2="95" stroke="#D4778F" strokeWidth="1" opacity="0.25" />
        {/* Text lines - right page */}
        <line x1="115" y1="42" x2="175" y2="45" stroke="#D4778F" strokeWidth="1" opacity="0.3" />
        <line x1="115" y1="55" x2="170" y2="58" stroke="#D4778F" strokeWidth="1" opacity="0.2" />
        <line x1="115" y1="68" x2="175" y2="71" stroke="#D4778F" strokeWidth="1" opacity="0.25" />
        <line x1="115" y1="82" x2="170" y2="84" stroke="#D4778F" strokeWidth="1" opacity="0.3" />
        <line x1="115" y1="95" x2="175" y2="97" stroke="#D4778F" strokeWidth="1" opacity="0.2" />
        {/* Decorative bismillah-style header on right page */}
        <rect x="125" y="28" width="40" height="6" rx="3" fill="#C55B7A" opacity="0.15" />
      </g>

      {/* ─── Lantern (Fanous) ─── */}
      <g transform="translate(80, 50)">
        {/* Chain */}
        <line x1="30" y1="0" x2="30" y2="25" stroke="#C55B7A" strokeWidth="1" opacity="0.4" />
        {/* Top cap */}
        <path d="M20 25L40 25L38 32L22 32Z" fill="#C55B7A" opacity="0.25" />
        {/* Body */}
        <path
          d="M22 32C18 45 18 75 22 88L38 88C42 75 42 45 38 32Z"
          fill="#C55B7A"
          opacity="0.08"
          stroke="#C55B7A"
          strokeWidth="1"
          strokeOpacity="0.2"
        />
        {/* Inner glow */}
        <ellipse cx="30" cy="60" rx="8" ry="15" fill="#C55B7A" opacity="0.1" />
        {/* Light rays */}
        <line x1="30" y1="55" x2="10" y2="45" stroke="#C55B7A" strokeWidth="0.5" opacity="0.15" />
        <line x1="30" y1="55" x2="50" y2="45" stroke="#C55B7A" strokeWidth="0.5" opacity="0.15" />
        <line x1="30" y1="60" x2="8" y2="60" stroke="#C55B7A" strokeWidth="0.5" opacity="0.12" />
        <line x1="30" y1="60" x2="52" y2="60" stroke="#C55B7A" strokeWidth="0.5" opacity="0.12" />
        {/* Bottom */}
        <path d="M22 88L26 95L34 95L38 88Z" fill="#C55B7A" opacity="0.2" />
      </g>

      {/* ─── Tasbih (Prayer Beads) ─── */}
      <g transform="translate(370, 230)">
        {/* String curve */}
        <path
          d="M10 10C20 30 40 50 30 80C25 95 15 95 10 80"
          fill="none"
          stroke="#C55B7A"
          strokeWidth="0.8"
          opacity="0.25"
        />
        {/* Beads */}
        {[12, 22, 32, 42, 52, 62, 72].map((y, i) => (
          <circle
            key={i}
            cx={10 + Math.sin(y * 0.08) * 15}
            cy={y}
            r="3.5"
            fill="#C55B7A"
            opacity={0.15 + i * 0.02}
          />
        ))}
        {/* Imama (marker bead) */}
        <ellipse cx="10" cy="82" rx="4" ry="6" fill="#C55B7A" opacity="0.2" />
      </g>

      {/* ─── Decorative Geometric Element (top right) ─── */}
      <g transform="translate(370, 40)" opacity="0.12">
        {/* 8-pointed star, small */}
        <path
          d="M40 5L47 30L72 30L52 47L59 72L40 55L21 72L28 47L8 30L33 30Z"
          fill="#C55B7A"
        />
      </g>

      {/* ─── Notebook / Journal ─── */}
      <g transform="translate(60, 250)">
        <rect x="0" y="0" width="70" height="90" rx="4" fill="#FAEDE6" stroke="#E8B5A8" strokeWidth="1" />
        <rect x="8" y="0" width="62" height="90" rx="3" fill="#FFF8F6" stroke="#F0D4CC" strokeWidth="0.8" />
        {/* Spiral binding dots */}
        {[12, 24, 36, 48, 60, 72].map((y) => (
          <circle key={y} cx="8" cy={y} r="2" fill="#E8B5A8" opacity="0.5" />
        ))}
        {/* Lines */}
        <line x1="18" y1="20" x2="60" y2="20" stroke="#D4778F" strokeWidth="0.5" opacity="0.2" />
        <line x1="18" y1="30" x2="55" y2="30" stroke="#D4778F" strokeWidth="0.5" opacity="0.15" />
        <line x1="18" y1="40" x2="58" y2="40" stroke="#D4778F" strokeWidth="0.5" opacity="0.2" />
        <line x1="18" y1="50" x2="50" y2="50" stroke="#D4778F" strokeWidth="0.5" opacity="0.15" />
      </g>

      {/* ─── Pen ─── */}
      <g transform="translate(105, 280) rotate(-30)">
        <rect x="0" y="0" width="5" height="50" rx="2" fill="#9A3D5E" opacity="0.2" />
        <polygon points="0,50 5,50 2.5,60" fill="#9A3D5E" opacity="0.25" />
        <rect x="0" y="0" width="5" height="8" rx="2" fill="#C55B7A" opacity="0.15" />
      </g>

      {/* ─── Floating dots (bokeh effect) ─── */}
      <circle cx="420" cy="150" r="4" fill="#C55B7A" opacity="0.08" />
      <circle cx="450" cy="180" r="6" fill="#C55B7A" opacity="0.05" />
      <circle cx="60" cy="170" r="5" fill="#C55B7A" opacity="0.06" />
      <circle cx="440" cy="320" r="3" fill="#C55B7A" opacity="0.07" />
      <circle cx="35" cy="380" r="4" fill="#C55B7A" opacity="0.05" />
    </svg>
  );
}
