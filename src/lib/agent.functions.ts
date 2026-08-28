import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";
import { notifyAdmins, notifyAgent } from "@/lib/notifications";

export const submitAgentApplication = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().min(6).max(30),
        motivation: z.string().trim().min(10).max(3000),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("agent_applications").insert({
      full_name: data.full_name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      motivation: data.motivation,
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error("Une candidature avec cet email existe déjà.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const reportTicketIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        commande_id: z.string().uuid(),
        reason: z.string().trim().min(3).max(2000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const roles = await assertAgentOrAdmin(context.userId);
    const isAdmin = roles.includes("admin");

    const { data: commande, error: cErr } = await supabaseAdmin
      .from("commandes")
      .select("id, assigned_agent_id, entreprise")
      .eq("id", data.commande_id)
      .single();
    if (cErr || !commande) throw new Error("Dossier introuvable");
    if (!isAdmin && commande.assigned_agent_id !== context.userId)
      throw new Error("Dossier non assigné");

    const { error } = await supabaseAdmin
      .from("commandes")
      .update({ statut: "bloque" })
      .eq("id", data.commande_id);
    if (error) throw new Error(error.message);

    // Ajoute une note interne avec le motif du blocage
    await supabaseAdmin.from("agent_notes").insert({
      commande_id: data.commande_id,
      agent_id: context.userId,
      contenu: `🚫 Blocage signalé : ${data.reason}`,
    });

    // Notifier tous les admins (notification en base + email)
    await notifyAdmins(
      `Alerte : Le dossier "${commande.entreprise}" (${commande.id.slice(0, 8)}) a été bloqué`,
      `Alerte : Dossier bloqué — ${commande.entreprise}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#EA4335">🚫 Dossier bloqué</h2>
        <p>Le dossier <b>${escapeHtml(commande.entreprise)}</b> (ID: ${commande.id.slice(0, 8)}) a été signalé comme bloqué.</p>
        <p><b>Motif :</b> ${escapeHtml(data.reason)}</p>
        <p>Connectez-vous au dashboard admin pour intervenir.</p>
        <p style="color:#666;font-size:13px;margin-top:32px">— Système d'alerte Hotavis</p>
      </div>`,
    );

    return { ok: true };
  });

async function assertAgentOrAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role, status")
    .eq("user_id", userId)
    .in("role", ["agent", "admin"]);
  if (!data || data.length === 0) throw new Error("Accès refusé : rôle agent ou admin requis");

  const roles = data.map((r) => r.role);
  const isAdmin = roles.includes("admin");

  // Les admins sont toujours autorisés
  if (isAdmin) return roles;

  // Pour les agents : vérifier que le statut est "active"
  // (null est traité comme "active" pour la rétro-compatibilité)
  const agentRole = data.find((r) => r.role === "agent");
  if (agentRole && agentRole.status && agentRole.status !== "active") {
    throw new Error("Votre compte agent est suspendu ou supprimé. Contactez un administrateur.");
  }

  return roles;
}

export const listPoolTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgentOrAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select("id, prenom, nom, entreprise, ville, activite, statut, created_at, paid_at")
      .in("statut", ["en_attente", "payé"])
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
      .select(
        "id, prenom, nom, entreprise, ville, activite, statut, assigned_at, paid_at, delivered_at",
      )
      .eq("assigned_agent_id", context.userId)
      .in("statut", ["en_cours", "bloque"])
      .order("assigned_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tickets: data || [] };
  });

export const claimTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commande_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAgentOrAdmin(context.userId);
    const { data: result, error } = await supabaseAdmin.rpc("claim_commande", {
      _commande_id: data.commande_id,
    });
    if (error) throw new Error(error.message);
    const res = result as { ok: boolean; reason?: string };

    // Si le claim a réussi, notifier l'agent (notification + email)
    if (res?.ok) {
      const { data: cmd } = await supabaseAdmin
        .from("commandes")
        .select("entreprise")
        .eq("id", data.commande_id)
        .single();
      await notifyAgent(
        context.userId,
        `Nouveau dossier assigné : ${cmd?.entreprise || "—"}`,
        `Nouveau dossier assigné — ${cmd?.entreprise || ""}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#4285F4">📋 Nouveau dossier assigné</h2>
          <p>Un nouveau dossier vous a été assigné : <b>${escapeHtml(cmd?.entreprise || "")}</b>.</p>
          <p>Connectez-vous à votre espace agent pour commencer le traitement.</p>
          <p style="color:#666;font-size:13px;margin-top:32px">À très vite,<br>— L'équipe Hotavis</p>
        </div>`,
      );
    }

    return res;
  });

export const unclaimTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commande_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAgentOrAdmin(context.userId);
    const { data: result, error } = await supabaseAdmin.rpc("unclaim_commande", {
      _commande_id: data.commande_id,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; reason?: string };
  });

export const listCompletedMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgentOrAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select(
        "id, prenom, nom, entreprise, ville, activite, statut, assigned_at, paid_at, delivered_at, commission_centimes, commission_paid",
      )
      .eq("assigned_agent_id", context.userId)
      .eq("statut", "livrée")
      .order("delivered_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tickets: data || [] };
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
    type AgentCommande = {
      id: string;
      prenom: string;
      nom: string;
      entreprise: string;
      ville: string;
      activite: string;
      statut: string;
      assigned_agent_id: string | null;
      assigned_at: string | null;
      created_at: string;
      paid_at: string | null;
      delivered_at: string | null;
    };
    const commande: AgentCommande | typeof full = isAdmin
      ? full
      : {
          id: full.id,
          prenom: full.prenom,
          nom: full.nom,
          entreprise: full.entreprise,
          ville: full.ville,
          activite: full.activite,
          statut: full.statut,
          assigned_agent_id: full.assigned_agent_id,
          assigned_at: full.assigned_at,
          created_at: full.created_at,
          paid_at: full.paid_at,
          delivered_at: full.delivered_at,
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

    // On ne génère plus les Signed URLs au chargement (elles expirent après 1h).
    // On renvoie uniquement les chemins storage ; les URLs fraîches sont
    // demandées au clic via getFreshSignedUrl.
    const onboardingWithFacture = onboarding as
      | (typeof onboarding & { facture_url?: string })
      | null;

    const notesWithMine = (notes || []).map((n) => ({
      id: n.id,
      contenu: n.contenu,
      created_at: n.created_at,
      is_mine: n.agent_id === context.userId,
    }));

    return {
      commande,
      onboarding,
      notes: notesWithMine,
      justificatifPath: onboarding?.justificatif_url || null,
      facturePath: onboardingWithFacture?.facture_url || null,
    };
  });

export const getFreshSignedUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ path: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAgentOrAdmin(context.userId);
    const { data: s, error } = await supabaseAdmin.storage
      .from("documents-gmb")
      .createSignedUrl(data.path, 3600);
    if (error || !s?.signedUrl) throw new Error("Impossible de générer le lien du document");
    return { url: s.signedUrl };
  });

export const addInternalNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        commande_id: z.string().uuid(),
        contenu: z.string().trim().min(1).max(2000),
      })
      .parse(i),
  )
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

export const getAgentCommissionsHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgentOrAdmin(context.userId);

    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select("id, entreprise, delivered_at, commission_centimes, commission_paid")
      .eq("assigned_agent_id", context.userId)
      .eq("statut", "livrée")
      .order("delivered_at", { ascending: false });
    if (error) throw new Error(error.message);

    const fiches = (data || []).map((f) => ({
      id: f.id,
      entreprise: f.entreprise,
      delivered_at: f.delivered_at,
      commission_centimes: f.commission_centimes || 0,
      commission_paid: f.commission_paid,
    }));

    const totalPaye = fiches
      .filter((f) => f.commission_paid)
      .reduce((s, f) => s + f.commission_centimes, 0);
    const totalEnAttente = fiches
      .filter((f) => !f.commission_paid)
      .reduce((s, f) => s + f.commission_centimes, 0);

    return {
      fiches,
      total_paye_centimes: totalPaye,
      total_en_attente_centimes: totalEnAttente,
    };
  });

export const getAgentStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgentOrAdmin(context.userId);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: livreesMois, error: e1 } = await supabaseAdmin
      .from("commandes")
      .select("id, commission_centimes")
      .eq("assigned_agent_id", context.userId)
      .eq("statut", "livrée")
      .gte("delivered_at", monthStart.toISOString());
    if (e1) throw new Error(e1.message);

    const { data: allLivrees, error: e2 } = await supabaseAdmin
      .from("commandes")
      .select("commission_centimes")
      .eq("assigned_agent_id", context.userId)
      .eq("statut", "livrée");
    if (e2) throw new Error(e2.message);

    const { count: enCours, error: e3 } = await supabaseAdmin
      .from("commandes")
      .select("id", { count: "exact", head: true })
      .eq("assigned_agent_id", context.userId)
      .in("statut", ["en_cours", "onboarding_complété"]);
    if (e3) throw new Error(e3.message);

    const totalCommissions = (allLivrees || []).reduce(
      (s, c) => s + (c.commission_centimes || 0),
      0,
    );

    return {
      fiches_livrees_mois: livreesMois?.length || 0,
      commissions_total_centimes: totalCommissions,
      missions_en_cours: enCours || 0,
    };
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
    if (!isAdmin && commande.assigned_agent_id !== context.userId)
      throw new Error("Dossier non assigné");

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
        commission_centimes: commission, // conserve la valeur figée
      })
      .eq("id", data.commande_id);
    if (error) throw new Error(error.message);

    // Email client (déjà existant côté admin, on dédouble pas — on déclenche ici)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails
        .send({
          from: "Hotavis <noreply@hotavis.fr>",
          to: [commande.email],
          subject: `🚀 Votre fiche Google ${escapeHtml(commande.entreprise)} est en ligne ! Nos conseils pour démarrer.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
          <h2 style="color:#34A853;margin-bottom:16px">Bonjour ${escapeHtml(commande.prenom)},</h2>
          <p>Félicitations ! Votre fiche Google Business Profile pour <b>${escapeHtml(commande.entreprise)}</b> est désormais officiellement en ligne et entièrement optimisée par nos soins.</p>
          <p>Vous pouvez dès à présent rechercher votre entreprise sur Google pour voir le résultat.</p>

          <h3 style="color:#1f2937;margin-top:32px;margin-bottom:12px">📈 Nos 3 conseils d'experts pour booster votre visibilité dès aujourd'hui :</h3>
          <p style="margin-bottom:16px">Pour que l'algorithme de Google vous place devant vos concurrents, la mise en ligne n'est que la première étape. Voici comment faire vivre votre fiche pour attirer un maximum de clients :</p>

          <ol style="padding-left:20px;line-height:1.7">
            <li style="margin-bottom:14px"><b>Décrochez vos premiers avis 5 étoiles (Votre priorité) :</b> N'attendez pas, sollicitez vos clients les plus fidèles dès aujourd'hui. La quantité et la régularité des avis sont le critère n°1 pour remonter sur Google Maps.</li>
            <li style="margin-bottom:14px"><b>Ajoutez des photos régulièrement :</b> L'algorithme adore les fiches actives. N'hésitez pas à publier souvent des photos de vos réalisations, de vos produits ou de votre équipe.</li>
            <li style="margin-bottom:14px"><b>Répondez à tous vos avis :</b> Qu'ils soient positifs ou négatifs, prenez toujours le temps de répondre. Cela montre votre professionnalisme aux futurs clients qui vous lisent.</li>
          </ol>

          <p style="margin-top:28px">Une question sur votre nouvelle fiche ou un besoin particulier ?<br>Nous restons à votre entière disposition pour vous accompagner. N'hésitez pas à nous écrire directement via notre formulaire de contact :</p>

          <p style="text-align:center;margin:28px 0">
            <a href="https://hotavis.fr/#contact" style="display:inline-block;background:#34A853;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 32px;border-radius:8px;font-size:16px">👉 Nous contacter</a>
          </p>

          <p style="margin-top:24px">Nous vous souhaitons beaucoup de succès pour ce lancement !</p>
          <p style="color:#666;font-size:13px;margin-top:32px">À très vite,<br>— L'équipe Hotavis</p>
        </div>`,
        })
        .catch((e) => console.error(e));
    }
    return { ok: true };
  });
