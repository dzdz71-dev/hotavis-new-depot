import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Wallet, Clock, ArrowRight, Inbox, Target } from "lucide-react";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgentStats, listMyAssignedTickets } from "@/lib/agent.functions";
import { getPublicCommissionAmount } from "@/lib/agency-public.functions";

export const Route = createFileRoute("/agent/")({
  head: () => ({
    meta: [{ title: "Tableau de bord Agent — Hotavis" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentOverview,
});

function AgentOverview() {
  const fetchStats = useServerFn(getAgentStats);
  const fetchMine = useServerFn(listMyAssignedTickets);
  const fetchCommission = useServerFn(getPublicCommissionAmount);

  const { data: stats, isLoading: ls } = useQuery({
    queryKey: ["agent-stats"],
    queryFn: () => fetchStats(),
  });
  const { data: mine, isLoading: lm } = useQuery({
    queryKey: ["agent-mine"],
    queryFn: () => fetchMine(),
  });
  const { data: commissionData } = useQuery({
    queryKey: ["agent-commission"],
    queryFn: () => fetchCommission(),
  });
  const commissionEuros = commissionData?.commission_euros ?? 50;

  const recent = (mine?.tickets || []).slice(0, 5);

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold">Vue d'ensemble</h2>
          <p className="text-sm text-muted-foreground">Suivez votre activité et vos gains.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Fiches livrées ce mois"
            value={ls ? "—" : (stats?.fiches_livrees_mois ?? 0)}
            color="text-google-green"
          />
          <KpiCard
            icon={<Wallet className="h-5 w-5" />}
            label="Commissions générées (total)"
            value={ls ? "—" : `${((stats?.commissions_total_centimes ?? 0) / 100).toFixed(0)} €`}
            color="text-google-blue"
          />
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="Missions en cours"
            value={ls ? "—" : (stats?.missions_en_cours ?? 0)}
            color="text-google-yellow"
          />
        </div>

        {/* Commission rate info */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold">Votre rémunération</h3>
            <p className="text-sm text-muted-foreground">
              Vous gagnez {commissionEuros} € par fiche livrée et validée.
            </p>
          </div>
          <Link
            to="/agent/market"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-google-blue text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
          >
            <Inbox className="h-4 w-4" /> Voir les missions
          </Link>
        </div>

        {/* Mes résultats */}
        <div>
          <h3 className="text-lg font-bold">Mes résultats</h3>
          <p className="text-sm text-muted-foreground">
            Voici le détail de vos missions terminées et de vos commissions.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                Dossiers validés
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-google-green" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">
                {ls ? "—" : (stats?.fiches_livrees_mois ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ce mois-ci</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                Commissions
              </CardTitle>
              <Wallet className="h-5 w-5 text-google-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">
                {ls ? "—" : `${((stats?.commissions_total_centimes ?? 0) / 100).toFixed(0)} €`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total cumulé</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                Objectif du mois
              </CardTitle>
              <Target className="h-5 w-5 text-google-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">
                {ls ? "—" : `${stats?.fiches_livrees_mois ?? 0} / 10`}
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-google-blue transition-all"
                  style={{
                    width: `${Math.min(((stats?.fiches_livrees_mois ?? 0) / 10) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.min(Math.round(((stats?.fiches_livrees_mois ?? 0) / 10) * 100), 100)}% de
                l'objectif
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent cases */}
        <div className="bg-card border border-border rounded-2xl shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold">Dossiers récents</h3>
            <Link
              to="/agent/cases"
              className="text-sm font-semibold text-google-blue hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {lm && (
              <div className="text-center py-8">
                <Loader2 className="h-5 w-5 animate-spin inline" />
              </div>
            )}
            {!lm && recent.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Aucun dossier pour le moment. Allez chercher une mission sur le marché !
              </div>
            )}
            {recent.map((t) => (
              <Link
                key={t.id}
                to="/agent/$id"
                params={{ id: t.id }}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:bg-accent/30 transition"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.entreprise}</div>
                  <div className="text-xs text-muted-foreground">{t.ville}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className={`inline-flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
    </div>
  );
}
