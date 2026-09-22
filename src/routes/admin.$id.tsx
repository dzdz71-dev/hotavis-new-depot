import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Save,
  Send,
  Unlock,
  FileText,
  Download,
  Check,
  Copy,
} from "lucide-react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  addAdminNote,
  getCommandeAdmin,
  getCommandeNotes,
  updateClientEmail,
  updateCommandeStatut,
  updateFactureStatus,
} from "@/lib/admin.functions";
import { unblockCommande } from "@/lib/admin-agency.functions";
import { generateFacturePDF } from "@/lib/facture-pdf";
import { renvoyerDocuments } from "@/lib/livraison.functions";
import { LivraisonSection } from "@/components/admin/LivraisonSection";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/$id")({
  head: () => ({ meta: [{ title: "Commande — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminCommande,
});

const STATUTS = [
  "en_attente",
  "payé",
  "onboarding_complété",
  "en_cours",
  "livrée",
  "annulée",
] as const;

type ChatNote = {
  id: string;
  agent_id: string;
  contenu: string;
  created_at: string;
  is_admin: boolean;
  is_mine: boolean;
};

function AdminCommande() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const guard = useAdminGuard();
  const fetchCommande = useServerFn(getCommandeAdmin);
  const fetchNotes = useServerFn(getCommandeNotes);
  const sendNote = useServerFn(addAdminNote);
  const updateFn = useServerFn(updateCommandeStatut);
  const updateFactureFn = useServerFn(updateFactureStatus);
  const unblock = useServerFn(unblockCommande);
  const renvoyerDocsFn = useServerFn(renvoyerDocuments);
  const updateEmailFn = useServerFn(updateClientEmail);
  const [statut, setStatut] = useState<(typeof STATUTS)[number]>("payé");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [factureStatus, setFactureStatus] = useState<string>("non_emise");
  const [savingFacture, setSavingFacture] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [resendingFacture, setResendingFacture] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-commande", id],
    queryFn: () => fetchCommande({ data: { id } }),
    enabled: guard === "authorized",
  });

  const { data: notesData } = useQuery({
    queryKey: ["admin-commande-notes", id],
    queryFn: () => fetchNotes({ data: { commande_id: id } }),
    enabled: guard === "authorized",
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (data) {
      setStatut(data.commande.statut as (typeof STATUTS)[number]);
      setNotes(data.commande.notes_admin || "");
      setFactureStatus(
        (data.commande as { facture_status?: string }).facture_status || "non_emise",
      );
    }
  }, [data]);

  // Auto-scroll vers le bas quand les notes changent
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notesData?.notes]);

  async function doUnblock() {
    setUnblocking(true);
    try {
      await unblock({ data: { commande_id: id } });
      toast.success("Dossier débloqué et repassé en cours.");
      qc.invalidateQueries({ queryKey: ["admin-commande", id] });
      qc.invalidateQueries({ queryKey: ["admin-commandes"] });
      qc.invalidateQueries({ queryKey: ["admin-kanban"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors du déblocage");
    } finally {
      setUnblocking(false);
    }
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    setSendingNote(true);
    try {
      await sendNote({ data: { commande_id: id, contenu: msg } });
      setChatInput("");
      qc.invalidateQueries({ queryKey: ["admin-commande-notes", id] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors de l'envoi du message");
    } finally {
      setSendingNote(false);
    }
  }

  async function changeFactureStatus(newStatus: string) {
    setSavingFacture(true);
    try {
      await updateFactureFn({
        data: { commande_id: id, facture_status: newStatus as "non_emise" | "emise" | "payee" },
      });
      setFactureStatus(newStatus);
      toast.success("Statut de facturation mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-commande", id] });
      qc.invalidateQueries({ queryKey: ["admin-commandes"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setSavingFacture(false);
    }
  }

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("Lien copié dans le presse-papiers");
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }

  function handleGeneratePDF() {
    setGeneratingPDF(true);
    try {
      generateFacturePDF({
        commandeId: commande.id,
        prenom: commande.prenom,
        nom: commande.nom,
        email: commande.email,
        telephone: commande.telephone,
        entreprise: commande.entreprise,
        ville: commande.ville,
        activite: commande.activite,
        montantCentimes: commande.montant_centimes,
        createdAt: commande.created_at,
        paidAt: commande.paid_at,
      });
      toast.success("Facture PDF générée et téléchargée");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPDF(false);
    }
  }

  async function resendFacture() {
    setResendingFacture(true);
    try {
      const res = await renvoyerDocsFn({ data: { commande_id: id, only: "facture" } });
      if (res.email_sent) {
        toast.success("Facture renvoyée au client !");
      } else {
        toast.error(`L'email n'a pas pu être envoyé : ${res.email_error}`);
      }
      qc.invalidateQueries({ queryKey: ["admin-commande", id] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors du renvoi");
    } finally {
      setResendingFacture(false);
    }
  }

  async function saveEmail() {
    const email = emailValue.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Adresse email invalide.");
      return;
    }
    setSavingEmail(true);
    try {
      await updateEmailFn({ data: { commande_id: id, email } });
      toast.success("Email du client mis à jour");
      setEditingEmail(false);
      qc.invalidateQueries({ queryKey: ["admin-commande", id] });
      qc.invalidateQueries({ queryKey: ["admin-livraison", id] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors de la mise à jour de l'email");
    } finally {
      setSavingEmail(false);
    }
  }

  async function save(markDelivered = false) {
    setSaving(true);
    try {
      await updateFn({
        data: { id, statut: markDelivered ? "livrée" : statut, notes_admin: notes },
      });
      toast.success(
        markDelivered ? "Commande marquée livrée et email envoyé !" : "Modifications enregistrées",
      );
      qc.invalidateQueries({ queryKey: ["admin-commande", id] });
      qc.invalidateQueries({ queryKey: ["admin-commandes"] });
      if (markDelivered) setStatut("livrée");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (guard !== "authorized" || isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-xl font-bold text-google-red">Erreur</h1>
          <p className="text-muted-foreground mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {
    commande,
    onboarding,
    justificatifSignedUrl,
    factureSignedUrl,
    factureGenViewUrl,
    factureGenDownloadUrl,
  } = data! as any;

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
    // Compte les jours ouvrés restants entre maintenant et la deadline
    const now = new Date();
    let joursRestants = 0;
    const tmp = new Date(now);
    while (tmp < deadline) {
      tmp.setDate(tmp.getDate() + 1);
      const d = tmp.getDay();
      if (d !== 0 && d !== 6) joursRestants++;
    }
    // Si la deadline est dépassée, calcule le retard en jours ouvrés
    if (joursRestants === 0 && now > deadline) {
      let retard = 0;
      const tmp2 = new Date(deadline);
      while (tmp2 < now) {
        tmp2.setDate(tmp2.getDate() + 1);
        const d = tmp2.getDay();
        if (d !== 0 && d !== 6) retard++;
      }
      joursRestants = -retard;
    }
    return { deadline, joursRestants };
  })();

  const chatNotes: ChatNote[] = (notesData?.notes || []) as ChatNote[];

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Toutes les commandes
          </Link>
          <NotificationsBell />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {commande.statut === "bloque" && (
          <Alert variant="destructive" className="border-2">
            <Lock className="h-5 w-5" />
            <AlertTitle className="text-base font-bold">Dossier bloqué</AlertTitle>
            <AlertDescription className="mt-1">
              Ce dossier a été signalé bloqué par un agent et nécessite une intervention. Vérifiez
              les notes internes, puis débloquez-le pour le remettre en traitement.
              <div className="mt-3">
                <button
                  onClick={doUnblock}
                  disabled={unblocking}
                  className="inline-flex items-center gap-2 rounded-full bg-google-red text-white px-4 py-2 text-sm font-semibold hover:bg-google-red/90 disabled:opacity-60"
                >
                  {unblocking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                  Débloquer le dossier
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{commande.entreprise}</h1>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              {editingEmail ? (
                <span className="inline-flex items-center gap-1.5">
                  <input
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEmail();
                      if (e.key === "Escape") setEditingEmail(false);
                    }}
                    placeholder="email@client.fr"
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground w-64"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveEmail}
                    disabled={savingEmail}
                    className="inline-flex items-center gap-1 rounded-full bg-google-blue text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {savingEmail ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingEmail(false)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    Annuler
                  </button>
                </span>
              ) : (
                <>
                  <span>
                    {commande.prenom} {commande.nom}
                  </span>
                  <span>·</span>
                  <span>{commande.email || "(email manquant)"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailValue(commande.email || "");
                      setEditingEmail(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-google-blue hover:underline"
                    title="Modifier l'email du client"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                  <span>·</span>
                  <span>{commande.telephone}</span>
                </>
              )}
            </div>
          </div>
          {deadlineInfo && (
            <div
              className={`rounded-2xl px-4 py-3 text-center font-bold border-2 ${
                deadlineInfo.joursRestants < 0
                  ? "bg-google-red/10 border-google-red text-google-red"
                  : deadlineInfo.joursRestants <= 2
                    ? "bg-google-yellow/15 border-google-yellow text-amber-700"
                    : "bg-google-green/10 border-google-green text-google-green"
              }`}
            >
              <div className="text-2xl leading-none">
                {deadlineInfo.joursRestants < 0
                  ? `+${Math.abs(deadlineInfo.joursRestants)}j`
                  : `${deadlineInfo.joursRestants}j`}
              </div>
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
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as (typeof STATUTS)[number])}
                className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5"
              >
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="flex-1 rounded-full bg-google-blue text-white py-2.5 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> Enregistrer
              </button>
            </div>
          </div>
          <label className="block mt-4">
            <span className="text-sm font-semibold">Notes admin (privées)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5"
            />
          </label>
          {statut !== "livrée" && (
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="mt-4 rounded-full gradient-cta text-white px-6 py-3 font-bold shadow-glow flex items-center gap-2 disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> Marquer livrée & envoyer email client
            </button>
          )}
        </div>

                {/* Livraison de la commande */}
        <LivraisonSection commandeId={commande.id} />

        {/* Facturation */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-google-blue" />
            <h2 className="font-bold text-lg">Facturation</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-semibold">Statut de la facture</span>
              <Select
                value={factureStatus}
                onValueChange={(v) => changeFactureStatus(v)}
                disabled={savingFacture}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_emise">Non émise</SelectItem>
                  <SelectItem value="emise">Émise</SelectItem>
                  <SelectItem value="payee">Payée</SelectItem>
                </SelectContent>
              </Select>
              {savingFacture && (
                <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Mise à jour…
                </p>
              )}
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGeneratePDF}
                disabled={generatingPDF}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-google-green text-white py-2.5 font-semibold disabled:opacity-60"
              >
                {generatingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Générer la facture (PDF)
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                factureStatus === "payee"
                  ? "bg-google-green/15 text-google-green"
                  : factureStatus === "emise"
                    ? "bg-google-blue/15 text-google-blue"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {factureStatus === "payee"
                ? "✓ Payée"
                : factureStatus === "emise"
                  ? "Émise"
                  : "Non émise"}
            </span>
            <span className="text-xs text-muted-foreground">
              N° facture : FAC-{commande.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              Montant : {(commande.montant_centimes / 100).toFixed(2)} €
            </span>
          </div>

          {commande.facture_url && (
            <div className="mt-4 rounded-xl border border-google-green/40 bg-google-green/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-google-green/15 text-google-green px-3 py-1 text-xs font-semibold">
                  🧾 Facture — {factureStatus === "payee" ? "Payée" : "Émise"}
                </span>
                {commande.facture_emise_at && (
                  <span className="text-xs text-muted-foreground">
                    Émise le {new Date(commande.facture_emise_at).toLocaleString("fr-FR")}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {factureGenViewUrl && (
                  <a
                    href={factureGenViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
                  >
                    Voir la facture
                  </a>
                )}
                {factureGenDownloadUrl && (
                  <a
                    href={factureGenDownloadUrl}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
                  >
                    <Download className="h-4 w-4" /> Télécharger la facture
                  </a>
                )}
                <button
                  type="button"
                  onClick={resendFacture}
                  disabled={resendingFacture}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-google-blue text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {resendingFacture ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Renvoyer la facture
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Cette facture a été générée à la livraison et envoyée au client avec le rapport.
              </p>
            </div>
          )}
        </div>

        {/* Messagerie Agent */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-google-blue" />
            <h2 className="font-bold text-lg">Messagerie Agent</h2>
          </div>
          <ScrollArea className="h-72 rounded-lg border border-border p-3 bg-muted/20">
            <div className="space-y-3">
              {chatNotes.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Aucun message pour le moment. Démarrez la conversation.
                </p>
              )}
              {chatNotes.map((n) => (
                <div key={n.id} className={`flex ${n.is_mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      n.is_mine
                        ? "bg-google-blue text-white rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{n.contenu}</div>
                    <div
                      className={`mt-1 text-[10px] ${n.is_mine ? "text-white/70" : "text-muted-foreground"}`}
                    >
                      {new Date(n.created_at).toLocaleString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          <form onSubmit={sendChatMessage} className="mt-3 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Écrivez un message à l'agent…"
              maxLength={2000}
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={sendingNote || !chatInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-google-blue text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {sendingNote ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer
            </button>
          </form>
        </div>

        {/* Commande */}
        <Card title="Commande">
          <Field k="ID" v={commande.id} />
          <Field k="Statut" v={commande.statut} />
          <Field k="Montant" v={`${(commande.montant_centimes / 100).toFixed(2)} €`} />
          <Field k="Créée le" v={new Date(commande.created_at).toLocaleString("fr-FR")} />
          {commande.paid_at && (
            <Field k="Payée le" v={new Date(commande.paid_at).toLocaleString("fr-FR")} />
          )}
          {commande.delivered_at && (
            <Field k="Livrée le" v={new Date(commande.delivered_at).toLocaleString("fr-FR")} />
          )}
          {commande.stripe_payment_id && (
            <Field k="Stripe payment" v={commande.stripe_payment_id} />
          )}
        </Card>

        {/* Onboarding */}
        {onboarding ? (
          <Card title="Briefing onboarding">
            <Field k="Nom commercial" v={onboarding.nom_commercial} />
            {onboarding.nom_legal && <Field k="Nom légal" v={onboarding.nom_legal} />}
            <div className="md:col-span-2 rounded-lg bg-muted/30 border border-border p-3 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Localisation
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Field
                  k="Adresse postale de l'entreprise"
                  v={`${(onboarding.adresse || "").replace(/\s*\([^)]*\)\s*$/, "")}, ${onboarding.code_postal} ${onboarding.ville}`}
                />
                {(onboarding.adresse || "").match(/\(([^)]+)\)$/) && (
                  <Field
                    k="Point de repère (Google Maps)"
                    v={(onboarding.adresse || "").match(/\(([^)]+)\)$/)?.[1] || "—"}
                  />
                )}
              </div>
            </div>
            <Field k="Téléphone affiché" v={onboarding.telephone_affiche} />
            {onboarding.site_web && <Field k="Site web" v={onboarding.site_web} />}
            <div className="md:col-span-2 rounded-lg bg-google-blue/5 border border-google-blue/20 p-3 space-y-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Possède un compte Google
                </dt>
                <dd className="mt-0.5 text-sm">{onboarding.pas_compte_google ? "Non" : "Oui"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Email Google
                </dt>
                <dd className="mt-0.5 text-sm break-words">
                  {onboarding.email_google || (onboarding.pas_compte_google ? "À créer" : "—")}
                </dd>
              </div>
            </div>
            <Field k="Catégorie" v={onboarding.categorie_principale} />
            {Array.isArray(onboarding.categories_secondaires) &&
              onboarding.categories_secondaires.length > 0 && (
                <Field
                  k="Catégories secondaires"
                  v={onboarding.categories_secondaires.join(", ")}
                />
              )}
            <Field
              k="Type de présence"
              v={formatTypePresence(onboarding.type_presence, onboarding.rayon_intervention_km)}
            />
            {Array.isArray(onboarding.zones_desservies) &&
              onboarding.zones_desservies.length > 0 && (
                <Field k="Zones desservies" v={onboarding.zones_desservies.join(", ")} />
              )}
            <div className="md:col-span-2">
              <Field k="Description" v={onboarding.description} />
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Réseaux sociaux
              </span>
              {onboarding.facebook_url ||
              onboarding.instagram_url ||
              onboarding.youtube_url ||
              onboarding.linkedin_url ||
              onboarding.tiktok_url ||
              (Array.isArray(onboarding.reseaux_autres) &&
                (onboarding.reseaux_autres as { label: string; url: string }[]).length > 0) ? (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {onboarding.facebook_url && (
                    <SocialChip
                      label="Facebook"
                      url={onboarding.facebook_url}
                      color="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      copiedUrl={copiedUrl}
                      onCopy={copyToClipboard}
                    />
                  )}
                  {onboarding.instagram_url && (
                    <SocialChip
                      label="Instagram"
                      url={onboarding.instagram_url}
                      color="bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100"
                      copiedUrl={copiedUrl}
                      onCopy={copyToClipboard}
                    />
                  )}
                  {onboarding.youtube_url && (
                    <SocialChip
                      label="YouTube"
                      url={onboarding.youtube_url}
                      color="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      copiedUrl={copiedUrl}
                      onCopy={copyToClipboard}
                    />
                  )}
                  {onboarding.linkedin_url && (
                    <SocialChip
                      label="LinkedIn"
                      url={onboarding.linkedin_url}
                      color="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
                      copiedUrl={copiedUrl}
                      onCopy={copyToClipboard}
                    />
                  )}
                  {onboarding.tiktok_url && (
                    <SocialChip
                      label="TikTok"
                      url={onboarding.tiktok_url}
                      color="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      copiedUrl={copiedUrl}
                      onCopy={copyToClipboard}
                    />
                  )}
                  {Array.isArray(onboarding.reseaux_autres) &&
                    (onboarding.reseaux_autres as { label: string; url: string }[]).map((r, i) => (
                      <SocialChip
                        key={i}
                        label={r.label}
                        url={r.url}
                        color="bg-muted text-foreground border-border hover:bg-accent"
                        copiedUrl={copiedUrl}
                        onCopy={copyToClipboard}
                      />
                    ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Aucun réseau social renseigné.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Services déclarés
              </span>
              {Array.isArray(onboarding.services) &&
              (onboarding.services as string[]).length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                <p className="mt-1 text-sm text-muted-foreground">Aucun service déclaré.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Attributs sélectionnés
              </span>
              {Array.isArray(onboarding.attributs) &&
              (onboarding.attributs as string[]).length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                <p className="mt-1 text-sm text-muted-foreground">Aucun attribut sélectionné.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Attributs personnalisés (ajoutés par le client)
              </span>
              {Array.isArray(onboarding.attributs_personnalises) &&
              (onboarding.attributs_personnalises as string[]).length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(onboarding.attributs_personnalises as string[]).map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-google-yellow/15 text-amber-700 px-2.5 py-1 text-xs font-semibold"
                    >
                      ✦ {a}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Aucun attribut personnalisé ajouté.
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Horaires d'ouverture
              </span>
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
            {onboarding.commentaires && (
              <div className="md:col-span-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Informations complémentaires
                </span>
                <div className="mt-1.5 text-sm rounded-lg bg-muted/40 border border-border p-3 whitespace-pre-line leading-relaxed">
                  {onboarding.commentaires}
                </div>
              </div>
            )}

            <div className="md:col-span-2 mt-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Logo de l'entreprise
              </span>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {onboarding.logo_url ? (
                  <a href={onboarding.logo_url} target="_blank" rel="noreferrer">
                    <img
                      src={onboarding.logo_url}
                      alt="Logo"
                      className="aspect-square object-cover rounded-lg border"
                    />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground col-span-2">Logo non fourni</span>
                )}
              </div>
            </div>

            <div className="md:col-span-2 mt-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Photo de couverture
              </span>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {onboarding.couverture_url ? (
                  <a href={onboarding.couverture_url} target="_blank" rel="noreferrer">
                    <img
                      src={onboarding.couverture_url}
                      alt="Couverture"
                      className="aspect-square object-cover rounded-lg border"
                    />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground col-span-2">
                    Photo de couverture non fournie
                  </span>
                )}
              </div>
            </div>

            {Array.isArray(onboarding.photos_etablissement) &&
              (onboarding.photos_etablissement as string[]).length > 0 && (
                <div className="md:col-span-2 mt-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Photos de l'établissement (preuve d'existence)
                  </span>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(onboarding.photos_etablissement as string[]).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img
                          src={u}
                          alt=""
                          className="aspect-square object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.photos_metier) &&
              (onboarding.photos_metier as string[]).length > 0 && (
                <div className="md:col-span-2 mt-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Photos de l'activité (menus, réalisations, etc.)
                  </span>
                  {onboarding.photos_metier_description && (
                    <p className="mt-1 text-sm text-muted-foreground italic">
                      {onboarding.photos_metier_description}
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(onboarding.photos_metier as string[]).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img
                          src={u}
                          alt=""
                          className="aspect-square object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.photos_exterieures) &&
              (onboarding.photos_exterieures as string[]).length > 0 && (
                <div className="md:col-span-2 mt-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Photos de l'extérieur
                  </span>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(onboarding.photos_exterieures as string[]).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img
                          src={u}
                          alt=""
                          className="aspect-square object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.photos_interieures) &&
              (onboarding.photos_interieures as string[]).length > 0 && (
                <div className="md:col-span-2 mt-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Photos de l'intérieur
                  </span>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(onboarding.photos_interieures as string[]).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img
                          src={u}
                          alt=""
                          className="aspect-square object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.photos_equipe) &&
              (onboarding.photos_equipe as string[]).length > 0 && (
                <div className="md:col-span-2 mt-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Photos de l'équipe
                  </span>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(onboarding.photos_equipe as string[]).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img
                          src={u}
                          alt=""
                          className="aspect-square object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(onboarding.videos_urls) &&
              (onboarding.videos_urls as string[]).length > 0 && (
                <div className="md:col-span-2 mt-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Vidéos de l'entreprise
                  </span>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(onboarding.videos_urls as string[]).map((u, i) => (
                      <div key={i} className="space-y-1.5">
                        <video
                          src={u}
                          className="aspect-video w-full object-cover rounded-lg border"
                          controls
                          muted
                        />
                        {/* Téléchargement du fichier ORIGINAL : le paramètre ?download
                            force Content-Disposition: attachment côté Supabase Storage,
                            sans recompression */}
                        <a
                          href={`${u}${u.includes("?") ? "&" : "?"}download`}
                          className="block text-center text-xs font-semibold rounded-lg border border-border px-2 py-1.5 hover:bg-accent transition"
                        >
                          Télécharger
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {onboarding.date_creation && (
              <div className="md:col-span-2 mt-2">
                <p className="text-sm">
                  <b>Date de création de l'entreprise :</b>{" "}
                  {new Date(onboarding.date_creation).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )}

            {/* Situation de l'entreprise (étape 6) */}
            <div className="md:col-span-2 mt-2 rounded-lg bg-muted/30 border border-border p-3 space-y-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Situation de l'entreprise
                </dt>
                <dd className="mt-0.5 text-sm break-words">
                  {formatEntrepriseStatut(onboarding.entreprise_statut_creation)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Validation Google comprise
                </dt>
                <dd className="mt-0.5 text-sm break-words">
                  {onboarding.validation_google_comprise ? "Oui" : "Non"}
                </dd>
              </div>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function formatTypePresence(type: string, rayon: number | null | undefined): string {
  const rayonStr = rayon ? ` (Rayon : ${rayon} km)` : "";
  if (type === "boutique") return "En boutique";
  if (type === "domicile_clients") return `En déplacement chez le client${rayonStr}`;
  if (type === "les_deux") return `En boutique et en déplacement chez le client${rayonStr}`;
  return type + rayonStr;
}

function SocialChip({
  label,
  url,
  color,
  copiedUrl,
  onCopy,
}: {
  label: string;
  url: string;
  color: string;
  copiedUrl: string | null;
  onCopy: (url: string) => void;
}) {
  const isCopied = copiedUrl === url;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${color}`}
    >
      <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
        {label}
      </a>
      <button
        type="button"
        onClick={() => onCopy(url)}
        className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 hover:bg-black/10 transition"
        title="Copier l'URL"
      >
        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}
