import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Accès refusé : admin requis");
}

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles").select("user_id, created_at").eq("role", "agent");
    if (rErr) throw new Error(rErr.message);

    const userIds = (roles || []).map((r) => r.user_id);
    const agents: Array<{ id: string; email: string; created_at: string; fiches_total: number; fiches_mois: number; commission_due_centimes: number }> = [];

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    for (const uid of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const email = u?.user?.email || "—";
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
        created_at: roles!.find((r) => r.user_id === uid)?.created_at || "",
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
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "Hotavis <onboarding@resend.dev>",
        to: [data.email],
        subject: "Vous êtes invité à rejoindre l'équipe Hotavis 🚀",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2>Bienvenue dans l'équipe !</h2>
          <p>Vous avez été invité à rejoindre la plateforme Hotavis en tant qu'<b>Agent</b>.</p>
          <p>Cliquez sur le lien ci-dessous pour créer votre compte (valable 7 jours) :</p>
          <p><a href="${link}" style="display:inline-block;background:#4285F4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Accepter l'invitation</a></p>
          <p style="color:#666;font-size:13px;margin-top:32px">Si vous n'êtes pas le destinataire prévu, ignorez ce message.</p>
        </div>`,
      }).catch((e) => console.error(e));
    }
    return { ok: true, link };
  });

export const revokeAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.user_id).eq("role", "agent");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getKanbanView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select("id, prenom, nom, entreprise, ville, statut, assigned_agent_id, assigned_at, paid_at, delivered_at, created_at")
      .in("statut", ["payé", "onboarding_complété", "en_cours", "livrée"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    // Map agent_id -> email
    const agentIds = Array.from(new Set((data || []).map((c) => c.assigned_agent_id).filter(Boolean))) as string[];
    const agentMap: Record<string, string> = {};
    for (const uid of agentIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (u?.user) agentMap[uid] = u.user.email || "—";
    }

    const nouveaux = (data || []).filter((c) => c.statut === "payé" && !c.assigned_agent_id);
    const en_cours = (data || []).filter((c) => c.statut === "en_cours" || c.statut === "onboarding_complété");
    const livrees = (data || []).filter((c) => c.statut === "livrée").slice(0, 30);

    const enrich = (list: any[]) => list.map((c) => ({ ...c, agent_email: c.assigned_agent_id ? agentMap[c.assigned_agent_id] : null }));
    return { nouveaux: enrich(nouveaux), en_cours: enrich(en_cours), livrees: enrich(livrees) };
  });

export const getCommissionsReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/), // "2026-06"
    agent_id: z.string().uuid().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const [year, month] = data.month.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    let q = supabaseAdmin
      .from("commandes")
      .select("id, entreprise, assigned_agent_id, delivered_at, commission_centimes, montant_centimes")
      .eq("statut", "livrée")
      .gte("delivered_at", start.toISOString())
      .lt("delivered_at", end.toISOString());
    if (data.agent_id) q = q.eq("assigned_agent_id", data.agent_id);

    const { data: rows, error } = await q.order("delivered_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Group by agent
    const byAgent: Record<string, { agent_id: string; email: string; count: number; total_commission_centimes: number; fiches: any[] }> = {};
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
      byAgent[r.assigned_agent_id].fiches.push({ id: r.id, entreprise: r.entreprise, delivered_at: r.delivered_at, commission_centimes: r.commission_centimes || 0 });
    }

    return { month: data.month, agents: Object.values(byAgent), total: rows?.length || 0 };
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
  .inputValidator((i) => z.object({
    commission_centimes_per_fiche: z.number().int().min(0).max(100000),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("agency_settings")
      .update({ commission_centimes_per_fiche: data.commission_centimes_per_fiche, updated_at: new Date().toISOString() })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
