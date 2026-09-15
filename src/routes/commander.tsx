import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { createCommande } from "@/lib/commande.functions";
import { Section } from "@/components/site/Section";

export const Route = createFileRoute("/commander")({
  head: () => ({ meta: [{ title: "Commander mon pack Hotavis — 199€" }] }),
  component: CommanderPage,
});

function CommanderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useServerFn(createCommande);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    entreprise: "",
    ville: "",
    activite: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await create({ data: form });
      // Handle rate limit error response
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error === "RATE_LIMITED"
      ) {
        const retryAfter = (result as { retryAfterSec: number }).retryAfterSec;
        toast.error(`Trop de requêtes. Réessayez dans ${retryAfter}s.`);
        setLoading(false);
        return;
      }
      const { commande_id } = result as { commande_id: string };
      navigate({ to: "/onboarding/$commandeId", params: { commandeId: commande_id } });
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error)?.message || "Une erreur est survenue");
      setLoading(false);
    }
  };

  const features = [
    t("commander.feature_1"),
    t("commander.feature_2"),
    t("commander.feature_3"),
    t("commander.feature_4"),
    t("commander.feature_5"),
    t("commander.feature_6"),
  ];

  return (
    <Section className="!py-12 md:!py-16">
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {t("commander.title")} <span className="text-google-blue">Hotavis</span>
          </h1>
          <p className="mt-3 text-muted-foreground">{t("commander.subtitle")}</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label={t("commander.first_name")}
                value={form.prenom}
                onChange={update("prenom")}
                required
              />
              <Field
                label={t("commander.last_name")}
                value={form.nom}
                onChange={update("nom")}
                required
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label={t("commander.email")}
                type="email"
                value={form.email}
                onChange={update("email")}
                required
              />
              <Field
                label={t("commander.phone")}
                type="tel"
                value={form.telephone}
                onChange={update("telephone")}
                required
              />
            </div>
            <Field
              label={t("commander.company")}
              value={form.entreprise}
              onChange={update("entreprise")}
              required
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label={t("commander.city")}
                value={form.ville}
                onChange={update("ville")}
                required
              />
              <Field
                label={t("commander.activity")}
                value={form.activite}
                onChange={update("activite")}
                placeholder={t("commander.activity_placeholder")}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full gradient-cta text-white px-6 py-4 font-bold text-lg shadow-glow disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Création de votre dossier…
                </>
              ) : (
                <>Continuer vers le briefing →</>
              )}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              Étape 1/3 · Aucun paiement à cette étape. Vous remplirez d'abord le briefing (10 min),
              puis vous finaliserez le paiement sécurisé.
            </p>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-google-green" />
              {t("commander.secure_line")}
            </p>
          </form>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-center gap-2 text-google-yellow">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                {t("commander.recap")}
              </span>
            </div>
            <h3 className="mt-3 text-xl font-bold">{t("commander.pack")}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold">199€</span>
              <span className="text-muted-foreground">{t("commander.price_meta")}</span>
            </div>

            <ul className="mt-5 space-y-2.5 text-sm">
              {features.map((txt) => (
                <li key={txt} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-google-green mt-0.5 flex-shrink-0" />
                  <span>{txt}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl border-2 border-google-green/30 bg-google-green/5 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-google-green">
                {t("guarantee.tag")}
              </div>
              <div className="mt-1 font-bold">{t("guarantee.title")}</div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {t("guarantee.body")}
              </p>
            </div>

            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs leading-relaxed text-amber-900">
              <b>Délais de livraison :</b> sous 7 jours ouvrés. Attention : dans certains cas,
              Google exige une vérification par courrier postal pour valider l'établissement, ce qui
              peut rallonger le délai d'environ 14 jours.
            </div>
          </div>
        </aside>
      </div>
    </Section>
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
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-google-red"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-google-blue focus:border-google-blue transition"
      />
    </label>
  );
}
