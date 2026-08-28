import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ArrowRight, Wallet, HandHelping, Inbox, History, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  listMyAssignedTickets,
  listPoolTickets,
  listCompletedMissions,
  claimTicket,
  unclaimTicket,
} from "@/lib/agent.functions";
import { getPublicCommissionAmount } from "@/lib/agency-public.functions";

export const Route = createFileRoute("/agent/cases")({
  head: () => ({
    meta: [{ title: "Dossiers & Missions — Hotavis" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentCases,
});

function AgentCases() {
  const queryClient = useQueryClient();
  const fetchMine = useServerFn(listMyAssignedTickets);
  const fetchPool = useServerFn(listPoolTickets);
  const fetchCompleted = useServerFn(listCompletedMissions);
  const claim = useServerFn(claimTicket);
  const unclaim = useServerFn(unclaimTicket);
  const fetchCommission = useServerFn(getPublicCommissionAmount);

  const { data: mine, isLoading: lm } = useQuery({
    queryKey: ["agent-mine"],
    queryFn: () => fetchMine(),
  });
  const { data: pool, isLoading: lp } = useQuery({
    queryKey: ["agent-pool"],
    queryFn: () => fetchPool(),
    refetchInterval: 15000,
  });
  const { data: commissionData } = useQuery({
    queryKey: ["agent-commission"],
    queryFn: () => fetchCommission(),
  });
  const { data: completed, isLoading: lc } = useQuery({
    queryKey: ["agent-completed"],
    queryFn: () => fetchCompleted(),
  });
  const commissionEuros = commissionData?.commission_euros ?? 50;

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [unclaimingId, setUnclaimingId] = useState<string | null>(null);
  const [disclaimerTicketId, setDisclaimerTicketId] = useState<string | null>(null);

  async function takeTicket(id: string) {
    setClaimingId(id);
    setDisclaimerTicketId(null);
    try {
      const res = await claim({ data: { commande_id: id } });
      if (!res.ok) {
        if (res.reason === "already_assigned")
          toast.error("Ce dossier vient d'être pris par un autre agent.");
        else toast.error("Impossible de prendre ce dossier.");
        queryClient.invalidateQueries({ queryKey: ["agent-pool"] });
        return;
      }
      toast.success("Mission réclamée ✓ Le dossier est maintenant dans « Mes dossiers en cours ».");
      queryClient.invalidateQueries({ queryKey: ["agent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["agent-mine"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setClaimingId(null);
    }
  }

  async function abandonTicket(id: string) {
    setUnclaimingId(id);
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
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    } finally {
      setUnclaimingId(null);
    }
  }

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold">Dossiers & Missions</h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos dossiers en cours et réclamez de nouvelles missions.
          </p>
        </div>

        <Tabs defaultValue="pool" className="w-full">
          <TabsList className="bg-muted">
            <TabsTrigger value="pool">
              Missions disponibles ({pool?.tickets?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="mine">
              Mes dossiers en cours ({mine?.tickets?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              Historique ({completed?.tickets?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Onglet : Missions disponibles */}
          <TabsContent value="pool">
            <section className="bg-card border border-border rounded-2xl shadow-card">
              <div className="p-4 space-y-3 max-h-[700px] overflow-auto">
                {lp && (
                  <div className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </div>
                )}
                {!lp && (pool?.tickets || []).length === 0 && (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Aucune mission disponible pour le moment. Bravo à l'équipe ! 🎉
                  </div>
                )}
                {(pool?.tickets || []).map((t) => (
                  <div
                    key={t.id}
                    className="border border-border rounded-xl p-4 hover:bg-accent/30 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.entreprise}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t.ville} • {t.activite}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Payé le {new Date(t.paid_at!).toLocaleDateString("fr-FR")}
                        </div>
                        <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-google-green/15 text-google-green font-bold text-xs px-2.5 py-1">
                          <Wallet className="h-3.5 w-3.5" /> + {commissionEuros} €
                        </span>
                      </div>
                      <button
                        onClick={() => setDisclaimerTicketId(t.id)}
                        disabled={claimingId === t.id}
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-bold rounded-full bg-google-blue text-white px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
                      >
                        {claimingId === t.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <HandHelping className="h-3.5 w-3.5" />
                        )}
                        Réclamer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* Onglet : Mes dossiers en cours */}
          <TabsContent value="mine">
            <section className="bg-card border border-border rounded-2xl shadow-card">
              <div className="p-4 space-y-3 max-h-[700px] overflow-auto">
                {lm && (
                  <div className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </div>
                )}
                {!lm && (mine?.tickets || []).length === 0 && (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    Aucun dossier en cours. Allez dans « Missions disponibles » pour réclamer une
                    mission.
                  </div>
                )}
                {(mine?.tickets || []).map((t) => (
                  <div
                    key={t.id}
                    className="border border-border rounded-xl p-4 hover:bg-accent/30 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link to="/agent/$id" params={{ id: t.id }} className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{t.entreprise}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.ville}</div>
                        <div className="text-xs mt-2 flex items-center gap-2 flex-wrap">
                          <StatusBadge s={t.statut} />
                          <span className="inline-flex items-center gap-1 rounded-full bg-google-green/15 text-google-green font-bold px-2 py-0.5">
                            <Wallet className="h-3 w-3" /> Gains : {commissionEuros} €
                          </span>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.statut !== "bloque" && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Abandonner cette mission ? Le dossier retournera dans le pool des missions disponibles.",
                                )
                              )
                                abandonTicket(t.id);
                            }}
                            disabled={unclaimingId === t.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold rounded-full border border-border text-muted-foreground px-3 py-1.5 hover:bg-accent transition disabled:opacity-50"
                          >
                            {unclaimingId === t.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            Abandonner
                          </button>
                        )}
                        <Link
                          to="/agent/$id"
                          params={{ id: t.id }}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-accent transition"
                        >
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* Onglet : Historique */}
          <TabsContent value="history">
            <section className="bg-card border border-border rounded-2xl shadow-card">
              <div className="p-4 space-y-3 max-h-[700px] overflow-auto">
                {lc && (
                  <div className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </div>
                )}
                {!lc && (completed?.tickets || []).length === 0 && (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Aucune mission terminée pour le moment.
                  </div>
                )}
                {(completed?.tickets || []).map((t) => (
                  <Link
                    key={t.id}
                    to="/agent/$id"
                    params={{ id: t.id }}
                    className="block border border-border rounded-xl p-4 hover:bg-accent/30 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.entreprise}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.ville}</div>
                        <div className="text-xs mt-2 flex items-center gap-2 flex-wrap">
                          <StatusBadge s={t.statut} />
                          <span className="inline-flex items-center gap-1 rounded-full bg-google-green/15 text-google-green font-bold px-2 py-0.5">
                            <Wallet className="h-3 w-3" /> {(t.commission_centimes ?? 0) / 100} €
                          </span>
                          {t.commission_paid && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-google-blue/15 text-google-blue font-bold px-2 py-0.5 text-xs">
                              Payée
                            </span>
                          )}
                        </div>
                        {t.delivered_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Livrée le {new Date(t.delivered_at).toLocaleDateString("fr-FR")}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>

        {/* AlertDialog : Conditions d'engagement */}
        <AlertDialog
          open={disclaimerTicketId !== null}
          onOpenChange={(open) => {
            if (!open) setDisclaimerTicketId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conditions d'engagement</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>En acceptant cette mission, vous vous engagez à :</p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Livrer la fiche GMB sous 7 jours ouvrés.</li>
                    <li>Ne pas conserver un dossier plus de 48h sans avancement.</li>
                    <li>Signaler immédiatement tout blocage via le bouton dédié.</li>
                  </ol>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => disclaimerTicketId && takeTicket(disclaimerTicketId)}
                disabled={claimingId !== null}
              >
                {claimingId !== null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "J'accepte et je commence la mission"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AgentLayout>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { l: string; c: string }> = {
    en_cours: { l: "En cours", c: "bg-google-yellow/20 text-amber-700" },
    onboarding_complété: { l: "Briefing reçu", c: "bg-google-blue/15 text-google-blue" },
    livrée: { l: "Livrée ✓", c: "bg-google-green/15 text-google-green" },
    bloque: { l: "Bloqué", c: "bg-google-red/15 text-google-red" },
  };
  const v = map[s] || { l: s, c: "bg-muted" };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 font-semibold ${v.c}`}>{v.l}</span>
  );
}
