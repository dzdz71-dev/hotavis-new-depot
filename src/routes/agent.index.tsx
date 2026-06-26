import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Inbox, Clock, ArrowRight, HandHelping, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listPoolTickets, listMyAssignedTickets, claimTicket } from "@/lib/agent.functions";
import { getPublicCommissionAmount } from "@/lib/agency-public.functions";

export const Route = createFileRoute("/agent/")({
  head: () => ({ meta: [{ title: "Tableau de bord Agent — Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: AgentDashboard,
});

function AgentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authReady, setAuthReady] = useState(false);
  const fetchPool = useServerFn(listPoolTickets);
  const fetchMine = useServerFn(listMyAssignedTickets);
  const claim = useServerFn(claimTicket);
  const fetchCommission = useServerFn(getPublicCommissionAmount);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/agent/login" });
      else setAuthReady(true);
    });
  }, [navigate]);

  const { data: pool, isLoading: lp } = useQuery({ queryKey: ["agent-pool"], queryFn: () => fetchPool(), enabled: authReady, refetchInterval: 15000 });
  const { data: mine, isLoading: lm } = useQuery({ queryKey: ["agent-mine"], queryFn: () => fetchMine(), enabled: authReady });
  const { data: commissionData } = useQuery({ queryKey: ["agent-commission"], queryFn: () => fetchCommission(), enabled: authReady });
  const commissionEuros = commissionData?.commission_euros ?? 50;

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/agent/login" });
  }

  async function takeTicket(id: string) {
    try {
      const res = await claim({ data: { commande_id: id } });
      if (!res.ok) {
        if (res.reason === "already_assigned") toast.error("Ce dossier vient d'être pris par un autre agent.");
        else toast.error("Impossible de prendre ce dossier.");
        queryClient.invalidateQueries({ queryKey: ["agent-pool"] });
        return;
      }
      toast.success("Dossier pris en charge ✓");
      queryClient.invalidateQueries({ queryKey: ["agent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["agent-mine"] });
      navigate({ to: "/agent/$id", params: { id } });
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    }
  }

  if (!authReady) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="inline-block bg-google-blue/15 text-google-blue text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Agent</div>
            <h1 className="text-xl font-extrabold mt-1">Tableau de bord</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-google-green/15 text-google-green text-xs font-bold px-3 py-1.5">
              <Wallet className="h-3.5 w-3.5" /> {commissionEuros} € / fiche livrée
            </span>
            <button onClick={logout} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-6">
        {/* Pool */}
        <section className="bg-card border border-border rounded-2xl shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2"><Inbox className="h-5 w-5 text-google-yellow" /> Missions disponibles ({pool?.tickets.length || 0})</h2>
          </div>
          <div className="p-4 space-y-3 max-h-[600px] overflow-auto">
            {lp && <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}
            {!lp && (pool?.tickets || []).length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">Aucun dossier en attente. Bravo à l'équipe ! 🎉</div>
            )}
            {(pool?.tickets || []).map((t) => (
              <div key={t.id} className="border border-border rounded-xl p-4 hover:bg-accent/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.entreprise}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.ville} • {t.activite}</div>
                    <div className="text-xs text-muted-foreground mt-1">Payé le {new Date(t.paid_at!).toLocaleDateString("fr-FR")}</div>
                    <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-google-green/15 text-google-green font-bold text-xs px-2.5 py-1">
                      <Wallet className="h-3.5 w-3.5" /> + {commissionEuros} €
                    </span>
                  </div>
                  <button onClick={() => takeTicket(t.id)} className="shrink-0 inline-flex items-center gap-1 text-xs font-bold rounded-full bg-google-blue text-white px-3 py-1.5 hover:opacity-90">
                    <HandHelping className="h-3.5 w-3.5" /> Je prends
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mine */}
        <section className="bg-card border border-border rounded-2xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-google-blue" /> Mes missions ({mine?.tickets.length || 0})</h2>
          </div>
          <div className="p-4 space-y-3 max-h-[600px] overflow-auto">
            {lm && <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}
            {!lm && (mine?.tickets || []).length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">Aucun dossier assigné pour le moment.</div>
            )}
            {(mine?.tickets || []).map((t) => (
              <Link key={t.id} to="/agent/$id" params={{ id: t.id }} className="block border border-border rounded-xl p-4 hover:bg-accent/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.entreprise}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.ville}</div>
                    <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                      <StatusBadge s={t.statut} />
                      <span className="inline-flex items-center gap-1 rounded-full bg-google-green/15 text-google-green font-bold px-2 py-0.5">
                        <Wallet className="h-3 w-3" /> Gains : {commissionEuros} €
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { l: string; c: string }> = {
    en_cours: { l: "En cours", c: "bg-google-yellow/20 text-amber-700" },
    onboarding_complété: { l: "Briefing reçu", c: "bg-google-blue/15 text-google-blue" },
    livrée: { l: "Livrée ✓", c: "bg-google-green/15 text-google-green" },
  };
  const v = map[s] || { l: s, c: "bg-muted" };
  return <span className={`inline-block rounded-full px-2 py-0.5 font-semibold ${v.c}`}>{v.l}</span>;
}
