import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Upload, X, Check, ChevronRight, FileText, ShieldCheck, ShieldCheck as ShieldIcon } from "lucide-react";
import { getCommande, createCheckoutForCommande } from "@/lib/commande.functions";
import { saveOnboarding, uploadOnboardingPhoto, uploadOnboardingDocument } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/onboarding/$commandeId")({
  head: () => ({ meta: [{ title: "Briefing — Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: OnboardingPage,
});

type HoraireJour = { ferme: boolean; ouverture: string; fermeture: string };
const JOUR_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type GoogleAccountStatus = "ai_compte" | "pas_compte" | "perdu_acces";

// ---------- Helpers de validation (messages FR clairs) ----------
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[0-9 +().\-]{6,}$/;
const URL_RX = /^https?:\/\/.+\..+/i;
const SIRET_RX = /^\d{14}$/;

function vRequired(v: string) {
  return v.trim().length === 0 ? "Ce champ est obligatoire." : "";
}
function vEmail(v: string, required = false) {
  if (!v.trim()) return required ? "Ce champ est obligatoire." : "";
  return EMAIL_RX.test(v.trim()) ? "" : "Format email invalide.";
}
function vPhone(v: string) {
  if (!v.trim()) return "Ce champ est obligatoire.";
  return PHONE_RX.test(v.trim()) ? "" : "Numéro de téléphone invalide.";
}
function vZip(v: string) {
  if (!v.trim()) return "Ce champ est obligatoire.";
  return /^[0-9]{4,10}$/.test(v.trim()) ? "" : "Code postal invalide.";
}
function vUrlOpt(v: string) {
  if (!v.trim()) return "";
  return URL_RX.test(v.trim()) ? "" : "Lien invalide (commencez par https://).";
}
function vMinLen(v: string, n: number) {
  if (!v.trim()) return "Ce champ est obligatoire.";
  return v.trim().length < n ? `Ce champ doit faire au moins ${n} caractères.` : "";
}
function vSiret(v: string) {
  const c = v.replace(/\s/g, "");
  if (!c) return "Le numéro de SIRET est obligatoire.";
  return SIRET_RX.test(c) ? "" : "Le SIRET doit contenir exactement 14 chiffres.";
}

function OnboardingPage() {
  const { commandeId } = Route.useParams();
  const { t } = useTranslation();
  const fetchCommande = useServerFn(getCommande);
  const startCheckout = useServerFn(createCheckoutForCommande);
  const save = useServerFn(saveOnboarding);
  const upload = useServerFn(uploadOnboardingPhoto);
  const uploadDoc = useServerFn(uploadOnboardingDocument);

  const { data: commande, isLoading, error } = useQuery({
    queryKey: ["commande", commandeId],
    queryFn: () => fetchCommande({ data: { id: commandeId } }),
    retry: 5,
  });


  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  // Champs déjà touchés (pour afficher l'erreur seulement après interaction ou tentative de Next)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((p) => ({ ...p, [k]: true }));

  const [f, setF] = useState({
    nom_commercial: "", date_creation: "", adresse: "", point_repere: "",
    code_postal: "", ville: "",
    telephone_affiche: "", site_web: "", email_google: "",
    google_status: "ai_compte" as GoogleAccountStatus,
    categorie_principale: "", description: "",
    mots_cles: "", reseaux_sociaux: "",
    type_presence: "boutique" as "boutique" | "domicile_clients" | "les_deux",
    rayon_intervention_km: "" as string,
    siret: "",
    commentaires: "", cgv_acceptees: false,
  });
  const set = (k: keyof typeof f) => (v: any) => setF((p) => ({ ...p, [k]: v }));

  const [horaires, setHoraires] = useState<Record<string, HoraireJour>>(
    Object.fromEntries(JOUR_KEYS.map((j) => [j, { ferme: false, ouverture: "09:00", fermeture: "18:00" }])),
  );
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [attributs, setAttributs] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [couvertureUrl, setCouvertureUrl] = useState("");
  const [photosUrls, setPhotosUrls] = useState<string[]>([]);
  const [photosEtab, setPhotosEtab] = useState<string[]>([]);
  const [justificatif, setJustificatif] = useState<{ path: string; nom: string; type: string } | null>(null);
  const [facture, setFacture] = useState<{ path: string; nom: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingFacture, setUploadingFacture] = useState(false);

  const days = t("onboarding.s3_days", { returnObjects: true }) as string[];
  const attrsList = t("onboarding.s4_attrs_list", { returnObjects: true }) as string[];
  const stepLabels = t("onboarding.steps", { returnObjects: true }) as string[];

  // ---------- Calcul des erreurs (réactif) ----------
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    e.nom_commercial = vRequired(f.nom_commercial);
    e.adresse = vRequired(f.adresse);
    e.code_postal = vZip(f.code_postal);
    e.ville = vRequired(f.ville);
    e.telephone_affiche = vPhone(f.telephone_affiche);
    e.site_web = vUrlOpt(f.site_web);
    e.email_google = f.google_status === "ai_compte"
      ? vEmail(f.email_google, true)
      : vEmail(f.email_google, false);
    e.categorie_principale = vRequired(f.categorie_principale);
    e.description = vMinLen(f.description, 20);
    e.siret = vSiret(f.siret);
    return e;
  }, [f]);

  const stepFields: Record<number, string[]> = {
    1: ["nom_commercial", "adresse", "code_postal", "ville", "telephone_affiche", "site_web", "email_google"],
    2: ["categorie_principale", "description"],
    3: [],
    4: [],
    5: [],
    6: ["siret"],
    7: [],
  };

  function stepHasErrors(s: number) {
    return stepFields[s].some((k) => errors[k]);
  }

  async function fileToB64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(bin);
  }

  async function handleFile(file: File, setter: (url: string) => void) {
    setUploading(true);
    try {
      const b64 = await fileToB64(file);
      const { url } = await upload({
        data: { commande_id: commandeId, filename: file.name, content_base64: b64, content_type: file.type || "image/jpeg" },
      });
      setter(url);
      toast.success(t("onboarding.upload_ok"));
    } catch (e: any) {
      toast.error(friendlyError(e) || t("onboarding.upload_fail"));
    } finally { setUploading(false); }
  }

  async function handleDoc(file: File, kind: "kbis" | "facture") {
    if (file.size > 10 * 1024 * 1024) return toast.error(t("onboarding.upload_max"));
    const setLoad = kind === "kbis" ? setUploadingDoc : setUploadingFacture;
    setLoad(true);
    try {
      const b64 = await fileToB64(file);
      const res = await uploadDoc({
        data: { commande_id: commandeId, filename: file.name, content_base64: b64, content_type: file.type || "application/octet-stream" },
      });
      const payload = { path: res.path, nom: res.filename, type: res.contentType };
      if (kind === "kbis") setJustificatif(payload);
      else setFacture(payload);
      toast.success(t("onboarding.doc_ok"));
    } catch (e: any) {
      toast.error(friendlyError(e) || t("onboarding.upload_fail"));
    } finally { setLoad(false); }
  }

  function tryNext() {
    // Marque tous les champs de l'étape comme touchés pour révéler les erreurs
    const fields = stepFields[step];
    if (fields.length) {
      setTouched((p) => ({ ...p, ...Object.fromEntries(fields.map((k) => [k, true])) }));
    }
    if (stepHasErrors(step)) {
      toast.error("Merci de corriger les champs en rouge avant de continuer.");
      return;
    }
    setStep((s) => s + 1);
  }

  function buildCommentairesPayload() {
    // Cleanly labelled blocks, separated by blank lines so the Admin can render
    // them with whitespace-pre-line. Each block is on its own line.
    const blocks: string[] = [];
    if (f.commentaires.trim()) {
      blocks.push(`💬 Commentaires du client :\n${f.commentaires.trim()}`);
    }
    if (f.point_repere.trim()) {
      blocks.push(`📍 Point de repère :\n${f.point_repere.trim()}`);
    }
    // Statut compte Google
    if (f.google_status === "ai_compte") {
      blocks.push(`🔐 Compte Google :\nLe client possède un compte Google.`);
    } else if (f.google_status === "pas_compte") {
      blocks.push(`🔐 Compte Google :\n⚠️ Le client N'A PAS de compte Google — à créer.`);
    } else if (f.google_status === "perdu_acces") {
      blocks.push(`🔐 Compte Google :\n⚠️ Le client a déjà une fiche Google mais N'A PLUS LES ACCÈS.`);
    }
    if (f.mots_cles.trim()) {
      blocks.push(`🔑 Mots-clés clients :\n${f.mots_cles.trim()}`);
    }
    if (f.reseaux_sociaux.trim()) {
      blocks.push(`🔗 Réseaux sociaux :\n${f.reseaux_sociaux.trim()}`);
    }
    if (f.siret.trim()) {
      blocks.push(`🏢 SIRET :\n${f.siret.replace(/\s/g, "")}`);
    }
    return blocks.join("\n\n");
  }

  async function submit() {
    // Flush any unsubmitted service in the input
    let finalServices = services;
    if (serviceInput.trim()) {
      finalServices = [...services, serviceInput.trim()];
      setServices(finalServices);
      setServiceInput("");
    }

    // Re-valide toutes les étapes
    const allKeys = Object.values(stepFields).flat();
    setTouched((p) => ({ ...p, ...Object.fromEntries(allKeys.map((k) => [k, true])) }));
    const firstStepWithError = [1, 2, 6].find((s) => stepHasErrors(s));
    if (firstStepWithError) {
      setStep(firstStepWithError);
      toast.error("Certains champs obligatoires sont incomplets ou invalides.");
      return;
    }
    // Kbis optional. Facture stays required (used for billing).
    if (!facture) { setStep(6); toast.error("Merci de téléverser une facture justificative."); return; }
    if (!f.cgv_acceptees) return toast.error(t("onboarding.must_accept_terms"));

    setSaving(true);
    try {
      await save({
        data: {
          commande_id: commandeId,
          nom_commercial: f.nom_commercial, date_creation: f.date_creation,
          adresse: f.point_repere.trim() ? `${f.adresse} (${f.point_repere.trim()})` : f.adresse,
          code_postal: f.code_postal, ville: f.ville, telephone_affiche: f.telephone_affiche,
          site_web: f.site_web, email_google: f.email_google,
          pas_compte_google: f.google_status !== "ai_compte",
          categorie_principale: f.categorie_principale, description: f.description,
          type_presence: f.type_presence,
          rayon_intervention_km: f.rayon_intervention_km ? parseInt(f.rayon_intervention_km, 10) : null,
          horaires, services: finalServices,
          logo_url: logoUrl, couverture_url: couvertureUrl, photos_urls: photosUrls,
          photos_etablissement: photosEtab,
          justificatif_url: justificatif?.path || "", justificatif_nom: justificatif?.nom || "", justificatif_type: justificatif?.type || "",
          facture_url: facture?.path || "", facture_nom: facture?.nom || "", facture_type: facture?.type || "",
          attributs, commentaires: buildCommentairesPayload(), cgv_acceptees: true,
        },
      });
      // Now redirect to Stripe Checkout
      const { url } = await startCheckout({ data: { commande_id: commandeId, origin: window.location.origin } });
      window.location.href = url;
    } catch (e: any) {
      toast.error(friendlyError(e) || t("onboarding.send_error"));
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;
  }
  if (error || !commande) {
    return <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
      <div><h1 className="text-2xl font-bold">{t("onboarding.not_found_title")}</h1><p className="text-muted-foreground mt-2">{t("onboarding.not_found_body")}</p></div>
    </div>;
  }
  // No payment gate here anymore — briefing happens BEFORE checkout.
  // Once a commande is paid, redirect away from this form.
  if (commande.statut !== "en_attente") {
    if (typeof window !== "undefined") {
      window.location.href = `/onboarding-success/${commandeId}`;
    }
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;
  }

  const TOTAL = 7;
  const err = (k: string) => (touched[k] ? errors[k] : "");

  return (
    <div className="min-h-screen bg-surface-alt py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold">{t("onboarding.hello")} {commande.prenom} 👋</h1>
          <p className="text-muted-foreground mt-2">{t("onboarding.briefing_for")} <b>{commande.entreprise}</b> — {t("onboarding.minutes")}</p>
        </header>

        <ol className="flex flex-wrap gap-2 mb-8 justify-center">
          {stepLabels.map((s, i) => (
            <li key={s} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${i + 1 === step ? "bg-google-blue text-white" : i + 1 < step ? "bg-google-green/15 text-google-green" : "bg-card border border-border text-muted-foreground"}`}>
              {i + 1 < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              {s}
            </li>
          ))}
        </ol>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-2">{t("onboarding.s1_title")}</h2>
              <Input label={t("onboarding.s1_name")} value={f.nom_commercial}
                onChange={(v) => set("nom_commercial")(v)} onBlur={() => touch("nom_commercial")} required error={err("nom_commercial")} />
              <Input label={t("onboarding.s1_date")} type="date" value={f.date_creation} onChange={(v) => set("date_creation")(v)} />
              <Input label={t("onboarding.s1_address")} value={f.adresse}
                onChange={(v) => set("adresse")(v)} onBlur={() => touch("adresse")} required error={err("adresse")} />
              <Input label="Point de repère pour votre adresse (optionnel)"
                value={f.point_repere} onChange={(v) => set("point_repere")(v)}
                placeholder="Ex : Bâtiment B, code porte 1234, à côté de la pharmacie…"
                helper="Aide nos équipes (et vos clients) à vous localiser facilement." />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t("onboarding.s1_zip")} value={f.code_postal}
                  onChange={(v) => set("code_postal")(v)} onBlur={() => touch("code_postal")} required error={err("code_postal")} />
                <Input label={t("onboarding.s1_city")} value={f.ville}
                  onChange={(v) => set("ville")(v)} onBlur={() => touch("ville")} required error={err("ville")} />
              </div>
              <Input label={t("onboarding.s1_phone")} type="tel" value={f.telephone_affiche}
                onChange={(v) => set("telephone_affiche")(v)} onBlur={() => touch("telephone_affiche")} required error={err("telephone_affiche")} />
              <Input label={t("onboarding.s1_website")} value={f.site_web}
                onChange={(v) => set("site_web")(v)} onBlur={() => touch("site_web")} placeholder="https://..." error={err("site_web")} />

              <div>
                <label className="block text-sm font-semibold mb-1.5">Votre situation Google *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    ["ai_compte", "J'ai un compte Google"],
                    ["pas_compte", "Je n'ai pas de compte Google"],
                    ["perdu_acces", "J'ai déjà une fiche, mais je n'ai plus les accès"],
                  ] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set("google_status")(v)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition text-left ${f.google_status === v ? "bg-google-blue text-white border-google-blue" : "bg-background border-border"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {f.google_status !== "pas_compte" && (
                <Input
                  label={f.google_status === "perdu_acces" ? "Email du compte Google associé à votre ancienne fiche" : t("onboarding.s1_google_email")}
                  type="email" value={f.email_google}
                  onChange={(v) => set("email_google")(v)} onBlur={() => touch("email_google")}
                  required={f.google_status === "ai_compte"}
                  error={err("email_google")}
                  helper="Cet email nous permettra de vous donner les droits de propriétaire sur votre nouvelle fiche Google une fois créée." />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-2">{t("onboarding.s2_title")}</h2>
              <Input label={t("onboarding.s2_category")} value={f.categorie_principale}
                onChange={(v) => set("categorie_principale")(v)} onBlur={() => touch("categorie_principale")}
                placeholder={t("onboarding.s2_category_ph")} required error={err("categorie_principale")} />
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("onboarding.s2_desc")}</label>
                <textarea value={f.description}
                  onChange={(e) => set("description")(e.target.value)}
                  onBlur={() => touch("description")}
                  rows={5} maxLength={750}
                  className={`w-full rounded-xl border bg-background px-4 py-3 focus:outline-none focus:ring-2 ${err("description") ? "border-destructive ring-destructive/30" : "border-input focus:ring-google-blue"}`}
                  placeholder={t("onboarding.s2_desc_ph")} />
                <div className="flex justify-between mt-1">
                  {err("description")
                    ? <p className="text-xs text-destructive font-medium">{err("description")}</p>
                    : <span />}
                  <div className="text-xs text-muted-foreground">{f.description.length}/750</div>
                </div>
              </div>
              <Input label="Mots-clés clients (optionnel)" value={f.mots_cles}
                onChange={(v) => set("mots_cles")(v)}
                placeholder="Ex : plombier urgence Paris 11, dépannage chaudière, fuite eau…"
                helper="Indiquez les 3 mots-clés principaux que vos clients utilisent pour vous trouver sur Google." />
              <Input label="Liens réseaux sociaux (optionnel)" value={f.reseaux_sociaux}
                onChange={(v) => set("reseaux_sociaux")(v)}
                placeholder="Facebook, Instagram, LinkedIn…"
                helper="Collez les URLs séparées par des virgules." />
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("onboarding.s2_presence")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["boutique", t("onboarding.s2_shop")],
                    ["domicile_clients", t("onboarding.s2_home")],
                    ["les_deux", t("onboarding.s2_both")],
                  ] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set("type_presence")(v)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${f.type_presence === v ? "bg-google-blue text-white border-google-blue" : "bg-background border-border"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {(f.type_presence === "domicile_clients" || f.type_presence === "les_deux") && (
                <Input label={t("onboarding.s2_radius")} type="number" value={f.rayon_intervention_km} onChange={(v) => set("rayon_intervention_km")(v)} />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold mb-2">{t("onboarding.s3_title")}</h2>
              {JOUR_KEYS.map((j, i) => (
                <div key={j} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="w-28 font-medium text-sm">{days[i]}</span>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={horaires[j].ferme}
                      onChange={(e) => setHoraires((h) => ({ ...h, [j]: { ...h[j], ferme: e.target.checked } }))} />
                    {t("onboarding.s3_closed")}
                  </label>
                  {!horaires[j].ferme && (
                    <>
                      <input type="time" value={horaires[j].ouverture}
                        onChange={(e) => setHoraires((h) => ({ ...h, [j]: { ...h[j], ouverture: e.target.value } }))}
                        className="rounded-md border border-input px-2 py-1 text-sm" />
                      <span className="text-muted-foreground">→</span>
                      <input type="time" value={horaires[j].fermeture}
                        onChange={(e) => setHoraires((h) => ({ ...h, [j]: { ...h[j], fermeture: e.target.value } }))}
                        className="rounded-md border border-input px-2 py-1 text-sm" />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-2">{t("onboarding.s4_title")}</h2>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("onboarding.s4_services")}</label>
                <div className="flex gap-2">
                  <input value={serviceInput} onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (serviceInput.trim()) { setServices([...services, serviceInput.trim()]); setServiceInput(""); } } }}
                    placeholder={t("onboarding.s4_services_ph")}
                    className="flex-1 rounded-xl border border-input px-4 py-2.5" />
                  <button type="button" onClick={() => { if (serviceInput.trim()) { setServices([...services, serviceInput.trim()]); setServiceInput(""); } }}
                    className="rounded-xl bg-google-blue text-white px-4 font-semibold">{t("onboarding.s4_add")}</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {services.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-3 py-1 text-sm">
                      {s}<button type="button" onClick={() => setServices(services.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("onboarding.s4_attributes")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {attrsList.map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm rounded-lg border border-border p-2 cursor-pointer hover:bg-accent">
                      <input type="checkbox" checked={attributs.includes(a)}
                        onChange={(e) => setAttributs(e.target.checked ? [...attributs, a] : attributs.filter((x) => x !== a))} />
                      {a}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold mb-2">{t("onboarding.s5_title")}</h2>
              <PhotoSlot label={t("onboarding.s5_logo")} url={logoUrl} onFile={(file) => handleFile(file, setLogoUrl)} uploading={uploading} chooseLabel={t("onboarding.s5_choose")} />
              <PhotoSlot label={t("onboarding.s5_cover")} url={couvertureUrl} onFile={(file) => handleFile(file, setCouvertureUrl)} uploading={uploading} chooseLabel={t("onboarding.s5_choose")} />
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("onboarding.s5_more")}</label>
                <input type="file" accept="image/*" multiple disabled={uploading || photosUrls.length >= 10}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []).slice(0, 10 - photosUrls.length);
                    for (const file of files) await handleFile(file, (url) => setPhotosUrls((p) => [...p, url]));
                  }} className="text-sm" />
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {photosUrls.map((u, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={u} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPhotosUrls(photosUrls.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-2">{t("onboarding.s6_title")}</h2>
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  {t("onboarding.s6_photos_etab")} <span className="text-muted-foreground font-normal">{t("onboarding.s6_photos_etab_hint")}</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">{t("onboarding.s6_photos_etab_desc")}</p>
                <input type="file" accept="image/*" multiple disabled={uploading || photosEtab.length >= 10}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []).slice(0, 10 - photosEtab.length);
                    for (const file of files) await handleFile(file, (url) => setPhotosEtab((p) => [...p, url]));
                  }} className="text-sm" />
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {photosEtab.map((u, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={u} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPhotosEtab(photosEtab.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <Input label="Numéro de SIRET *" value={f.siret}
                onChange={(v) => set("siret")(v)} onBlur={() => touch("siret")}
                placeholder="14 chiffres (ex : 12345678901234)"
                helper="Le SIRET figure sur votre extrait Kbis ou votre avis Sirene."
                required error={err("siret")} />

              <div>
                <DocSlot title="Extrait Kbis (optionnel)" desc={t("onboarding.s6_kbis_desc")}
                  doc={justificatif} onRemove={() => setJustificatif(null)} onFile={(file) => handleDoc(file, "kbis")}
                  uploading={uploadingDoc}
                  uploadLabel={t("onboarding.s6_upload")} uploadingLabel={t("onboarding.s6_uploading")} removeLabel={t("onboarding.s6_remove")} />
              </div>

              <div className="rounded-xl bg-google-blue/5 border border-google-blue/20 p-3 text-xs leading-relaxed text-foreground/80">
                <b>Pourquoi fournir ces documents ?</b> Un Kbis, un SIRET valide ou une facture professionnelle augmente considérablement les chances de validation rapide par Google. Ces documents sont impératifs si Google décide d'effectuer une vérification approfondie de votre entreprise.
              </div>

              <DocSlot title={t("onboarding.s6_invoice_title")} desc={t("onboarding.s6_invoice_desc")}
                doc={facture} onRemove={() => setFacture(null)} onFile={(file) => handleDoc(file, "facture")}
                uploading={uploadingFacture}
                uploadLabel={t("onboarding.s6_upload")} uploadingLabel={t("onboarding.s6_uploading")} removeLabel={t("onboarding.s6_remove")} />
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-2">{t("onboarding.s7_title")}</h2>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("onboarding.s7_comments")}</label>
                <textarea value={f.commentaires} onChange={(e) => set("commentaires")(e.target.value)} rows={4} maxLength={2000}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3" placeholder={t("onboarding.s7_comments_ph")} />
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm leading-relaxed text-amber-900">
                <b>Délais de livraison :</b> sous 7 jours ouvrés. Attention : dans certains cas, Google exige une vérification par courrier postal pour valider l'établissement, ce qui peut rallonger le délai d'environ 14 jours.
              </div>
              <div className="rounded-xl border-2 border-google-green/30 bg-google-green/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-google-green">{t("guarantee.tag")}</div>
                <div className="mt-1 font-bold">{t("guarantee.title")}</div>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{t("guarantee.body")}</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={f.cgv_acceptees} onChange={(e) => set("cgv_acceptees")(e.target.checked)} className="mt-1" />
                <span>{t("onboarding.s7_terms")}</span>
              </label>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <button type="button" disabled={step === 1} onClick={() => setStep((s) => s - 1)}
              className="rounded-full border border-border px-5 py-2.5 font-semibold disabled:opacity-40">
              {t("onboarding.prev")}
            </button>
            {step < TOTAL ? (
              <button type="button" onClick={tryNext}
                className="rounded-full bg-google-blue text-white px-6 py-2.5 font-semibold flex items-center gap-1">
                {t("onboarding.next")} <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={saving || !f.cgv_acceptees}
                className="rounded-full gradient-cta text-white px-6 py-2.5 font-bold shadow-glow disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Valider et passer au paiement →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Transforme une erreur (souvent issue de Zod sérialisée) en message FR lisible
function friendlyError(e: any): string {
  const raw = e?.message || "";
  if (!raw) return "";
  // Si le message ressemble à du JSON (Zod), on tente d'extraire le 1er message
  const trimmed = String(raw).trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const first = arr[0];
      if (first?.message) return `Champ « ${(first.path || []).join(".") || "?"} » : ${first.message}`;
    } catch { /* ignore */ }
    return "Certaines informations sont invalides. Vérifiez vos champs et réessayez.";
  }
  return raw;
}

function Input({ label, value, onChange, onBlur, type = "text", required, placeholder, error, helper }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void;
  type?: string; required?: boolean; placeholder?: string; error?: string; helper?: string;
}) {
  const hasError = !!error;
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        required={required} placeholder={placeholder}
        aria-invalid={hasError || undefined}
        className={`mt-1 w-full rounded-xl border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 ${hasError ? "border-destructive ring-destructive/30 focus:ring-destructive/40" : "border-input focus:ring-google-blue"}`} />
      {hasError ? (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </label>
  );
}

function PhotoSlot({ label, url, onFile, uploading, chooseLabel }: { label: string; url: string; onFile: (file: File) => void; uploading: boolean; chooseLabel: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">{label}</label>
      {url ? (
        <div className="relative inline-block">
          <img src={url} alt="" className="h-32 w-32 object-cover rounded-xl border border-border" />
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 w-32 rounded-xl border-2 border-dashed border-border hover:border-google-blue cursor-pointer transition">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Upload className="h-6 w-6 text-muted-foreground" /><span className="text-xs text-muted-foreground mt-1">{chooseLabel}</span></>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}

function DocSlot({ title, desc, doc, onRemove, onFile, uploading, uploadLabel, uploadingLabel, removeLabel }: {
  title: string; desc: string;
  doc: { nom: string } | null;
  onRemove: () => void; onFile: (file: File) => void;
  uploading: boolean;
  uploadLabel: string; uploadingLabel: string; removeLabel: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-google-blue/30 bg-google-blue/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-google-blue flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          <div className="mt-3">
            {doc ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-border p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-5 w-5 text-google-green flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{doc.nom}</span>
                </div>
                <button type="button" onClick={onRemove} className="text-google-red text-sm font-semibold">{removeLabel}</button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-full bg-google-blue text-white px-4 py-2 text-sm font-semibold hover:opacity-90">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? uploadingLabel : uploadLabel}
                <input type="file" accept=".pdf,image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
