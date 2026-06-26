import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Accès refusé : admin requis");
}

export const listCommandes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select("id, prenom, nom, email, telephone, entreprise, ville, activite, statut, montant_centimes, created_at, paid_at, delivered_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const stats = {
      total: data.length,
      en_attente: data.filter((c) => c.statut === "en_attente").length,
      en_cours: data.filter((c) => ["payé", "onboarding_complété", "en_cours"].includes(c.statut)).length,
      livrees: data.filter((c) => c.statut === "livrée").length,
      ca_total: data.filter((c) => c.statut !== "en_attente" && c.statut !== "annulée")
        .reduce((s, c) => s + c.montant_centimes, 0),
    };
    return { commandes: data, stats };
  });

export const getCommandeAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: commande, error } = await supabaseAdmin
      .from("commandes").select("*").eq("id", data.id).single();
    if (error || !commande) throw new Error("Commande introuvable");
    const { data: onboarding } = await supabaseAdmin
      .from("onboardings").select("*").eq("commande_id", data.id).maybeSingle();

    // Signed URLs for private documents (1h)
    let justificatifSignedUrl: string | null = null;
    let factureSignedUrl: string | null = null;
    if (onboarding?.justificatif_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("documents-gmb")
        .createSignedUrl(onboarding.justificatif_url, 60 * 60);
      justificatifSignedUrl = signed?.signedUrl || null;
    }
    if ((onboarding as any)?.facture_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("documents-gmb")
        .createSignedUrl((onboarding as any).facture_url, 60 * 60);
      factureSignedUrl = signed?.signedUrl || null;
    }
    return { commande, onboarding, justificatifSignedUrl, factureSignedUrl };
  });

export const updateCommandeStatut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid(),
      statut: z.enum(["en_attente", "payé", "onboarding_complété", "en_cours", "livrée", "annulée"]),
      notes_admin: z.string().max(2000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const update: any = { statut: data.statut };
    if (data.notes_admin !== undefined) update.notes_admin = data.notes_admin;

    const wasDelivered = data.statut === "livrée";
    if (wasDelivered) update.delivered_at = new Date().toISOString();

    const { data: commande, error } = await supabaseAdmin
      .from("commandes").update(update).eq("id", data.id).select().single();
    if (error || !commande) throw new Error(error?.message || "Erreur");

    if (wasDelivered) {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "Hotavis <onboarding@resend.dev>",
          to: [commande.email],
          subject: "🎉 Votre fiche Google est en ligne !",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <h2 style="color:#34A853">Félicitations ${escapeHtml(commande.prenom)} !</h2>
              <p>Votre fiche Google Business Profile pour <b>${escapeHtml(commande.entreprise)}</b> est désormais en ligne et optimisée. 🚀</p>
              <p>Recherchez votre entreprise sur Google pour la voir apparaître.</p>
              <p><b>Prochaine étape :</b> demandez à vos premiers clients de laisser un avis 5 étoiles — c'est ce qui fera décoller votre visibilité.</p>
              <p style="margin-top:24px">Une question ? Répondez simplement à cet email.</p>
              <p style="color:#666;font-size:13px;margin-top:32px">— L'équipe Hotavis</p>
            </div>`,
        }).catch((e) => console.error(e));
      }
    }
    return { ok: true };
  });

