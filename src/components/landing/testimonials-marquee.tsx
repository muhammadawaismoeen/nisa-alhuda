"use client";

/**
 * Testimonials marquee — two infinite horizontal scrolling rows, opposing directions.
 * Pauses on hover (see .marquee-pause util). Edges faded via CSS mask so testimonials
 * seem to dissolve in/out rather than hard-clip.
 *
 * Replaces the previous carousel because:
 *   - It shows 6–8 testimonials at a glance instead of one
 *   - Feels alive without requiring interaction
 *   - Scales to any number of testimonials without layout work
 */
import { Quote } from "lucide-react";

interface Testimonial {
  name: string;
  program: string;
  text: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Umm Aisha",
    program: "Fiqh",
    text: "This program transformed my understanding of Fiqh. I finally feel confident in my daily worship.",
  },
  {
    name: "Fatimah Z.",
    program: "Arabic",
    text: "The instructors are patient and knowledgeable. I can now read Qur'an with much better understanding.",
  },
  {
    name: "Maryam K.",
    program: "Hadith",
    text: "Every class felt like a spiritual journey. The recordings are a blessing for busy mothers like me.",
  },
  {
    name: "Khadijah R.",
    program: "Qur'an",
    text: "I joined with basic recitation skills and now read with proper Tajweed. Personal attention made the difference.",
  },
  {
    name: "Amina S.",
    program: "Fiqh",
    text: "As a revert I was overwhelmed. This platform made Islamic knowledge accessible and welcoming.",
  },
  {
    name: "Hafsa A.",
    program: "Arabic",
    text: "The sequenced curriculum finally helped Arabic 'click' for me. Wish I'd started years ago.",
  },
  {
    name: "Zainab M.",
    program: "Qur'an",
    text: "A quiet, disciplined space to learn with sisters who actually care about your progress.",
  },
  {
    name: "Sumayyah B.",
    program: "Hadith",
    text: "Well-structured, deeply researched, and delivered with adab. Alhamdulillah for this effort.",
  },
];

export function TestimonialsMarquee() {
  // Split testimonials between rows so neither repeats mid-screen
  const rowA = TESTIMONIALS.slice(0, 4);
  const rowB = TESTIMONIALS.slice(4);

  return (
    <div
      className="marquee-pause relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
    >
      {/* Row A — scrolls left */}
      <div className="flex w-max animate-marquee gap-4 pb-4">
        {[...rowA, ...rowA].map((t, i) => (
          <TestimonialCard key={`a-${i}`} t={t} />
        ))}
      </div>
      {/* Row B — scrolls right */}
      <div className="mt-4 flex w-max animate-marquee-reverse gap-4">
        {[...rowB, ...rowB].map((t, i) => (
          <TestimonialCard key={`b-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="w-[280px] shrink-0 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-sm transition-colors hover:border-primary/30 sm:w-[340px]">
      <Quote className="h-4 w-4 text-primary/40" />
      <blockquote className="mt-3 text-sm leading-relaxed text-foreground/85">
        &ldquo;{t.text}&rdquo;
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3 border-t border-border/50 pt-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
          {t.name.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-semibold">{t.name}</div>
          <div className="text-[11px] text-muted-foreground">{t.program}</div>
        </div>
      </figcaption>
    </figure>
  );
}
