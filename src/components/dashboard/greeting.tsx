/**
 * DashboardGreeting — warm salam banner at the top of role landings.
 * Time-of-day-aware headline with a short du'a strip, set against a
 * brand-tinted gradient with a Kufic watermark. Server-rendered so the
 * greeting matches PKT where the audience actually lives.
 */
interface GreetingProps {
  name: string;
  role: string;
  /** Short tail line — usually a stat or a nudge. */
  tail?: string;
}

function firstName(full: string) {
  return full?.split(" ")[0] || full || "Sister";
}

function partOfDay(): { greet: string; dua: string } {
  // Pakistan Standard Time = UTC+5. Use a simple offset so the greeting
  // reflects the audience's local hour regardless of server region.
  const now = new Date();
  const pktHour = (now.getUTCHours() + 5) % 24;
  if (pktHour >= 4 && pktHour < 12)
    return {
      greet: "Good morning",
      dua: "Allahumma barik lana fi yawmina — bless our day.",
    };
  if (pktHour >= 12 && pktHour < 17)
    return {
      greet: "Good afternoon",
      dua: "Rabbi zidni 'ilma — my Lord, increase me in knowledge.",
    };
  if (pktHour >= 17 && pktHour < 20)
    return {
      greet: "Good evening",
      dua: "Alhamdulillah 'ala kulli hal — all praise is due in every state.",
    };
  return {
    greet: "Peaceful night",
    dua: "Bismika Rabbi — with Your name, my Lord, I rest.",
  };
}

export function DashboardGreeting({ name, role, tail }: GreetingProps) {
  const { greet, dua } = partOfDay();
  const roleLabel =
    role === "instructor"
      ? "Instructor"
      : role === "admin"
        ? "Administrator"
        : role === "treasurer"
          ? "Treasurer"
          : "Student";

  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-rose-50/50 dark:to-rose-950/10 p-5 md:p-7">
      {/* Decorative geometric petals — a soft brand watermark */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -right-6 -top-6 h-52 w-52 text-primary opacity-[0.08]"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="100" cy="100" r="80" />
          <circle cx="100" cy="100" r="60" />
          <circle cx="100" cy="100" r="40" />
          {Array.from({ length: 8 }).map((_, i) => (
            <path
              key={i}
              d="M100 20 Q 120 100 100 180 Q 80 100 100 20 Z"
              transform={`rotate(${i * 45} 100 100)`}
            />
          ))}
        </g>
      </svg>

      <div className="relative">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Assalamu 'alaikum · {roleLabel}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight md:text-3xl">
          {greet}, {firstName(name)}
        </h1>
        <p className="mt-2 max-w-xl text-sm italic text-muted-foreground">
          {dua}
        </p>
        {tail && (
          <p className="mt-3 text-sm font-medium text-foreground/80">{tail}</p>
        )}
      </div>
    </div>
  );
}
