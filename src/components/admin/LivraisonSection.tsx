import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  PackageCheck,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createRapportCaptureUploadUrl,
  getLivraison,
  livrerCommande,
  renvoyerDocuments,
  saveLivraison,
} from "@/lib/livraison.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// =====================================================================
// SECTION "LIVRAISON DE LA COMMANDE" (admin, page detail commande)
// Tableau prestations/statuts/observations + captures facultatives,
// puis cloture complete : rapport PDF + facture PDF generes cote
// serveur, stockes, et envoyes au client dans UN seul email.
// =====================================================================

type LivraisonStatut = "effectue" | "partiel" | "non_effectue" | "en_attente";

const STATUT_OPTIONS: { value: LivraisonStatut; label: string }[] = [
  { value: "effectue", label: "\u2705 Effectué" },
  { value: "partiel", label: "\uD83D\uDFE0 Partiel" },
  { value: "non_effectue", label: "\u274C Non effectué" },
  { value: "en_attente", label: "\u23F3 En attente" },
];

const PRESTATIONS: { key: string; categorie: string; label: string; defaut?: LivraisonStatut }[] = [
  { key: "nom_entreprise", categorie: "Informations de l'entreprise", label: "Nom de l'entreprise" },
  { key: "nom_legal", categorie: "Informations de l'entreprise", label: "Nom légal" },
  { key: "adresse", categorie: "Informations de l'entreprise", label: "Adresse / localisation" },
  { key: "telephone", categorie: "Informations de l'entreprise", label: "Téléphone" },
  { key: "site_internet", categorie: "Informations de l'entreprise", label: "Site internet" },
  { key: "categorie_principale", categorie: "Catégories", label: "Catégorie principale" },
  { key: "categories_secondaires", categorie: "Catégories", label: "Catégories secondaires" },
  { key: "description_optimisee", categorie: "Présentation", label: "Description optimisée" },
  { key: "type_presence", categorie: "Activité et localisation", label: "Type de présence" },
  { key: "zone_intervention", categorie: "Activité et localisation", label: "Zone d'intervention" },
  { key: "zones_desservies", categorie: "Activité et localisation", label: "Zones desservies" },
  { key: "horaires", categorie: "Horaires", label: "Horaires d'ouverture" },
  { key: "services", categorie: "Services", label: "Services configurés" },
  { key: "descriptions_services", categorie: "Services", label: "Descriptions des services" },
  { key: "attributs_google", categorie: "Attributs", label: "Attributs Google" },
  { key: "attributs_personnalises", categorie: "Attributs", label: "Attributs personnalisés" },
  { key: "logo", categorie: "Photos", label: "Logo" },
  { key: "photo_couverture", categorie: "Photos", label: "Photo de couverture" },
  { key: "photos_activite", categorie: "Photos", label: "Photos d'activité" },
  { key: "photos_exterieures", categorie: "Photos", label: "Photos extérieures" },
  { key: "photos_interieures", categorie: "Photos", label: "Photos intérieures" },
  { key: "photos_equipe", categorie: "Photos", label: "Photos de l'équipe" },
  { key: "videos", categorie: "Vidéos", label: "Vidéos de l'entreprise" },
  { key: "facebook", categorie: "Réseaux sociaux", label: "Facebook" },
  { key: "instagram", categorie: "Réseaux sociaux", label: "Instagram" },
  { key: "youtube", categorie: "Réseaux sociaux", label: "YouTube" },
  { key: "linkedin", categorie: "Réseaux sociaux", label: "LinkedIn" },
  { key: "tiktok", categorie: "Réseaux sociaux", label: "TikTok" },
  { key: "pinterest_x", categorie: "Réseaux sociaux", label: "Pinterest / X (si concerné)" },
  { key: "compte_google", categorie: "Compte Google", label: "Compte Google associé" },
  { key: "creation_fiche", categorie: "Création et vérification", label: "Création de la fiche" },
  { key: "configuration_fiche", categorie: "Création et vérification", label: "Configuration de la fiche" },
  { key: "accompagnement_verification", categorie: "Création et vérification", label: "Accompagnement à la procédure de vérification Google" },
  { key: "etat_verification", categorie: "Création et vérification", label: "État de la vérification", defaut: "en_attente" },
];

type RowState = { statut: LivraisonStatut; observation: string };
type CaptureItem = { path: string; previewUrl: string | null };

function defaultRows(): Record<string, RowState> {
  const rows: Record<string, RowState> = {};
  for (const p of PRESTATIONS) {
    rows[p.key] = { statut: p.defaut ?? "effectue", observation: "" };
  }
  return rows;
}
export function LivraisonSection({ commandeId }: { commandeId: string }) {
  const qc = useQueryClient();
  const fetchLivraison = useServerFn(getLivraison);
  const saveFn = useServerFn(saveLivraison);
  const livrerFn = useServerFn(livrerCommande);
  const renvoyerFn = useServerFn(renvoyerDocuments);
  const captureUrlFn = useServerFn(createRapportCaptureUploadUrl);

  const [rows, setRows] = useState<Record<string, RowState>>(defaultRows);
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [resending, setResending] = useState<"all" | "rapport" | "facture" | null>(null);
  const [uploadingCapture, setUploadingCapture] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-livraison", commandeId],
    queryFn: () => fetchLivraison({ data: { commande_id: commandeId } }),
  });

  // Recharge le formulaire depuis les donnees enregistrees
  useEffect(() => {
    if (!data) return;
    const base = defaultRows();
    if (Array.isArray(data.livraison_details)) {
      for (const d of data.livraison_details as {
        key: string;
        statut: LivraisonStatut;
        observation?: string;
      }[]) {
        if (base[d.key]) {
          base[d.key] = { statut: d.statut, observation: d.observation || "" };
        }
      }
    }
    setRows(base);
    setCaptures(
      (data.captures || []).map((c) => ({ path: c.path, previewUrl: c.signedUrl })),
    );
  }, [data]);

  const livre = Boolean(data?.rapport_url);

  const categories = useMemo(() => {
    const cats: string[] = [];
    for (const p of PRESTATIONS) if (!cats.includes(p.categorie)) cats.push(p.categorie);
    return cats;
  }, []);

  function payload() {
    return PRESTATIONS.map((p) => ({
      key: p.key,
      label: p.label,
      categorie: p.categorie,
      statut: rows[p.key]?.statut ?? "effectue",
      observation: rows[p.key]?.observation ?? "",
    }));
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-livraison", commandeId] });
    qc.invalidateQueries({ queryKey: ["admin-commande", commandeId] });
    qc.invalidateQueries({ queryKey: ["admin-commandes"] });
  }

  async function onSaveDraft() {
    setSavingDraft(true);
    try {
      await saveFn({
        data: {
          commande_id: commandeId,
          details: payload(),
          captures: captures.map((c) => c.path),
        },
      });
      toast.success("Tableau de livraison enregistré");
      invalidate();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingDraft(false);
    }
  }

  async function onDeliverClick() {
    // Pré-vérification indicative : la source de vérité reste la base (relecture
    // côté serveur dans livrerCommande). Si le cache ne connaît pas l'email,
    // on re-synchronise plutôt que de bloquer.
    if (!data?.email || !data.email.trim()) {
      await qc.refetchQueries({ queryKey: ["admin-livraison", commandeId] });
      toast.info(
        "Email non trouvé localement — le serveur relira l'email enregistré sur la commande.",
      );
    }
    if (!(0 < (data?.montant_centimes ?? 0))) {
      toast.error("Montant de la commande invalide — facture impossible à générer.");
      return;
    }
    setConfirmOpen(true);
  }

  async function onConfirmDeliver() {
    setConfirmOpen(false);
    setDelivering(true);
    try {
      const res = await livrerFn({
        data: {
          commande_id: commandeId,
          details: payload(),
          captures: captures.map((c) => c.path),
        },
      });
      if (res.email_sent) {
        toast.success("Commande livrée — rapport et facture envoyés au client !");
      } else {
        toast.warning(
          `Rapport et facture générés, commande livrée, mais l'email n'a pas pu être envoyé : ${res.email_error}. Utilisez « Renvoyer rapport + facture ».`,
          { duration: 10000 },
        );
      }
      invalidate();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors de la livraison");
    } finally {
      setDelivering(false);
    }
  }

  async function onResend(only: "all" | "rapport" | "facture") {
    setResending(only);
    try {
      const res = await renvoyerFn({ data: { commande_id: commandeId, only } });
      const label =
        only === "facture"
          ? "Facture renvoyée au client !"
          : only === "rapport"
            ? "Rapport renvoyé au client !"
            : "Rapport et facture renvoyés au client !";
      if (res.email_sent) {
        toast.success(label);
      } else {
        toast.error(`L'email n'a pas pu être envoyé : ${res.email_error}`);
      }
      invalidate();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors du renvoi");
    } finally {
      setResending(null);
    }
  }

  async function onCaptureFile(file: File) {
    setUploadingCapture(true);
    try {
      const { signedUrl, path } = await captureUrlFn({
        data: {
          commande_id: commandeId,
          filename: file.name,
          content_type: file.type,
          size: file.size,
        },
      });
      const res = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Échec de l'upload de la capture");
      setCaptures((prev) => [...prev, { path, previewUrl: URL.createObjectURL(file) }]);
      toast.success("Capture ajoutée — pensez à enregistrer ou livrer.");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors de l'upload");
    } finally {
      setUploadingCapture(false);
    }
  }
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la livraison…
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <PackageCheck className="h-5 w-5 text-google-blue" />
        <h2 className="font-bold text-lg">Livraison de la commande</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Renseignez l'état réel de chaque prestation, puis livrez : le rapport PDF et la facture
        sont générés, associés à la commande et envoyés au client dans un seul email.
      </p>

      {livre && (
        <div className="rounded-xl border-2 border-google-green/30 bg-google-green/5 p-4 mb-5">
          <div className="flex items-center gap-2 font-bold text-google-green">
            <CheckCircle2 className="h-5 w-5" /> {"\u2705"} Commande livrée
          </div>
          <div className="mt-2 text-sm space-y-1">
            {data?.delivered_at && (
              <p>
                <span className="font-semibold">Date de livraison :</span>{" "}
                {new Date(data.delivered_at).toLocaleString("fr-FR")}
              </p>
            )}
            {data?.rapport_sent_at ? (
              <p>
                <span className="font-semibold">Rapport envoyé le :</span>{" "}
                {new Date(data.rapport_sent_at).toLocaleString("fr-FR")}
              </p>
            ) : (
              <p className="text-amber-700 font-medium">
                Rapport généré mais email non envoyé — utilisez « Renvoyer rapport + facture ».
              </p>
            )}
            {data?.facture_emise_at && (
              <p>
                <span className="font-semibold">Facture émise le :</span>{" "}
                {new Date(data.facture_emise_at).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {data?.rapportViewUrl && (
              <a
                href={data.rapportViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                <Eye className="h-4 w-4" /> Voir le rapport
              </a>
            )}
            {data?.rapportDownloadUrl && (
              <a
                href={data.rapportDownloadUrl}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Télécharger le rapport
              </a>
            )}
            <button
              type="button"
              onClick={() => onResend("rapport")}
              disabled={resending !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-google-blue text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {resending === "rapport" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Renvoyer le rapport
            </button>
            {data?.factureViewUrl && (
              <a
                href={data.factureViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                <Eye className="h-4 w-4" /> Voir la facture
              </a>
            )}
            {data?.factureDownloadUrl && (
              <a
                href={data.factureDownloadUrl}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Télécharger la facture
              </a>
            )}
            {data?.facture_url && (
              <button
                type="button"
                onClick={() => onResend("facture")}
                disabled={resending !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-google-blue text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {resending === "facture" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Renvoyer la facture
              </button>
            )}
            <button
              type="button"
              onClick={() => onResend("all")}
              disabled={resending !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-full gradient-cta text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {resending === "all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Renvoyer rapport + facture
            </button>
          </div>
        </div>
      )}

      {/* Tableau de livraison */}
      <div className="rounded-xl border border-border overflow-hidden">
        {categories.map((cat) => (
          <div key={cat}>
            <div className="bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {cat}
            </div>
            {PRESTATIONS.filter((p) => p.categorie === cat).map((p) => (
              <div
                key={p.key}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 px-4 py-2.5 border-t border-border"
              >
                <div className="sm:flex-1 text-sm font-medium min-w-0">{p.label}</div>
                <select
                  value={rows[p.key]?.statut ?? "effectue"}
                  onChange={(e) =>
                    setRows((prev) => ({
                      ...prev,
                      [p.key]: {
                        statut: e.target.value as LivraisonStatut,
                        observation: prev[p.key]?.observation ?? "",
                      },
                    }))
                  }
                  disabled={livre}
                  className="sm:w-44 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm disabled:opacity-60"
                >
                  {STATUT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={rows[p.key]?.observation ?? ""}
                  onChange={(e) =>
                    setRows((prev) => ({
                      ...prev,
                      [p.key]: {
                        statut: prev[p.key]?.statut ?? "effectue",
                        observation: e.target.value,
                      },
                    }))
                  }
                  placeholder="Observation (facultatif)"
                  maxLength={500}
                  disabled={livre}
                  className="sm:w-64 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm disabled:opacity-60"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Captures facultatives */}
      <div className="mt-5">
        <span className="text-sm font-semibold">
          Captures d'écran de la fiche Google (facultatif, 5 max)
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">
          Si ajoutées, elles sont intégrées au rapport PDF du client.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {captures.map((c) => (
            <div
              key={c.path}
              className="relative h-20 w-20 rounded-lg overflow-hidden border border-border bg-muted"
            >
              {c.previewUrl && (
                <img src={c.previewUrl} alt="" className="h-full w-full object-cover" />
              )}
              {!livre && (
                <button
                  type="button"
                  onClick={() => setCaptures((prev) => prev.filter((x) => x.path !== c.path))}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {!livre && captures.length < 5 && (
            <label className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-google-blue cursor-pointer transition">
              {uploadingCapture ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onCaptureFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      {!livre && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={savingDraft || delivering}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-5 py-2.5 font-semibold disabled:opacity-60"
          >
            {savingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </button>
          <button
            type="button"
            onClick={onDeliverClick}
            disabled={delivering || savingDraft}
            className="inline-flex items-center justify-center gap-2 rounded-full gradient-cta text-white px-6 py-2.5 font-bold shadow-glow disabled:opacity-60"
          >
            {delivering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Livrer et envoyer le rapport
          </button>
        </div>
      )}

      {/* Confirmation de cloture complete */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Livrer cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action va :</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>générer le rapport de livraison ;</li>
            <li>générer la facture PDF si nécessaire ;</li>
            <li>
              envoyer le rapport et la facture à <strong className="text-foreground">{data?.email || "—"}</strong> par email ;
            </li>
            <li>passer la facture au statut « Émise » ;</li>
            <li>passer la commande au statut « Livrée ».</li>
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDeliver}>Confirmer la livraison</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}