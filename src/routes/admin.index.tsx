import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Package, Clock, Cog, CheckCircle2, Euro } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listCommandes } from "@/lib/admin.functions";
import { AdminNav } from "@/components/admin/AdminNav";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
  en_attente: { label: "En attente paiement", cls: "bg-muted text-muted-foreground" },
  payé: { label: "Informations en attente", cls: "bg-google-yellow/20 text-amber-700" },
  onboarding_complété: { label: "À faire", cls: "bg-google-blue/15 text-google-blue" },
  en_cours: { label: "En cours", cls: "bg-google-yellow/20 text-amber-700" },
  livrée: { label: "Livrée", cls: "bg-google-green/15 text-google-green" },
  annulée: { label: "Annulée", cls: "bg-google-red/15 text-google-red" },
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const fetchCommandes = useServerFn(listCommandes);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin/login" });
      else setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/admin/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-commandes"],
    queryFn: () => fetchCommandes(),
    enabled: authReady,
  });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (!authReady || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div><h1 className="text-xl font-bold text-google-red">Erreur</h1>
      <p className="text-muted-foreground mt-2">{(error as Error).message}</p>
      <button onClick={logout} className="mt-4 rounded-full border border-border px-5 py-2 text-sm">Se déconnecter</button></div>
    </div>;
  }

  const { commandes, stats } = data!;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold">Admin Hotavis</h1>
            <p className="text-xs text-muted-foreground">Gestion des commandes</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </header>
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Stat icon={<Package className="h-5 w-5" />} label="Total" value={stats.total} />
          <Stat icon={<Clock className="h-5 w-5" />} label="En attente" value={stats.en_attente} />
          <Stat icon={<Cog className="h-5 w-5" />} label="En cours" value={stats.en_cours} />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Livrées" value={stats.livrees} />
          <Stat icon={<Euro className="h-5 w-5" />} label="CA total" value={`${(stats.ca_total / 100).toFixed(0)}€`} />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Entreprise</th>
                  <th className="px-4 py-3 font-semibold">Activité</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Délai</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {commandes.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Aucune commande pour le moment.</td></tr>
                )}
                {commandes.map((c) => {
                  const s = STATUT_LABEL[c.statut] || { label: c.statut, cls: "bg-muted" };
                  const delai = computeDelai(c);
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.prenom} {c.nom}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.entreprise}</div>
                        <div className="text-xs text-muted-foreground">{c.ville}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.activite}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {delai ? (
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${delai.cls}`}>{delai.label}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to="/admin/$id" params={{ id: c.id }} className="text-google-blue font-semibold hover:underline">Détails →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-1.5 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

/** Jours ouvrés restants sur la garantie 7 jours, à partir de paid_at. */
function computeDelai(c: { statut: string; paid_at: string | null; delivered_at: string | null }) {
  if (c.statut === "livrée") return { label: "Livrée ✓", cls: "bg-google-green/15 text-google-green" };
  if (c.statut === "annulée" || c.statut === "en_attente" || !c.paid_at) return null;
  const start = new Date(c.paid_at);
  const now = new Date();
  // Compte les jours ouvrés écoulés (lun-ven)
  let used = 0;
  const cursor = new Date(start);
  while (cursor < now) {
    cursor.setDate(cursor.getDate() + 1);
    const d = cursor.getDay();
    if (d !== 0 && d !== 6) used += 1;
  }
  const remaining = 7 - used;
  if (remaining <= 0) return { label: `⚠ Retard ${Math.abs(remaining)}j`, cls: "bg-google-red/15 text-google-red" };
  if (remaining <= 2) return { label: `⏰ ${remaining}j restants`, cls: "bg-google-yellow/20 text-amber-700" };
  return { label: `${remaining}j restants`, cls: "bg-google-blue/15 text-google-blue" };
}
