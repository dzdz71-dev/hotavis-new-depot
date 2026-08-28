import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  FileText,
  MessageSquare,
  Send,
  ExternalLink,
  AlertTriangle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AgentLayout } from "@/components/agent/AgentLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getAgentTicketDetails,
  addInternalNote,
  markTicketCompleted,
  getFreshSignedUrl,
  reportTicketIssue,
  unclaimTicket,
} from "@/lib/agent.functions";

export const Route = createFileRoute("/agent/$id")({
  head: () => ({
    meta: [{ title: "Dossier — Agent Hotavis" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentTicket,
});

function AgentTicket() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);

  const fetchDetails = useServerFn(getAgentTicketDetails);
  const saveNote = useServerFn(addInternalNote);
  const complete = useServerFn(markTicketCompleted);
  const fetchUrl = useServerFn(getFreshSignedUrl);
  const reportIssue = useServerFn(reportTicketIssue);
  const unclaim = useServerFn(unclaimTicket);

  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-ticket", id],
    queryFn: () => fetchDetails({ data: { id } }),
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.notes]);

  async function openDocument(path: string | null, label: string) {
    if (!path) return;
    setDocLoading(label);
    try {
      const { url } = await fetchUrl({ data: { path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Impossible d'ouvrir le document");
    } finally {
      setDocLoading(null);
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await saveNote({ data: { commande_id: id, contenu: note.trim() } });
      setNote("");
      toast.success("Message envoyé");
      queryClient.invalidateQueries({ queryKey: ["agent-ticket", id] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setSavingNote(false);
    }
  }

  async function markDone() {
    if (!confirm("Confirmer que la fiche est en ligne et livrer ce dossier au client ?")) return;
    setCompleting(true);
    try {
      await complete({ data: { commande_id: id } });
      toast.success("Dossier livré ✓ Le client a été notifié.");
      navigate({ to: "/agent/cases" });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setCompleting(false);
    }
  }

  async function abandonTicket() {
    if (
      !confirm(
        "Abandonner cette mission ? Le dossier retournera dans le pool des missions disponibles.",
      )
    )
      return;
    setUnclaiming(true);
    try {
      const res = await unclaim({ data: { commande_id: id } });
      if (!res.ok) {
        if (res.reason === "already_delivered")
          toast.error("Impossible d'abandonner un dossier déjà livré.");
        else toast.error("Impossible d'abandonner ce dossier.");
        return;
      }
      toast.success("Mission abandonnée. Le dossier est de nouveau disponible dans le pool.");
      queryClient.invalidateQueries({ queryKey: ["agent-mine"] });
      queryClient.invalidateQueries({ queryKey: ["agent-pool"] });
      navigate({ to: "/agent/cases" });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setUnclaiming(false);
    }
  }

  async function submitBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockReason.trim()) return;
    setReporting(true);
    try {
      await reportIssue({ data: { commande_id: id, reason: blockReason.trim() } });
      toast.success("Blocage signalé. L'administration a été notifiée.");
      setBlockDialogOpen(false);
      setBlockReason("");
      queryClient.invalidateQueries({ queryKey: ["agent-ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["agent-mine"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setReporting(false);
    }
  }

  if (isLoading) {
    return (
      <AgentLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
        </div>
      </AgentLayout>
    );
  }

  if (error) {
    return (
      <AgentLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-4 text-center">
          <div>
            <h1 className="text-xl font-bold text-google-red">Erreur</h1>
            <p className="text-muted-foreground mt-2">{(error as Error).message}</p>
            <Link to="/agent/cases" className="text-google-blue font-semibold mt-4 inline-block">
              ← Retour
            </Link>
          </div>
        </div>
      </AgentLayout>
    );
  }

  const { commande, onboarding, notes, justificatifPath, facturePath } = data!;
  const c = commande as typeof commande & { statut: string };

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/agent/cases"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Mes dossiers
          </Link>
          <div className="flex items-center gap-2">
            {c.statut === "bloque" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-google-red/15 text-google-red font-bold px-3 py-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" /> Bloqué
              </span>
            )}
            {c.statut !== "livrée" && c.statut !== "bloque" && (
              <button
                onClick={() => setBlockDialogOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-google-red/30 text-google-red font-semibold px-4 py-2 text-sm hover:bg-google-red/10 transition"
              >
                <AlertTriangle className="h-4 w-4" />
                Signaler un blocage
              </button>
            )}
            {c.statut !== "livrée" && c.statut !== "bloque" && (
              <button
                onClick={abandonTicket}
                disabled={unclaiming}
                className="inline-flex items-center gap-2 rounded-full border border-border text-muted-foreground font-semibold px-4 py-2 text-sm hover:bg-accent transition disabled:opacity-50"
              >
                {unclaiming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowLeft className="h-4 w-4" />
                )}
                Abandonner
              </button>
            )}
            {c.statut !== "livrée" && (
              <button
                disabled={completing}
                onClick={markDone}
                className="inline-flex items-center gap-2 rounded-full bg-google-green text-white font-bold px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Marquer comme terminé
              </button>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <h1 className="text-2xl font-extrabold">{c.entreprise}</h1>
          <p className="text-muted-foreground">
            {c.prenom} {c.nom} • {c.ville} • {c.activite}
          </p>
          {c.statut === "bloque" && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-google-red/10 border border-google-red/20 px-3 py-2 text-sm text-google-red font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Ce dossier est actuellement bloqué. L'administration a été notifiée.
            </div>
          )}
        </div>

        {onboarding ? (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <h2 className="font-bold text-lg">Briefing client</h2>
            <Grid>
              <Field label="Nom commercial" value={onboarding.nom_commercial} />
              {onboarding.nom_legal && <Field label="Nom légal" value={onboarding.nom_legal} />}
              <Field label="Catégorie" value={onboarding.categorie_principale} />
              {Array.isArray(onboarding.categories_secondaires) &&
                onboarding.categories_secondaires.length > 0 && (
                  <Field
                    label="Catégories secondaires"
                    value={onboarding.categories_secondaires.join(", ")}
                  />
                )}
              <div className="col-span-2 rounded-lg bg-muted/30 border border-border p-3 space-y-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Localisation
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field
                    label="Adresse postale de l'entreprise"
                    value={`${(onboarding.adresse || "").replace(/\s*\([^)]*\)\s*$/, "")}, ${onboarding.code_postal} ${onboarding.ville}`}
                  />
                  {(onboarding.adresse || "").match(/\(([^)]+)\)$/) && (
                    <Field
                      label="Point de repère (Google Maps)"
                      value={(onboarding.adresse || "").match(/\(([^)]+)\)$/)?.[1] || "—"}
                    />
                  )}
                </div>
              </div>
              <Field label="Téléphone affiché" value={onboarding.telephone_affiche} />
              <Field label="Site web" value={onboarding.site_web || "—"} />
              <div className="col-span-2 rounded-lg bg-google-blue/5 border border-google-blue/20 p-3 space-y-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Possède un compte Google
                  </div>
                  <div className="text-sm">{onboarding.pas_compte_google ? "Non" : "Oui"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Email Google
                  </div>
                  <div className="text-sm break-words">
                    {onboarding.email_google || (onboarding.pas_compte_google ? "À créer" : "—")}
                  </div>
                </div>
              </div>
              <Field
                label="Type de présence"
                value={formatTypePresence(
                  onboarding.type_presence,
                  onboarding.rayon_intervention_km,
                )}
              />
              {Array.isArray(onboarding.zones_desservies) &&
                onboarding.zones_desservies.length > 0 && (
                  <Field label="Zones desservies" value={onboarding.zones_desservies.join(", ")} />
                )}
            </Grid>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Description
              </div>
              <p className="text-sm whitespace-pre-wrap">{onboarding.description}</p>
            </div>
            <Grid>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Services
                </div>
                {Array.isArray(onboarding.services) &&
                (onboarding.services as string[]).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(onboarding.services as string[]).map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-google-blue/10 text-google-blue px-2.5 py-1 text-xs font-semibold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Attributs sélectionnés
                </div>
                {Array.isArray(onboarding.attributs) &&
                (onboarding.attributs as string[]).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(onboarding.attributs as string[]).map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-google-green/10 text-google-green px-2.5 py-1 text-xs font-semibold"
                      >
                        <Check className="h-3 w-3" /> {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </Grid>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Attributs personnalisés (ajoutés par le client)
              </div>
              {(() => {
                const customAttrs = (onboarding as { attributs_personnalises?: string[] })
                  .attributs_personnalises;
                if (!Array.isArray(customAttrs) || customAttrs.length === 0) {
                  return <p className="text-sm text-muted-foreground">—</p>;
                }
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {customAttrs.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-google-yellow/15 text-amber-700 px-2.5 py-1 text-xs font-semibold"
                      >
                        ✦ {a}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Réseaux sociaux
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {onboarding.facebook_url && (
                  <SocialLinkBox
                    label="Facebook"
                    url={onboarding.facebook_url}
                    color="bg-blue-50 text-blue-700 border-blue-200"
                  />
                )}
                {onboarding.instagram_url && (
                  <SocialLinkBox
                    label="Instagram"
                    url={onboarding.instagram_url}
                    color="bg-pink-50 text-pink-700 border-pink-200"
                  />
                )}
                {onboarding.youtube_url && (
                  <SocialLinkBox
                    label="YouTube"
                    url={onboarding.youtube_url}
                    color="bg-red-50 text-red-700 border-red-200"
                  />
                )}
                {onboarding.linkedin_url && (
                  <SocialLinkBox
                    label="LinkedIn"
                    url={onboarding.linkedin_url}
                    color="bg-sky-50 text-sky-700 border-sky-200"
                  />
                )}
                {onboarding.tiktok_url && (
                  <SocialLinkBox
                    label="TikTok"
                    url={onboarding.tiktok_url}
                    color="bg-gray-50 text-gray-700 border-gray-200"
                  />
                )}
                {Array.isArray(onboarding.reseaux_autres) &&
                  (onboarding.reseaux_autres as { label: string; url: string }[]).map((r, i) => (
                    <SocialLinkBox
                      key={i}
                      label={r.label}
                      url={r.url}
                      color="bg-amber-50 text-amber-700 border-amber-200"
                    />
                  ))}
                {!onboarding.facebook_url &&
                  !onboarding.instagram_url &&
                  !onboarding.youtube_url &&
                  !onboarding.linkedin_url &&
                  !onboarding.tiktok_url &&
                  (!Array.isArray(onboarding.reseaux_autres) ||
                    (onboarding.reseaux_autres as string[]).length === 0) && (
                    <p className="text-sm text-muted-foreground">Aucun réseau social renseigné.</p>
                  )}
              </div>
            </div>

            {onboarding.commentaires && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Informations complémentaires
                </div>
                <div className="mt-1.5 text-sm rounded-lg bg-muted/40 border border-border p-3 whitespace-pre-line leading-relaxed">
                  {onboarding.commentaires}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Horaires d'ouverture
              </div>
              <ul className="mt-1.5 text-sm space-y-0.5">
                {formatHoraires(onboarding.horaires).map((h) => (
                  <li key={h.label}>
                    <b className="inline-block w-24">{h.label}</b>
                    <span className={h.closed ? "text-muted-foreground italic" : ""}>
                      {h.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Situation de l'entreprise (étape 6) */}
            <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Situation de l'entreprise
                </div>
                <div className="mt-0.5 text-sm">
                  {formatEntrepriseStatut(onboarding.entreprise_statut_creation)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Validation Google comprise
                </div>
                <div className="mt-0.5 text-sm">
                  {onboarding.validation_google_comprise ? "Oui" : "Non"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              {justificatifPath && (
                <button
                  onClick={() => openDocument(justificatifPath, "kbis")}
                  disabled={docLoading !== null}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  {docLoading === "kbis" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Voir le KBIS <ExternalLink className="h-3 w-3" />
                </button>
              )}
              {facturePath && (
                <button
                  onClick={() => openDocument(facturePath, "facture")}
                  disabled={docLoading !== null}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  {docLoading === "facture" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Voir la Facture <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>

            {onboarding.logo_url && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Logo de l'entreprise
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <a
                    href={onboarding.logo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-border"
                  >
                    <img
                      src={onboarding.logo_url}
                      alt="Logo"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </a>
                </div>
              </div>
            )}

            {onboarding.couverture_url && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Photo de couverture
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <a
                    href={onboarding.couverture_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-border"
                  >
                    <img
                      src={onboarding.couverture_url}
                      alt="Couverture"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </a>
                </div>
              </div>
            )}

            {Array.isArray(onboarding.photos_metier) &&
              (onboarding.photos_metier as string[]).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Photos de l'activité (menus, réalisations, etc.)
                  </div>
                  {onboarding.photos_metier_description && (
                    <p className="text-sm text-muted-foreground italic mb-2">
                      {onboarding.photos_metier_description}
                    </p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(onboarding.photos_metier as string[]).map((u, i) => (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden border border-border"
                      >
                        <img
                          src={u}
                          alt={`Photo activité ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.photos_exterieures) &&
              (onboarding.photos_exterieures as string[]).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Photos de l'extérieur
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(onboarding.photos_exterieures as string[]).map((u, i) => (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden border border-border"
                      >
                        <img
                          src={u}
                          alt={`Photo extérieur ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.photos_interieures) &&
              (onboarding.photos_interieures as string[]).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Photos de l'intérieur
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(onboarding.photos_interieures as string[]).map((u, i) => (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden border border-border"
                      >
                        <img
                          src={u}
                          alt={`Photo intérieur ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.photos_equipe) &&
              (onboarding.photos_equipe as string[]).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Photos de l'équipe
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(onboarding.photos_equipe as string[]).map((u, i) => (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden border border-border"
                      >
                        <img
                          src={u}
                          alt={`Photo équipe ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.videos_urls) &&
              (onboarding.videos_urls as string[]).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Vidéos de l'entreprise
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(onboarding.videos_urls as string[]).map((u, i) => (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-video rounded-lg overflow-hidden border border-border"
                      >
                        <video src={u} className="w-full h-full object-cover" controls muted />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.photos_etablissement) &&
              (onboarding.photos_etablissement as string[]).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Photos de l'établissement (preuve d'existence)
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(onboarding.photos_etablissement as string[]).map((u, i) => (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden border border-border"
                      >
                        <img
                          src={u}
                          alt={`Photo établissement ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {onboarding.date_creation && (
              <div>
                <p className="text-sm">
                  <b>Date de création de l'entreprise :</b>{" "}
                  {new Date(onboarding.date_creation).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground">
            Briefing client en attente.
          </div>
        )}

        {/* Chat / Messagerie */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Messagerie
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Discussion avec l'administration Hotavis
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[28rem] bg-surface-alt">
            {(notes || []).length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Aucun message pour le moment. Démarrez la conversation 👇
              </div>
            )}
            {(notes || []).map((n) => (
              <div key={n.id} className={`flex ${n.is_mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    n.is_mine
                      ? "bg-google-blue text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{n.contenu}</div>
                  <div
                    className={`text-[10px] mt-1 ${
                      n.is_mine ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {formatChatDate(n.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={submitNote}
            className="border-t border-border p-3 flex items-end gap-2 bg-card"
          >
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={1}
              maxLength={2000}
              placeholder="Écrivez un message…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitNote(e);
                }
              }}
              className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm max-h-32"
            />
            <button
              type="submit"
              disabled={savingNote || !note.trim()}
              className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-google-blue text-white disabled:opacity-50 hover:opacity-90"
              aria-label="Envoyer"
            >
              {savingNote ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>

        {/* Dialog : Signaler un blocage */}
        <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Signaler un blocage</DialogTitle>
              <DialogDescription>
                Expliquez le problème rencontré. Le dossier sera marqué comme bloqué et
                l'administration en sera notifiée.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitBlock} className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Motif du blocage</label>
                <textarea
                  required
                  minLength={3}
                  maxLength={2000}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Ex : Le client ne répond pas, documents manquants..."
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBlockDialogOpen(false)}
                  disabled={reporting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={reporting || !blockReason.trim()}
                >
                  {reporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  Confirmer le blocage
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AgentLayout>
  );
}

function formatChatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Aujourd'hui à ${time}`;
  if (isYesterday) return `Hier à ${time}`;
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })} à ${time}`;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

const DAY_LABELS: Record<string, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function formatHoraires(horaires: unknown) {
  if (!horaires || typeof horaires !== "object") return [];
  const h = horaires as Record<string, { ferme: boolean; ouverture: string; fermeture: string }>;
  return DAY_ORDER.map((key) => {
    const day = h[key];
    if (!day) return { label: DAY_LABELS[key], value: "—", closed: false };
    if (day.ferme) return { label: DAY_LABELS[key], value: "Fermé", closed: true };
    return { label: DAY_LABELS[key], value: `${day.ouverture} – ${day.fermeture}`, closed: false };
  });
}

function formatEntrepriseStatut(v: string | null): string {
  switch (v) {
    case "creee":
      return "Entreprise officiellement créée";
    case "en_cours":
      return "Entreprise en cours de création";
    case "non_creee":
      return "Entreprise non créée";
    default:
      return "—";
  }
}

function formatTypePresence(type: string, rayon: number | null | undefined): string {
  const rayonStr = rayon ? ` (Rayon : ${rayon} km)` : "";
  if (type === "boutique") return "En boutique";
  if (type === "domicile_clients") return `En déplacement chez le client${rayonStr}`;
  if (type === "les_deux") return `En boutique et en déplacement chez le client${rayonStr}`;
  return type + rayonStr;
}

function SocialLinkBox({ label, url, color }: { label: string; url: string; color: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:opacity-80 ${color}`}
    >
      <span className="font-bold">{label}</span>
      <span className="truncate text-xs opacity-80">{url}</span>
    </a>
  );
}
