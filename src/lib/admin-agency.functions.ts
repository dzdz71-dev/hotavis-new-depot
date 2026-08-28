import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "@/lib/admin-guard";

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at, status, suspended_at, deleted_at")
      .eq("role", "agent");
    if (rErr) throw new Error(rErr.message);

    const userIds = (roles || []).map((r) => r.user_id);
    const agents: Array<{
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
    }> = [];

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    for (const uid of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const email = u?.user?.email || "—";
      const userMeta = u?.user?.user_metadata as { full_name?: string; phone?: string } | undefined;

      // Récupère les infos depuis candidatures (si recruté via candidature)
      let prenom = userMeta?.full_name || "";
      let telephone = userMeta?.phone || "";
      if (email && email !== "—") {
        const { data: cand } = await supabaseAdmin
          .from("candidatures")
          .select("prenom, nom, telephone")
          .eq("email", email.toLowerCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cand) {
          prenom = prenom || `${cand.prenom} ${cand.nom}`.trim();
          telephone = telephone || cand.telephone || "";
        }
      }

      const { data: livrees } = await supabaseAdmin
        .from("commandes")
        .select("id, delivered_at, commission_centimes")
        .eq("assigned_agent_id", uid)
        .eq("statut", "livrée");
      const list = livrees || [];
      const mois = list.filter((c) => c.delivered_at && new Date(c.delivered_at) >= monthStart);
      const commission_due = mois.reduce((s, c) => s + (c.commission_centimes || 0), 0);
      agents.push({
        id: uid,
        email,
        full_name: prenom,
        phone: telephone,
        created_at: roles!.find((r) => r.user_id === uid)?.created_at || "",
        status: roles!.find((r) => r.user_id === uid)?.status || "active",
        suspended_at: roles!.find((r) => r.user_id === uid)?.suspended_at || null,
        deleted_at: roles!.find((r) => r.user_id === uid)?.deleted_at || null,
        fiches_total: list.length,
        fiches_mois: mois.length,
        commission_due_centimes: commission_due,
      });
    }

    return { agents };
  });

export const inviteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ email: z.string().email().max(255) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const { error } = await supabaseAdmin.from("agent_invitations").insert({
      email: data.email.toLowerCase().trim(),
      token,
      invited_by: context.userId,
    });
    if (error) throw new Error(error.message);

    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.SITE_URL || "http://localhost:8080";
    const link = `${baseUrl}/accept-invitation/${token}`;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn("[inviteAgent] RESEND_API_KEY manquante — email non envoyé");
      return { ok: true, link, emailSent: false, emailError: "RESEND_API_KEY non configurée" };
    }

    const resend = new Resend(resendKey);
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const res = await resend.emails.send({
        from: "Hotavis <noreply@hotavis.fr>",
        to: [data.email],
        subject: "Vous êtes invité à rejoindre l'équipe Hotavis 🚀",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2>Bienvenue dans l'équipe !</h2>
        <p>Vous avez été invité à rejoindre la plateforme Hotavis en tant qu'<b>Agent</b>.</p>
        <p>Cliquez sur le lien ci-dessous pour créer votre compte (valable 7 jours) :</p>
        <p><a href="${link}" style="display:inline-block;background:#4285F4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Accepter l'invitation</a></p>
        <p style="color:#666;font-size:13px;margin-top:32px">Si vous n'êtes pas le destinataire prévu, ignorez ce message.</p>
      </div>`,
      });
      if (res.error) {
        emailError = res.error.message;
        console.error("[inviteAgent] Erreur Resend:", res.error);
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = (e as Error)?.message || "Erreur inconnue";
      console.error("[inviteAgent] Exception envoi email:", e);
    }

    return { ok: true, link, emailSent, emailError };
  });

export const revokeAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "agent");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Suspension / Réactivation / Suppression (soft delete) ────────────────

export const suspendAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ status: "suspended", suspended_at: new Date().toISOString() })
      .eq("user_id", data.user_id)
      .eq("role", "agent");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reactivateAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ status: "active", suspended_at: null })
      .eq("user_id", data.user_id)
      .eq("role", "agent");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Soft delete : on marque le rôle comme supprimé sans le retirer
    // physiquement, afin de préserver l'historique des commandes.
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .eq("user_id", data.user_id)
      .eq("role", "agent");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Détails d'un agent (tâches + commandes) ──────────────────────────────

export const getAgentDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Récupérer l'email de l'agent via Auth Admin
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    const email = u?.user?.email || "—";
    const userMeta = u?.user?.user_metadata as { full_name?: string; phone?: string } | undefined;

    let full_name = userMeta?.full_name || "";
    let phone = userMeta?.phone || "";
    if (email && email !== "—") {
      const { data: cand } = await supabaseAdmin
        .from("candidatures")
        .select("prenom, nom, telephone")
        .eq("email", email.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cand) {
        full_name = full_name || `${cand.prenom} ${cand.nom}`.trim();
        phone = phone || cand.telephone || "";
      }
    }

    // Récupérer le statut du rôle agent
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("status, created_at, suspended_at, deleted_at")
      .eq("user_id", data.user_id)
      .eq("role", "agent")
      .maybeSingle();

    // Récupérer toutes les commandes assignées à cet agent
    const { data: commandes, error: cErr } = await supabaseAdmin
      .from("commandes")
      .select(
        "id, prenom, nom, entreprise, ville, activite, statut, created_at, paid_at, assigned_at, delivered_at, commission_centimes, commission_paid",
      )
      .eq("assigned_agent_id", data.user_id)
      .order("assigned_at", { ascending: false });
    if (cErr) throw new Error(cErr.message);

    const allCommandes = commandes || [];

    // Séparer les tâches en cours et les commandes livrées
    const taches_en_cours = allCommandes.filter((c) =>
      ["en_cours", "onboarding_complété", "bloque"].includes(c.statut),
    );
    const commandes_livrees = allCommandes.filter((c) => c.statut === "livrée");

    // Statistiques
    const total_commission_centimes = commandes_livrees.reduce(
      (s, c) => s + (c.commission_centimes || 0),
      0,
    );
    const commission_payee_centimes = commandes_livrees
      .filter((c) => c.commission_paid)
      .reduce((s, c) => s + (c.commission_centimes || 0), 0);
    const commission_en_attente_centimes = commandes_livrees
      .filter((c) => !c.commission_paid)
      .reduce((s, c) => s + (c.commission_centimes || 0), 0);

    return {
      agent: {
        id: data.user_id,
        email,
        full_name,
        phone,
        status: role?.status || "active",
        created_at: role?.created_at || "",
        suspended_at: role?.suspended_at || null,
        deleted_at: role?.deleted_at || null,
      },
      taches_en_cours,
      commandes_livrees,
      stats: {
        total_commandes: allCommandes.length,
        taches_en_cours_count: taches_en_cours.length,
        commandes_livrees_count: commandes_livrees.length,
        total_commission_centimes,
        commission_payee_centimes,
        commission_en_attente_centimes,
      },
    };
  });

export const getKanbanView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select(
        "id, prenom, nom, entreprise, ville, statut, assigned_agent_id, assigned_at, paid_at, delivered_at, created_at",
      )
      .in("statut", ["payé", "onboarding_complété", "en_cours", "livrée", "bloque"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    // Map agent_id -> email
    const agentIds = Array.from(
      new Set((data || []).map((c) => c.assigned_agent_id).filter(Boolean)),
    ) as string[];
    const agentMap: Record<string, string> = {};
    for (const uid of agentIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (u?.user) agentMap[uid] = u.user.email || "—";
    }

    const nouveaux = (data || []).filter((c) => c.statut === "payé" && !c.assigned_agent_id);
    const en_cours = (data || []).filter(
      (c) => c.statut === "en_cours" || c.statut === "onboarding_complété",
    );
    const livrees = (data || []).filter((c) => c.statut === "livrée").slice(0, 30);
    const bloques = (data || []).filter((c) => c.statut === "bloque");

    type KanbanCommande = {
      id: string;
      prenom: string;
      nom: string;
      entreprise: string;
      ville: string;
      statut: string;
      assigned_agent_id: string | null;
      assigned_at: string | null;
      paid_at: string | null;
      delivered_at: string | null;
      created_at: string;
    };

    const enrich = (list: KanbanCommande[]) =>
      list.map((c) => ({
        ...c,
        agent_email: c.assigned_agent_id ? agentMap[c.assigned_agent_id] : null,
      }));
    return {
      nouveaux: enrich(nouveaux),
      en_cours: enrich(en_cours),
      livrees: enrich(livrees),
      bloques: enrich(bloques),
    };
  });

export const unblockCommande = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commande_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // On ne débloque que les commandes effectivement bloquées.
    const { data: commande, error: cErr } = await supabaseAdmin
      .from("commandes")
      .select("id, statut")
      .eq("id", data.commande_id)
      .single();
    if (cErr || !commande) throw new Error("Commande introuvable");
    if (commande.statut !== "bloque")
      throw new Error("Seules les commandes bloquées peuvent être débloquées");

    const { error } = await supabaseAdmin
      .from("commandes")
      .update({ statut: "en_cours" })
      .eq("id", data.commande_id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const getCommissionsReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/), // "2026-06"
        agent_id: z.string().uuid().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const [year, month] = data.month.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    let q = supabaseAdmin
      .from("commandes")
      .select(
        "id, entreprise, assigned_agent_id, delivered_at, commission_centimes, montant_centimes, commission_paid",
      )
      .eq("statut", "livrée")
      .gte("delivered_at", start.toISOString())
      .lt("delivered_at", end.toISOString());
    if (data.agent_id) q = q.eq("assigned_agent_id", data.agent_id);

    const { data: rows, error } = await q.order("delivered_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Group by agent
    type CommissionFiche = {
      id: string;
      entreprise: string;
      delivered_at: string | null;
      commission_centimes: number;
      commission_paid: boolean;
    };

    const byAgent: Record<
      string,
      {
        agent_id: string;
        email: string;
        count: number;
        total_commission_centimes: number;
        fiches: CommissionFiche[];
      }
    > = {};
    for (const r of rows || []) {
      if (!r.assigned_agent_id) continue;
      if (!byAgent[r.assigned_agent_id]) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.assigned_agent_id);
        byAgent[r.assigned_agent_id] = {
          agent_id: r.assigned_agent_id,
          email: u?.user?.email || "—",
          count: 0,
          total_commission_centimes: 0,
          fiches: [],
        };
      }
      byAgent[r.assigned_agent_id].count += 1;
      byAgent[r.assigned_agent_id].total_commission_centimes += r.commission_centimes || 0;
      byAgent[r.assigned_agent_id].fiches.push({
        id: r.id,
        entreprise: r.entreprise,
        delivered_at: r.delivered_at,
        commission_centimes: r.commission_centimes || 0,
        commission_paid: r.commission_paid,
      });
    }

    return { month: data.month, agents: Object.values(byAgent), total: rows?.length || 0 };
  });

export const markCommissionsAsPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        commande_ids: z.array(z.string().uuid()).min(1).max(1000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // On ne marque que les fiches livrées et non déjà payées, pour éviter
    // un UPDATE inutile ou une modification accidentelle d'autres lignes.
    const { data: updated, error } = await supabaseAdmin
      .from("commandes")
      .update({ commission_paid: true })
      .in("id", data.commande_ids)
      .eq("statut", "livrée")
      .eq("commission_paid", false)
      .select("id");

    if (error) throw new Error(error.message);

    return { ok: true, updated: updated?.length || 0 };
  });

export const getAgencySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("agency_settings").select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return { settings: data };
  });

export const updateAgencySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        commission_centimes_per_fiche: z.number().int().min(0).max(100000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("agency_settings")
      .update({
        commission_centimes_per_fiche: data.commission_centimes_per_fiche,
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
