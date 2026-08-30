import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  X,
  Check,
  ChevronRight,
  FileText,
  ShieldCheck,
  ShieldCheck as ShieldIcon,
  Building2,
  Sparkles,
  Home,
  MapPin,
  Navigation,
  Store,
  Layers,
} from "lucide-react";
import { getCommande, createCheckoutForCommande } from "@/lib/commande.functions";
import {
  saveOnboarding,
  uploadOnboardingPhoto,
  uploadOnboardingVideo,
  uploadOnboardingDocument,
} from "@/lib/onboarding.functions";

export const Route = createFileRoute("/onboarding/$commandeId")({
  head: () => ({ meta: [{ title: "Briefing — Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: OnboardingPage,
});

type HoraireJour = { ferme: boolean; ouverture: string; fermeture: string };
const JOUR_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type GoogleAccountStatus = "ai_compte" | "pas_compte" | "perdu_acces";
type EntrepriseStatus = "creee" | "en_cours" | "non_creee";

// ---------- Helpers de validation (messages FR clairs) ----------
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[0-9 +().-]{6,}$/;
const URL_RX = /^https?:\/\/.+\..+/i;
const SIRET_RX = /^\d{14}$/;

function vRequired(v: string) {
  return v.trim().length === 0 ? "Ce champ est obligatoire." : "";
}
function vEmail(v: string, required = false) {
  if (!v.trim()) return required ? "Ce champ est obligatoire." : "";
  return EMAIL_RX.test(v.trim()) ? "" : "Format email invalide.";
}
function vGmail(v: string) {
  if (!v.trim()) return "Ce champ est obligatoire.";
  if (!EMAIL_RX.test(v.trim())) return "Format email invalide.";
  return v.trim().toLowerCase().endsWith("@gmail.com")
    ? ""
    : "Veuillez renseigner une adresse finissant par @gmail.com";
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
  const uploadVideo = useServerFn(uploadOnboardingVideo);
  const uploadDoc = useServerFn(uploadOnboardingDocument);

  const {
    data: commande,
    isLoading,
    error,
  } = useQuery({
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
    nom_commercial: "",
    nom_legal: "",
    date_creation: "",
    adresse: "",
    point_repere: "",
    code_postal: "",
    ville: "",
    telephone_affiche: "",
    site_web: "",
    facebook_url: "",
    instagram_url: "",
    youtube_url: "",
    linkedin_url: "",
    tiktok_url: "",
    reseaux_autres: [] as { label: string; url: string }[],
    email_google: "",
    google_status: "ai_compte" as GoogleAccountStatus,
    categorie_principale: "",
    categories_secondaires: [] as string[],
    description: "",
    informations_complementaires: "",
    mots_cles: "",
    reseaux_sociaux: "",
    type_presence: "boutique" as "boutique" | "domicile_clients" | "les_deux",
    zones_desservies: [] as string[],
    siret: "",
    commentaires: "",
    cgv_acceptees: false,
    entreprise_statut_creation: "" as EntrepriseStatus | "",
    validation_google_comprise: false,
  });
  const set = (k: keyof typeof f) => (v: string | boolean | string[]) =>
    setF((p) => ({ ...p, [k]: v }));

  const [horaires, setHoraires] = useState<Record<string, HoraireJour>>(
    Object.fromEntries(
      JOUR_KEYS.map((j) => [j, { ferme: false, ouverture: "09:00", fermeture: "18:00" }]),
    ),
  );
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [zoneInput, setZoneInput] = useState("");
  const [attributs, setAttributs] = useState<string[]>([]);
  const [attributsPersonnalises, setAttributsPersonnalises] = useState<string[]>([]);
  const [customAttrInput, setCustomAttrInput] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [couvertureUrl, setCouvertureUrl] = useState("");
  const [photosUrls, setPhotosUrls] = useState<string[]>([]);
  const [photosEtab, setPhotosEtab] = useState<string[]>([]);
  const [photosExterieurs, setPhotosExterieurs] = useState<string[]>([]);
  const [photosInterieurs, setPhotosInterieurs] = useState<string[]>([]);
  const [photosEquipe, setPhotosEquipe] = useState<string[]>([]);
  const [photosMetier, setPhotosMetier] = useState<string[]>([]);
  const [videosUrls, setVideosUrls] = useState<string[]>([]);
  const [justificatif, setJustificatif] = useState<{
    path: string;
    nom: string;
    type: string;
  } | null>(null);
  const [facture, setFacture] = useState<{ path: string; nom: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingFacture, setUploadingFacture] = useState(false);

  const days = t("onboarding.s3_days", { returnObjects: true }) as string[];
  const attrsList = t("onboarding.s4_attrs_list", { returnObjects: true }) as string[];
  const stepLabels = t("onboarding.steps", { returnObjects: true }) as string[];

  // ---------- Calcul des erreurs (réactif) ----------
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    // Section 1 - Identité
    e.nom_commercial = vRequired(f.nom_commercial);
    e.categorie_principale = vRequired(f.categorie_principale);
    // Section 2 - Présentation
    e.description = vMinLen(f.description, 100);
    // Coordonnées
    e.adresse = vRequired(f.adresse);
    e.code_postal = vZip(f.code_postal);
    e.ville = vRequired(f.ville);
    e.telephone_affiche = vPhone(f.telephone_affiche);
    e.site_web = vUrlOpt(f.site_web);
    // Email Google : validation selon le statut du compte
    if (f.google_status === "ai_compte") {
      // Pour "J'ai un compte Google" : email obligatoire, format valide (tout domaine accepté)
      e.email_google = vEmail(f.email_google, true);
    } else if (f.google_status === "pas_compte" || f.google_status === "perdu_acces") {
      // Pour "Je n'ai pas de compte" ou "J'ai perdu l'accès" : email obligatoire, format valide (tout domaine accepté)
      e.email_google = vEmail(f.email_google, true);
    } else {
      e.email_google = vEmail(f.email_google, false);
    }
    e.siret = vSiret(f.siret);
    return e;
  }, [f]);

  const stepFields: Record<number, string[]> = {
    1: [
      "nom_commercial",
      "categorie_principale",
      "description",
      "adresse",
      "code_postal",
      "ville",
      "telephone_affiche",
      "site_web",
      "email_google",
    ],
    2: ["type_presence"],
    3: [],
    4: [],
    5: [],
    6: [],
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
    for (let i = 0; i < bytes.length; i += chunk)
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(bin);
  }

  async function handleFile(file: File, setter: (url: string) => void) {
    setUploading(true);
    try {
      const b64 = await fileToB64(file);
      const { url } = await upload({
        data: {
          commande_id: commandeId,
          filename: file.name,
          content_base64: b64,
          content_type: file.type || "image/jpeg",
        },
      });
      setter(url);
      toast.success(t("onboarding.upload_ok"));
    } catch (e: unknown) {
      toast.error(friendlyError(e) || t("onboarding.upload_fail"));
    } finally {
      setUploading(false);
    }
  }

  async function handleVideo(file: File, setter: (url: string) => void) {
    setUploadingVideo(true);
    try {
      const b64 = await fileToB64(file);
      const { url } = await uploadVideo({
        data: {
          commande_id: commandeId,
          filename: file.name,
          content_base64: b64,
          content_type: file.type || "video/mp4",
        },
      });
      setter(url);
      toast.success(t("onboarding.upload_ok"));
    } catch (e: unknown) {
      toast.error(friendlyError(e) || t("onboarding.upload_fail"));
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleDoc(file: File, kind: "kbis" | "facture") {
    if (file.size > 10 * 1024 * 1024) return toast.error(t("onboarding.upload_max"));
    const setLoad = kind === "kbis" ? setUploadingDoc : setUploadingFacture;
    setLoad(true);
    try {
      const b64 = await fileToB64(file);
      const res = await uploadDoc({
        data: {
          commande_id: commandeId,
          filename: file.name,
          content_base64: b64,
          content_type: file.type || "application/octet-stream",
        },
      });
      const payload = { path: res.path, nom: res.filename, type: res.contentType };
      if (kind === "kbis") setJustificatif(payload);
      else setFacture(payload);
      toast.success(t("onboarding.doc_ok"));
    } catch (e: unknown) {
      toast.error(friendlyError(e) || t("onboarding.upload_fail"));
    } finally {
      setLoad(false);
    }
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
    // Étape 6 — Situation de l'entreprise
    if (step === 6) {
      setTouched((p) => ({ ...p, entreprise_statut_creation: true }));
      if (!f.entreprise_statut_creation) {
        toast.error(t("onboarding.s6_required"));
        return;
      }
      if (!f.validation_google_comprise) {
        toast.error(t("onboarding.s6_confirm_required"));
        return;
      }
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
    // Statut compte Google - retiré des informations complémentaires (affiché ailleurs)
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
    const firstStepWithError = [1, 2].find((s) => stepHasErrors(s));
    if (firstStepWithError) {
      setStep(firstStepWithError);
      toast.error("Certains champs obligatoires sont incomplets ou invalides.");
      return;
    }
    // Étape 6 — Situation de l'entreprise
    if (!f.entreprise_statut_creation) {
      setStep(6);
      setTouched((p) => ({ ...p, entreprise_statut_creation: true }));
      toast.error(t("onboarding.s6_required"));
      return;
    }
    if (!f.validation_google_comprise) {
      setStep(6);
      toast.error(t("onboarding.s6_confirm_required"));
      return;
    }
    if (!f.cgv_acceptees) return toast.error(t("onboarding.must_accept_terms"));

    setSaving(true);
    try {
      const payload = {
        commande_id: commandeId,
        nom_commercial: f.nom_commercial,
        nom_legal: f.nom_legal || null,
        date_creation: f.date_creation || null,
        adresse: f.adresse,
        code_postal: f.code_postal,
        ville: f.ville,
        telephone_affiche: f.telephone_affiche,
        site_web: f.site_web || null,
        email_google: f.email_google || null,
        pas_compte_google: f.google_status === "pas_compte",
        categorie_principale: f.categorie_principale,
        categories_secondaires: f.categories_secondaires,
        description: f.description,
        informations_complementaires: f.informations_complementaires || null,
        type_presence: f.type_presence,
        zones_desservies: f.zones_desservies,
        horaires,
        services: finalServices,
        logo_url: logoUrl || null,
        couverture_url: couvertureUrl || null,
        photos_urls: photosUrls,
        photos_etablissement: photosEtab,
        justificatif_url: justificatif?.path || null,
        justificatif_nom: justificatif?.nom || null,
        justificatif_type: justificatif?.type || null,
        facture_url: facture?.path || null,
        facture_nom: facture?.nom || null,
        facture_type: facture?.type || null,
        attributs,
        attributs_personnalises: attributsPersonnalises,
        facebook_url: f.facebook_url || null,
        instagram_url: f.instagram_url || null,
        youtube_url: f.youtube_url || null,
        linkedin_url: f.linkedin_url || null,
        tiktok_url: f.tiktok_url || null,
        reseaux_autres: f.reseaux_autres.length > 0 ? f.reseaux_autres : [],
        photos_metier: photosMetier,
        photos_metier_description: null,
        photos_exterieures: photosExterieurs,
        photos_interieures: photosInterieurs,
        photos_equipe: photosEquipe,
        videos_urls: videosUrls,
        commentaires: buildCommentairesPayload() || null,
        cgv_acceptees: f.cgv_acceptees,
        entreprise_statut_creation: f.entreprise_statut_creation as EntrepriseStatus,
        validation_google_comprise: f.validation_google_comprise,
      };
      await save({ data: payload });
      toast.success(t("onboarding.saved"));
      // Redirige vers Stripe
      const { url } = await startCheckout({
        data: { commande_id: commandeId, origin: window.location.origin },
      });
      window.location.href = url;
    } catch (e: unknown) {
      toast.error(friendlyError(e) || t("onboarding.save_fail"));
    } finally {
      setSaving(false);
    }
  }

  const TOTAL = 7;
  const err = (k: string) => (touched[k] ? errors[k] : "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-alt flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-google-blue" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-card">
            <X className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold">Impossible de charger le briefing</h2>
            <p className="text-muted-foreground mt-2">
              {friendlyError(error) || "Commande introuvable ou erreur serveur."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-google-blue text-white px-6 py-2.5 font-semibold"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt flex items-start justify-center px-4 py-12">
      <div className="max-w-3xl w-full">
        <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
          <div className="bg-gradient-to-br from-google-blue/10 via-google-green/5 to-google-yellow/5 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {t("onboarding.title")}
                </h1>
                <p className="text-muted-foreground mt-1">{t("onboarding.subtitle")}</p>
              </div>
              <div className="flex-shrink-0 text-right text-sm text-muted-foreground">
                <div className="font-bold text-foreground">{commande?.entreprise}</div>
                <div>{commande?.ville}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs sm:h-8 sm:w-8 sm:text-sm font-bold transition-colors ${
                      i + 1 < step
                        ? "bg-google-green text-white"
                        : i + 1 === step
                          ? "gradient-cta text-white shadow-glow"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div
                      className={`hidden h-px w-16 flex-shrink-0 sm:block ${i + 1 < step ? "bg-google-green" : "bg-border"}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
              <ShieldIcon className="h-4 w-4 text-google-green" />
              <span>{t("onboarding.secure_note")}</span>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-google-blue/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-google-blue" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t("onboarding.s1_title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("onboarding.s1_subtitle")}</p>
                  </div>
                </div>

                {/* Section 1: Identité de l'entreprise */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-google-blue/10 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-google-blue" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t("onboarding.s1_section1_title")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("onboarding.s1_section1_subtitle")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label={t("onboarding.s1_nom_commercial")}
                      value={f.nom_commercial}
                      onChange={set("nom_commercial")}
                      onBlur={() => touch("nom_commercial")}
                      required
                      error={err("nom_commercial")}
                      placeholder={t("onboarding.s1_nom_commercial_ph")}
                      helper={t("onboarding.s1_nom_commercial_hint")}
                    />

                    <Input
                      label={t("onboarding.s1_nom_legal")}
                      value={f.nom_legal}
                      onChange={set("nom_legal")}
                      onBlur={() => touch("nom_legal")}
                      placeholder={t("onboarding.s1_nom_legal_ph")}
                      helper={t("onboarding.s1_nom_legal_hint")}
                    />

                    <Input
                      label={t("onboarding.s1_categorie_principale")}
                      value={f.categorie_principale}
                      onChange={set("categorie_principale")}
                      onBlur={() => touch("categorie_principale")}
                      required
                      error={err("categorie_principale")}
                      placeholder={t("onboarding.s1_categorie_principale_ph")}
                      helper={t("onboarding.s1_categorie_principale_hint")}
                    />

                    <div>
                      <label className="block text-sm font-semibold mb-1.5">
                        {t("onboarding.s1_categories_secondaires")}
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("onboarding.s1_categories_secondaires_hint")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {f.categories_secondaires.map((cat, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-3 py-1 text-sm"
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() =>
                                setF((prev) => ({
                                  ...prev,
                                  categories_secondaires: prev.categories_secondaires.filter(
                                    (_, j) => j !== i,
                                  ),
                                }))
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          placeholder={t("onboarding.s1_categories_secondaires_ph")}
                          className="flex-1 rounded-xl border border-input px-4 py-2.5"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val && f.categories_secondaires.length < 10) {
                                setF((prev) => ({
                                  ...prev,
                                  categories_secondaires: [...prev.categories_secondaires, val],
                                }));
                                e.currentTarget.value = "";
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector(
                              'input[placeholder="Ex : Pâtisserie, Salon de thé, Traiteur"]',
                            ) as HTMLInputElement;
                            if (input) {
                              const val = input.value.trim();
                              if (val && f.categories_secondaires.length < 10) {
                                setF((prev) => ({
                                  ...prev,
                                  categories_secondaires: [...prev.categories_secondaires, val],
                                }));
                                input.value = "";
                              }
                            }
                          }}
                          className="rounded-xl bg-google-blue text-white px-4 font-semibold"
                        >
                          {t("onboarding.s1_categories_secondaires_add")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Présentation de votre entreprise */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-google-green/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-google-green" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t("onboarding.s1_section2_title")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("onboarding.s1_section2_subtitle")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1.5">
                      {t("onboarding.s1_description")}
                    </label>
                    <textarea
                      value={f.description}
                      onChange={(e) => set("description")(e.target.value)}
                      onBlur={() => touch("description")}
                      rows={5}
                      maxLength={750}
                      className={`w-full rounded-xl border bg-background px-4 py-3 focus:outline-none focus:ring-2 ${err("description") ? "border-destructive ring-destructive/30 focus:ring-destructive/40" : "border-input focus:ring-google-blue"}`}
                      placeholder={t("onboarding.s1_description_ph")}
                    />
                    <div className="flex items-center justify-between mt-1">
                      {err("description") ? (
                        <p className="text-xs font-medium text-destructive">{err("description")}</p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {t("onboarding.s1_description_hint")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {f.description.length}/750
                          </p>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <span>{t("onboarding.s1_description_min")}</span>
                      <span>·</span>
                      <span>{t("onboarding.s1_description_max")}</span>
                    </p>
                  </div>
                </div>

                {/* Coordonnées & Contact */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-google-blue/10 flex items-center justify-center">
                      <Home className="h-4 w-4 text-google-blue" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Coordonnées & Contact</h3>
                      <p className="text-sm text-muted-foreground">
                        Informations pour localiser et contacter votre établissement.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label={t("onboarding.s1_address")}
                      value={f.adresse}
                      onChange={set("adresse")}
                      onBlur={() => touch("adresse")}
                      required
                      error={err("adresse")}
                      placeholder={t("onboarding.s1_address_ph")}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label={t("onboarding.s1_zip")}
                        value={f.code_postal}
                        onChange={set("code_postal")}
                        onBlur={() => touch("code_postal")}
                        required
                        error={err("code_postal")}
                        placeholder={t("onboarding.s1_zip_ph")}
                      />
                      <Input
                        label={t("onboarding.s1_city")}
                        value={f.ville}
                        onChange={set("ville")}
                        onBlur={() => touch("ville")}
                        required
                        error={err("ville")}
                        placeholder={t("onboarding.s1_city_ph")}
                      />
                    </div>

                    <Input
                      label={t("onboarding.s1_phone")}
                      value={f.telephone_affiche}
                      onChange={set("telephone_affiche")}
                      onBlur={() => touch("telephone_affiche")}
                      required
                      error={err("telephone_affiche")}
                      placeholder={t("onboarding.s1_phone_ph")}
                      type="tel"
                    />

                    <Input
                      label={t("onboarding.s1_website")}
                      value={f.site_web}
                      onChange={set("site_web")}
                      onBlur={() => touch("site_web")}
                      error={err("site_web")}
                      placeholder={t("onboarding.s1_website_ph")}
                      helper={t("onboarding.s1_website_hint")}
                    />

                    {/* Réseaux sociaux */}
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">
                        {t("onboarding.s1_social_networks")}
                      </label>
                      <p className="text-xs text-muted-foreground mb-3">
                        {t("onboarding.s1_social_networks_hint")}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <Input
                          label={t("onboarding.s1_facebook")}
                          value={f.facebook_url}
                          onChange={set("facebook_url")}
                          onBlur={() => touch("facebook_url")}
                          placeholder={t("onboarding.s1_facebook_ph")}
                          error={err("facebook_url")}
                        />
                        <Input
                          label={t("onboarding.s1_instagram")}
                          value={f.instagram_url}
                          onChange={set("instagram_url")}
                          onBlur={() => touch("instagram_url")}
                          placeholder={t("onboarding.s1_instagram_ph")}
                          error={err("instagram_url")}
                        />
                        <Input
                          label={t("onboarding.s1_youtube")}
                          value={f.youtube_url}
                          onChange={set("youtube_url")}
                          onBlur={() => touch("youtube_url")}
                          placeholder={t("onboarding.s1_youtube_ph")}
                          error={err("youtube_url")}
                        />
                        <Input
                          label={t("onboarding.s1_linkedin")}
                          value={f.linkedin_url}
                          onChange={set("linkedin_url")}
                          onBlur={() => touch("linkedin_url")}
                          placeholder={t("onboarding.s1_linkedin_ph")}
                          error={err("linkedin_url")}
                        />
                      </div>
                      <Input
                        label={t("onboarding.s1_tiktok")}
                        value={f.tiktok_url}
                        onChange={set("tiktok_url")}
                        onBlur={() => touch("tiktok_url")}
                        placeholder={t("onboarding.s1_tiktok_ph")}
                        error={err("tiktok_url")}
                      />

                      {/* Autre réseau */}
                      <div className="mt-4">
                        <label className="block text-sm font-semibold mb-1.5">
                          {t("onboarding.s1_social_other_label")}
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {f.reseaux_autres.map((r, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-3 py-1 text-sm"
                            >
                              {r.label} – {r.url}
                              <button
                                type="button"
                                onClick={() =>
                                  setF((prev) => ({
                                    ...prev,
                                    reseaux_autres: prev.reseaux_autres.filter((_, j) => j !== i),
                                  }))
                                }
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            placeholder={t("onboarding.s1_social_other_label_ph")}
                            className="flex-1 rounded-xl border border-input px-4 py-2.5"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const label = e.currentTarget.value.trim();
                                const urlInput = document.querySelector(
                                  'input[placeholder="URL du profil"]',
                                ) as HTMLInputElement;
                                if (urlInput) {
                                  const url = urlInput.value.trim();
                                  if (label && url && f.reseaux_autres.length < 10) {
                                    setF((prev) => ({
                                      ...prev,
                                      reseaux_autres: [...prev.reseaux_autres, { label, url }],
                                    }));
                                    e.currentTarget.value = "";
                                    urlInput.value = "";
                                  }
                                }
                              }
                            }}
                          />
                          <input
                            type="text"
                            placeholder={t("onboarding.s1_social_other_url_ph")}
                            className="flex-1 rounded-xl border border-input px-4 py-2.5"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const url = e.currentTarget.value.trim();
                                const labelInput = document.querySelector(
                                  'input[placeholder="Nom du réseau"]',
                                ) as HTMLInputElement;
                                if (labelInput) {
                                  const label = labelInput.value.trim();
                                  if (label && url && f.reseaux_autres.length < 10) {
                                    setF((prev) => ({
                                      ...prev,
                                      reseaux_autres: [...prev.reseaux_autres, { label, url }],
                                    }));
                                    labelInput.value = "";
                                    e.currentTarget.value = "";
                                  }
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const labelInput = document.querySelector(
                                'input[placeholder="Nom du réseau"]',
                              ) as HTMLInputElement;
                              const urlInput = document.querySelector(
                                'input[placeholder="URL du profil"]',
                              ) as HTMLInputElement;
                              if (labelInput && urlInput) {
                                const label = labelInput.value.trim();
                                const url = urlInput.value.trim();
                                if (label && url && f.reseaux_autres.length < 10) {
                                  setF((prev) => ({
                                    ...prev,
                                    reseaux_autres: [...prev.reseaux_autres, { label, url }],
                                  }));
                                  labelInput.value = "";
                                  urlInput.value = "";
                                }
                              }
                            }}
                            disabled={f.reseaux_autres.length >= 10}
                            className="rounded-xl bg-google-blue text-white px-4 font-semibold disabled:opacity-50 whitespace-nowrap"
                          >
                            {t("onboarding.s1_social_other_add")}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1.5">
                        {t("onboarding.s1_google_account")}
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {(["ai_compte", "pas_compte", "perdu_acces"] as GoogleAccountStatus[]).map(
                          (val) => (
                            <label
                              key={val}
                              className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition ${f.google_status === val ? "border-google-blue bg-google-blue/5" : "border-border hover:border-google-blue/50"}`}
                            >
                              <input
                                type="radio"
                                name="google_status"
                                value={val}
                                checked={f.google_status === val}
                                onChange={() => set("google_status")(val)}
                                className="text-google-blue"
                              />
                              <span className="text-sm">{t(`onboarding.s1_google_${val}`)}</span>
                            </label>
                          ),
                        )}
                      </div>
                    </div>

                    <Input
                      label={t("onboarding.s1_google_email")}
                      value={f.email_google}
                      onChange={set("email_google")}
                      onBlur={() => touch("email_google")}
                      error={err("email_google")}
                      placeholder={t("onboarding.s1_google_email_ph")}
                      description={t("onboarding.s1_google_email_hint_any_email")}
                      helper={
                        f.google_status === "ai_compte"
                          ? t("onboarding.s1_google_email_hint_required")
                          : f.google_status === "pas_compte" || f.google_status === "perdu_acces"
                            ? t("onboarding.s1_google_email_hint_any_email")
                            : t("onboarding.s1_google_email_hint_optional")
                      }
                    />
                    {(f.google_status === "pas_compte" || f.google_status === "perdu_acces") && (
                      <div className="mt-3 p-3 rounded-lg bg-google-blue/5 border border-google-blue/20">
                        <p className="text-sm text-google-blue/90">
                          {t("onboarding.s1_google_email_hint_gmail_required")}
                        </p>
                        <a
                          href="https://accounts.google.com/signup"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-google-blue hover:underline"
                        >
                          {t("onboarding.s1_google_create_gmail")}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-google-green/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-google-green" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t("onboarding.s2_title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("onboarding.s2_subtitle")}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-google-green/10 flex items-center justify-center">
                      <Navigation className="h-4 w-4 text-google-green" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t("onboarding.s2_presence")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("onboarding.s2_presence_hint")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(["boutique", "domicile_clients", "les_deux"] as const).map((val) => (
                      <label
                        key={val}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 cursor-pointer transition ${f.type_presence === val ? "border-google-blue bg-google-blue/5" : "border-border hover:border-google-blue/50"}`}
                      >
                        <input
                          type="radio"
                          name="type_presence"
                          value={val}
                          checked={f.type_presence === val}
                          onChange={() => set("type_presence")(val)}
                          className="text-google-blue sr-only"
                        />
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${f.type_presence === val ? "bg-google-blue text-white" : "bg-muted"}`}
                        >
                          {val === "boutique" && <Store className="h-5 w-5" />}
                          {val === "domicile_clients" && <MapPin className="h-5 w-5" />}
                          {val === "les_deux" && <Layers className="h-5 w-5" />}
                        </div>
                        <span className="text-sm font-medium text-center">
                          {t(`onboarding.s2_presence_${val}`)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {(f.type_presence === "domicile_clients" || f.type_presence === "les_deux") && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-google-yellow/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-google-yellow" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{t("onboarding.s2_zones_title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("onboarding.s2_zones_subtitle")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {f.zones_desservies.map((zone, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-3 py-1 text-sm"
                        >
                          {zone}
                          <button
                            type="button"
                            onClick={() =>
                              setF((prev) => ({
                                ...prev,
                                zones_desservies: prev.zones_desservies.filter((_, j) => j !== i),
                              }))
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={zoneInput}
                        onChange={(e) => setZoneInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = zoneInput.trim();
                            if (val && f.zones_desservies.length < 20) {
                              setF((prev) => ({
                                ...prev,
                                zones_desservies: [...prev.zones_desservies, val],
                              }));
                              setZoneInput("");
                            }
                          }
                        }}
                        placeholder={t("onboarding.s2_zones_placeholder")}
                        className="flex-1 rounded-xl border border-input px-4 py-2.5"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = zoneInput.trim();
                          if (val && f.zones_desservies.length < 20) {
                            setF((prev) => ({
                              ...prev,
                              zones_desservies: [...prev.zones_desservies, val],
                            }));
                            setZoneInput("");
                          }
                        }}
                        disabled={f.zones_desservies.length >= 20}
                        className="rounded-xl bg-google-blue text-white px-4 font-semibold disabled:opacity-50"
                      >
                        {t("onboarding.s2_zones_add")}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {f.zones_desservies.length}/20 {t("onboarding.s2_zones_count")} ·{" "}
                      {t("onboarding.s2_zones_limit")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-2">{t("onboarding.s3_title")}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {JOUR_KEYS.map((j, i) => (
                    <div key={j} className="rounded-xl border border-border p-3">
                      <div className="text-sm font-semibold capitalize mb-2">{days[i]}</div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={horaires[j].ferme}
                          onChange={(e) =>
                            setHoraires((p) => ({
                              ...p,
                              [j]: { ...p[j], ferme: e.target.checked },
                            }))
                          }
                          className="text-google-blue"
                        />
                        <span>Fermé</span>
                      </label>
                      {!horaires[j].ferme && (
                        <div className="grid grid-cols-1 gap-2 mt-2 sm:grid-cols-2">
                          <Input
                            label={t("onboarding.s3_open")}
                            value={horaires[j].ouverture || "09:00"}
                            onChange={(v) =>
                              setHoraires((p) => ({ ...p, [j]: { ...p[j], ouverture: v } }))
                            }
                            type="time"
                            required
                          />
                          <Input
                            label={t("onboarding.s3_close")}
                            value={horaires[j].fermeture || "18:00"}
                            onChange={(v) =>
                              setHoraires((p) => ({ ...p, [j]: { ...p[j], fermeture: v } }))
                            }
                            type="time"
                            required
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-2">{t("onboarding.s4_title")}</h2>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    {t("onboarding.s4_services")}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={serviceInput}
                      onChange={(e) => setServiceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (serviceInput.trim()) {
                            setServices([...services, serviceInput.trim()]);
                            setServiceInput("");
                          }
                        }
                      }}
                      placeholder={t("onboarding.s4_services_ph")}
                      className="flex-1 rounded-xl border border-input px-4 py-2.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (serviceInput.trim()) {
                          setServices([...services, serviceInput.trim()]);
                          setServiceInput("");
                        }
                      }}
                      className="rounded-xl bg-google-blue text-white px-4 font-semibold"
                    >
                      {t("onboarding.s4_add")}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {services.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-3 py-1 text-sm"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setServices(services.filter((_, j) => j !== i))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    {t("onboarding.s4_attributes")}
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {attrsList.map((a) => (
                      <label
                        key={a}
                        className="flex items-center gap-2 text-sm rounded-lg border border-border p-2 cursor-pointer hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={attributs.includes(a)}
                          onChange={(e) =>
                            setAttributs(
                              e.target.checked
                                ? [...attributs, a]
                                : attributs.filter((x) => x !== a),
                            )
                          }
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Attributs personnalisés */}
                <div className="rounded-2xl border border-border bg-card p-5 mt-4">
                  <h3 className="font-bold text-base">{t("onboarding.s4_custom_attrs_title")}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {t("onboarding.s4_custom_attrs_subtitle")}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {attributsPersonnalises.map((attr, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-3 py-1 text-sm"
                      >
                        {attr}
                        <button
                          type="button"
                          onClick={() =>
                            setAttributsPersonnalises(
                              attributsPersonnalises.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={customAttrInput}
                      onChange={(e) => setCustomAttrInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = customAttrInput.trim();
                          if (val && attributsPersonnalises.length < 20) {
                            setAttributsPersonnalises([...attributsPersonnalises, val]);
                            setCustomAttrInput("");
                          }
                        }
                      }}
                      placeholder={t("onboarding.s4_custom_attrs_placeholder")}
                      className="flex-1 rounded-xl border border-input px-4 py-2.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customAttrInput.trim();
                        if (val && attributsPersonnalises.length < 20) {
                          setAttributsPersonnalises([...attributsPersonnalises, val]);
                          setCustomAttrInput("");
                        }
                      }}
                      disabled={attributsPersonnalises.length >= 20}
                      className="rounded-xl bg-google-blue text-white px-4 font-semibold disabled:opacity-50 whitespace-nowrap"
                    >
                      {t("onboarding.s4_custom_attrs_add")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">{t("onboarding.s5_title")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("onboarding.s5_subtitle")}
                  </p>
                  <div className="rounded-2xl border border-border bg-card p-5 mt-4">
                    <h3 className="font-bold text-base mb-3">
                      {t("onboarding.s5_conseils_title")}
                    </h3>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <li key={n} className="flex items-start gap-2">
                          <span className="text-google-green mt-0.5">•</span>
                          <span>{t(`onboarding.s5_conseils_${n}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Logo */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-bold text-base">{t("onboarding.s5_logo")}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {t("onboarding.s5_logo_subtitle")}
                  </p>
                  {logoUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={logoUrl}
                        alt=""
                        className="h-32 w-32 object-cover rounded-xl border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 w-32 rounded-xl border-2 border-dashed border-border hover:border-google-blue cursor-pointer transition">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">
                            {t("onboarding.s5_choose")}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] && handleFile(e.target.files[0], setLogoUrl)
                        }
                      />
                    </label>
                  )}
                </div>

                {/* Photo de couverture */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-bold text-base">{t("onboarding.s5_cover")}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {t("onboarding.s5_cover_subtitle")}
                  </p>
                  {couvertureUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={couvertureUrl}
                        alt=""
                        className="h-32 w-32 object-cover rounded-xl border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setCouvertureUrl("")}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 w-32 rounded-xl border-2 border-dashed border-border hover:border-google-blue cursor-pointer transition">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">
                            {t("onboarding.s5_choose")}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] && handleFile(e.target.files[0], setCouvertureUrl)
                        }
                      />
                    </label>
                  )}
                </div>

                {/* Photos de l'extérieur */}
                <PhotoCategoryCard
                  title={t("onboarding.s5_exterieur")}
                  subtitle={t("onboarding.s5_exterieur_subtitle")}
                  examples={t("onboarding.s5_exterieur_examples")}
                  photos={photosExterieurs}
                  setPhotos={setPhotosExterieurs}
                  uploading={uploading}
                  handleFile={handleFile}
                  t={t}
                />

                {/* Photos de l'intérieur */}
                <PhotoCategoryCard
                  title={t("onboarding.s5_interieur")}
                  subtitle={t("onboarding.s5_interieur_subtitle")}
                  examples={t("onboarding.s5_interieur_examples")}
                  photos={photosInterieurs}
                  setPhotos={setPhotosInterieurs}
                  uploading={uploading}
                  handleFile={handleFile}
                  t={t}
                />

                {/* Photos de l'équipe */}
                <PhotoCategoryCard
                  title={t("onboarding.s5_equipe")}
                  subtitle={t("onboarding.s5_equipe_subtitle")}
                  examples={t("onboarding.s5_equipe_examples")}
                  photos={photosEquipe}
                  setPhotos={setPhotosEquipe}
                  uploading={uploading}
                  handleFile={handleFile}
                  t={t}
                />

                {/* Produits, services ou réalisations */}
                <PhotoCategoryCard
                  title={t("onboarding.s5_metier")}
                  subtitle={t("onboarding.s5_metier_subtitle")}
                  examples={t("onboarding.s5_metier_examples")}
                  photos={photosMetier}
                  setPhotos={setPhotosMetier}
                  uploading={uploading}
                  handleFile={handleFile}
                  t={t}
                />

                {/* Vidéos de votre entreprise */}
                <VideoCategoryCard
                  title={t("onboarding.s5_videos_title")}
                  subtitle={t("onboarding.s5_videos_subtitle")}
                  examples={t("onboarding.s5_videos_examples")}
                  videos={videosUrls}
                  setVideos={setVideosUrls}
                  uploading={uploadingVideo}
                  handleVideo={handleVideo}
                  t={t}
                />

                {/* Conseils pour vos vidéos */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-bold text-base mb-3">
                    {t("onboarding.s5_videos_conseils_title")}
                  </h3>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <li key={n} className="flex items-start gap-2">
                        <span className="text-google-green mt-0.5">•</span>
                        <span>{t(`onboarding.s5_videos_conseils_${n}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-google-yellow/10 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-google-yellow" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t("onboarding.s6_title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("onboarding.s6_subtitle")}</p>
                  </div>
                </div>

                {/* Question principale */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-bold text-lg">{t("onboarding.s6_question")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("onboarding.s6_question_hint")}
                  </p>

                  <div className="mt-4 space-y-2">
                    {(["creee", "en_cours", "non_creee"] as EntrepriseStatus[]).map((val) => (
                      <label
                        key={val}
                        className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition ${f.entreprise_statut_creation === val ? "border-google-blue bg-google-blue/5" : "border-border hover:border-google-blue/50"}`}
                      >
                        <input
                          type="radio"
                          name="entreprise_statut_creation"
                          value={val}
                          checked={f.entreprise_statut_creation === val}
                          onChange={() => set("entreprise_statut_creation")(val)}
                          className="text-google-blue"
                        />
                        <span className="text-sm font-medium">
                          {t(`onboarding.s6_choice_${val}`)}
                        </span>
                      </label>
                    ))}
                  </div>
                  {touched["entreprise_statut_creation"] && !f.entreprise_statut_creation && (
                    <p className="mt-2 text-xs font-medium text-destructive">
                      {t("onboarding.s6_required")}
                    </p>
                  )}
                </div>

                {/* Avertissement si en cours de création */}
                {f.entreprise_statut_creation === "en_cours" && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm leading-relaxed text-amber-900">
                    <b>{t("onboarding.s6_warning_en_cours_title")}</b>
                    <p className="mt-2 whitespace-pre-line">
                      {t("onboarding.s6_warning_en_cours_text")}
                    </p>
                  </div>
                )}

                {/* Avertissement si entreprise non créée */}
                {f.entreprise_statut_creation === "non_creee" && (
                  <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 text-sm leading-relaxed text-amber-900">
                    <b>{t("onboarding.s6_warning_non_creee_title")}</b>
                    <p className="mt-2 whitespace-pre-line">
                      {t("onboarding.s6_warning_non_creee_text")}
                    </p>
                  </div>
                )}

                {/* Encadré commun — À savoir Validation Google */}
                <div className="rounded-xl bg-google-blue/5 border border-google-blue/20 p-4 text-sm leading-relaxed text-foreground/80">
                  <b>{t("onboarding.s6_info_google_title")}</b>
                  <p className="mt-2 whitespace-pre-line">{t("onboarding.s6_info_google_text")}</p>
                </div>

                {/* Checkbox obligatoire */}
                <label className="flex items-start gap-2 bg-muted/30 rounded-xl border border-border p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.validation_google_comprise}
                    onChange={(e) => set("validation_google_comprise")(e.target.checked)}
                    className="mt-1 text-google-blue"
                  />
                  <span className="text-sm font-medium">
                    {t("onboarding.s6_confirmation_label")}
                  </span>
                </label>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-2">{t("onboarding.s7_title")}</h2>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    {t("onboarding.s7_comments")}
                  </label>
                  <textarea
                    value={f.commentaires}
                    onChange={(e) => set("commentaires")(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3"
                    placeholder={t("onboarding.s7_comments_ph")}
                  />
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm leading-relaxed text-amber-900">
                  <b>Délais de livraison :</b> sous 7 jours ouvrés. Attention : dans certains cas,
                  Google exige une vérification par courrier postal pour valider l'établissement, ce
                  qui peut rallonger le délai d'environ 14 jours.
                </div>
                <div className="rounded-xl border-2 border-google-green/30 bg-google-green/5 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-google-green">
                    {t("guarantee.tag")}
                  </div>
                  <div className="mt-1 font-bold">{t("guarantee.title")}</div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {t("guarantee.body")}
                  </p>
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.cgv_acceptees}
                    onChange={(e) => set("cgv_acceptees")(e.target.checked)}
                    className="mt-1"
                  />
                  <span>{t("onboarding.s7_terms")}</span>
                </label>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between mt-8 pt-6 border-t border-border">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((s) => s - 1)}
                className="w-full sm:w-auto rounded-full border border-border px-5 py-2.5 font-semibold disabled:opacity-40"
              >
                {t("onboarding.prev")}
              </button>
              {step < TOTAL ? (
                <button
                  type="button"
                  onClick={tryNext}
                  className="w-full sm:w-auto rounded-full bg-google-blue text-white px-6 py-2.5 font-semibold flex items-center justify-center gap-1"
                >
                  {t("onboarding.next")} <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || !f.cgv_acceptees}
                  className="w-full sm:w-auto rounded-full gradient-cta text-white px-6 py-2.5 font-bold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Valider et passer au paiement →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Transforme une erreur (souvent issue de Zod sérialisée) en message FR lisible
function friendlyError(e: unknown): string {
  const raw = (e as { message?: string })?.message || "";
  if (!raw) return "";
  // Si le message ressemble à du JSON (Zod), on tente d'extraire le 1er message
  const trimmed = String(raw).trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const first = arr[0];
      if (first?.message)
        return `Champ « ${(first.path || []).join(".") || "?"} » : ${first.message}`;
    } catch {
      /* ignore */
    }
    return "Certaines informations sont invalides. Vérifiez vos champs et réessayez.";
  }
  return raw;
}

function Input({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  required,
  placeholder,
  error,
  helper,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  helper?: string;
  description?: string;
}) {
  const hasError = !!error;
  return (
    <label className="block min-w-0">
      <span className="text-sm font-semibold">{label}</span>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        className={`mt-1 w-full rounded-xl border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 ${hasError ? "border-destructive ring-destructive/30 focus:ring-destructive/40" : "border-input focus:ring-google-blue"}`}
      />
      {hasError ? (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </label>
  );
}

function PhotoSlot({
  label,
  url,
  onFile,
  uploading,
  chooseLabel,
}: {
  label: string;
  url: string;
  onFile: (file: File) => void;
  uploading: boolean;
  chooseLabel: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">{label}</label>
      {url ? (
        <div className="relative inline-block">
          <img
            src={url}
            alt=""
            className="h-32 w-32 object-cover rounded-xl border border-border"
          />
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 w-32 rounded-xl border-2 border-dashed border-border hover:border-google-blue cursor-pointer transition">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">{chooseLabel}</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}

function DocSlot({
  title,
  desc,
  doc,
  onRemove,
  onFile,
  uploading,
  uploadLabel,
  uploadingLabel,
  removeLabel,
}: {
  title: string;
  desc: string;
  doc: { nom: string } | null;
  onRemove: () => void;
  onFile: (file: File) => void;
  uploading: boolean;
  uploadLabel: string;
  uploadingLabel: string;
  removeLabel: string;
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
                <button
                  type="button"
                  onClick={onRemove}
                  className="text-google-red text-sm font-semibold"
                >
                  {removeLabel}
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-full bg-google-blue text-white px-4 py-2 text-sm font-semibold hover:opacity-90">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? uploadingLabel : uploadLabel}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoCategoryCard({
  title,
  subtitle,
  examples,
  photos,
  setPhotos,
  uploading,
  handleFile,
  t,
}: {
  title: string;
  subtitle: string;
  examples: string;
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  uploading: boolean;
  handleFile: (file: File, setter: (url: string) => void) => Promise<void>;
  t: (key: string) => string;
}) {
  const MAX_PHOTOS = 10;
  const isAtLimit = photos.length >= MAX_PHOTOS;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-bold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      <p className="text-xs text-muted-foreground mt-1 italic">{examples}</p>
      <p className="text-xs text-google-blue font-medium mt-2">
        {t("onboarding.s5_recommande")} · {photos.length} {t("onboarding.s5_compteur")}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{t("onboarding.s5_non_obligatoire")}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {isAtLimit ? t("onboarding.s5_max_atteint") : t("onboarding.s5_max_photos")}
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
        {photos.map((u, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={u} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!isAtLimit && (
          <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-border hover:border-google-blue cursor-pointer transition">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1 text-center px-1">
                  {t("onboarding.s5_ajouter_photos")}
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={async (e) => {
                const allFiles = Array.from(e.target.files || []);
                const remaining = MAX_PHOTOS - photos.length;
                const files = allFiles.slice(0, remaining);
                const skipped = allFiles.length - files.length;
                for (const file of files)
                  await handleFile(file, (url) => setPhotos((p) => [...p, url]));
                if (skipped > 0) {
                  toast.warning(`${skipped} ${t("onboarding.s5_limite_depassee")}`);
                }
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function VideoCategoryCard({
  title,
  subtitle,
  examples,
  videos,
  setVideos,
  uploading,
  handleVideo,
  t,
}: {
  title: string;
  subtitle: string;
  examples: string;
  videos: string[];
  setVideos: React.Dispatch<React.SetStateAction<string[]>>;
  uploading: boolean;
  handleVideo: (file: File, setter: (url: string) => void) => Promise<void>;
  t: (key: string) => string;
}) {
  const MAX_VIDEOS = 10;
  const isAtLimit = videos.length >= MAX_VIDEOS;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-bold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      <p className="text-xs text-muted-foreground mt-1 italic">{examples}</p>
      <p className="text-xs text-google-blue font-medium mt-2">
        {t("onboarding.s5_videos_recommande")} · {videos.length}{" "}
        {t("onboarding.s5_videos_compteur")}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {t("onboarding.s5_videos_non_obligatoire")}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {isAtLimit ? t("onboarding.s5_videos_max_atteint") : t("onboarding.s5_videos_max")}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
        {videos.map((u, i) => (
          <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <video src={u} className="w-full h-full object-cover" muted playsInline />
            <button
              type="button"
              onClick={() => setVideos(videos.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!isAtLimit && (
          <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-border hover:border-google-blue cursor-pointer transition">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1 text-center px-1">
                  {t("onboarding.s5_videos_ajouter")}
                </span>
              </>
            )}
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/x-ms-wmv"
              multiple
              className="hidden"
              onChange={async (e) => {
                const allFiles = Array.from(e.target.files || []);
                const remaining = MAX_VIDEOS - videos.length;
                const files = allFiles.slice(0, remaining);
                const skipped = allFiles.length - files.length;
                for (const file of files)
                  await handleVideo(file, (url) => setVideos((p) => [...p, url]));
                if (skipped > 0) {
                  toast.warning(`${skipped} ${t("onboarding.s5_videos_limite_depassee")}`);
                }
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
