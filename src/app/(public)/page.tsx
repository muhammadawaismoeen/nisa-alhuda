/**
 * Landing Page — the first thing visitors see.
 * Goal: Communicate value proposition + drive enrollment.
 */
import {
  BookOpen,
  Users,
  Video,
  MessageCircle,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

const features = [
  {
    icon: BookOpen,
    title: "Structured Programs",
    description:
      "Comprehensive Islamic studies programs with multiple subjects including Fiqh, Arabic, Hadith, and Qur'an.",
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
      "Engage with your instructors and fellow students through dedicated group discussions.",
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
    <div>
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-background py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-800 mb-6">
            <Users className="h-4 w-4" />
            Sisterhood Learning Community
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Embark on Your Journey of
            <span className="text-primary block mt-2">Islamic Knowledge</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
            {APP_NAME} offers live programs, courses, and workshops designed
            exclusively for sisters seeking authentic Islamic education. Learn
            from qualified instructors in a supportive community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton size="lg" href="/catalog">
                Explore Programs
                <ArrowRight className="ml-2 h-4 w-4" />
            </LinkButton>
            <LinkButton size="lg" variant="outline" href="/register">Create Free Account</LinkButton>
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">
              Everything You Need to Learn
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete digital learning ecosystem built for the modern Muslim
              woman.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="max-w-xl mx-auto mb-8 opacity-90">
            Join our sisterhood community and take the first step towards
            deepening your understanding of the Deen.
          </p>
          <LinkButton size="lg" variant="secondary" href="/catalog">
              View Available Programs
              <ArrowRight className="ml-2 h-4 w-4" />
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
