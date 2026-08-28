import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  X,
  ArrowRight,
  Shield,
  MapPin,
  Image as ImageIcon,
  FileText,
  Settings,
  Search,
  Lock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clock,
  AlertTriangle,
  Award,
  Zap,
  Users,
  Navigation,
  Globe,
} from "lucide-react";
import { Section, FadeIn } from "@/components/site/Section";
import { Stars, GooglePin } from "@/components/site/GoogleBrand";
import { sendContactMessage } from "@/lib/site.functions";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

/* ÉLÉMENTS FACILEMENT MODIFIABLES */
const VIDEO_EMBED_URL = "https://www.youtube.com/embed/KlfzyjEzmJg";
const HERO_PHOTOS = {
  cover: "/images/gmb-cover.avif",
  thumb1: "/images/gmb-photo-1.avif",
  thumb2: "/images/gmb-photo-2.jpg",
  thumb3: "/images/gmb-photo-3.jpg",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hotavis — Création & optimisation de fiche Google My Business — 379€" },
      {
        name: "description",
        content:
          "Agence française spécialisée Google My Business. Nous créons et optimisons votre fiche pour que vos clients vous trouvent sur Google Maps. 379€ — Garantie livraison sous 7 jours ouvrés ou remboursé.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <HeroSection />
      <ReassuranceBar />
      <VideoSection />
      <ProblemSection />
      <RisksSection />
      <StatsSection />
      <BeforeAfterSection />
      <ServicesSection />
      <ExpertiseSection />
      <TestimonialsCarousel />
      <ProcessSection />
      <PricingSection />
      <GuaranteeSection />
      <FAQSection />
      <ContactSection />
    </>
  );
}

/* ============================================================
 * HERO
 * ============================================================ */
function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden gradient-hero">
      <div
        aria-hidden
        className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-google-blue/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-10 right-0 h-72 w-72 rounded-full bg-google-yellow/15 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute top-40 right-1/4 h-40 w-40 rounded-full bg-google-green/20 blur-3xl"
      />

      <div className="container mx-auto px-4 max-w-7xl py-20 md:py-28 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-border px-4 py-1.5 shadow-card text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-google-green opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-google-green" />
              </span>
              {t("hero.badge")}
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] text-balance">
              {t("hero.title_a")}{" "}
              <span className="bg-gradient-to-r from-google-red via-google-yellow to-google-blue bg-clip-text text-transparent">
                {t("hero.title_b")}
              </span>{" "}
              {t("hero.title_c")}
            </h1>

            <p className="mt-5 text-lg text-muted-foreground max-w-xl">{t("hero.subtitle")}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/commander"
                className="inline-flex items-center gap-2 rounded-full gradient-cta text-white px-7 py-3.5 font-semibold shadow-glow hover:-translate-y-0.5 transition"
              >
                {t("hero.cta")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium">
              <Badge>{t("hero.badge_delivery")}</Badge>
              <Badge>{t("hero.badge_secure")}</Badge>
              <Badge>{t("hero.badge_report")}</Badge>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-6 bg-gradient-to-tr from-google-blue/20 via-google-green/10 to-google-yellow/20 blur-2xl rounded-3xl"
              />
              <div className="relative">
                <GMBProfileMockup />
                <p className="mt-4 text-center text-sm text-muted-foreground italic">
                  {t("hero.caption")}
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-border px-3 py-1.5 shadow-card">
      {children}
    </span>
  );
}

const GMB_SLIDES = [
  { src: "/images/gmb-demo/1.png", alt: "Fiche Google — Studio Bellecour (coiffure)" },
  { src: "/images/gmb-demo/2.png", alt: "Fiche Google — Meca 71 (garage automobile)" },
  { src: "/images/gmb-demo/3.png", alt: "Fiche Google — Howard Original Smash Burger" },
  { src: "/images/gmb-demo/4.png", alt: "Fiche Google — Plombier Montpellier" },
  { src: "/images/gmb-demo/5.png", alt: "Fiche Google — Boulangerie Maison Bécam" },
];

function GMBProfileMockup() {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % GMB_SLIDES.length), 3500);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div
        className="relative overflow-hidden rounded-lg bg-white border border-border shadow-elevated aspect-[9/16]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Exemples de fiches Google My Business"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={GMB_SLIDES[idx].src}
            src={GMB_SLIDES[idx].src}
            alt={GMB_SLIDES[idx].alt}
            className="absolute inset-0 h-full w-full object-cover object-top"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            loading="eager"
          />
        </AnimatePresence>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {GMB_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Voir l'exemple ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === idx ? "w-8 bg-google-blue" : "w-2 bg-border hover:bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>

      <p className="sr-only">{t("hero.caption")}</p>
    </div>
  );
}

/* ============================================================
 * BANDEAU RÉASSURANCE
 * ============================================================ */
function ReassuranceBar() {
  const { t } = useTranslation();
  const items = t("reassurance", { returnObjects: true }) as string[];
  return (
    <>
      <div className="bg-foreground text-white">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm font-medium">
            {items.map((tx) => (
              <span key={tx} className="whitespace-nowrap">
                {tx}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="container mx-auto px-4 max-w-7xl py-3">
          <p className="text-center text-xs sm:text-sm text-amber-900 leading-relaxed">
            <b>Délais de livraison :</b> sous 7 jours ouvrés. Attention : dans certains cas, Google
            exige une vérification par courrier postal pour valider l'établissement, ce qui peut
            rallonger le délai d'environ 14 jours.
          </p>
        </div>
      </div>
    </>
  );
}

/* ============================================================
 * VIDÉO
 * ============================================================ */
function VideoSection() {
  const { t } = useTranslation();
  return (
    <Section alt>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-balance">{t("video.title")}</h2>
        <p className="mt-4 text-lg text-muted-foreground">{t("video.subtitle")}</p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mt-10 flex flex-col items-center">
          <div className="w-full max-w-[340px]">
            <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden shadow-elevated bg-black">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={VIDEO_EMBED_URL}
                title="Google My Business — YouTube Short"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          <div className="mt-7 w-full max-w-[340px] text-center">
            <Link
              to="/commander"
              className="inline-flex items-center gap-2 rounded-full gradient-cta text-white px-7 py-3.5 font-semibold shadow-glow hover:-translate-y-0.5 transition"
            >
              {t("video.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}

/* ============================================================
 * PROBLÈME
 * ============================================================ */
function ProblemSection() {
  const { t } = useTranslation();
  const items = t("problem.items", { returnObjects: true }) as Array<{
    icon: string;
    title: string;
    desc: string;
  }>;
  return (
    <Section>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-google-red/10 text-google-red px-3 py-1 text-xs font-semibold">
          {t("problem.tag")}
        </div>
        <h2 className="mt-4 text-3xl md:text-5xl font-extrabold text-balance">
          {t("problem.title")}
        </h2>
      </FadeIn>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {items.map((p, i) => (
          <FadeIn key={i} delay={i * 0.08}>
            <div className="h-full rounded-2xl bg-red-50 border border-red-100 p-6">
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-4 font-bold text-lg">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
 * RISQUES
 * ============================================================ */
function RisksSection() {
  const { t } = useTranslation();
  const risks = t("risks.items", { returnObjects: true }) as string[];
  return (
    <Section alt>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-google-red/10 text-google-red">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-3xl md:text-5xl font-extrabold text-balance">
          {t("risks.title")}
        </h2>
      </FadeIn>
      <FadeIn delay={0.1}>
        <ul className="mt-10 max-w-3xl mx-auto space-y-3">
          {risks.map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl bg-white border border-red-100 p-4 shadow-card"
            >
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-google-red/10 text-google-red flex-shrink-0">
                <X className="h-4 w-4" />
              </span>
              <span className="text-sm md:text-base font-medium">{r}</span>
            </li>
          ))}
        </ul>
      </FadeIn>
    </Section>
  );
}

/* ============================================================
 * STATS
 * ============================================================ */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const dur = 1500;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setV(Math.floor(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <span>
      {v}
      {suffix}
    </span>
  );
}

function StatsSection() {
  const { t } = useTranslation();
  const labels = t("stats.items", { returnObjects: true }) as string[];
  const stats = [
    { value: 97, suffix: "%", label: labels[0] },
    { value: 46, suffix: "%", label: labels[1] },
    { value: 7, suffix: "×", label: labels[2] },
    { value: 3.5, suffix: " Md", label: labels[3], float: true },
  ];
  return (
    <section className="py-20 md:py-24 gradient-cta text-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <FadeIn className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-balance">{t("stats.title")}</h2>
        </FadeIn>
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-extrabold tracking-tight">
                  {s.float ? (
                    `${s.value}${s.suffix}`
                  ) : (
                    <>
                      <Counter to={s.value as number} />
                      {s.suffix}
                    </>
                  )}
                </div>
                <div className="mt-3 text-white/90 text-sm font-medium leading-relaxed">
                  {s.label}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * AVANT / APRÈS
 * ============================================================ */
function BeforeAfterSection() {
  const { t } = useTranslation();
  const before = t("before_after.before", { returnObjects: true }) as string[];
  const after = t("before_after.after", { returnObjects: true }) as string[];
  return (
    <Section>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-balance">
          {t("before_after.title")}
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">{t("before_after.subtitle")}</p>
      </FadeIn>
      <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <FadeIn>
          <div className="h-full rounded-2xl bg-red-50 border border-red-200 p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-google-red/15 text-google-red px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <X className="h-3.5 w-3.5" /> {t("before_after.before_tag")}
            </div>
            <h3 className="mt-3 font-bold text-xl">{t("before_after.before_title")}</h3>
            <ul className="mt-5 space-y-2.5">
              {before.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <X className="h-4 w-4 text-google-red flex-shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="h-full rounded-2xl bg-green-50 border border-green-200 p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-google-green/15 text-google-green px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("before_after.after_tag")}
            </div>
            <h3 className="mt-3 font-bold text-xl">{t("before_after.after_title")}</h3>
            <ul className="mt-5 space-y-2.5">
              {after.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-google-green flex-shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}

/* ============================================================
 * SERVICES
 * ============================================================ */
function ServicesSection() {
  const { t } = useTranslation();
  const services = t("services.items", { returnObjects: true }) as Array<{
    icon: string;
    title: string;
    desc: string;
  }>;
  return (
    <Section id="services" alt>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-balance">{t("services.title")}</h2>
        <p className="mt-3 text-lg text-muted-foreground">{t("services.subtitle")}</p>
      </FadeIn>
      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((s, i) => (
          <FadeIn key={i} delay={i * 0.04}>
            <div className="h-full rounded-2xl bg-white border border-border p-6 shadow-card hover:shadow-elevated hover:-translate-y-1 transition">
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-3 font-bold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
 * EXPERTISE
 * ============================================================ */
function ExpertiseSection() {
  const { t } = useTranslation();
  const items = t("expertise.items", { returnObjects: true }) as Array<{
    title: string;
    desc: string;
  }>;
  const styles = [
    { Icon: Award, color: "text-google-blue bg-google-blue/10" },
    { Icon: MapPin, color: "text-google-red bg-google-red/10" },
    { Icon: Zap, color: "text-google-yellow bg-google-yellow/15" },
    { Icon: Users, color: "text-google-green bg-google-green/10" },
  ];
  return (
    <Section>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-balance">{t("expertise.title")}</h2>
        <p className="mt-3 text-lg text-muted-foreground">{t("expertise.subtitle")}</p>
      </FadeIn>
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((it, i) => {
          const s = styles[i] || styles[0];
          return (
            <FadeIn key={i} delay={i * 0.06}>
              <div className="h-full rounded-2xl bg-white border border-border p-6 shadow-card">
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}
                >
                  <s.Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-bold text-lg">{it.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
              </div>
            </FadeIn>
          );
        })}
      </div>
      <FadeIn delay={0.2}>
        <div className="mt-10 mx-auto max-w-2xl rounded-2xl bg-blue-50 border border-blue-100 p-5 text-center">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-google-green" /> {t("expertise.badge")}
          </span>
        </div>
      </FadeIn>
    </Section>
  );
}

/* ============================================================
 * TÉMOIGNAGES
 * ============================================================ */
function TestimonialsCarousel() {
  const { t } = useTranslation();
  const items = t("testimonials.items", { returnObjects: true }) as Array<{
    name: string;
    role: string;
    text: string;
  }>;
  const colors = [
    "bg-google-blue",
    "bg-google-red",
    "bg-google-green",
    "bg-google-yellow",
    "bg-google-blue",
    "bg-google-red",
  ];
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((i) => (i + 1) % items.length);
  const prev = () => setIdx((i) => (i - 1 + items.length) % items.length);
  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
  const cur = items[idx];

  return (
    <Section id="temoignages" alt>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-balance">
          {t("testimonials.title")}
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">{t("testimonials.subtitle")}</p>
      </FadeIn>

      <div className="mt-12 max-w-3xl mx-auto relative">
        <div className="relative min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl bg-white border border-border p-8 shadow-card"
            >
              <Stars className="h-5 w-5" />
              <p className="mt-4 text-lg leading-relaxed">"{cur.text}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className={`${colors[idx % colors.length]} text-white h-12 w-12 rounded-full inline-flex items-center justify-center font-bold`}
                >
                  {cur.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="font-semibold">{cur.name}</div>
                  <div className="text-xs text-muted-foreground">{cur.role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={prev}
            aria-label="prev"
            className="h-10 w-10 rounded-full bg-white border border-border shadow-card inline-flex items-center justify-center hover:bg-accent transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-google-blue" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            aria-label="next"
            className="h-10 w-10 rounded-full bg-white border border-border shadow-card inline-flex items-center justify-center hover:bg-accent transition"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Section>
  );
}

/* ============================================================
 * PROCESSUS
 * ============================================================ */
function ProcessSection() {
  const { t } = useTranslation();
  const items = t("process.items", { returnObjects: true }) as Array<{
    title: string;
    desc: string;
  }>;
  const styles = [
    { icon: Mail, color: "bg-google-blue" },
    { icon: Lock, color: "bg-google-green" },
    { icon: Settings, color: "bg-google-yellow" },
    { icon: Search, color: "bg-google-red" },
    { icon: FileText, color: "bg-google-blue" },
  ];
  return (
    <Section id="processus">
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-balance">{t("process.title")}</h2>
        <p className="mt-3 text-lg text-muted-foreground">{t("process.subtitle")}</p>
      </FadeIn>
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {items.map((s, i) => {
          const st = styles[i] || styles[0];
          return (
            <FadeIn key={i} delay={i * 0.06}>
              <div className="relative h-full rounded-2xl bg-white border border-border p-6 shadow-card">
                <div
                  className={`${st.color} text-white inline-flex h-11 w-11 items-center justify-center rounded-2xl font-extrabold shadow-glow`}
                >
                  {i + 1}
                </div>
                <st.icon className="mt-4 h-5 w-5 text-muted-foreground" />
                <h3 className="mt-2 font-bold text-base">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </FadeIn>
          );
        })}
      </div>
      <FadeIn delay={0.2}>
        <div className="mt-10 mx-auto max-w-2xl rounded-2xl bg-blue-50 border border-blue-100 p-5 text-center">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-google-blue" /> {t("process.badge")}
          </span>
        </div>
      </FadeIn>
    </Section>
  );
}

/* ============================================================
 * TARIF
 * ============================================================ */
function PricingSection() {
  const { t } = useTranslation();
  const features = t("pricing.features", { returnObjects: true }) as string[];
  const badges = t("pricing.badges", { returnObjects: true }) as string[];
  return (
    <Section id="tarifs" alt>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-balance">{t("pricing.title")}</h2>
        <p className="mt-3 text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
      </FadeIn>
      <div className="mt-12 max-w-2xl mx-auto">
        <FadeIn>
          <div className="relative rounded-3xl gradient-cta text-white p-8 md:p-10 shadow-elevated">
            <div className="absolute -top-3 right-6 rounded-full bg-google-yellow text-foreground px-3 py-1 text-xs font-bold">
              {t("pricing.popular")}
            </div>
            <div className="text-sm font-semibold opacity-90 uppercase tracking-wider">
              {t("pricing.pack_name")}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-6xl font-extrabold">379€</span>
              <span className="text-sm opacity-80">{t("pricing.price_meta")}</span>
            </div>
            <div className="text-sm opacity-90">{t("pricing.one_time")}</div>
            <ul className="mt-7 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/commander"
              className="mt-8 block text-center rounded-full bg-white text-google-blue px-6 py-3.5 font-bold hover:bg-white/90 transition"
            >
              {t("pricing.cta")}
            </Link>
            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs opacity-95">
              {badges.map((b) => (
                <span key={b}>{b}</span>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-white/15 border border-white/20 p-3 text-xs leading-relaxed text-white">
              <b>Délais de livraison :</b> sous 7 jours ouvrés. Attention : dans certains cas,
              Google exige une vérification par courrier postal pour valider l'établissement, ce qui
              peut rallonger le délai d'environ 14 jours.
            </div>
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}

/* ============================================================
 * GARANTIE
 * ============================================================ */
function GuaranteeSection() {
  const { t } = useTranslation();
  return (
    <Section id="garantie">
      <FadeIn className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl border-2 border-google-green/40 bg-gradient-to-br from-google-green/5 via-white to-google-blue/5 p-8 md:p-12 shadow-elevated overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-google-green/20 blur-3xl"
          />
          <div className="relative flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-cta text-white shadow-glow">
              <Shield className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-google-green/15 text-google-green px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t("guarantee.tag")}
              </div>
              <h2 className="mt-3 text-2xl md:text-3xl font-extrabold text-balance">
                {t("guarantee.title_long_a")}{" "}
                <span className="text-google-green">{t("guarantee.title_long_b")}</span>
              </h2>
              <p className="mt-4 text-base md:text-lg leading-relaxed text-foreground/90">
                {t("guarantee.body_long")}
              </p>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                Délais de livraison : sous 7 jours ouvrés. <strong>Attention :</strong> dans
                certains cas, Google exige une vérification par courrier postal pour valider
                l'établissement, ce qui peut rallonger le délai d'environ 14 jours.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-google-blue" /> {t("guarantee.chip_delay")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-google-green" />{" "}
                  {t("guarantee.chip_conform")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1.5">
                  <Shield className="h-3.5 w-3.5 text-google-red" /> {t("guarantee.chip_refund")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}

/* ============================================================
 * FAQ
 * ============================================================ */
function FAQSection() {
  const { t } = useTranslation();
  const faqs = t("faq.items", { returnObjects: true }) as Array<{ q: string; a: string }>;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-balance">{t("faq.title")}</h2>
      </FadeIn>
      <div className="mt-12 max-w-3xl mx-auto space-y-3">
        {faqs.map((f, i) => (
          <FadeIn key={i} delay={i * 0.03}>
            <div className="rounded-2xl border border-border bg-white overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-accent/40 transition"
                aria-expanded={open === i}
              >
                <span className="font-semibold">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-5 pb-5 text-muted-foreground leading-relaxed text-sm"
                >
                  {f.a}
                </motion.div>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
 * CONTACT
 * ============================================================ */
function ContactSection() {
  const { t } = useTranslation();
  const sectors = t("contact.sectors", { returnObjects: true }) as string[];

  const contactSchema = z.object({
    prenom: z.string().trim().min(1, t("contact.errors.required")).max(60),
    nom: z.string().trim().min(1, t("contact.errors.required")).max(60),
    entreprise: z.string().trim().min(1, t("contact.errors.required")).max(120),
    secteur: z.string().min(1, t("contact.errors.sector")),
    ville: z.string().trim().min(1, t("contact.errors.required")).max(80),
    email: z.string().trim().email(t("contact.errors.email")).max(255),
    ficheExistante: z.enum(["oui", "non", "je_ne_sais_pas"], {
      message: t("contact.errors.choice"),
    }),
    message: z.string().trim().max(2000).optional(),
    rgpd: z.literal(true, { message: t("contact.errors.rgpd") }),
  });
  type ContactValues = z.infer<typeof contactSchema>;

  const sendFn = useServerFn(sendContactMessage);
  const { register, handleSubmit, reset, formState } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      ficheExistante: undefined as unknown as ContactValues["ficheExistante"],
      message: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (data: ContactValues) => {
    setLoading(true);
    try {
      await sendFn({
        data: { ...data, message: data.message || "", rgpd: true },
      });
      toast.success(t("contact.sent_title"));
      setSent(true);
      reset();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || t("contact.errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section id="contact" alt>
      <FadeIn className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold">{t("contact.title")}</h2>
        <p className="mt-3 text-lg text-muted-foreground">{t("contact.subtitle")}</p>
      </FadeIn>
      <div className="mt-12 max-w-3xl mx-auto">
        <FadeIn>
          {sent ? (
            <div className="rounded-2xl bg-green-50 border border-green-200 p-8 text-center shadow-card">
              <CheckCircle2 className="mx-auto h-12 w-12 text-google-green" />
              <h3 className="mt-4 text-2xl font-bold">{t("contact.sent_title")}</h3>
              <p className="mt-2 text-muted-foreground">{t("contact.sent_body")}</p>
              <button
                onClick={() => setSent(false)}
                className="mt-5 text-sm font-semibold text-google-blue hover:underline"
              >
                {t("contact.send_another")}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-2xl bg-white border border-border p-6 md:p-8 shadow-card space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("contact.first_name")} error={formState.errors.prenom?.message}>
                  <input {...register("prenom")} className={inputCls} />
                </Field>
                <Field label={t("contact.last_name")} error={formState.errors.nom?.message}>
                  <input {...register("nom")} className={inputCls} />
                </Field>
              </div>
              <Field label={t("contact.company")} error={formState.errors.entreprise?.message}>
                <input {...register("entreprise")} className={inputCls} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("contact.sector")} error={formState.errors.secteur?.message}>
                  <select {...register("secteur")} className={inputCls} defaultValue="">
                    <option value="" disabled>
                      {t("contact.choose")}
                    </option>
                    {sectors.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("contact.city")} error={formState.errors.ville?.message}>
                  <input {...register("ville")} className={inputCls} />
                </Field>
              </div>
              <Field label={t("contact.email")} error={formState.errors.email?.message}>
                <input type="email" {...register("email")} className={inputCls} />
              </Field>
              <Field
                label={t("contact.existing_listing")}
                error={formState.errors.ficheExistante?.message}
              >
                <div className="mt-1 flex flex-wrap gap-3">
                  {[
                    { v: "oui", l: t("contact.yes") },
                    { v: "non", l: t("contact.no") },
                    { v: "je_ne_sais_pas", l: t("contact.unsure") },
                  ].map((o) => (
                    <label
                      key={o.v}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm cursor-pointer hover:border-google-blue transition"
                    >
                      <input
                        type="radio"
                        value={o.v}
                        {...register("ficheExistante")}
                        className="accent-google-blue"
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label={t("contact.message")}>
                <textarea rows={4} {...register("message")} className={inputCls} />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" {...register("rgpd")} className="mt-1 accent-google-blue" />
                <span>{t("contact.rgpd")}</span>
              </label>
              {formState.errors.rgpd && (
                <span className="text-xs text-google-red block">
                  {formState.errors.rgpd.message as string}
                </span>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full gradient-cta text-white py-3.5 font-semibold shadow-glow hover:-translate-y-0.5 transition disabled:opacity-60"
              >
                {loading ? t("contact.sending") : t("contact.submit")}
              </button>
              <p className="text-xs text-muted-foreground text-center pt-1">
                {t("contact.privacy")}
              </p>
            </form>
          )}
        </FadeIn>
      </div>
    </Section>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-google-blue focus:ring-2 focus:ring-google-blue/20 transition";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="text-xs text-google-red mt-1 block">{error}</span>}
    </label>
  );
}
