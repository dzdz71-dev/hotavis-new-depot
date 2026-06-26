import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCommandeAdmin, updateCommandeStatut } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/$id")({
  head: () => ({ meta: [{ title: "Commande — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminCommande,
});

const STATUTS = ["en_attente", "payé", "onboarding_complété", "en_cours", "livrée", "annulée"] as const;

function AdminCommande() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchCommande = useServerFn(getCommandeAdmin);
  const updateFn = useServerFn(updateCommandeStatut);
  const [authReady, setAuthReady] = useState(false);
  const [statut, setStatut] = useState<typeof STATUTS[number]>("payé");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin/login" });
      else setAuthReady(true);
    });
  }, [navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-commande", id],
    queryFn: () => fetchCommande({ data: { id } }),
    enabled: authReady,
  });

  useEffect(() => {
    if (data) {
      setStatut(data.commande.statut as any);
      setNotes(data.commande.notes_admin || "");
    }
  }, [data]);

  async function save(markDelivered = false) {
    setSaving(true);
    try {
      await updateFn({ data: { id, statut: markDelivered ? "livrée" : statut, notes_admin: notes } });
      toast.success(markDelivered ? "Commande marquée livrée et email envoyé !" : "Modifications enregistrées");
      qc.invalidateQueries({ queryKey: ["admin-commande", id] });
      qc.invalidateQueries({ queryKey: ["admin-commandes"] });
      if (markDelivered) setStatut("livrée");
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (!authReady || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-center px-4"><div><h1 className="text-xl font-bold text-google-red">Erreur</h1><p className="text-muted-foreground mt-2">{(error as Error).message}</p></div></div>;

  const { commande, onboarding, justificatifSignedUrl, factureSignedUrl } = data! as any;

  // Countdown 7 jours ouvrés à partir du paiement
  const deadlineInfo = (() => {
    if (commande.statut === "livrée" || commande.statut === "annulée") return null;
    const startStr = commande.paid_at || commande.created_at;
    const start = new Date(startStr);
    let remaining = 7;
    const cur = new Date(start);
    while (remaining > 0) {
      cur.setDate(cur.getDate() + 1);
      const d = cur.getDay();
      if (d !== 0 && d !== 6) remaining--;
    }
    const deadline = cur;
    const now = new Date();
    const msPerDay = 86400000;
    const joursRestants = Math.ceil((deadline.getTime() - now.getTime()) / msPerDay);
    return { deadline, joursRestants };
  })();

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Toutes les commandes
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{commande.entreprise}</h1>
            <p className="text-muted-foreground">{commande.prenom} {commande.nom} · {commande.email} · {commande.telephone}</p>
          </div>
          {deadlineInfo && (
            <div className={`rounded-2xl px-4 py-3 text-center font-bold border-2 ${
              deadlineInfo.joursRestants < 0 ? "bg-google-red/10 border-google-red text-google-red" :
              deadlineInfo.joursRestants <= 2 ? "bg-google-yellow/15 border-google-yellow text-amber-700" :
              "bg-google-green/10 border-google-green text-google-green"
            }`}>
              <div className="text-2xl leading-none">{deadlineInfo.joursRestants < 0 ? `+${Math.abs(deadlineInfo.joursRestants)}j` : `${deadlineInfo.joursRestants}j`}</div>
              <div className="text-[10px] uppercase tracking-wider mt-1">
                {deadlineInfo.joursRestants < 0 ? "Retard" : "restants / 7j"}
              </div>
            </div>
          )}
        </div>

        {/* Statut + notes */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <h2 className="font-bold text-lg mb-4">Gestion</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold">Statut</span>
              <select value={statut} onChange={(e) => setStatut(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5">
                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button onClick={() => save(false)} disabled={saving}
                className="flex-1 rounded-full bg-google-blue text-white py-2.5 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Save className="h-4 w-4" /> Enregistrer
              </button>
            </div>
          </div>
          <label className="block mt-4">
            <span className="text-sm font-semibold">Notes admin (privées)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5" />
          </label>
          {statut !== "livrée" && (
            <button onClick={() => save(true)} disabled={saving}
              className="mt-4 rounded-full gradient-cta text-white px-6 py-3 font-bold shadow-glow flex items-center gap-2 disabled:opacity-60">
              <Send className="h-4 w-4" /> Marquer livrée & envoyer email client
            </button>
          )}
        </div>

        {/* Commande */}
        <Card title="Commande">
          <Field k="ID" v={commande.id} />
          <Field k="Statut" v={commande.statut} />
          <Field k="Montant" v={`${(commande.montant_centimes / 100).toFixed(2)} €`} />
          <Field k="Créée le" v={new Date(commande.created_at).toLocaleString("fr-FR")} />
          {commande.paid_at && <Field k="Payée le" v={new Date(commande.paid_at).toLocaleString("fr-FR")} />}
          {commande.delivered_at && <Field k="Livrée le" v={new Date(commande.delivered_at).toLocaleString("fr-FR")} />}
          {commande.stripe_payment_id && <Field k="Stripe payment" v={commande.stripe_payment_id} />}
        </Card>

        {/* Onboarding */}
        {onboarding ? (
          <Card title="Briefing onboarding">
            <Field k="Nom commercial" v={onboarding.nom_commercial} />
            <Field k="Adresse" v={`${onboarding.adresse}, ${onboarding.code_postal} ${onboarding.ville}`} />
            <Field k="Téléphone affiché" v={onboarding.telephone_affiche} />
            {onboarding.site_web && <Field k="Site web" v={onboarding.site_web} />}
            <Field k="Email Google" v={onboarding.email_google || (onboarding.pas_compte_google ? "À créer" : "—")} />
            <Field k="Catégorie" v={onboarding.categorie_principale} />
            <Field k="Type" v={onboarding.type_presence + (onboarding.rayon_intervention_km ? ` (rayon ${onboarding.rayon_intervention_km}km)` : "")} />
            <div className="md:col-span-2"><Field k="Description" v={onboarding.description} /></div>
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Services déclarés</span>
              {Array.isArray(onboarding.services) && (onboarding.services as string[]).length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(onboarding.services as string[]).map((s, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-google-blue/10 text-google-blue px-2.5 py-1 text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              ) : <p className="mt-1 text-sm text-muted-foreground">Aucun service déclaré.</p>}
            </div>
            <div className="md:col-span-2"><Field k="Attributs" v={(onboarding.attributs as string[]).join(", ") || "—"} /></div>
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Horaires d'ouverture</span>
              <ul className="mt-1.5 text-sm space-y-0.5">
                {formatHoraires(onboarding.horaires).map((h) => (
                  <li key={h.label}>
                    <b className="inline-block w-24">{h.label}</b>
                    <span className={h.closed ? "text-muted-foreground italic" : ""}>{h.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            {onboarding.commentaires && (
              <div className="md:col-span-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Informations complémentaires</span>
                <div className="mt-1.5 text-sm rounded-lg bg-muted/40 border border-border p-3 whitespace-pre-line leading-relaxed">
                  {onboarding.commentaires}
                </div>
              </div>
            )}

            <div className="md:col-span-2 mt-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Photos pour la fiche</span>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {onboarding.logo_url && <a href={onboarding.logo_url} target="_blank" rel="noreferrer"><img src={onboarding.logo_url} alt="Logo" className="aspect-square object-cover rounded-lg border" /></a>}
                {onboarding.couverture_url && <a href={onboarding.couverture_url} target="_blank" rel="noreferrer"><img src={onboarding.couverture_url} alt="Couverture" className="aspect-square object-cover rounded-lg border" /></a>}
                {(onboarding.photos_urls as string[]).map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="aspect-square object-cover rounded-lg border" /></a>
                ))}
              </div>
            </div>

            {Array.isArray(onboarding.photos_etablissement) && (onboarding.photos_etablissement as string[]).length > 0 && (
              <div className="md:col-span-2 mt-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Photos de l'établissement (preuve d'existence)</span>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(onboarding.photos_etablissement as string[]).map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="aspect-square object-cover rounded-lg border" /></a>
                  ))}
                </div>
              </div>
            )}

            <div className="md:col-span-2 mt-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Documents officiels</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {onboarding.justificatif_url && justificatifSignedUrl ? (
                  <a href={justificatifSignedUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-google-blue text-white px-4 py-2 text-sm font-semibold">
                    📄 Kbis — {onboarding.justificatif_nom || "télécharger"}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">Kbis : non fourni</span>
                )}
                {onboarding.facture_url && factureSignedUrl ? (
                  <a href={factureSignedUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-google-blue text-white px-4 py-2 text-sm font-semibold">
                    🧾 Facture — {onboarding.facture_nom || "télécharger"}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">Facture : non fournie</span>
                )}
              </div>
              {onboarding.date_creation && (
                <p className="mt-2 text-sm"><b>Date de création :</b> {new Date(onboarding.date_creation).toLocaleDateString("fr-FR")}</p>
              )}
            </div>
          </Card>
        ) : (
          <Card title="Briefing onboarding">
            <p className="text-muted-foreground text-sm">Pas encore complété par le client.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <h2 className="font-bold text-lg mb-4">{title}</h2>
      <dl className="grid md:grid-cols-2 gap-4">{children}</dl>
    </div>
  );
}
function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 text-sm break-words">{v}</dd>
    </div>
  );
}

const DAY_LABELS: Record<string, string> = {
  mon: "Lundi", tue: "Mardi", wed: "Mercredi", thu: "Jeudi",
  fri: "Vendredi", sat: "Samedi", sun: "Dimanche",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function formatHoraires(raw: any): Array<{ label: string; value: string; closed: boolean }> {
  if (!raw || typeof raw !== "object") return [];
  return DAY_ORDER.filter((k) => raw[k]).map((k) => {
    const h = raw[k];
    if (h?.ferme) return { label: DAY_LABELS[k], value: "Fermé", closed: true };
    const o = h?.ouverture || "—";
    const c = h?.fermeture || "—";
    return { label: DAY_LABELS[k], value: `${o} – ${c}`, closed: false };
  });
}
