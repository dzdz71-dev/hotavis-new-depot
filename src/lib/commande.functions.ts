import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";

const schema = z.object({
  prenom: z.string().trim().min(1).max(60),
  nom: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  telephone: z.string().trim().min(6).max(30),
  entreprise: z.string().trim().min(1).max(120),
  ville: z.string().trim().min(1).max(120),
  activite: z.string().trim().min(1).max(120),
});

const MONTANT = 37900; // 379€

// Step 1 of the funnel: just create the commande. NO Stripe yet.
// The client is redirected to /onboarding/{id} to fill the briefing first.
export const createCommande = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, request }) => {
    // Dynamic import to avoid client-side import issues with @tanstack/react-start/server
    const { createCommandeHandler } = await import("@/lib/create-commande.handler.server");
    return await createCommandeHandler(data, request);
  });

// Step 3 of the funnel: after the briefing is saved, create a Stripe checkout
// session for an existing commande and redirect the client to it.
export const createCheckoutForCommande = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        commande_id: z.string().uuid(),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");
    const stripe = new Stripe(stripeKey, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: "2024-12-18.acacia" as any,
    });

    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .select("id, email, entreprise, ville, statut, montant_centimes")
      .eq("id", data.commande_id)
      .single();
    if (error || !commande) throw new Error("Commande introuvable");
    if (commande.statut !== "en_attente") {
      // Already paid — short-circuit to success
      return { url: `${data.origin}/onboarding-success/${commande.id}`, already_paid: true };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: commande.montant_centimes ?? MONTANT,
            product_data: {
              name: "Pack Hotavis — Création & optimisation fiche Google Business",
              description: `Pour ${commande.entreprise} (${commande.ville})`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: commande.email,
      success_url: `${data.origin}/onboarding-success/${commande.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/onboarding/${commande.id}?cancelled=1`,
      metadata: { commande_id: commande.id },
      allow_promotion_codes: true,
    });

    await supabaseAdmin
      .from("commandes")
      .update({ stripe_session_id: session.id })
      .eq("id", commande.id);

    return { url: session.url!, already_paid: false };
  });

export const getCommande = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: c, error } = await supabaseAdmin
      .from("commandes")
      .select("id, prenom, nom, email, entreprise, ville, statut, paid_at")
      .eq("id", data.id)
      .single();
    if (error || !c) throw new Error("Commande introuvable");
    return c;
  });

// Fallback used by /onboarding-success after Stripe redirect, in case the
// webhook is delayed. Marks paid and bumps statut according to onboarding presence.
export const confirmStripeSession = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        commande_id: z.string().uuid(),
        session_id: z.string().min(5).max(255),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: commande, error: cErr } = await supabaseAdmin
      .from("commandes")
      .select("id, statut, stripe_session_id, stripe_payment_id, montant_centimes")
      .eq("id", data.commande_id)
      .single();
    if (cErr || !commande) throw new Error("Commande introuvable");
    // Si deja payee (le webhook est passe avant le fallback) : short-circuit,
    // mais on recupere quand meme le montant reellement paye (session
    // .amount_total = code promo inclus) pour l'evenement GA4 "purchase".
    if (commande.statut !== "en_attente") {
      let montantCentimes = commande.montant_centimes ?? MONTANT;
      let paymentId: string | null = commande.stripe_payment_id ?? null;
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            apiVersion: "2024-12-18.acacia" as any,
          });
          const session = await stripe.checkout.sessions.retrieve(data.session_id);
          if (session.metadata?.commande_id === data.commande_id) {
            if (typeof session.amount_total === "number") {
              montantCentimes = session.amount_total;
            }
            paymentId = (session.payment_intent as string) ?? paymentId;
          }
        } catch (e) {
          console.error("Stripe session retrieve failed (already paid):", e);
        }
      }
      return {
        paid: true,
        commande_id: commande.id,
        transaction_id: commande.id,
        montant_centimes: montantCentimes,
        payment_id: paymentId,
      };
    }

    // Si stripe_session_id diverge, c'est un retry avec une nouvelle session
    // (le client a peut-être abandonné puis relancé un checkout). On accepte
    // la nouvelle session à condition qu'elle appartienne bien à cette commande
    // (vérifié via metadata côté Stripe). On ne jette plus systématiquement.
    if (commande.stripe_session_id && commande.stripe_session_id !== data.session_id) {
      // On persiste le nouveau session_id pour les retries futurs
      await supabaseAdmin
        .from("commandes")
        .update({ stripe_session_id: data.session_id })
        .eq("id", data.commande_id)
        .eq("statut", "en_attente");
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");
    const stripe = new Stripe(stripeKey, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: "2024-12-18.acacia" as any,
    });

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(data.session_id);
    } catch (e) {
      console.error("Stripe session retrieve failed:", e);
      return { paid: false };
    }

    // Sécurité : la session Stripe doit référencer cette commande dans ses metadata
    if (session.metadata?.commande_id !== data.commande_id) {
      console.error(
        "Session Stripe metadata commande_id mismatch:",
        session.metadata?.commande_id,
        "vs",
        data.commande_id,
      );
      throw new Error("Session Stripe invalide pour cette commande");
    }

    if (session.payment_status === "paid") {
      // Decide statut based on onboarding presence
      const { data: ob } = await supabaseAdmin
        .from("onboardings")
        .select("commande_id")
        .eq("commande_id", data.commande_id)
        .maybeSingle();
      const newStatut = ob ? "onboarding_complété" : "payé";

      const { data: fullCmd } = await supabaseAdmin
        .from("commandes")
        .update({
          statut: newStatut,
          stripe_payment_id: (session.payment_intent as string) ?? null,
          paid_at: new Date().toISOString(),
        })
        .eq("id", data.commande_id)
        .eq("statut", "en_attente")
        .select("id, prenom, nom, email, entreprise, ville, activite, montant_centimes, paid_at")
        .single();

      // Envoi email de confirmation au client (fallback si webhook Stripe retardé/absent)
      if (fullCmd) {
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          try {
            const resend = new Resend(resendKey);
            const FROM = "Hotavis <noreply@hotavis.fr>";
            const montantEuros = ((fullCmd.montant_centimes ?? MONTANT) / 100).toFixed(2);
            const dateStr = new Date(fullCmd.paid_at || Date.now()).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            });

            const clientHtml = ob
              ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                  <h2 style="color:#34A853">Merci ${escapeHtml(fullCmd.prenom)} ! 🎉</h2>
                  <p>Votre paiement de <b>${montantEuros}€</b> est confirmé pour <b>${escapeHtml(fullCmd.entreprise)}</b>.</p>
                  <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:20px 0">
                    <h3 style="margin:0 0 12px 0;color:#4285F4;font-size:14px">Récapitulatif de commande</h3>
                    <table style="width:100%;font-size:13px;color:#333">
                      <tr><td style="padding:4px 0;color:#666">Client :</td><td style="padding:4px 0;font-weight:bold">${escapeHtml(fullCmd.prenom)} ${escapeHtml(fullCmd.nom)}</td></tr>
                      <tr><td style="padding:4px 0;color:#666">Entreprise :</td><td style="padding:4px 0;font-weight:bold">${escapeHtml(fullCmd.entreprise)}</td></tr>
                      <tr><td style="padding:4px 0;color:#666">Prestation :</td><td style="padding:4px 0">Création & optimisation fiche Google Business Profile</td></tr>
                      <tr><td style="padding:4px 0;color:#666">Date :</td><td style="padding:4px 0">${dateStr}</td></tr>
                      <tr><td style="padding:4px 0;color:#666">Montant :</td><td style="padding:4px 0;font-weight:bold;color:#34A853">${montantEuros}€</td></tr>
                    </table>
                  </div>
                  <p>Votre briefing est <b>entre les mains de nos experts</b>. Vous recevrez votre fiche Google Business sous 7 jours ouvrés.</p>
                  <p style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px;font-size:13px;color:#78350F;border-radius:6px">
                    <b>À noter :</b> dans certains cas, Google exige une vérification par courrier postal pour valider l'établissement, ce qui peut rallonger le délai d'environ 14 jours.
                  </p>
                  <p style="color:#666;font-size:13px;margin-top:32px">— L'équipe Hotavis</p>
                </div>`
              : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                  <h2 style="color:#4285F4">Merci ${escapeHtml(fullCmd.prenom)} !</h2>
                  <p>Votre paiement de <b>${montantEuros}€</b> a bien été reçu pour <b>${escapeHtml(fullCmd.entreprise)}</b>.</p>
                  <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:20px 0">
                    <h3 style="margin:0 0 12px 0;color:#4285F4;font-size:14px">Récapitulatif de commande</h3>
                    <table style="width:100%;font-size:13px;color:#333">
                      <tr><td style="padding:4px 0;color:#666">Client :</td><td style="padding:4px 0;font-weight:bold">${escapeHtml(fullCmd.prenom)} ${escapeHtml(fullCmd.nom)}</td></tr>
                      <tr><td style="padding:4px 0;color:#666">Entreprise :</td><td style="padding:4px 0;font-weight:bold">${escapeHtml(fullCmd.entreprise)}</td></tr>
                      <tr><td style="padding:4px 0;color:#666">Prestation :</td><td style="padding:4px 0">Création & optimisation fiche Google Business Profile</td></tr>
                      <tr><td style="padding:4px 0;color:#666">Date :</td><td style="padding:4px 0">${dateStr}</td></tr>
                      <tr><td style="padding:4px 0;color:#666">Montant :</td><td style="padding:4px 0;font-weight:bold;color:#34A853">${montantEuros}€</td></tr>
                    </table>
                  </div>
                  <p>Dernière étape : remplissez le formulaire de briefing (10 min) pour qu'on puisse créer votre fiche Google.</p>
                  <p style="color:#666;font-size:13px;margin-top:32px">— L'équipe Hotavis</p>
                </div>`;

            await resend.emails.send({
              from: FROM,
              to: [fullCmd.email],
              subject: ob
                ? "✅ Paiement confirmé — Votre dossier est entre nos mains !"
                : "✅ Paiement confirmé — À vous de jouer !",
              html: clientHtml,
            });
          } catch (e) {
            console.error("Email send error (confirmStripeSession):", e);
          }
        }
      }
      return {
        paid: true,
        commande_id: data.commande_id,
        transaction_id: data.commande_id,
        montant_centimes: session.amount_total ?? fullCmd?.montant_centimes ?? MONTANT,
        payment_id: (session.payment_intent as string) ?? null,
      };
    }
    return { paid: false };
  });
