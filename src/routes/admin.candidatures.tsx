import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  ExternalLink,
  Send,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import {
  listCandidatures,
  updateCandidatureStatut,
  acceptAndInviteCandidat,
} from "@/lib/candidature.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/candidatures")({
  head: () => ({
    meta: [{ title: "Candidatures — Admin Hotavis" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminCandidatures,
});

const STATUT: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  nouveau: {
    label: "Nouveau",
    cls: "bg-google-blue/15 text-google-blue",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  accepté: {
    label: "Accepté",
    cls: "bg-google-green/15 text-google-green",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejeté: {
    label: "Rejeté",
    cls: "bg-google-red/15 text-google-red",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

type Candidature = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  siret: string | null;
  fiche_url: string | null;
  linkedin_url: string | null;
  presentation: string;
  qcm_q1: string;
  qcm_score: number;
  q2_reponse: string;
  q3_reponse: string;
  statut: string;
  created_at: string;
};

function AdminCandidatures() {
  const guard = useAdminGuard();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [notesAdmin, setNotesAdmin] = useState("");
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    link: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const fetchList = useServerFn(listCandidatures);
  const updateFn = useServerFn(updateCandidatureStatut);
  const acceptInviteFn = useServerFn(acceptAndInviteCandidat);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-candidatures"],
    queryFn: () => fetchList(),
    enabled: guard === "authorized",
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; statut: "nouveau" | "accepté" | "rejeté" }) =>
      updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-candidatures"] }),
  });

  const acceptInviteMut = useMutation({
    mutationFn: (v: { id: string; notes_admin?: string }) => acceptInviteFn({ data: v }),
    onSuccess: (res: {
      ok: boolean;
      email: string;
      link: string;
      emailSent: boolean;
      emailError?: string;
    }) => {
      if (res.emailSent) {
        toast.success(`Candidature acceptée et invitation envoyée à ${res.email}`);
        setDialogOpen(false);
        setSelectedCandidature(null);
        setNotesAdmin("");
      } else {
        // L'email n'est pas parti — on affiche le lien de secours dans la modale
        setInviteResult({
          email: res.email,
          link: res.link,
          emailSent: false,
          emailError: res.emailError,
        });
        toast.warning(`L'email n'a pas pu être envoyé — lien de secours disponible`);
      }
      qc.invalidateQueries({ queryKey: ["admin-candidatures"] });
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
    },
    onError: (e: Error) => {
      toast.error(e?.message || "Erreur lors de l'acceptation");
    },
  });

  function copyInviteLink() {
    if (!inviteResult) return;
    navigator.clipboard.writeText(inviteResult.link);
    setLinkCopied(true);
    toast.success("Lien copié dans le presse-papiers");
  }

  function closeDialog() {
    setDialogOpen(false);
    setSelectedCandidature(null);
    setNotesAdmin("");
    setInviteResult(null);
    setLinkCopied(false);
  }

  function openAcceptDialog(c: Candidature) {
    setSelectedCandidature(c);
    setNotesAdmin("");
    setDialogOpen(true);
  }

  function confirmAcceptInvite() {
    if (!selectedCandidature) return;
    acceptInviteMut.mutate({
      id: selectedCandidature.id,
      notes_admin: notesAdmin.trim() || undefined,
    });
  }

  if (guard !== "authorized" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );
  }

  const candidatures = (data?.candidatures || []) as Candidature[];
  const correct = data?.correct_q1 || "B";

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Candidatures Experts</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {candidatures.length} candidature(s)
            </span>
            <NotificationsBell />
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {candidatures.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
            Aucune candidature pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {candidatures.map((c) => {
              const s = STATUT[c.statut] || STATUT.nouveau;
              const q1ok = c.qcm_q1 === correct;
              return (
                <div key={c.id} className="bg-card border border-border rounded-xl p-5 shadow-card">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">
                          {c.prenom} {c.nom}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}
                        >
                          {s.icon} {s.label}
                        </span>
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${q1ok ? "bg-google-green/15 text-google-green" : "bg-google-red/15 text-google-red"}`}
                        >
                          QCM : {c.qcm_score}/1 {q1ok ? "✓" : "✗"}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {c.email}
                        </a>
                        <a
                          href={`tel:${c.telephone}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {c.telephone}
                        </a>
                        {c.siret && <span>SIRET : {c.siret}</span>}
                        {c.fiche_url && (
                          <a
                            href={c.fiche_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-google-blue hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Fiche exemple
                          </a>
                        )}
                        {c.linkedin_url && (
                          <a
                            href={c.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-google-blue hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Profil / Site web
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reçu le {new Date(c.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openAcceptDialog(c)}
                        disabled={acceptInviteMut.isPending || mut.isPending}
                        className="inline-flex items-center gap-1.5 rounded-full bg-google-green text-white text-sm font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-50"
                      >
                        {acceptInviteMut.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Accepter & Inviter
                      </button>
                      <button
                        onClick={() => mut.mutate({ id: c.id, statut: "rejeté" })}
                        disabled={mut.isPending || acceptInviteMut.isPending}
                        className="rounded-full bg-google-red text-white text-sm font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-50"
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {c.presentation && (
                      <div className="rounded-lg bg-accent/40 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Présentation — Motivations & expertise
                        </div>
                        <p className="mt-1 text-sm whitespace-pre-wrap">{c.presentation}</p>
                      </div>
                    )}
                    <div className="rounded-lg bg-accent/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Q1 — QCM (réponse correcte : {correct})
                      </div>
                      <div className="mt-1 text-sm">
                        Réponse du candidat : <b>{c.qcm_q1}</b>{" "}
                        {q1ok ? (
                          <span className="text-google-green">✓ correct</span>
                        ) : (
                          <span className="text-google-red">✗ incorrect</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg bg-accent/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Q2 — Fiche suspendue pour activité suspecte
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{c.q2_reponse}</p>
                    </div>
                    <div className="rounded-lg bg-accent/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Q3 — Artisan sans local physique
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{c.q3_reponse}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modale Accepter & Inviter */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          {inviteResult ? (
            // ─── Résultat : email non envoyé, lien de secours ───
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Email non envoyé
                </DialogTitle>
                <DialogDescription>
                  La candidature a été acceptée, mais l'email d'invitation n'a pas pu être envoyé.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                <p className="font-semibold mb-1">
                  L'email d'invitation n'a pas pu être envoyé à {inviteResult.email}.
                </p>
                {inviteResult.emailError && (
                  <p className="text-xs text-amber-700 mt-1">Raison : {inviteResult.emailError}</p>
                )}
                <p className="text-xs text-amber-700 mt-2">
                  💡 Vous pouvez transmettre le lien ci-dessous manuellement à l'agent (par email,
                  WhatsApp, etc.).
                </p>
              </div>

              <p className="text-sm font-semibold">
                Lien d'invitation (à transmettre manuellement) :
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteResult.link}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-google-blue text-white px-3 py-2 text-sm font-semibold"
                >
                  {linkCopied ? (
                    <>
                      <Check className="h-4 w-4" /> Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copier
                    </>
                  )}
                </button>
              </div>

              <DialogFooter>
                <button
                  onClick={closeDialog}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
                >
                  Fermer
                </button>
              </DialogFooter>
            </>
          ) : (
            // ─── Formulaire d'acceptation ───
            <>
              <DialogHeader>
                <DialogTitle>Accepter & Inviter</DialogTitle>
                <DialogDescription>
                  La candidature sera marquée comme acceptée et une invitation agent sera envoyée
                  par email.
                </DialogDescription>
              </DialogHeader>

              {selectedCandidature && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-accent/40 p-3 text-sm">
                    <div className="font-semibold">
                      {selectedCandidature.prenom} {selectedCandidature.nom}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedCandidature.email}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold">Note admin (optionnelle)</span>
                    <textarea
                      value={notesAdmin}
                      onChange={(e) => setNotesAdmin(e.target.value)}
                      rows={3}
                      placeholder="Note interne sur cette candidature…"
                      className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5"
                    />
                  </label>
                </div>
              )}

              <DialogFooter>
                <button
                  onClick={closeDialog}
                  disabled={acceptInviteMut.isPending}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmAcceptInvite}
                  disabled={acceptInviteMut.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-google-green text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {acceptInviteMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Confirmer & Inviter
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
