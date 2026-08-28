import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Inbox, HandHelping, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { listPoolTickets, claimTicket } from "@/lib/agent.functions";
import { getPublicCommissionAmount } from "@/lib/agency-public.functions";

export const Route = createFileRoute("/agent/market")({
  head: () => ({
    meta: [{ title: "Marché des missions — Hotavis" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentMarket,
});

function AgentMarket() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchPool = useServerFn(listPoolTickets);
  const claim = useServerFn(claimTicket);
  const fetchCommission = useServerFn(getPublicCommissionAmount);

  const { data: pool, isLoading: lp } = useQuery({
    queryKey: ["agent-pool"],
    queryFn: () => fetchPool(),
    refetchInterval: 15000,
  });
  const { data: commissionData } = useQuery({
    queryKey: ["agent-commission"],
    queryFn: () => fetchCommission(),
  });
  const commissionEuros = commissionData?.commission_euros ?? 50;

  async function takeTicket(id: string) {
    try {
      const res = await claim({ data: { commande_id: id } });
      if (!res.ok) {
        if (res.reason === "already_assigned")
          toast.error("Ce dossier vient d'être pris par un autre agent.");
        else toast.error("Impossible de prendre ce dossier.");
        queryClient.invalidateQueries({ queryKey: ["agent-pool"] });
        return;
      }
      toast.success("Dossier pris en charge ✓");
      queryClient.invalidateQueries({ queryKey: ["agent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["agent-mine"] });
      navigate({ to: "/agent/$id", params: { id } });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur");
    }
  }

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold">Marché des missions</h2>
          <p className="text-sm text-muted-foreground">
            Dossiers disponibles ({pool?.tickets.length || 0}). Chaque fiche livrée ={" "}
            {commissionEuros} €.
          </p>
        </div>

        <section className="bg-card border border-border rounded-2xl shadow-card">
          <div className="p-4 space-y-3 max-h-[700px] overflow-auto">
            {lp && (
              <div className="text-center py-8">
                <Loader2 className="h-5 w-5 animate-spin inline" />
              </div>
            )}
            {!lp && (pool?.tickets || []).length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Aucun dossier en attente. Bravo à l'équipe ! 🎉
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
                    onClick={() => takeTicket(t.id)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-bold rounded-full bg-google-blue text-white px-3 py-1.5 hover:opacity-90"
                  >
                    <HandHelping className="h-3.5 w-3.5" /> Je prends
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AgentLayout>
  );
}
