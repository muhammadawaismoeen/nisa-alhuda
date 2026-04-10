/**
 * Landing Page — the first thing visitors see.
 * Design: Rich visuals, glassmorphism, Kufic motifs, aesthetic illustrations.
 */
import {
  BookOpen,
  Video,
  MessageCircle,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Star,
  Clock,
  Heart,
  Users,
} from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { HeroIllustration } from "@/components/decorative/hero-illustration";
import { IslamicStar } from "@/components/decorative/islamic-pattern";
import { SectionDivider, WaveDivider } from "@/components/decorative/section-divider";
import { APP_NAME } from "@/lib/constants";

const features = [
  {
    icon: BookOpen,
    title: "Structured Programs",
    description:
      "Comprehensive Islamic studies with multiple subjects — Fiqh, Arabic, Hadith, and Qur'an.",
    gradient: "from-rose-500/10 to-rose-600/5",
  },
  {
    icon: Video,
    title: "Live Classes",
    description:
      "Attend live sessions with qualified instructors. Recordings available for all enrolled students.",
    gradient: "from-rose-400/10 to-rose-500/5",
  },
  {
    icon: MessageCircle,
    title: "Community Chat",
    description:
      "Engage with instructors and fellow sisters through dedicated group discussions.",
    gradient: "from-rose-500/10 to-rose-400/5",
  },
  {
    icon: GraduationCap,
    title: "Learn at Your Pace",
    description:
      "Lifetime access to recordings and resources. Revisit lessons whenever you need.",
    gradient: "from-rose-600/10 to-rose-500/5",
  },
];

const stats = [
  { icon: BookOpen, value: "4+", label: "Subjects" },
  { icon: Users, value: "100+", label: "Sisters" },
  { icon: Clock, value: "Live", label: "Classes" },
  { icon: Heart, value: "Lifetime", label: "Access" },
];

export default function HomePage() {
  return (
    <div className="fade-in">
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* Background decorations */}
        <div className="absolute inset-0 kufic-pattern" />
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50/90 via-background/80 to-background" />

        {/* Floating geometric stars */}
        <IslamicStar className="absolute top-10 right-10 text-primary hidden lg:block" size={160} />
        <IslamicStar className="absolute bottom-20 left-5 text-primary hidden lg:block" size={100} />

        <div className="container relative mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-primary mb-6 glass">
                <Sparkles className="h-4 w-4" />
                Sisterhood Learning Community
              </div>

              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Embark on Your
                <span className="text-primary block mt-1">Journey of Light</span>
              </h1>

              <p className="max-w-xl text-lg text-muted-foreground mb-8 mx-auto lg:mx-0">
                {APP_NAME} offers live programs, courses, and workshops designed
                exclusively for sisters seeking authentic Islamic education.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <LinkButton size="lg" href="/catalog" className="press">
                  Explore Programs
                  <ArrowRight className="ml-2 h-4 w-4" />
                </LinkButton>
                <LinkButton size="lg" variant="outline" href="/register" className="press">
                  Create Free Account
                </LinkButton>
              </div>

              {/* Mini stats row */}
              <div className="flex flex-wrap gap-6 mt-10 justify-center lg:justify-start">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold font-heading">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Illustration */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                {/* Glow behind illustration */}
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl scale-75" />
                <HeroIllustration className="relative w-full max-w-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Wave Transition ─── */}
      <div className="bg-gradient-to-b from-background to-secondary/30">
        <WaveDivider />
      </div>

      {/* ─── Features Section ─── */}
      <section className="py-20 bg-secondary/30 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              Why Nisa Al-Huda
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-4">
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
                className="border-0 shadow-sm hover-lift glass group"
              >
                <CardContent className="pt-6">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─── Visual Banner — Subjects Preview ─── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Subject Cards in Bento-style Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Fiqh", desc: "Islamic Jurisprudence", icon: "&#xFEDF;", color: "from-rose-600 to-rose-500" },
                { name: "Arabic", desc: "Classical Language", icon: "&#xFE8D;", color: "from-rose-500 to-rose-400" },
                { name: "Hadith", desc: "Prophetic Traditions", icon: "&#xFEE7;", color: "from-rose-400 to-rose-500" },
                { name: "Qur'an", desc: "Divine Revelation", icon: "&#xFED7;", color: "from-rose-500 to-rose-600" },
              ].map((subject, i) => (
                <div
                  key={subject.name}
                  className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${subject.color} text-white hover-lift cursor-default ${
                    i === 0 ? "row-span-2 flex flex-col justify-end min-h-[200px]" : ""
                  }`}
                >
                  {/* Decorative Kufic grid overlay */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <div className="relative">
                    <h3 className="font-heading font-bold text-lg">{subject.name}</h3>
                    <p className="text-sm text-white/80 mt-1">{subject.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Text */}
            <div>
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                Our Curriculum
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-5">
                Rooted in Tradition,{" "}
                <span className="text-primary">Designed for Today</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Our programs are carefully structured by qualified scholars,
                covering the essential Islamic sciences that every Muslimah should
                know. From the foundations of Fiqh to the beauty of Qur'anic
                recitation.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Live interactive sessions with qualified instructors",
                  "Structured curriculum with clear learning outcomes",
                  "Lifetime access to recordings and notes",
                  "Supportive sisterhood community",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <LinkButton href="/catalog" className="press">
                View Full Catalog
                <ArrowRight className="ml-2 h-4 w-4" />
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─── Inspirational Quote Banner ─── */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary via-rose-50 to-secondary" />
        <IslamicStar className="absolute left-10 top-1/2 -translate-y-1/2 text-primary hidden md:block" size={120} />
        <IslamicStar className="absolute right-10 top-1/2 -translate-y-1/2 text-primary hidden md:block" size={120} />

        <div className="container relative mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl text-primary/20 font-heading mb-4">&ldquo;</div>
            <p className="font-heading text-xl md:text-2xl font-medium text-foreground/90 italic leading-relaxed">
              Seeking knowledge is an obligation upon every Muslim.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              — Prophet Muhammad (peace be upon him)
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        {/* Decorative grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Decorative stars */}
        <IslamicStar className="absolute -left-10 -top-10 text-white" size={200} />
        <IslamicStar className="absolute -right-10 -bottom-10 text-white" size={200} />

        <div className="container relative mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="max-w-xl mx-auto mb-8 opacity-90 text-lg">
            Join our sisterhood community and take the first step towards
            deepening your understanding of the Deen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton size="lg" variant="secondary" href="/register" className="press">
              Join the Sisterhood
              <ArrowRight className="ml-2 h-4 w-4" />
            </LinkButton>
            <LinkButton
              size="lg"
              variant="outline"
              href="/catalog"
              className="press border-white/30 text-white hover:bg-white/10"
            >
              Browse Programs
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
