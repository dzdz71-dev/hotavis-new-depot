import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, Fragment } from "react";
import {
  Loader2,
  UserPlus,
  X,
  Trash2,
  AlertTriangle,
  Copy,
  Check,
  Ban,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  listAgents,
  inviteAgent,
  revokeAgent,
  suspendAgent,
  reactivateAgent,
  deleteAgent,
  getAgentDetails,
} from "@/lib/admin-agency.functions";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationsBell } from "@/components/admin/NotificationsBell";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({ meta: [{ title: "Agents — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AgentsPage,
});

type AgentRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  status: string;
  suspended_at: string | null;
  deleted_at: string | null;
  fiches_total: number;
  fiches_mois: number;
  commission_due_centimes: number;
};

type AgentDetails = {
  agent: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    status: string;
    created_at: string;
    suspended_at: string | null;
    deleted_at: string | null;
  };
  taches_en_cours: Array<{
    id: string;
    prenom: string;
    nom: string;
    entreprise: string;
    ville: string;
    activite: string;
    statut: string;
    created_at: string;
    paid_at: string | null;
    assigned_at: string | null;
    delivered_at: string | null;
    commission_centimes: number | null;
    commission_paid: boolean;
  }>;
  commandes_livrees: Array<{
    id: string;
    prenom: string;
    nom: string;
    entreprise: string;
    ville: string;
    activite: string;
    statut: string;
    created_at: string;
    paid_at: string | null;
    assigned_at: string | null;
    delivered_at: string | null;
    commission_centimes: number | null;
    commission_paid: boolean;
  }>;
  stats: {
    total_commandes: number;
    taches_en_cours_count: number;
    commandes_livrees_count: number;
    total_commission_centimes: number;
    commission_payee_centimes: number;
    commission_en_attente_centimes: number;
  };
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 border-green-200",
    suspended: "bg-amber-100 text-amber-800 border-amber-200",
    deleted: "bg-red-100 text-red-800 border-red-200",
  };
  const labels: Record<string, string> = {
    active: "Actif",
    suspended: "Suspendu",
    deleted: "Supprimé",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status] || styles.active}`}
    >
      {labels[status] || status}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function AgentsPage() {
  const queryClient = useQueryClient();
  const guard = useAdminGuard();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    link: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAgents = useServerFn(listAgents);
  const invite = useServerFn(inviteAgent);
  const revoke = useServerFn(revokeAgent);
  const suspend = useServerFn(suspendAgent);
  const reactivate = useServerFn(reactivateAgent);
  const remove = useServerFn(deleteAgent);
  const fetchDetails = useServerFn(getAgentDetails);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => fetchAgents(),
    enabled: guard === "authorized",
  });

  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin-agent-details", expandedAgent],
    queryFn: () => fetchDetails({ data: { user_id: expandedAgent! } }),
    enabled: guard === "authorized" && !!expandedAgent,
  });

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setLinkCopied(false);
    try {
      const res = await invite({ data: { email } });
      if (res.emailSent) {
        toast.success(`Invitation envoyée à ${email}`);
        setEmail("");
        setModalOpen(false);
      } else {
        setInviteResult({
          email,
          link: res.link,
          emailSent: false,
          emailError: res.emailError,
        });
        toast.warning(`L'email n'a pas pu être envoyé — lien de secours disponible`);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setInviting(false);
    }
  }

  function copyInviteLink() {
    if (!inviteResult) return;
    navigator.clipboard.writeText(inviteResult.link);
    setLinkCopied(true);
    toast.success("Lien copié dans le presse-papiers");
  }

  function resetInviteModal() {
    setInviteResult(null);
    setLinkCopied(false);
    setEmail("");
    setModalOpen(false);
  }

  async function doRevoke(uid: string, email: string) {
    if (!confirm(`Retirer définitivement le rôle agent à ${email} ?`)) return;
    setActionLoading(uid);
    try {
      await revoke({ data: { user_id: uid } });
      toast.success("Rôle retiré");
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function doSuspend(uid: string, email: string) {
    if (!confirm(`Suspendre l'agent ${email} ? Il ne pourra plus accéder à son espace.`)) return;
    setActionLoading(uid);
    try {
      await suspend({ data: { user_id: uid } });
      toast.success("Agent suspendu");
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function doReactivate(uid: string, email: string) {
    if (!confirm(`Réactiver l'agent ${email} ?`)) return;
    setActionLoading(uid);
    try {
      await reactivate({ data: { user_id: uid } });
      toast.success("Agent réactivé");
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function doDelete(uid: string, email: string) {
    if (
      !confirm(
        `Supprimer l'agent ${email} ? Cette action est réversible (soft delete). L'historique des commandes est préservé.`,
      )
    )
      return;
    setActionLoading(uid);
    try {
      await remove({ data: { user_id: uid } });
      toast.success("Agent supprimé");
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  function toggleExpand(uid: string) {
    setExpandedAgent(expandedAgent === uid ? null : uid);
  }

  if (guard !== "authorized" || isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );

  const agents = (data?.agents || []) as AgentRow[];
  const details = detailsData as AgentDetails | undefined;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Admin Hotavis</h1>
          <NotificationsBell />
        </div>
      </header>
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Équipe ({agents.length})</h2>
            <p className="text-sm text-muted-foreground">
              Agents qui prennent en charge les fiches clients.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-google-blue text-white font-semibold px-4 py-2 text-sm"
          >
            <UserPlus className="h-4 w-4" /> Inviter un agent
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold"></th>
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Téléphone</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Fiches ce mois</th>
                <th className="px-4 py-3 font-semibold text-right">Total fiches</th>
                <th className="px-4 py-3 font-semibold text-right">Commission due (ce mois)</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    Aucun agent. Cliquez sur "Inviter un agent".
                  </td>
                </tr>
              )}
              {agents.map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-t border-border">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(a.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Voir les détails"
                      >
                        {expandedAgent === a.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">{a.full_name || "—"}</td>
                    <td className="px-4 py-3 font-medium">{a.email}</td>
                    <td className="px-4 py-3">{a.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right">{a.fiches_mois}</td>
                    <td className="px-4 py-3 text-right">{a.fiches_total}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {(a.commission_due_centimes / 100).toFixed(2)}€
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => toggleExpand(a.id)}
                          className="text-google-blue hover:underline text-xs inline-flex items-center gap-1"
                          title="Voir les détails"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        {a.status === "active" && (
                          <button
                            onClick={() => doSuspend(a.id, a.email)}
                            disabled={actionLoading === a.id}
                            className="text-amber-600 hover:underline text-xs inline-flex items-center gap-1 disabled:opacity-50"
                            title="Suspendre"
                          >
                            <Ban className="h-3 w-3" />
                            Suspendre
                          </button>
                        )}
                        {a.status === "suspended" && (
                          <button
                            onClick={() => doReactivate(a.id, a.email)}
                            disabled={actionLoading === a.id}
                            className="text-green-600 hover:underline text-xs inline-flex items-center gap-1 disabled:opacity-50"
                            title="Réactiver"
                          >
                            <PlayCircle className="h-3 w-3" />
                            Réactiver
                          </button>
                        )}
                        {a.status !== "deleted" && (
                          <button
                            onClick={() => doDelete(a.id, a.email)}
                            disabled={actionLoading === a.id}
                            className="text-google-red hover:underline text-xs inline-flex items-center gap-1 disabled:opacity-50"
                            title="Supprimer (soft delete)"
                          >
                            <Trash2 className="h-3 w-3" />
                            Supprimer
                          </button>
                        )}
                        {a.status === "deleted" && (
                          <button
                            onClick={() => doReactivate(a.id, a.email)}
                            disabled={actionLoading === a.id}
                            className="text-green-600 hover:underline text-xs inline-flex items-center gap-1 disabled:opacity-50"
                            title="Restaurer"
                          >
                            <PlayCircle className="h-3 w-3" />
                            Restaurer
                          </button>
                        )}
                        <button
                          onClick={() => doRevoke(a.id, a.email)}
                          disabled={actionLoading === a.id}
                          className="text-muted-foreground hover:underline text-xs inline-flex items-center gap-1 disabled:opacity-50"
                          title="Retirer définitivement le rôle"
                        >
                          <X className="h-3 w-3" />
                          Retirer
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedAgent === a.id && (
                    <tr className="border-t border-border bg-muted/20">
                      <td colSpan={9} className="px-4 py-4">
                        {detailsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement des détails…
                          </div>
                        ) : details ? (
                          <div className="space-y-4">
                            {/* En-tête détails agent */}
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Nom :</span>{" "}
                                <span className="font-medium">
                                  {details.agent.full_name || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Email :</span>{" "}
                                <span className="font-medium">{details.agent.email}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Téléphone :</span>{" "}
                                <span className="font-medium">{details.agent.phone || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Inscrit le :</span>{" "}
                                <span className="font-medium">
                                  {formatDate(details.agent.created_at)}
                                </span>
                              </div>
                              {details.agent.suspended_at && (
                                <div>
                                  <span className="text-muted-foreground">Suspendu le :</span>{" "}
                                  <span className="font-medium text-amber-600">
                                    {formatDate(details.agent.suspended_at)}
                                  </span>
                                </div>
                              )}
                              {details.agent.deleted_at && (
                                <div>
                                  <span className="text-muted-foreground">Supprimé le :</span>{" "}
                                  <span className="font-medium text-red-600">
                                    {formatDate(details.agent.deleted_at)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Statistiques */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="rounded-lg border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground">Total commandes</div>
                                <div className="text-lg font-bold">
                                  {details.stats.total_commandes}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground">Tâches en cours</div>
                                <div className="text-lg font-bold text-amber-600">
                                  {details.stats.taches_en_cours_count}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground">
                                  Commandes livrées
                                </div>
                                <div className="text-lg font-bold text-green-600">
                                  {details.stats.commandes_livrees_count}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground">
                                  Commission totale
                                </div>
                                <div className="text-lg font-bold">
                                  {(details.stats.total_commission_centimes / 100).toFixed(2)}€
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {" "}
                                  Payée :{" "}
                                  {(details.stats.commission_payee_centimes / 100).toFixed(2)}€ · En
                                  attente :{" "}
                                  {(details.stats.commission_en_attente_centimes / 100).toFixed(2)}€
                                </div>
                              </div>
                            </div>

                            {/* Tâches en cours */}
                            <div>
                              <h4 className="text-sm font-bold mb-2">
                                Tâches en cours ({details.taches_en_cours.length})
                              </h4>
                              {details.taches_en_cours.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Aucune tâche en cours.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-border">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-left">
                                      <tr>
                                        <th className="px-3 py-2 font-semibold">Entreprise</th>
                                        <th className="px-3 py-2 font-semibold">Ville</th>
                                        <th className="px-3 py-2 font-semibold">Activité</th>
                                        <th className="px-3 py-2 font-semibold">Statut</th>
                                        <th className="px-3 py-2 font-semibold">Assignée le</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {details.taches_en_cours.map((t) => (
                                        <tr key={t.id} className="border-t border-border">
                                          <td className="px-3 py-2 font-medium">{t.entreprise}</td>
                                          <td className="px-3 py-2">{t.ville}</td>
                                          <td className="px-3 py-2">{t.activite}</td>
                                          <td className="px-3 py-2">
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                                              {t.statut}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2">{formatDate(t.assigned_at)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Commandes livrées */}
                            <div>
                              <h4 className="text-sm font-bold mb-2">
                                Commandes livrées ({details.commandes_livrees.length})
                              </h4>
                              {details.commandes_livrees.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Aucune commande livrée.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-border">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-left">
                                      <tr>
                                        <th className="px-3 py-2 font-semibold">Entreprise</th>
                                        <th className="px-3 py-2 font-semibold">Ville</th>
                                        <th className="px-3 py-2 font-semibold">Livrée le</th>
                                        <th className="px-3 py-2 font-semibold text-right">
                                          Commission
                                        </th>
                                        <th className="px-3 py-2 font-semibold">Payée ?</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {details.commandes_livrees.map((c) => (
                                        <tr key={c.id} className="border-t border-border">
                                          <td className="px-3 py-2 font-medium">{c.entreprise}</td>
                                          <td className="px-3 py-2">{c.ville}</td>
                                          <td className="px-3 py-2">
                                            {formatDate(c.delivered_at)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-semibold">
                                            {((c.commission_centimes || 0) / 100).toFixed(2)}€
                                          </td>
                                          <td className="px-3 py-2">
                                            {c.commission_paid ? (
                                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                                                ✓ Payée
                                              </span>
                                            ) : (
                                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                                                En attente
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Impossible de charger les détails.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => (inviteResult ? resetInviteModal() : setModalOpen(false))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md"
          >
            {inviteResult ? (
              // ─── Résultat : email non envoyé, lien de secours ───
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Email non envoyé
                  </h3>
                  <button type="button" onClick={resetInviteModal}>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-900">
                  <p className="font-semibold mb-1">
                    L'email d'invitation n'a pas pu être envoyé à {inviteResult.email}.
                  </p>
                  {inviteResult.emailError && (
                    <p className="text-xs text-amber-700 mt-1">
                      Raison : {inviteResult.emailError}
                    </p>
                  )}
                  <p className="text-xs text-amber-700 mt-2">
                    💡 Vous pouvez transmettre le lien ci-dessous manuellement à l'agent (par email,
                    WhatsApp, etc.).
                  </p>
                </div>

                <p className="text-sm font-semibold mb-2">
                  Lien d'invitation (à transmettre manuellement) :
                </p>
                <div className="flex items-center gap-2 mb-4">
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

                <button
                  type="button"
                  onClick={resetInviteModal}
                  className="w-full rounded-full border border-border font-semibold py-2.5"
                >
                  Fermer
                </button>
              </div>
            ) : (
              // ─── Formulaire d'invitation ───
              <form onSubmit={submitInvite}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">Inviter un agent</h3>
                  <button type="button" onClick={() => setModalOpen(false)}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  L'agent recevra un email avec un lien pour créer son compte (valable 7 jours).
                </p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@exemple.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 mb-4"
                />
                <button
                  disabled={inviting}
                  className="w-full rounded-full bg-google-blue text-white font-semibold py-2.5 disabled:opacity-50"
                >
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    "Envoyer l'invitation"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
