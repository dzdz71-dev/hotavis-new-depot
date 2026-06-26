import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, CheckCircle2, FileText, MessageSquarePlus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAgentTicketDetails, addInternalNote, markTicketCompleted } from "@/lib/agent.functions";

export const Route = createFileRoute("/agent/$id")({
  head: () => ({ meta: [{ title: "Dossier — Agent Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: AgentTicket,
});

function AgentTicket() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authReady, setAuthReady] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchDetails = useServerFn(getAgentTicketDetails);
  const saveNote = useServerFn(addInternalNote);
  const complete = useServerFn(markTicketCompleted);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/agent/login" });
      else setAuthReady(true);
    });
  }, [navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-ticket", id],
    queryFn: () => fetchDetails({ data: { id } }),
    enabled: authReady,
  });

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await saveNote({ data: { commande_id: id, contenu: note.trim() } });
      setNote("");
      toast.success("Note ajoutée");
      queryClient.invalidateQueries({ queryKey: ["agent-ticket", id] });
    } catch (e: any) { toast.error(e?.message || "Erreur"); }
    finally { setSavingNote(false); }
  }

  async function markDone() {
    if (!confirm("Confirmer que la fiche est en ligne et livrer ce dossier au client ?")) return;
    setCompleting(true);
    try {
      await complete({ data: { commande_id: id } });
      toast.success("Dossier livré ✓ Le client a été notifié.");
      navigate({ to: "/agent" });
    } catch (e: any) { toast.error(e?.message || "Erreur"); }
    finally { setCompleting(false); }
  }

  if (!authReady || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-4 text-center"><div><h1 className="text-xl font-bold text-google-red">Erreur</h1><p className="text-muted-foreground mt-2">{(error as Error).message}</p><Link to="/agent" className="text-google-blue font-semibold mt-4 inline-block">← Retour</Link></div></div>;

  const { commande, onboarding, notes, justificatifSignedUrl, factureSignedUrl } = data!;
  const c: any = commande;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/agent" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Mes dossiers
          </Link>
          {c.statut !== "livrée" && (
            <button disabled={completing} onClick={markDone} className="inline-flex items-center gap-2 rounded-full bg-google-green text-white font-bold px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50">
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Marquer comme terminé
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <h1 className="text-2xl font-extrabold">{c.entreprise}</h1>
          <p className="text-muted-foreground">{c.prenom} {c.nom} • {c.ville} • {c.activite}</p>
        </div>

        {onboarding ? (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <h2 className="font-bold text-lg">Briefing client</h2>
            <Grid>
              <Field label="Nom commercial" value={onboarding.nom_commercial} />
              <Field label="Catégorie" value={onboarding.categorie_principale} />
              <Field label="Adresse" value={`${onboarding.adresse}, ${onboarding.code_postal} ${onboarding.ville}`} />
              <Field label="Téléphone affiché" value={onboarding.telephone_affiche} />
              <Field label="Site web" value={onboarding.site_web || "—"} />
              <Field label="Email Google" value={onboarding.email_google || (onboarding.pas_compte_google ? "Pas de compte" : "—")} />
              <Field label="Type de présence" value={onboarding.type_presence} />
              <Field label="Rayon (km)" value={onboarding.rayon_intervention_km?.toString() || "—"} />
            </Grid>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Description</div>
              <p className="text-sm whitespace-pre-wrap">{onboarding.description}</p>
            </div>
            <Grid>
              <Field label="Services" value={(onboarding.services as string[])?.join(", ") || "—"} />
              <Field label="Attributs" value={(onboarding.attributs as string[])?.join(", ") || "—"} />
            </Grid>

            {onboarding.commentaires && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Commentaires & infos additionnelles</div>
                <pre className="text-sm whitespace-pre-wrap font-sans bg-muted/40 p-3 rounded-lg">{onboarding.commentaires}</pre>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              {justificatifSignedUrl && (
                <a href={justificatifSignedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
                  <FileText className="h-4 w-4" /> Kbis <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {factureSignedUrl && (
                <a href={factureSignedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
                  <FileText className="h-4 w-4" /> Facture <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {(onboarding.photos_urls as string[])?.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Photos ({(onboarding.photos_urls as string[]).length})</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(onboarding.photos_urls as string[]).map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={u} alt={`Photo ${i+1}`} className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground">Briefing client en attente.</div>
        )}

        {/* Notes internes */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MessageSquarePlus className="h-5 w-5" /> Notes internes (équipe)</h2>
          <div className="space-y-2 mb-4">
            {(notes || []).length === 0 && <p className="text-sm text-muted-foreground">Aucune note pour le moment.</p>}
            {(notes || []).map((n) => (
              <div key={n.id} className="text-sm bg-muted/40 rounded-lg p-3">
                <div className="whitespace-pre-wrap">{n.contenu}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("fr-FR")}</div>
              </div>
            ))}
          </div>
          <form onSubmit={submitNote} className="space-y-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="Ex: URL fiche Google créée : ... / en attente validation Google" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button disabled={savingNote || !note.trim()} className="rounded-full bg-google-blue text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Ajouter une note"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}
function Field({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div><div className="text-sm">{value}</div></div>;
}
