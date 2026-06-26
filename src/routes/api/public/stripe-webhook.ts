import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!stripeKey || !webhookSecret) {
          return new Response("Server misconfigured", { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        } catch (err) {
          console.error("Webhook signature verification failed:", err);
          return new Response("Invalid signature", { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const commandeId = session.metadata?.commande_id;
          if (commandeId) {
            // Determine target statut: if briefing exists, jump straight to onboarding_complété
            const { data: ob } = await supabaseAdmin
              .from("onboardings")
              .select("commande_id")
              .eq("commande_id", commandeId)
              .maybeSingle();
            const newStatut = ob ? "onboarding_complété" : "payé";

            const { data: commande, error } = await supabaseAdmin
              .from("commandes")
              .update({
                statut: newStatut,
                stripe_payment_id: session.payment_intent as string,
                paid_at: new Date().toISOString(),
              })
              .eq("id", commandeId)
              .select()
              .single();

            if (!error && commande) {
              const resendKey = process.env.RESEND_API_KEY;
              if (resendKey) {
                const resend = new Resend(resendKey);
                const FROM = "Hotavis <onboarding@resend.dev>";
                const ADMIN = "dz.societe.ecommerce@gmail.com";

                const host = request.headers.get("host");
                const successUrl = `https://${host}/onboarding-success/${commande.id}`;
                const onboardingUrl = `https://${host}/onboarding/${commande.id}`;

                // Client email — content depends on briefing presence
                const clientHtml = ob
                  ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                      <h2 style="color:#34A853">Merci ${escapeHtml(commande.prenom)} ! 🎉</h2>
                      <p>Votre paiement de <b>379€</b> est confirmé pour <b>${escapeHtml(commande.entreprise)}</b>.</p>
                      <p>Votre briefing est <b>entre les mains de nos experts</b>. Vous recevrez votre fiche Google Business sous 7 jours ouvrés.</p>
                      <p style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px;font-size:13px;color:#78350F;border-radius:6px">
                        <b>À noter :</b> dans certains cas, Google exige une vérification par courrier postal pour valider l'établissement, ce qui peut rallonger le délai d'environ 14 jours.
                      </p>
                      <p style="text-align:center;margin:32px 0">
                        <a href="${successUrl}" style="background:#4285F4;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">
                          Suivre mon dossier
                        </a>
                      </p>
                      <p style="color:#666;font-size:13px">— L'équipe Hotavis</p>
                    </div>`
                  : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                      <h2 style="color:#4285F4">Merci ${escapeHtml(commande.prenom)} !</h2>
                      <p>Votre paiement de <b>379€</b> a bien été reçu pour <b>${escapeHtml(commande.entreprise)}</b>.</p>
                      <p>Dernière étape : remplissez le formulaire de briefing (10 min) pour qu'on puisse créer votre fiche Google.</p>
                      <p style="text-align:center;margin:32px 0">
                        <a href="${onboardingUrl}" style="background:#4285F4;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">
                          📝 Remplir mon briefing
                        </a>
                      </p>
                      <p style="color:#666;font-size:13px">— L'équipe Hotavis</p>
                    </div>`;

                await Promise.all([
                  resend.emails.send({
                    from: FROM,
                    to: [commande.email],
                    subject: ob
                      ? "✅ Paiement confirmé — Votre dossier est entre nos mains !"
                      : "✅ Paiement confirmé — À vous de jouer !",
                    html: clientHtml,
                  }),
                  resend.emails.send({
                    from: FROM,
                    to: [ADMIN],
                    subject: `💰 Nouvelle commande payée — ${commande.entreprise}`,
                    html: `<h2>Nouvelle commande payée</h2>
                      <p><b>Client :</b> ${escapeHtml(commande.prenom)} ${escapeHtml(commande.nom)}</p>
                      <p><b>Email :</b> ${escapeHtml(commande.email)}</p>
                      <p><b>Tél :</b> ${escapeHtml(commande.telephone)}</p>
                      <p><b>Entreprise :</b> ${escapeHtml(commande.entreprise)} — ${escapeHtml(commande.ville)}</p>
                      <p><b>Activité :</b> ${escapeHtml(commande.activite)}</p>
                      <p><b>Briefing :</b> ${ob ? "✅ Déjà complété" : "⏳ Pas encore rempli"}</p>
                      <p><b>Montant :</b> 379€</p>`,
                  }),
                ]).catch((e) => console.error("Email send error:", e));
              }
            }
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

