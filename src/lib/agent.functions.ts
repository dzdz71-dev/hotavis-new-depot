import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";

async function assertAgentOrAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["agent", "admin"]);
  if (!data || data.length === 0) throw new Error("Accès refusé : rôle agent ou admin requis");
  return data.map((r) => r.role);
}

export const listPoolTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgentOrAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select("id, prenom, nom, entreprise, ville, activite, statut, created_at, paid_at")
      .eq("statut", "payé")
      .is("assigned_agent_id", null)
      .order("paid_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { tickets: data || [] };
  });

export const listMyAssignedTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgentOrAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select("id, prenom, nom, entreprise, ville, activite, statut, assigned_at, paid_at, delivered_at")
      .eq("assigned_agent_id", context.userId)
      .in("statut", ["en_cours", "onboarding_complété", "livrée"])
      .order("assigned_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tickets: data || [] };
  });

export const claimTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commande_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAgentOrAdmin(context.userId);
    const { data: result, error } = await supabaseAdmin.rpc("claim_commande", { _commande_id: data.commande_id });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; reason?: string };
  });

export const getAgentTicketDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const roles = await assertAgentOrAdmin(context.userId);
    const isAdmin = roles.includes("admin");

    const { data: full, error } = await supabaseAdmin
      .from("commandes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !full) throw new Error("Dossier introuvable");

    if (!isAdmin && full.assigned_agent_id !== context.userId) {
      throw new Error("Ce dossier n'est pas assigné à vous");
    }

    // Filtre les colonnes sensibles pour les agents (pas d'email/téléphone/montant client)
    const commande: any = isAdmin
      ? full
      : {
          id: full.id, prenom: full.prenom, nom: full.nom, entreprise: full.entreprise,
          ville: full.ville, activite: full.activite, statut: full.statut,
          assigned_agent_id: full.assigned_agent_id, assigned_at: full.assigned_at,
          created_at: full.created_at, paid_at: full.paid_at, delivered_at: full.delivered_at,
        };

    const { data: onboarding } = await supabaseAdmin
      .from("onboardings")
      .select("*")
      .eq("commande_id", data.id)
      .maybeSingle();

    const { data: notes } = await supabaseAdmin
      .from("agent_notes")
      .select("id, contenu, created_at, agent_id")
      .eq("commande_id", data.id)
      .order("created_at", { ascending: true });

    let justificatifSignedUrl: string | null = null;
    let factureSignedUrl: string | null = null;
    if (onboarding?.justificatif_url) {
      const { data: s } = await supabaseAdmin.storage.from("documents-gmb").createSignedUrl(onboarding.justificatif_url, 3600);
      justificatifSignedUrl = s?.signedUrl || null;
    }
    if ((onboarding as any)?.facture_url) {
      const { data: s } = await supabaseAdmin.storage.from("documents-gmb").createSignedUrl((onboarding as any).facture_url, 3600);
      factureSignedUrl = s?.signedUrl || null;
    }

    return { commande, onboarding, notes: notes || [], justificatifSignedUrl, factureSignedUrl };
  });

export const addInternalNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    commande_id: z.string().uuid(),
    contenu: z.string().trim().min(1).max(2000),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAgentOrAdmin(context.userId);
    const { error } = await supabaseAdmin.from("agent_notes").insert({
      commande_id: data.commande_id,
      agent_id: context.userId,
      contenu: data.contenu,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markTicketCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commande_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const roles = await assertAgentOrAdmin(context.userId);
    const isAdmin = roles.includes("admin");

    const { data: commande, error: cErr } = await supabaseAdmin
      .from("commandes")
      .select("id, assigned_agent_id, prenom, entreprise, email, commission_centimes")
      .eq("id", data.commande_id)
      .single();
    if (cErr || !commande) throw new Error("Dossier introuvable");
    if (!isAdmin && commande.assigned_agent_id !== context.userId) throw new Error("Dossier non assigné");

    // La commission a été figée au moment du claim_commande (M10).
    // Si pour une raison quelconque elle est NULL (commande antérieure à la
    // migration M10), on fallback sur la valeur actuelle de agency_settings.
    let commission = commande.commission_centimes;
    if (commission == null) {
      const { data: settings } = await supabaseAdmin
        .from("agency_settings")
        .select("commission_centimes_per_fiche")
        .maybeSingle();
      commission = settings?.commission_centimes_per_fiche ?? 5000;
    }

    const { error } = await supabaseAdmin
      .from("commandes")
      .update({
        statut: "livrée",
        delivered_at: new Date().toISOString(),
        commission_centimes: commission,  // conserve la valeur figée
      })
      .eq("id", data.commande_id);
    if (error) throw new Error(error.message);

    // Email client (déjà existant côté admin, on dédouble pas — on déclenche ici)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "Hotavis <onboarding@resend.dev>",
        to: [commande.email],
        subject: "🎉 Votre fiche Google est en ligne !",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#34A853">Félicitations ${escapeHtml(commande.prenom)} !</h2>
          <p>Votre fiche Google Business Profile pour <b>${escapeHtml(commande.entreprise)}</b> est en ligne. 🚀</p>
          <p>Recherchez votre entreprise sur Google pour la voir apparaître.</p>
          <p><b>Prochaine étape :</b> demandez à vos premiers clients de laisser un avis 5 étoiles.</p>
          <p style="color:#666;font-size:13px;margin-top:32px">— L'équipe Hotavis</p>
        </div>`,
      }).catch((e) => console.error(e));
    }
    return { ok: true };
  });

