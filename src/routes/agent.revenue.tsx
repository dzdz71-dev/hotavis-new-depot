import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Clock, CheckCircle2, Receipt } from "lucide-react";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { getAgentStats, getAgentCommissionsHistory } from "@/lib/agent.functions";
import { getPublicCommissionAmount } from "@/lib/agency-public.functions";

export const Route = createFileRoute("/agent/revenue")({
  head: () => ({
    meta: [{ title: "Mes Revenus — Hotavis" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentRevenue,
});

function AgentRevenue() {
  const fetchStats = useServerFn(getAgentStats);
  const fetchCommission = useServerFn(getPublicCommissionAmount);
  const fetchHistory = useServerFn(getAgentCommissionsHistory);

  const { data: stats } = useQuery({
    queryKey: ["agent-stats"],
    queryFn: () => fetchStats(),
  });
  const { data: commissionData } = useQuery({
    queryKey: ["agent-commission"],
    queryFn: () => fetchCommission(),
  });
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["agent-commissions-history"],
    queryFn: () => fetchHistory(),
  });

  const commissionEuros = commissionData?.commission_euros ?? 50;
  const totalCommissions = ((stats?.commissions_total_centimes ?? 0) / 100).toFixed(0);
  const totalPaye = ((history?.total_paye_centimes ?? 0) / 100).toFixed(2);
  const totalEnAttente = ((history?.total_en_attente_centimes ?? 0) / 100).toFixed(2);

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold">Mes Revenus</h2>
          <p className="text-sm text-muted-foreground">Suivi de vos commissions et gains.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="inline-flex items-center gap-2 text-google-blue">
              <Wallet className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Commissions totales
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold">{totalCommissions} €</div>
            <p className="text-xs text-muted-foreground mt-1">Depuis votre inscription</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="inline-flex items-center gap-2 text-google-green">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Taux actuel</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold">{commissionEuros} €</div>
            <p className="text-xs text-muted-foreground mt-1">Par fiche livrée et validée</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="inline-flex items-center gap-2 text-google-green">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Payé</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold">{totalPaye} €</div>
            <p className="text-xs text-muted-foreground mt-1">Commissions versées</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="inline-flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">En attente</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold">{totalEnAttente} €</div>
            <p className="text-xs text-muted-foreground mt-1">À verser</p>
          </div>
        </div>

        {/* Historique détaillé */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-bold text-lg">Historique des commissions</h3>
          </div>

          {historyLoading ? (
            <div className="p-10 text-center text-muted-foreground">Chargement…</div>
          ) : !history || history.fiches.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Aucune commission pour le moment.</p>
            </div>
          ) : (
            <>
              {/* Tableau desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase text-muted-foreground">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Entreprise</th>
                      <th className="px-6 py-3 text-right">Montant</th>
                      <th className="px-6 py-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.fiches.map((f) => (
                      <tr key={f.id} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {f.delivered_at
                            ? new Date(f.delivered_at).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-6 py-3 font-medium">{f.entreprise}</td>
                        <td className="px-6 py-3 text-right font-semibold whitespace-nowrap">
                          {(f.commission_centimes / 100).toFixed(2)} €
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Badge paid={f.commission_paid} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Liste mobile */}
              <div className="sm:hidden divide-y divide-border">
                {history.fiches.map((f) => (
                  <div key={f.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.entreprise}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {f.delivered_at
                          ? new Date(f.delivered_at).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                      <div className="mt-1.5">
                        <Badge paid={f.commission_paid} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold whitespace-nowrap">
                        {(f.commission_centimes / 100).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AgentLayout>
  );
}
function Badge({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-google-green/10 text-google-green px-2.5 py-1 text-xs font-semibold">
      <CheckCircle2 className="h-3 w-3" /> Payé
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-semibold">
      <Clock className="h-3 w-3" /> En attente
    </span>
  );
}
