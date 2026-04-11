/**
 * Landing Page — the first thing visitors see.
 * Design: Warm blush tones, glassmorphism cards, Kufic pattern accents.
 * Goal: Communicate value + drive enrollment with a modern GenZ aesthetic.
 */
import {
  BookOpen,
  Video,
  MessageCircle,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { TestimonialsSlider } from "@/components/landing/testimonials-slider";
import { APP_NAME } from "@/lib/constants";

const features = [
  {
    icon: BookOpen,
    title: "Structured Programs",
    description:
      "Comprehensive Islamic studies with multiple subjects — Fiqh, Arabic, Hadith, and Qur'an.",
  },
  {
    icon: Video,
    title: "Live Classes",
    description:
      "Attend live sessions with qualified instructors. Recordings available for all enrolled students.",
  },
  {
    icon: MessageCircle,
    title: "Community Chat",
    description:
      "Engage with instructors and fellow sisters through dedicated group discussions.",
  },
  {
    icon: GraduationCap,
    title: "Learn at Your Pace",
    description:
      "Lifetime access to recordings and resources. Revisit lessons whenever you need.",
  },
];

export default function HomePage() {
  return (
    <div className="fade-in">
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden kufic-pattern py-20 md:py-32">
        {/* Soft gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50/80 via-background to-background" />

        <div className="container relative mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-primary mb-6 glass">
            <Sparkles className="h-4 w-4" />
            Sisterhood Learning Community
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Embark on Your Journey of
            <span className="text-primary block mt-2">Islamic Knowledge</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 px-2">
            {APP_NAME} offers live programs, courses, and workshops designed
            exclusively for sisters seeking authentic Islamic education. Learn
            from qualified instructors in a supportive community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton size="lg" href="/catalog" className="press">
              Explore Programs
              <ArrowRight className="ml-2 h-4 w-4" />
            </LinkButton>
            <LinkButton size="lg" variant="outline" href="/register" className="press">
              Create Free Account
            </LinkButton>
          </div>
        </div>
      </section>

      {/* ─── Qur'anic Ayah Section ─── */}
      <section className="py-16 bg-secondary/40">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              From the Noble Qur&apos;an
            </span>

            {/* Arabic Text */}
            <p className="font-heading text-2xl md:text-3xl text-foreground/90 mt-5 mb-4 leading-relaxed" dir="rtl" lang="ar">
              يَرْفَعِ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟ مِنكُمْ وَٱلَّذِينَ أُوتُوا۟ ٱلْعِلْمَ دَرَجَـٰتٍ
            </p>

            {/* English Translation */}
            <p className="text-base md:text-lg text-muted-foreground italic leading-relaxed">
              &ldquo;Allah will raise those who have believed among you and those
              who were given knowledge, by degrees.&rdquo;
            </p>

            {/* Reference */}
            <p className="text-sm text-primary font-medium mt-4">
              Surah Al-Mujadila (58:11)
            </p>
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-4">
              Everything You Need to Learn
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete digital learning ecosystem built for the modern
              Muslimah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-0 shadow-sm hover-lift glass"
              >
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Hadith Section ─── */}
      <section className="py-16 bg-secondary/40">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              Prophetic Wisdom
            </span>

            {/* Arabic Text */}
            <p className="font-heading text-2xl md:text-3xl text-foreground/90 mt-5 mb-4 leading-relaxed" dir="rtl" lang="ar">
              طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ
            </p>

            {/* English Translation */}
            <p className="text-base md:text-lg text-muted-foreground italic leading-relaxed">
              &ldquo;Seeking knowledge is an obligation upon every Muslim.&rdquo;
            </p>

            {/* Reference */}
            <p className="text-sm text-primary font-medium mt-4">
              Sunan Ibn Majah 224 — Graded Sahih by Al-Albani
            </p>
          </div>
        </div>
      </section>

      {/* ─── Testimonials Slider ─── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              Student Voices
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold mt-3 mb-4">
              What Our Sisters Say
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hear from sisters who have transformed their lives through knowledge.
            </p>
          </div>

          <TestimonialsSlider />
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        {/* Decorative Kufic grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="container relative mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="max-w-xl mx-auto mb-8 opacity-90 text-sm sm:text-base px-2">
            Join our sisterhood community and take the first step towards
            deepening your understanding of the Deen.
          </p>
          <LinkButton size="lg" variant="secondary" href="/catalog" className="press">
            View Available Programs
            <ArrowRight className="ml-2 h-4 w-4" />
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
