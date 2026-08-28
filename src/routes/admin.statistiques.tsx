import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3, PieChart as PieIcon, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { getDashboardAnalytics } from "@/lib/stats.functions";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const Route = createFileRoute("/admin/statistiques")({
  head: () => ({
    meta: [{ title: "Statistiques — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: StatistiquesPage,
});

const COLORS_AGENT = [
  "#4285F4",
  "#34A853",
  "#FBBC04",
  "#EA4335",
  "#A142F4",
  "#F47CB4",
  "#00BCD4",
  "#FF9800",
];

const caConfig: ChartConfig = {
  ca_centimes: { label: "CA (€)", color: "#4285F4" },
  nb_dossiers: { label: "Dossiers", color: "#34A853" },
};

const agentConfig: ChartConfig = {
  nb_dossiers: { label: "Dossiers livrés" },
};

function StatistiquesPage() {
  const guard = useAdminGuard();
  const fetchAnalytics = useServerFn(getDashboardAnalytics);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => fetchAnalytics(),
    enabled: guard === "authorized",
  });

  if (guard !== "authorized" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-xl font-bold text-google-red">Erreur</h1>
          <p className="text-muted-foreground mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const caData = (data?.caParMois || []).map((m) => ({
    mois: m.mois,
    ca_centimes: m.ca_centimes / 100,
    nb_dossiers: m.nb_dossiers,
  }));

  const agentData = (data?.dossiersParAgent || []).map((a, i) => ({
    email: a.email,
    nb_dossiers: a.nb_dossiers,
    fill: COLORS_AGENT[i % COLORS_AGENT.length],
  }));

  const totalCa = caData.reduce((s, m) => s + m.ca_centimes, 0);
  const totalDossiers = caData.reduce((s, m) => s + m.nb_dossiers, 0);
  const totalDossiersAgent = agentData.reduce((s, a) => s + a.nb_dossiers, 0);

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Admin Hotavis</h1>
          <NotificationsBell />
        </div>
      </header>
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Statistiques & Pilotage</h2>
          <p className="text-sm text-muted-foreground">
            Chiffre d'affaires et performance des agents sur les 6 derniers mois.
          </p>
        </div>

        {/* Stats résumées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CA total (6 mois)</CardTitle>
              <TrendingUp className="h-4 w-4 text-google-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCa.toFixed(2)}€</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dossiers (6 mois)</CardTitle>
              <BarChart3 className="h-4 w-4 text-google-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDossiers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dossiers livrés par agents</CardTitle>
              <PieIcon className="h-4 w-4 text-google-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDossiersAgent}</div>
            </CardContent>
          </Card>
        </div>

        {/* Graphique CA par mois */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-google-blue" />
              Chiffre d'affaires par mois
            </CardTitle>
            <CardDescription>
              CA en euros et nombre de dossiers sur les 6 derniers mois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {caData.length === 0 || totalCa === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Aucune donnée disponible.
              </div>
            ) : (
              <ChartContainer config={caConfig} className="h-[300px] w-full">
                <BarChart data={caData} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="mois" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}€`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="ca_centimes"
                    fill="var(--color-ca_centimes)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Graphique dossiers par agent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-google-yellow" />
              Dossiers livrés par agent
            </CardTitle>
            <CardDescription>
              Répartition des dossiers livrés par agent (camembert).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agentData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Aucun dossier livré par agent pour le moment.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ChartContainer config={agentConfig} className="h-[300px] w-full md:w-1/2">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="email" hideLabel />} />
                    <Pie
                      data={agentData}
                      dataKey="nb_dossiers"
                      nameKey="email"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {agentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="w-full md:w-1/2 space-y-2">
                  {agentData.map((a, i) => (
                    <div key={a.email} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: COLORS_AGENT[i % COLORS_AGENT.length] }}
                        />
                        {a.email}
                      </span>
                      <span className="font-semibold">{a.nb_dossiers}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
