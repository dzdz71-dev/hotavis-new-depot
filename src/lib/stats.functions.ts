import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "@/lib/admin-guard";

type CaParMois = {
  mois: string;
  ca_centimes: number;
  nb_dossiers: number;
};

type DossiersParAgent = {
  agent_id: string;
  email: string;
  nb_dossiers: number;
};

type DashboardAnalytics = {
  caParMois: CaParMois[];
  dossiersParAgent: DossiersParAgent[];
};

/**
 * Agrège les données de pilotage pour le dashboard admin :
 *  - CA total par mois (6 derniers mois) pour un graphique en barres.
 *  - Nombre de dossiers livrés par agent pour un graphique circulaire.
 */
export const getDashboardAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    // --- CA par mois (6 derniers mois) ---
    // On ne compte que les commandes payées (hors en_attente et annulée).
    const maintenant = new Date();
    const moisLabels: string[] = [];
    const moisDates: { start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      const end = new Date(maintenant.getFullYear(), maintenant.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      moisLabels.push(label);
      moisDates.push({ start: d, end });
    }

    const sixMoisAgo = moisDates[0].start.toISOString();
    const { data: commandes, error: cmdErr } = await supabaseAdmin
      .from("commandes")
      .select("id, montant_centimes, statut, paid_at, created_at")
      .not("statut", "eq", "en_attente")
      .not("statut", "eq", "annulée")
      .or(`paid_at.gte.${sixMoisAgo},created_at.gte.${sixMoisAgo}`)
      .order("created_at", { ascending: true });

    if (cmdErr) throw new Error(cmdErr.message);

    const caParMois: CaParMois[] = moisLabels.map((mois, i) => {
      const { start, end } = moisDates[i];
      const cmdDuMois = (commandes || []).filter((c) => {
        const dateStr = c.paid_at || c.created_at;
        const d = new Date(dateStr);
        return d >= start && d < end;
      });
      return {
        mois,
        ca_centimes: cmdDuMois.reduce((s, c) => s + c.montant_centimes, 0),
        nb_dossiers: cmdDuMois.length,
      };
    });

    // --- Dossiers par agent (livrés) ---
    const { data: livrees, error: livErr } = await supabaseAdmin
      .from("commandes")
      .select("id, assigned_agent_id")
      .eq("statut", "livrée")
      .not("assigned_agent_id", "is", null);

    if (livErr) throw new Error(livErr.message);

    // Grouper par agent
    const countByAgent: Record<string, number> = {};
    for (const c of livrees || []) {
      const aid = c.assigned_agent_id as string;
      countByAgent[aid] = (countByAgent[aid] || 0) + 1;
    }

    // Récupérer les emails
    const dossiersParAgent: DossiersParAgent[] = [];
    for (const [agentId, count] of Object.entries(countByAgent)) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(agentId);
      dossiersParAgent.push({
        agent_id: agentId,
        email: u?.user?.email || "—",
        nb_dossiers: count,
      });
    }
    // Trier par nombre de dossiers décroissant
    dossiersParAgent.sort((a, b) => b.nb_dossiers - a.nb_dossiers);

    const result: DashboardAnalytics = { caParMois, dossiersParAgent };
    return result;
  });
