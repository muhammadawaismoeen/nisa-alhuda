/**
 * Testimonials Slider — auto-rotating carousel of student testimonials.
 * Client component with smooth transitions and manual navigation.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  name: string;
  program: string;
  text: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Umm Aisha",
    program: "Sisterhood Islamic Studies — Fiqh",
    text: "This program transformed my understanding of Fiqh. The structured approach and supportive environment made it easy to stay consistent. I finally feel confident in my daily worship.",
  },
  {
    name: "Fatimah Z.",
    program: "Sisterhood Islamic Studies — Arabic",
    text: "Learning Arabic here has been a life-changing experience. The instructors are patient and knowledgeable, and the sisterhood keeps you motivated. I can now read Qur'an with much better understanding.",
  },
  {
    name: "Maryam K.",
    program: "Sisterhood Islamic Studies — Hadith",
    text: "The Hadith course opened my eyes to the beauty of the Prophetic traditions. Every class felt like a spiritual journey. The recordings are a blessing for busy mothers like me.",
  },
  {
    name: "Khadijah R.",
    program: "Sisterhood Islamic Studies — Qur'an",
    text: "I joined with very basic recitation skills and now I read with proper Tajweed. The live sessions and personal attention from the instructors made all the difference.",
  },
  {
    name: "Amina S.",
    program: "Sisterhood Islamic Studies — Fiqh",
    text: "As a revert, I was overwhelmed by how much I needed to learn. This platform made Islamic knowledge accessible and welcoming. The sisters here became my second family.",
  },
];

export function TestimonialsSlider() {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, next]);

  const handleManualNav = (direction: "prev" | "next") => {
    setIsAutoPlaying(false);
    if (direction === "prev") prev();
    else next();
    // Resume auto-play after 10 seconds of no interaction
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="relative max-w-3xl mx-auto px-6 md:px-10">
      {/* Testimonial Card */}
      <div className="glass rounded-2xl p-6 sm:p-8 md:p-10 text-center min-h-[260px] sm:min-h-[280px] flex flex-col items-center justify-center">
        {/* Quote Icon */}
        <Quote className="h-8 w-8 text-primary/30 mb-4" />

        {/* Testimonial Text */}
        <p className="text-base md:text-lg text-foreground/85 leading-relaxed mb-6 italic max-w-2xl">
          &ldquo;{testimonials[current].text}&rdquo;
        </p>

        {/* Author Info */}
        <div>
          <p className="font-heading font-semibold text-foreground">
            {testimonials[current].name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {testimonials[current].program}
          </p>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => handleManualNav("prev")}
        className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-card shadow-md flex items-center justify-center hover:bg-secondary transition-colors border border-border"
        aria-label="Previous testimonial"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
      </button>
      <button
        onClick={() => handleManualNav("next")}
        className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-card shadow-md flex items-center justify-center hover:bg-secondary transition-colors border border-border"
        aria-label="Next testimonial"
      >
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrent(index);
              setIsAutoPlaying(false);
              setTimeout(() => setIsAutoPlaying(true), 10000);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === current
                ? "w-6 bg-primary"
                : "w-2 bg-primary/20 hover:bg-primary/40"
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
