import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Briefcase,
  Wallet,
  Sparkles,
  Loader2,
  ArrowRight,
  Users,
  Wrench,
  HeartHandshake,
  LayoutDashboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitCandidature } from "@/lib/candidature.functions";
import { getPublicCommissionAmount } from "@/lib/agency-public.functions";

export const Route = createFileRoute("/recrutement")({
  head: () => ({
    meta: [
      { title: "Devenir Expert SEO Local chez Hotavis — Recrutement" },
      {
        name: "description",
        content:
          "Rejoignez Hotavis en tant qu'expert SEO local indépendant. Zéro prospection, rémunération au forfait, liberté totale. Postulez en quelques minutes.",
      },
      { property: "og:title", content: "Devenir Expert SEO Local chez Hotavis" },
      {
        property: "og:description",
        content:
          "Rejoignez Hotavis : missions GBP déjà payées, rémunération attractive au forfait, autonomie totale.",
      },
      { property: "og:image", content: "/images/recrutement-banner.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/images/recrutement-banner.png" },
    ],
  }),
  component: RecrutementPage,
});

/* ── Composant Reveal : animation fade-in + translateY au scroll ── */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type Form = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  siret: string;
  fiche_url: string;
  linkedin_url: string;
  presentation: string;
  qcm_q1: "A" | "B" | "C" | "";
  q2_reponse: string;
  q3_reponse: string;
};

function RecrutementPage() {
  const submit = useServerFn(submitCandidature);
  const fetchCommission = useServerFn(getPublicCommissionAmount);
  const { data: commissionData } = useQuery({
    queryKey: ["public-commission"],
    queryFn: () => fetchCommission(),
  });
  const commissionEuros = commissionData?.commission_euros ?? 50;

  const [form, setForm] = useState<Form>({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    siret: "",
    fiche_url: "",
    linkedin_url: "",
    presentation: "",
    qcm_q1: "",
    q2_reponse: "",
    q3_reponse: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.qcm_q1) {
      setErr("Merci de répondre à la question QCM.");
      return;
    }
    if (form.presentation.trim().length < 20) {
      setErr("Merci de remplir le champ « Parlez-nous de vous » (au moins 20 caractères).");
      return;
    }
    if (form.q2_reponse.trim().length < 10 || form.q3_reponse.trim().length < 10) {
      setErr("Merci de détailler vos réponses (au moins 10 caractères).");
      return;
    }
    setLoading(true);
    try {
      await submit({ data: { ...form, qcm_q1: form.qcm_q1 as "A" | "B" | "C" } });
      setOk(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Une erreur est survenue. Réessayez.";
      setErr(
        msg.includes("duplicate")
          ? "Une candidature avec cet email existe déjà."
          : "Impossible d'envoyer la candidature. Vérifiez vos informations.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-surface-alt">
      {/* HERO — bannière pleine largeur : image de fond + texte/CTA superposés */}
      <section className="relative w-full overflow-hidden">
        {/* Image de fond pleine largeur */}
        <img
          src="/images/Gemini_Generated_Image_lfflvlfflvlfflvl - Copie.png"
          alt="Experte SEO Hotavis optimisant une fiche Google Business Profile depuis son bureau"
          className="absolute inset-0 h-full w-full object-cover object-right"
          loading="eager"
        />
        {/* Overlay sombre dégradé pour la lisibilité du texte */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"
        />

        {/* Contenu superposé */}
        <div className="relative container mx-auto max-w-6xl px-4 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur text-white px-3 py-1 text-xs font-semibold border border-white/20">
              <Briefcase className="h-3.5 w-3.5" />
              Recrutement Expert SEO Local
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-balance text-white drop-shadow-lg">
              Devenir Expert SEO Local chez Hotavis
            </h1>
            <p className="mt-5 max-w-xl mx-auto sm:mx-0 text-lg text-white/90 drop-shadow">
              Rejoignez une équipe d'indépendants experts Google Business Profile et générez des
              revenus réguliers, sans prospection, en toute liberté.
            </p>
            <div className="mt-8 flex justify-center sm:justify-start">
              <a
                href="#postuler"
                className="inline-flex items-center gap-2 rounded-full gradient-cta text-white font-semibold px-7 py-3.5 shadow-glow hover:-translate-y-0.5 transition"
              >
                Postuler maintenant <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI NOUS REJOINDRE ? — section unique fusionnée */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="container mx-auto max-w-6xl px-4">
          <Reveal className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">Pourquoi nous rejoindre ?</h2>
            <p className="text-muted-foreground mt-3">
              Hotavis vous offre la liberté d'un travail indépendant, une rémunération au mérite et
              un accompagnement de qualité pour grandir.
            </p>
          </Reveal>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <Reveal delay={0.1}>
              <Card className="shadow-card hover:-translate-y-1 transition h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-bold">Liberté Totale</CardTitle>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-google-blue/15 text-google-blue">
                    <Briefcase className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    100% à distance, 0% de pression hiérarchique. Vous choisissez vos missions et
                    gérez votre emploi du temps. Vous êtes votre propre patron.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={0.2}>
              <Card className="shadow-card hover:-translate-y-1 transition h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-bold">Rémunération Attractive</CardTitle>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-google-green/15 text-google-green">
                    <Wallet className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {commissionEuros} € par fiche livrée et validée. Votre efficacité est votre
                    salaire. Travaillez plus, gagnez plus, sans plafond.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={0.3}>
              <Card className="shadow-card hover:-translate-y-1 transition h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-bold">Accompagnement Hotavis</CardTitle>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-google-yellow/20 text-amber-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Bénéficiez d'un tableau de bord dédié, d'un support administratif et montez en
                    compétence sur les outils Google My Business.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* VOTRE MISSION AU QUOTIDIEN */}
      <section className="py-16 sm:py-20 bg-surface-alt">
        <div className="container mx-auto max-w-4xl px-4">
          <Reveal className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">Votre mission au quotidien</h2>
            <p className="text-muted-foreground mt-3">
              Quatre missions claires pour garantir le succès de nos partenaires.
            </p>
          </Reveal>
          <div className="mt-10 space-y-5">
            <Reveal delay={0.1}>
              <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-5 shadow-card">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-google-blue/15 text-google-blue">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Accompagner les entreprises locales</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Guidez les entreprises locales dans leur stratégie d'avis clients pour booster
                    leur visibilité sur Google.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-5 shadow-card">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-google-green/15 text-google-green">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Installer et configurer les outils</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Installez et configurez les outils de récolte d'avis pour automatiser le
                    processus client.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-5 shadow-card">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-google-yellow/20 text-amber-700">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Assurer le suivi et la satisfaction</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assurez le suivi régulier et la satisfaction des partenaires tout au long du
                    processus.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-5 shadow-card">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-google-red/15 text-google-red">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Gérer votre portefeuille de missions</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gérez votre portefeuille de missions via votre tableau de bord dédié, du claim à
                    la livraison.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* LE PROFIL IDÉAL */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="container mx-auto max-w-3xl px-4">
          <Reveal>
            <div className="bg-card border border-border rounded-3xl shadow-card p-8 sm:p-10 text-center space-y-6">
              <h2 className="text-2xl font-bold">Le profil idéal</h2>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-google-green shrink-0 mt-0.5" />
                  <p className="text-sm">
                    <strong>Vous êtes rigoureux et organisé ?</strong> Vous savez structurer votre
                    travail et respecter des délais.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-google-green shrink-0 mt-0.5" />
                  <p className="text-sm">
                    <strong>Vous cherchez un complément de revenu flexible ?</strong> Vous voulez
                    gagner selon votre disponibilité, sans contrainte fixe.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-google-green shrink-0 mt-0.5" />
                  <p className="text-sm">
                    <strong>Vous voulez apprendre le SEO en action ?</strong> Vous êtes curieux et
                    motivé pour monter en compétence sur Google My Business.
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold text-google-blue">
                Si vous avez répondu OUI, rejoignez l'aventure Hotavis.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FORMULAIRE */}
      <section id="postuler" className="pb-20">
        <div className="container mx-auto max-w-3xl px-4">
          <Reveal>
            <div className="bg-card border border-border rounded-3xl shadow-card p-6 sm:p-10">
              {ok ? (
                <div className="text-center py-10">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-google-green/15 text-google-green">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold">Candidature envoyée 🎉</h3>
                  <p className="text-muted-foreground mt-2">
                    Merci ! Notre équipe étudie votre profil et vous recontacte sous 5 jours ouvrés.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-8">
                  <h2 className="text-2xl font-bold">Postuler comme Expert SEO</h2>

                  <fieldset className="space-y-4">
                    <legend className="text-sm font-bold uppercase tracking-wider text-google-blue">
                      A. Informations de base
                    </legend>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field
                        label="Prénom *"
                        value={form.prenom}
                        onChange={(v) => update("prenom", v)}
                        required
                      />
                      <Field
                        label="Nom *"
                        value={form.nom}
                        onChange={(v) => update("nom", v)}
                        required
                      />
                      <Field
                        label="Email *"
                        type="email"
                        value={form.email}
                        onChange={(v) => update("email", v)}
                        required
                      />
                      <Field
                        label="Téléphone *"
                        type="tel"
                        value={form.telephone}
                        onChange={(v) => update("telephone", v)}
                        required
                      />
                      <Field
                        label="Numéro de SIRET (optionnel)"
                        value={form.siret}
                        onChange={(v) => update("siret", v)}
                      />
                      <Field
                        label="Lien d'une fiche Google déjà optimisée (optionnel)"
                        type="url"
                        placeholder="https://maps.google.com/..."
                        value={form.fiche_url}
                        onChange={(v) => update("fiche_url", v)}
                      />
                    </div>
                  </fieldset>

                  <fieldset className="space-y-5">
                    <legend className="text-sm font-bold uppercase tracking-wider text-google-blue">
                      B. Présentation & Profil
                    </legend>
                    <Field
                      label="Lien de votre profil LinkedIn ou Site Web (optionnel)"
                      type="url"
                      placeholder="https://www.linkedin.com/in/..."
                      value={form.linkedin_url}
                      onChange={(v) => update("linkedin_url", v)}
                    />
                    <Textarea
                      label="Parlez-nous de vous (Motivations, expertise SEO et atouts) *"
                      value={form.presentation}
                      onChange={(v) => update("presentation", v)}
                      placeholder="Décrivez votre expérience, particulièrement en SEO local et Google Business Profile, et pourquoi vous souhaitez rejoindre notre réseau d'experts..."
                      rows={4}
                      required
                    />
                  </fieldset>

                  <fieldset className="space-y-5">
                    <legend className="text-sm font-bold uppercase tracking-wider text-google-blue">
                      C. Test d'autonomie et d'expertise GBP
                    </legend>

                    <div>
                      <p className="font-semibold mb-2">
                        1. Quelle catégorie a le plus d'impact sur le SEO local d'une fiche ? *
                      </p>
                      <div className="space-y-2">
                        {[
                          { v: "A", label: "La description de l'entreprise" },
                          { v: "B", label: "La catégorie principale" },
                          { v: "C", label: "Les catégories secondaires" },
                        ].map((opt) => (
                          <label
                            key={opt.v}
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${form.qcm_q1 === opt.v ? "border-google-blue bg-google-blue/5" : "border-border hover:bg-accent"}`}
                          >
                            <input
                              type="radio"
                              name="qcm_q1"
                              value={opt.v}
                              checked={form.qcm_q1 === opt.v}
                              onChange={() => update("qcm_q1", opt.v as "A" | "B" | "C")}
                              className="accent-google-blue"
                              required
                            />
                            <span>
                              <b>[{opt.v}]</b> {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      label="2. Si une fiche client est suspendue par Google pour 'Activité suspecte', quelle est votre première démarche ? *"
                      value={form.q2_reponse}
                      onChange={(v) => update("q2_reponse", v)}
                    />
                    <Textarea
                      label="3. Comment optimiseriez-vous une fiche pour un artisan qui travaille uniquement à domicile (sans local physique) ? *"
                      value={form.q3_reponse}
                      onChange={(v) => update("q3_reponse", v)}
                    />
                  </fieldset>

                  {err && (
                    <div className="rounded-lg bg-google-red/10 text-google-red text-sm p-3">
                      {err}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-google-blue text-white font-semibold py-3 disabled:opacity-60 hover:opacity-90 transition"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Envoyer ma candidature
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-google-blue"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        minLength={10}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-google-blue"
      />
    </label>
  );
}
