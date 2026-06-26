import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Briefcase, Wallet, Sparkles, Loader2 } from "lucide-react";
import { submitCandidature } from "@/lib/candidature.functions";
import { getPublicCommissionAmount } from "@/lib/agency-public.functions";

export const Route = createFileRoute("/recrutement")({
  head: () => ({
    meta: [
      { title: "Devenir Expert SEO Local chez Hotavis — Recrutement" },
      { name: "description", content: "Rejoignez Hotavis en tant qu'expert SEO local indépendant. Zéro prospection, rémunération au forfait, liberté totale. Postulez en quelques minutes." },
      { property: "og:title", content: "Devenir Expert SEO Local chez Hotavis" },
      { property: "og:description", content: "Rejoignez Hotavis : missions GBP déjà payées, rémunération attractive au forfait, autonomie totale." },
      { property: "og:image", content: "/images/recrutement-banner.svg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/images/recrutement-banner.svg" },
    ],
  }),
  component: RecrutementPage,
});

type Form = {
  prenom: string; nom: string; email: string; telephone: string;
  siret: string; fiche_url: string;
  qcm_q1: "A" | "B" | "C" | "";
  q2_reponse: string; q3_reponse: string;
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
    prenom: "", nom: "", email: "", telephone: "",
    siret: "", fiche_url: "",
    qcm_q1: "", q2_reponse: "", q3_reponse: "",
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
    if (!form.qcm_q1) { setErr("Merci de répondre à la question QCM."); return; }
    if (form.q2_reponse.trim().length < 10 || form.q3_reponse.trim().length < 10) {
      setErr("Merci de détailler vos réponses (au moins 10 caractères)."); return;
    }
    setLoading(true);
    try {
      await submit({ data: { ...form, qcm_q1: form.qcm_q1 as "A"|"B"|"C" } });
      setOk(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Une erreur est survenue. Réessayez.";
      setErr(msg.includes("duplicate") ? "Une candidature avec cet email existe déjà." : "Impossible d'envoyer la candidature. Vérifiez vos informations.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-surface-alt">
      {/* HERO avec bannière en fond */}
      <section
        className="relative bg-cover bg-center"
        style={{ backgroundImage: `url(/images/recrutement-banner.svg)` }}
      >
        {/* Overlay sombre pour lisibilité */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30" />
        <div className="relative container mx-auto max-w-5xl px-4 py-20 sm:py-28 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur text-white px-3 py-1 text-xs font-semibold border border-white/20">
            Recrutement Expert SEO Local
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg">
            Devenir Expert SEO Local chez Hotavis
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90 drop-shadow">
            Rejoignez une équipe d'indépendants experts Google Business Profile et générez des revenus
            réguliers, sans prospection, en toute liberté.
          </p>
          <a href="#postuler" className="mt-8 inline-flex items-center rounded-full bg-google-blue text-white font-semibold px-7 py-3 shadow-glow hover:opacity-90 transition">
            Postuler maintenant
          </a>
        </div>
      </section>

      {/* AVANTAGES */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center">Les avantages Hotavis</h2>
          <p className="text-center text-muted-foreground mt-2">Trois bonnes raisons de nous rejoindre.</p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <Advantage
              icon={<Briefcase className="h-6 w-6" />}
              color="bg-google-blue/15 text-google-blue"
              title="Zéro Prospection"
              desc="Les clients ont déjà payé. Vous récupérez les missions disponibles dans notre pool et créez les fiches. Vous vous concentrez uniquement sur votre expertise."
            />
            <Advantage
              icon={<Wallet className="h-6 w-6" />}
              color="bg-google-green/15 text-google-green"
              title="Rémunération attractive au forfait"
              desc={`Rémunération garantie de ${commissionEuros} € par fiche validée et livrée. Pas de surprise, pas de négociation : vous savez exactement combien vous gagnez.`}
            />
            <Advantage
              icon={<Sparkles className="h-6 w-6" />}
              color="bg-google-yellow/20 text-amber-700"
              title="Liberté & Autonomie totale"
              desc="Travaillez d'où vous voulez, quand vous voulez. Vous choisissez les dossiers qui vous intéressent dans le pool de missions."
            />
          </div>
        </div>
      </section>

      {/* FORMULAIRE */}
      <section id="postuler" className="pb-20">
        <div className="container mx-auto max-w-3xl px-4">
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
                    <Field label="Prénom *" value={form.prenom} onChange={(v) => update("prenom", v)} required />
                    <Field label="Nom *" value={form.nom} onChange={(v) => update("nom", v)} required />
                    <Field label="Email *" type="email" value={form.email} onChange={(v) => update("email", v)} required />
                    <Field label="Téléphone *" type="tel" value={form.telephone} onChange={(v) => update("telephone", v)} required />
                    <Field label="Numéro de SIRET (optionnel)" value={form.siret} onChange={(v) => update("siret", v)} />
                    <Field label="Lien d'une fiche Google déjà optimisée (optionnel)" type="url" placeholder="https://maps.google.com/..." value={form.fiche_url} onChange={(v) => update("fiche_url", v)} />
                  </div>
                </fieldset>

                <fieldset className="space-y-5">
                  <legend className="text-sm font-bold uppercase tracking-wider text-google-blue">
                    B. Test d'autonomie et d'expertise GBP
                  </legend>

                  <div>
                    <p className="font-semibold mb-2">1. Quelle catégorie a le plus d'impact sur le SEO local d'une fiche ? *</p>
                    <div className="space-y-2">
                      {[
                        { v: "A", label: "La description de l'entreprise" },
                        { v: "B", label: "La catégorie principale" },
                        { v: "C", label: "Les catégories secondaires" },
                      ].map((opt) => (
                        <label key={opt.v} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${form.qcm_q1 === opt.v ? "border-google-blue bg-google-blue/5" : "border-border hover:bg-accent"}`}>
                          <input type="radio" name="qcm_q1" value={opt.v} checked={form.qcm_q1 === opt.v} onChange={() => update("qcm_q1", opt.v as "A"|"B"|"C")} className="accent-google-blue" required />
                          <span><b>[{opt.v}]</b> {opt.label}</span>
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

                {err && <div className="rounded-lg bg-google-red/10 text-google-red text-sm p-3">{err}</div>}

                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-google-blue text-white font-semibold py-3 disabled:opacity-60 hover:opacity-90 transition">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Envoyer ma candidature
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Advantage({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card hover:-translate-y-1 transition">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <h3 className="mt-4 font-bold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-google-blue" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} minLength={10} required
        className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-google-blue" />
    </label>
  );
}
