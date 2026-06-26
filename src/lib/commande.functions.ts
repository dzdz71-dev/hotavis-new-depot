import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rateLimit } from "@/lib/rate-limit";
import { getRequest } from "@tanstack/react-start/server";

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

// Rate-limit key : combine IP + email pour limiter les créations de commande
function buildRateLimitKey(): string {
  try {
    const req = getRequest();
    if (!req) return "no-req";
    const cfIp = (req as any).cf?.ipCountry as string | undefined;
    const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = xff || cfIp || "unknown";
    return `cmd:${ip}`;
  } catch {
    return "cmd:unknown";
  }
}

// Step 1 of the funnel: just create the commande. NO Stripe yet.
// The client is redirected to /onboarding/{id} to fill the briefing first.
export const createCommande = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    // Rate-limit : 5 commandes / minute / IP
    rateLimit(buildRateLimitKey(), 5, 60_000);

    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .insert({
        prenom: data.prenom,
        nom: data.nom,
        email: data.email,
        telephone: data.telephone,
        entreprise: data.entreprise,
        ville: data.ville,
        activite: data.activite,
        montant_centimes: MONTANT,
        statut: "en_attente",
      })
      .select()
      .single();

    if (error || !commande) {
      console.error(error);
      throw new Error("Erreur création commande");
    }
    return { commande_id: commande.id };
  });

// Step 3 of the funnel: after the briefing is saved, create a Stripe checkout
// session for an existing commande and redirect the client to it.
export const createCheckoutForCommande = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      commande_id: z.string().uuid(),
      origin: z.string().url(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });

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
    z.object({
      commande_id: z.string().uuid(),
      session_id: z.string().min(5).max(255),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: commande, error: cErr } = await supabaseAdmin
      .from("commandes")
      .select("id, statut, stripe_session_id")
      .eq("id", data.commande_id)
      .single();
    if (cErr || !commande) throw new Error("Commande introuvable");
    // Si déjà payée (webhook est passé avant), on short-circuite.
    if (commande.statut !== "en_attente") return { paid: true };

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
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(data.session_id);
    } catch (e) {
      console.error("Stripe session retrieve failed:", e);
      return { paid: false };
    }

    // Sécurité : la session Stripe doit référencer cette commande dans ses metadata
    if (session.metadata?.commande_id !== data.commande_id) {
      console.error("Session Stripe metadata commande_id mismatch:", session.metadata?.commande_id, "vs", data.commande_id);
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

      await supabaseAdmin
        .from("commandes")
        .update({
          statut: newStatut,
          stripe_payment_id: (session.payment_intent as string) ?? null,
          paid_at: new Date().toISOString(),
        })
        .eq("id", data.commande_id)
        .eq("statut", "en_attente");
      return { paid: true };
    }
    return { paid: false };
  });
