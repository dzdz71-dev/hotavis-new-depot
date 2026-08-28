import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/lib/commande.functions.ts?tss-serverfn-split");import { createServerRpc } from "/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/node_modules/@tanstack/react-start/dist/esm/server-rpc.js?v=92e22543";
import { createServerFn } from "/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/node_modules/@tanstack/react-start/dist/esm/index.js?v=92e22543";
import Stripe from "/node_modules/.vite/deps/stripe.js?v=92e22543";
import { Resend } from "/node_modules/.vite/deps/resend.js?v=92e22543";
import { supabaseAdmin } from "/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/integrations/supabase/client.server.ts";
import { escapeHtml } from "/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/lib/utils.ts";
const MONTANT = 37900;
const createCommande_createServerFn_handler = createServerRpc({
  id: "eyJmaWxlIjoiL0Bmcy9DOi9Vc2Vycy9kYW91ZC9Eb2N1bWVudHMvaG90YXZpcy0tdmVyY2VsL2hvdGF2aXMtYm9vc3Qvc3JjL2xpYi9jb21tYW5kZS5mdW5jdGlvbnMudHM_dHNzLXNlcnZlcmZuLXNwbGl0IiwiZXhwb3J0IjoiY3JlYXRlQ29tbWFuZGVfY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9",
  name: "createCommande",
  filename: "src/lib/commande.functions.ts"
}, (opts) => createCommande.__executeServer(opts));
const createCommande = createServerFn({
  method: "POST"
}).handler(createCommande_createServerFn_handler, async ({
  data,
  request
}) => {
  const {
    createCommandeHandler
  } = await import("/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/lib/create-commande.handler.server.ts");
  return await createCommandeHandler(data, request);
});
const createCheckoutForCommande_createServerFn_handler = createServerRpc({
  id: "eyJmaWxlIjoiL0Bmcy9DOi9Vc2Vycy9kYW91ZC9Eb2N1bWVudHMvaG90YXZpcy0tdmVyY2VsL2hvdGF2aXMtYm9vc3Qvc3JjL2xpYi9jb21tYW5kZS5mdW5jdGlvbnMudHM_dHNzLXNlcnZlcmZuLXNwbGl0IiwiZXhwb3J0IjoiY3JlYXRlQ2hlY2tvdXRGb3JDb21tYW5kZV9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0",
  name: "createCheckoutForCommande",
  filename: "src/lib/commande.functions.ts"
}, (opts) => createCheckoutForCommande.__executeServer(opts));
const createCheckoutForCommande = createServerFn({
  method: "POST"
}).handler(createCheckoutForCommande_createServerFn_handler, async ({
  data
}) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");
  const stripe = new Stripe(stripeKey, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2024-12-18.acacia"
  });
  const {
    data: commande,
    error
  } = await supabaseAdmin.from("commandes").select("id, email, entreprise, ville, statut, montant_centimes").eq("id", data.commande_id).single();
  if (error || !commande) throw new Error("Commande introuvable");
  if (commande.statut !== "en_attente") {
    return {
      url: `${data.origin}/onboarding-success/${commande.id}`,
      already_paid: true
    };
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        unit_amount: commande.montant_centimes ?? MONTANT,
        product_data: {
          name: "Pack Hotavis — Création & optimisation fiche Google Business",
          description: `Pour ${commande.entreprise} (${commande.ville})`
        }
      },
      quantity: 1
    }],
    customer_email: commande.email,
    success_url: `${data.origin}/onboarding-success/${commande.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${data.origin}/onboarding/${commande.id}?cancelled=1`,
    metadata: {
      commande_id: commande.id
    },
    allow_promotion_codes: true
  });
  await supabaseAdmin.from("commandes").update({
    stripe_session_id: session.id
  }).eq("id", commande.id);
  return {
    url: session.url,
    already_paid: false
  };
});
const getCommande_createServerFn_handler = createServerRpc({
  id: "eyJmaWxlIjoiL0Bmcy9DOi9Vc2Vycy9kYW91ZC9Eb2N1bWVudHMvaG90YXZpcy0tdmVyY2VsL2hvdGF2aXMtYm9vc3Qvc3JjL2xpYi9jb21tYW5kZS5mdW5jdGlvbnMudHM_dHNzLXNlcnZlcmZuLXNwbGl0IiwiZXhwb3J0IjoiZ2V0Q29tbWFuZGVfY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9",
  name: "getCommande",
  filename: "src/lib/commande.functions.ts"
}, (opts) => getCommande.__executeServer(opts));
const getCommande = createServerFn({
  method: "GET"
}).handler(getCommande_createServerFn_handler, async ({
  data
}) => {
  const {
    data: c,
    error
  } = await supabaseAdmin.from("commandes").select("id, prenom, nom, email, entreprise, ville, statut, paid_at").eq("id", data.id).single();
  if (error || !c) throw new Error("Commande introuvable");
  return c;
});
const confirmStripeSession_createServerFn_handler = createServerRpc({
  id: "eyJmaWxlIjoiL0Bmcy9DOi9Vc2Vycy9kYW91ZC9Eb2N1bWVudHMvaG90YXZpcy0tdmVyY2VsL2hvdGF2aXMtYm9vc3Qvc3JjL2xpYi9jb21tYW5kZS5mdW5jdGlvbnMudHM_dHNzLXNlcnZlcmZuLXNwbGl0IiwiZXhwb3J0IjoiY29uZmlybVN0cmlwZVNlc3Npb25fY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9",
  name: "confirmStripeSession",
  filename: "src/lib/commande.functions.ts"
}, (opts) => confirmStripeSession.__executeServer(opts));
const confirmStripeSession = createServerFn({
  method: "POST"
}).handler(confirmStripeSession_createServerFn_handler, async ({
  data
}) => {
  const {
    data: commande,
    error: cErr
  } = await supabaseAdmin.from("commandes").select("id, statut, stripe_session_id").eq("id", data.commande_id).single();
  if (cErr || !commande) throw new Error("Commande introuvable");
  if (commande.statut !== "en_attente") return {
    paid: true
  };
  if (commande.stripe_session_id && commande.stripe_session_id !== data.session_id) {
    await supabaseAdmin.from("commandes").update({
      stripe_session_id: data.session_id
    }).eq("id", data.commande_id).eq("statut", "en_attente");
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");
  const stripe = new Stripe(stripeKey, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2024-12-18.acacia"
  });
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(data.session_id);
  } catch (e) {
    console.error("Stripe session retrieve failed:", e);
    return {
      paid: false
    };
  }
  if (session.metadata?.commande_id !== data.commande_id) {
    console.error("Session Stripe metadata commande_id mismatch:", session.metadata?.commande_id, "vs", data.commande_id);
    throw new Error("Session Stripe invalide pour cette commande");
  }
  if (session.payment_status === "paid") {
    const {
      data: ob
    } = await supabaseAdmin.from("onboardings").select("commande_id").eq("commande_id", data.commande_id).maybeSingle();
    const newStatut = ob ? "onboarding_complété" : "payé";
    const {
      data: fullCmd
    } = await supabaseAdmin.from("commandes").update({
      statut: newStatut,
      stripe_payment_id: session.payment_intent ?? null,
      paid_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", data.commande_id).eq("statut", "en_attente").select("id, prenom, nom, email, entreprise, ville, activite, montant_centimes, paid_at").single();
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
            year: "numeric"
          });
          const clientHtml = ob ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
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
                </div>` : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
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
            subject: ob ? "✅ Paiement confirmé — Votre dossier est entre nos mains !" : "✅ Paiement confirmé — À vous de jouer !",
            html: clientHtml
          });
        } catch (e) {
          console.error("Email send error (confirmStripeSession):", e);
        }
      }
    }
    return {
      paid: true
    };
  }
  return {
    paid: false
  };
});
export { createCommande_createServerFn_handler, createCheckoutForCommande_createServerFn_handler, getCommande_createServerFn_handler, confirmStripeSession_createServerFn_handler };
if (import.meta.hot) {
  import.meta.hot.accept(() => {
  });
}
if (import.meta.webpackHot) {
  import.meta.webpackHot.accept(() => {
  });
}

//# sourceMappingURL=data:application/json;base64,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T0FBTztBQUFBLHdJQUMyQkYsWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsMEJBU3BJO0FBQUEsb0RBQ29DcEYsV0FBVzBFLFFBQVFtQixNQUFNLENBQUM7QUFBQSw0Q0FDbENULFlBQVksaUNBQWlDcEYsV0FBVzBFLFFBQVExQixVQUFVLENBQUM7QUFBQTtBQUFBO0FBQUE7QUFBQSx5SEFJRWhELFdBQVcwRSxRQUFRbUIsTUFBTSxDQUFDLElBQUk3RixXQUFXMEUsUUFBUW9CLEdBQUcsQ0FBQztBQUFBLDZIQUNqRDlGLFdBQVcwRSxRQUFRMUIsVUFBVSxDQUFDO0FBQUE7QUFBQSxzR0FFckRzQyxPQUFPO0FBQUEsd0lBQzJCRixZQUFZO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQU94SSxnQkFBTUYsT0FBT2EsT0FBT0MsS0FBSztBQUFBLFlBQ3ZCdEUsTUFBTXlEO0FBQUFBLFlBQ05jLElBQUksQ0FBQ3ZCLFFBQVF0QixLQUFLO0FBQUEsWUFDbEI4QyxTQUFTM0IsS0FDTCw4REFDQTtBQUFBLFlBQ0o0QixNQUFNUDtBQUFBQSxVQUNSLENBQUM7QUFBQSxRQUNILFNBQVN4QixHQUFHO0FBQ1ZDLGtCQUFRNUMsTUFBTSw0Q0FBNEMyQyxDQUFDO0FBQUEsUUFDN0Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUNBLFdBQU87QUFBQSxNQUFFSCxNQUFNO0FBQUEsSUFBSztBQUFBLEVBQ3RCO0FBQ0EsU0FBTztBQUFBLElBQUVBLE1BQU07QUFBQSxFQUFNO0FBQ3ZCLENBQUM7QUFBRSxTQUFBL0QsdUNBQUFhLGtEQUFBNEMsb0NBQUFHO0FBQUEsSUFBQXNDLFlBQUFDLEtBQUE7QUFBQUQsY0FBQUMsSUFBQUMsT0FBQTtBQUFBO0FBQUE7QUFBQSxJQUFBRixZQUFBRyxZQUFBO0FBQUFILGNBQUFHLFdBQUFELE9BQUE7QUFBQTtBQUFBIiwibmFtZXMiOlsiY3JlYXRlU2VydmVyRm4iLCJTdHJpcGUiLCJSZXNlbmQiLCJzdXBhYmFzZUFkbWluIiwiZXNjYXBlSHRtbCIsIk1PTlRBTlQiLCJjcmVhdGVDb21tYW5kZV9jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIiwiY3JlYXRlU2VydmVyUnBjIiwiaWQiLCJuYW1lIiwiZmlsZW5hbWUiLCJvcHRzIiwiY3JlYXRlQ29tbWFuZGUiLCJfX2V4ZWN1dGVTZXJ2ZXIiLCJtZXRob2QiLCJoYW5kbGVyIiwiZGF0YSIsInJlcXVlc3QiLCJjcmVhdGVDb21tYW5kZUhhbmRsZXIiLCJjcmVhdGVDaGVja291dEZvckNvbW1hbmRlX2NyZWF0ZVNlcnZlckZuX2hhbmRsZXIiLCJjcmVhdGVDaGVja291dEZvckNvbW1hbmRlIiwic3RyaXBlS2V5IiwicHJvY2VzcyIsImVudiIsIlNUUklQRV9TRUNSRVRfS0VZIiwiRXJyb3IiLCJzdHJpcGUiLCJhcGlWZXJzaW9uIiwiY29tbWFuZGUiLCJlcnJvciIsImZyb20iLCJzZWxlY3QiLCJlcSIsImNvbW1hbmRlX2lkIiwic2luZ2xlIiwic3RhdHV0IiwidXJsIiwib3JpZ2luIiwiYWxyZWFkeV9wYWlkIiwic2Vzc2lvbiIsImNoZWNrb3V0Iiwic2Vzc2lvbnMiLCJjcmVhdGUiLCJtb2RlIiwicGF5bWVudF9tZXRob2RfdHlwZXMiLCJsaW5lX2l0ZW1zIiwicHJpY2VfZGF0YSIsImN1cnJlbmN5IiwidW5pdF9hbW91bnQiLCJtb250YW50X2NlbnRpbWVzIiwicHJvZHVjdF9kYXRhIiwiZGVzY3JpcHRpb24iLCJlbnRyZXByaXNlIiwidmlsbGUiLCJxdWFudGl0eSIsImN1c3RvbWVyX2VtYWlsIiwiZW1haWwiLCJzdWNjZXNzX3VybCIsImNhbmNlbF91cmwiLCJtZXRhZGF0YSIsImFsbG93X3Byb21vdGlvbl9jb2RlcyIsInVwZGF0ZSIsInN0cmlwZV9zZXNzaW9uX2lkIiwiZ2V0Q29tbWFuZGVfY3JlYXRlU2VydmVyRm5faGFuZGxlciIsImdldENvbW1hbmRlIiwiYyIsImNvbmZpcm1TdHJpcGVTZXNzaW9uX2NyZWF0ZVNlcnZlckZuX2hhbmRsZXIiLCJjb25maXJtU3RyaXBlU2Vzc2lvbiIsImNFcnIiLCJwYWlkIiwic2Vzc2lvbl9pZCIsInJldHJpZXZlIiwiZSIsImNvbnNvbGUiLCJwYXltZW50X3N0YXR1cyIsIm9iIiwibWF5YmVTaW5nbGUiLCJuZXdTdGF0dXQiLCJmdWxsQ21kIiwic3RyaXBlX3BheW1lbnRfaWQiLCJwYXltZW50X2ludGVudCIsInBhaWRfYXQiLCJEYXRlIiwidG9JU09TdHJpbmciLCJyZXNlbmRLZXkiLCJSRVNFTkRfQVBJX0tFWSIsInJlc2VuZCIsIkZST00iLCJtb250YW50RXVyb3MiLCJ0b0ZpeGVkIiwiZGF0ZVN0ciIsIm5vdyIsInRvTG9jYWxlRGF0ZVN0cmluZyIsImRheSIsIm1vbnRoIiwieWVhciIsImNsaWVudEh0bWwiLCJwcmVub20iLCJub20iLCJlbWFpbHMiLCJzZW5kIiwidG8iLCJzdWJqZWN0IiwiaHRtbCIsImltcG9ydCIsImhvdCIsImFjY2VwdCIsIndlYnBhY2tIb3QiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiY29tbWFuZGUuZnVuY3Rpb25zLnRzP3Rzcy1zZXJ2ZXJmbi1zcGxpdCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVTZXJ2ZXJGbiB9IGZyb20gXCJAdGFuc3RhY2svcmVhY3Qtc3RhcnRcIjtcbmltcG9ydCB7IHogfSBmcm9tIFwiem9kXCI7XG5pbXBvcnQgU3RyaXBlIGZyb20gXCJzdHJpcGVcIjtcbmltcG9ydCB7IFJlc2VuZCB9IGZyb20gXCJyZXNlbmRcIjtcbmltcG9ydCB7IHN1cGFiYXNlQWRtaW4gfSBmcm9tIFwiQC9pbnRlZ3JhdGlvbnMvc3VwYWJhc2UvY2xpZW50LnNlcnZlclwiO1xuaW1wb3J0IHsgZXNjYXBlSHRtbCB9IGZyb20gXCJAL2xpYi91dGlsc1wiO1xuXG5jb25zdCBzY2hlbWEgPSB6Lm9iamVjdCh7XG4gIHByZW5vbTogei5zdHJpbmcoKS50cmltKCkubWluKDEpLm1heCg2MCksXG4gIG5vbTogei5zdHJpbmcoKS50cmltKCkubWluKDEpLm1heCg2MCksXG4gIGVtYWlsOiB6LnN0cmluZygpLnRyaW0oKS5lbWFpbCgpLm1heCgyNTUpLFxuICB0ZWxlcGhvbmU6IHouc3RyaW5nKCkudHJpbSgpLm1pbig2KS5tYXgoMzApLFxuICBlbnRyZXByaXNlOiB6LnN0cmluZygpLnRyaW0oKS5taW4oMSkubWF4KDEyMCksXG4gIHZpbGxlOiB6LnN0cmluZygpLnRyaW0oKS5taW4oMSkubWF4KDEyMCksXG4gIGFjdGl2aXRlOiB6LnN0cmluZygpLnRyaW0oKS5taW4oMSkubWF4KDEyMCksXG59KTtcblxuY29uc3QgTU9OVEFOVCA9IDM3OTAwOyAvLyAzNznigqxcblxuLy8gU3RlcCAxIG9mIHRoZSBmdW5uZWw6IGp1c3QgY3JlYXRlIHRoZSBjb21tYW5kZS4gTk8gU3RyaXBlIHlldC5cbi8vIFRoZSBjbGllbnQgaXMgcmVkaXJlY3RlZCB0byAvb25ib2FyZGluZy97aWR9IHRvIGZpbGwgdGhlIGJyaWVmaW5nIGZpcnN0LlxuZXhwb3J0IGNvbnN0IGNyZWF0ZUNvbW1hbmRlID0gY3JlYXRlU2VydmVyRm4oeyBtZXRob2Q6IFwiUE9TVFwiIH0pXG4gIC5pbnB1dFZhbGlkYXRvcigoaW5wdXQpID0+IHNjaGVtYS5wYXJzZShpbnB1dCkpXG4gIC5oYW5kbGVyKGFzeW5jICh7IGRhdGEsIHJlcXVlc3QgfSkgPT4ge1xuICAgIC8vIER5bmFtaWMgaW1wb3J0IHRvIGF2b2lkIGNsaWVudC1zaWRlIGltcG9ydCBpc3N1ZXMgd2l0aCBAdGFuc3RhY2svcmVhY3Qtc3RhcnQvc2VydmVyXG4gICAgY29uc3QgeyBjcmVhdGVDb21tYW5kZUhhbmRsZXIgfSA9IGF3YWl0IGltcG9ydChcIkAvbGliL2NyZWF0ZS1jb21tYW5kZS5oYW5kbGVyLnNlcnZlclwiKTtcbiAgICByZXR1cm4gYXdhaXQgY3JlYXRlQ29tbWFuZGVIYW5kbGVyKGRhdGEsIHJlcXVlc3QpO1xuICB9KTtcblxuLy8gU3RlcCAzIG9mIHRoZSBmdW5uZWw6IGFmdGVyIHRoZSBicmllZmluZyBpcyBzYXZlZCwgY3JlYXRlIGEgU3RyaXBlIGNoZWNrb3V0XG4vLyBzZXNzaW9uIGZvciBhbiBleGlzdGluZyBjb21tYW5kZSBhbmQgcmVkaXJlY3QgdGhlIGNsaWVudCB0byBpdC5cbmV4cG9ydCBjb25zdCBjcmVhdGVDaGVja291dEZvckNvbW1hbmRlID0gY3JlYXRlU2VydmVyRm4oeyBtZXRob2Q6IFwiUE9TVFwiIH0pXG4gIC5pbnB1dFZhbGlkYXRvcigoaW5wdXQpID0+XG4gICAgelxuICAgICAgLm9iamVjdCh7XG4gICAgICAgIGNvbW1hbmRlX2lkOiB6LnN0cmluZygpLnV1aWQoKSxcbiAgICAgICAgb3JpZ2luOiB6LnN0cmluZygpLnVybCgpLFxuICAgICAgfSlcbiAgICAgIC5wYXJzZShpbnB1dCksXG4gIClcbiAgLmhhbmRsZXIoYXN5bmMgKHsgZGF0YSB9KSA9PiB7XG4gICAgY29uc3Qgc3RyaXBlS2V5ID0gcHJvY2Vzcy5lbnYuU1RSSVBFX1NFQ1JFVF9LRVk7XG4gICAgaWYgKCFzdHJpcGVLZXkpIHRocm93IG5ldyBFcnJvcihcIlNUUklQRV9TRUNSRVRfS0VZIG5vbiBjb25maWd1csOpZVwiKTtcbiAgICBjb25zdCBzdHJpcGUgPSBuZXcgU3RyaXBlKHN0cmlwZUtleSwge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgIGFwaVZlcnNpb246IFwiMjAyNC0xMi0xOC5hY2FjaWFcIiBhcyBhbnksXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGRhdGE6IGNvbW1hbmRlLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgLmZyb20oXCJjb21tYW5kZXNcIilcbiAgICAgIC5zZWxlY3QoXCJpZCwgZW1haWwsIGVudHJlcHJpc2UsIHZpbGxlLCBzdGF0dXQsIG1vbnRhbnRfY2VudGltZXNcIilcbiAgICAgIC5lcShcImlkXCIsIGRhdGEuY29tbWFuZGVfaWQpXG4gICAgICAuc2luZ2xlKCk7XG4gICAgaWYgKGVycm9yIHx8ICFjb21tYW5kZSkgdGhyb3cgbmV3IEVycm9yKFwiQ29tbWFuZGUgaW50cm91dmFibGVcIik7XG4gICAgaWYgKGNvbW1hbmRlLnN0YXR1dCAhPT0gXCJlbl9hdHRlbnRlXCIpIHtcbiAgICAgIC8vIEFscmVhZHkgcGFpZCDigJQgc2hvcnQtY2lyY3VpdCB0byBzdWNjZXNzXG4gICAgICByZXR1cm4geyB1cmw6IGAke2RhdGEub3JpZ2lufS9vbmJvYXJkaW5nLXN1Y2Nlc3MvJHtjb21tYW5kZS5pZH1gLCBhbHJlYWR5X3BhaWQ6IHRydWUgfTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXNzaW9uID0gYXdhaXQgc3RyaXBlLmNoZWNrb3V0LnNlc3Npb25zLmNyZWF0ZSh7XG4gICAgICBtb2RlOiBcInBheW1lbnRcIixcbiAgICAgIHBheW1lbnRfbWV0aG9kX3R5cGVzOiBbXCJjYXJkXCJdLFxuICAgICAgbGluZV9pdGVtczogW1xuICAgICAgICB7XG4gICAgICAgICAgcHJpY2VfZGF0YToge1xuICAgICAgICAgICAgY3VycmVuY3k6IFwiZXVyXCIsXG4gICAgICAgICAgICB1bml0X2Ftb3VudDogY29tbWFuZGUubW9udGFudF9jZW50aW1lcyA/PyBNT05UQU5ULFxuICAgICAgICAgICAgcHJvZHVjdF9kYXRhOiB7XG4gICAgICAgICAgICAgIG5hbWU6IFwiUGFjayBIb3RhdmlzIOKAlCBDcsOpYXRpb24gJiBvcHRpbWlzYXRpb24gZmljaGUgR29vZ2xlIEJ1c2luZXNzXCIsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgUG91ciAke2NvbW1hbmRlLmVudHJlcHJpc2V9ICgke2NvbW1hbmRlLnZpbGxlfSlgLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHF1YW50aXR5OiAxLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGN1c3RvbWVyX2VtYWlsOiBjb21tYW5kZS5lbWFpbCxcbiAgICAgIHN1Y2Nlc3NfdXJsOiBgJHtkYXRhLm9yaWdpbn0vb25ib2FyZGluZy1zdWNjZXNzLyR7Y29tbWFuZGUuaWR9P3Nlc3Npb25faWQ9e0NIRUNLT1VUX1NFU1NJT05fSUR9YCxcbiAgICAgIGNhbmNlbF91cmw6IGAke2RhdGEub3JpZ2lufS9vbmJvYXJkaW5nLyR7Y29tbWFuZGUuaWR9P2NhbmNlbGxlZD0xYCxcbiAgICAgIG1ldGFkYXRhOiB7IGNvbW1hbmRlX2lkOiBjb21tYW5kZS5pZCB9LFxuICAgICAgYWxsb3dfcHJvbW90aW9uX2NvZGVzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgLmZyb20oXCJjb21tYW5kZXNcIilcbiAgICAgIC51cGRhdGUoeyBzdHJpcGVfc2Vzc2lvbl9pZDogc2Vzc2lvbi5pZCB9KVxuICAgICAgLmVxKFwiaWRcIiwgY29tbWFuZGUuaWQpO1xuXG4gICAgcmV0dXJuIHsgdXJsOiBzZXNzaW9uLnVybCEsIGFscmVhZHlfcGFpZDogZmFsc2UgfTtcbiAgfSk7XG5cbmV4cG9ydCBjb25zdCBnZXRDb21tYW5kZSA9IGNyZWF0ZVNlcnZlckZuKHsgbWV0aG9kOiBcIkdFVFwiIH0pXG4gIC5pbnB1dFZhbGlkYXRvcigoaW5wdXQpID0+IHoub2JqZWN0KHsgaWQ6IHouc3RyaW5nKCkudXVpZCgpIH0pLnBhcnNlKGlucHV0KSlcbiAgLmhhbmRsZXIoYXN5bmMgKHsgZGF0YSB9KSA9PiB7XG4gICAgY29uc3QgeyBkYXRhOiBjLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgLmZyb20oXCJjb21tYW5kZXNcIilcbiAgICAgIC5zZWxlY3QoXCJpZCwgcHJlbm9tLCBub20sIGVtYWlsLCBlbnRyZXByaXNlLCB2aWxsZSwgc3RhdHV0LCBwYWlkX2F0XCIpXG4gICAgICAuZXEoXCJpZFwiLCBkYXRhLmlkKVxuICAgICAgLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvciB8fCAhYykgdGhyb3cgbmV3IEVycm9yKFwiQ29tbWFuZGUgaW50cm91dmFibGVcIik7XG4gICAgcmV0dXJuIGM7XG4gIH0pO1xuXG4vLyBGYWxsYmFjayB1c2VkIGJ5IC9vbmJvYXJkaW5nLXN1Y2Nlc3MgYWZ0ZXIgU3RyaXBlIHJlZGlyZWN0LCBpbiBjYXNlIHRoZVxuLy8gd2ViaG9vayBpcyBkZWxheWVkLiBNYXJrcyBwYWlkIGFuZCBidW1wcyBzdGF0dXQgYWNjb3JkaW5nIHRvIG9uYm9hcmRpbmcgcHJlc2VuY2UuXG5leHBvcnQgY29uc3QgY29uZmlybVN0cmlwZVNlc3Npb24gPSBjcmVhdGVTZXJ2ZXJGbih7IG1ldGhvZDogXCJQT1NUXCIgfSlcbiAgLmlucHV0VmFsaWRhdG9yKChpbnB1dCkgPT5cbiAgICB6XG4gICAgICAub2JqZWN0KHtcbiAgICAgICAgY29tbWFuZGVfaWQ6IHouc3RyaW5nKCkudXVpZCgpLFxuICAgICAgICBzZXNzaW9uX2lkOiB6LnN0cmluZygpLm1pbig1KS5tYXgoMjU1KSxcbiAgICAgIH0pXG4gICAgICAucGFyc2UoaW5wdXQpLFxuICApXG4gIC5oYW5kbGVyKGFzeW5jICh7IGRhdGEgfSkgPT4ge1xuICAgIGNvbnN0IHsgZGF0YTogY29tbWFuZGUsIGVycm9yOiBjRXJyIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluXG4gICAgICAuZnJvbShcImNvbW1hbmRlc1wiKVxuICAgICAgLnNlbGVjdChcImlkLCBzdGF0dXQsIHN0cmlwZV9zZXNzaW9uX2lkXCIpXG4gICAgICAuZXEoXCJpZFwiLCBkYXRhLmNvbW1hbmRlX2lkKVxuICAgICAgLnNpbmdsZSgpO1xuICAgIGlmIChjRXJyIHx8ICFjb21tYW5kZSkgdGhyb3cgbmV3IEVycm9yKFwiQ29tbWFuZGUgaW50cm91dmFibGVcIik7XG4gICAgLy8gU2kgZMOpasOgIHBhecOpZSAod2ViaG9vayBlc3QgcGFzc8OpIGF2YW50KSwgb24gc2hvcnQtY2lyY3VpdGUuXG4gICAgaWYgKGNvbW1hbmRlLnN0YXR1dCAhPT0gXCJlbl9hdHRlbnRlXCIpIHJldHVybiB7IHBhaWQ6IHRydWUgfTtcblxuICAgIC8vIFNpIHN0cmlwZV9zZXNzaW9uX2lkIGRpdmVyZ2UsIGMnZXN0IHVuIHJldHJ5IGF2ZWMgdW5lIG5vdXZlbGxlIHNlc3Npb25cbiAgICAvLyAobGUgY2xpZW50IGEgcGV1dC3DqnRyZSBhYmFuZG9ubsOpIHB1aXMgcmVsYW5jw6kgdW4gY2hlY2tvdXQpLiBPbiBhY2NlcHRlXG4gICAgLy8gbGEgbm91dmVsbGUgc2Vzc2lvbiDDoCBjb25kaXRpb24gcXUnZWxsZSBhcHBhcnRpZW5uZSBiaWVuIMOgIGNldHRlIGNvbW1hbmRlXG4gICAgLy8gKHbDqXJpZmnDqSB2aWEgbWV0YWRhdGEgY8O0dMOpIFN0cmlwZSkuIE9uIG5lIGpldHRlIHBsdXMgc3lzdMOpbWF0aXF1ZW1lbnQuXG4gICAgaWYgKGNvbW1hbmRlLnN0cmlwZV9zZXNzaW9uX2lkICYmIGNvbW1hbmRlLnN0cmlwZV9zZXNzaW9uX2lkICE9PSBkYXRhLnNlc3Npb25faWQpIHtcbiAgICAgIC8vIE9uIHBlcnNpc3RlIGxlIG5vdXZlYXUgc2Vzc2lvbl9pZCBwb3VyIGxlcyByZXRyaWVzIGZ1dHVyc1xuICAgICAgYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgICAuZnJvbShcImNvbW1hbmRlc1wiKVxuICAgICAgICAudXBkYXRlKHsgc3RyaXBlX3Nlc3Npb25faWQ6IGRhdGEuc2Vzc2lvbl9pZCB9KVxuICAgICAgICAuZXEoXCJpZFwiLCBkYXRhLmNvbW1hbmRlX2lkKVxuICAgICAgICAuZXEoXCJzdGF0dXRcIiwgXCJlbl9hdHRlbnRlXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IHN0cmlwZUtleSA9IHByb2Nlc3MuZW52LlNUUklQRV9TRUNSRVRfS0VZO1xuICAgIGlmICghc3RyaXBlS2V5KSB0aHJvdyBuZXcgRXJyb3IoXCJTVFJJUEVfU0VDUkVUX0tFWSBub24gY29uZmlndXLDqWVcIik7XG4gICAgY29uc3Qgc3RyaXBlID0gbmV3IFN0cmlwZShzdHJpcGVLZXksIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICBhcGlWZXJzaW9uOiBcIjIwMjQtMTItMTguYWNhY2lhXCIgYXMgYW55LFxuICAgIH0pO1xuXG4gICAgbGV0IHNlc3Npb246IFN0cmlwZS5DaGVja291dC5TZXNzaW9uO1xuICAgIHRyeSB7XG4gICAgICBzZXNzaW9uID0gYXdhaXQgc3RyaXBlLmNoZWNrb3V0LnNlc3Npb25zLnJldHJpZXZlKGRhdGEuc2Vzc2lvbl9pZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihcIlN0cmlwZSBzZXNzaW9uIHJldHJpZXZlIGZhaWxlZDpcIiwgZSk7XG4gICAgICByZXR1cm4geyBwYWlkOiBmYWxzZSB9O1xuICAgIH1cblxuICAgIC8vIFPDqWN1cml0w6kgOiBsYSBzZXNzaW9uIFN0cmlwZSBkb2l0IHLDqWbDqXJlbmNlciBjZXR0ZSBjb21tYW5kZSBkYW5zIHNlcyBtZXRhZGF0YVxuICAgIGlmIChzZXNzaW9uLm1ldGFkYXRhPy5jb21tYW5kZV9pZCAhPT0gZGF0YS5jb21tYW5kZV9pZCkge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJTZXNzaW9uIFN0cmlwZSBtZXRhZGF0YSBjb21tYW5kZV9pZCBtaXNtYXRjaDpcIixcbiAgICAgICAgc2Vzc2lvbi5tZXRhZGF0YT8uY29tbWFuZGVfaWQsXG4gICAgICAgIFwidnNcIixcbiAgICAgICAgZGF0YS5jb21tYW5kZV9pZCxcbiAgICAgICk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZXNzaW9uIFN0cmlwZSBpbnZhbGlkZSBwb3VyIGNldHRlIGNvbW1hbmRlXCIpO1xuICAgIH1cblxuICAgIGlmIChzZXNzaW9uLnBheW1lbnRfc3RhdHVzID09PSBcInBhaWRcIikge1xuICAgICAgLy8gRGVjaWRlIHN0YXR1dCBiYXNlZCBvbiBvbmJvYXJkaW5nIHByZXNlbmNlXG4gICAgICBjb25zdCB7IGRhdGE6IG9iIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluXG4gICAgICAgIC5mcm9tKFwib25ib2FyZGluZ3NcIilcbiAgICAgICAgLnNlbGVjdChcImNvbW1hbmRlX2lkXCIpXG4gICAgICAgIC5lcShcImNvbW1hbmRlX2lkXCIsIGRhdGEuY29tbWFuZGVfaWQpXG4gICAgICAgIC5tYXliZVNpbmdsZSgpO1xuICAgICAgY29uc3QgbmV3U3RhdHV0ID0gb2IgPyBcIm9uYm9hcmRpbmdfY29tcGzDqXTDqVwiIDogXCJwYXnDqVwiO1xuXG4gICAgICBjb25zdCB7IGRhdGE6IGZ1bGxDbWQgfSA9IGF3YWl0IHN1cGFiYXNlQWRtaW5cbiAgICAgICAgLmZyb20oXCJjb21tYW5kZXNcIilcbiAgICAgICAgLnVwZGF0ZSh7XG4gICAgICAgICAgc3RhdHV0OiBuZXdTdGF0dXQsXG4gICAgICAgICAgc3RyaXBlX3BheW1lbnRfaWQ6IChzZXNzaW9uLnBheW1lbnRfaW50ZW50IGFzIHN0cmluZykgPz8gbnVsbCxcbiAgICAgICAgICBwYWlkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIH0pXG4gICAgICAgIC5lcShcImlkXCIsIGRhdGEuY29tbWFuZGVfaWQpXG4gICAgICAgIC5lcShcInN0YXR1dFwiLCBcImVuX2F0dGVudGVcIilcbiAgICAgICAgLnNlbGVjdChcImlkLCBwcmVub20sIG5vbSwgZW1haWwsIGVudHJlcHJpc2UsIHZpbGxlLCBhY3Rpdml0ZSwgbW9udGFudF9jZW50aW1lcywgcGFpZF9hdFwiKVxuICAgICAgICAuc2luZ2xlKCk7XG5cbiAgICAgIC8vIEVudm9pIGVtYWlsIGRlIGNvbmZpcm1hdGlvbiBhdSBjbGllbnQgKGZhbGxiYWNrIHNpIHdlYmhvb2sgU3RyaXBlIHJldGFyZMOpL2Fic2VudClcbiAgICAgIGlmIChmdWxsQ21kKSB7XG4gICAgICAgIGNvbnN0IHJlc2VuZEtleSA9IHByb2Nlc3MuZW52LlJFU0VORF9BUElfS0VZO1xuICAgICAgICBpZiAocmVzZW5kS2V5KSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc2VuZCA9IG5ldyBSZXNlbmQocmVzZW5kS2V5KTtcbiAgICAgICAgICAgIGNvbnN0IEZST00gPSBcIkhvdGF2aXMgPG5vcmVwbHlAaG90YXZpcy5mcj5cIjtcbiAgICAgICAgICAgIGNvbnN0IG1vbnRhbnRFdXJvcyA9ICgoZnVsbENtZC5tb250YW50X2NlbnRpbWVzID8/IE1PTlRBTlQpIC8gMTAwKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IG5ldyBEYXRlKGZ1bGxDbWQucGFpZF9hdCB8fCBEYXRlLm5vdygpKS50b0xvY2FsZURhdGVTdHJpbmcoXCJmci1GUlwiLCB7XG4gICAgICAgICAgICAgIGRheTogXCIyLWRpZ2l0XCIsXG4gICAgICAgICAgICAgIG1vbnRoOiBcImxvbmdcIixcbiAgICAgICAgICAgICAgeWVhcjogXCJudW1lcmljXCIsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgY2xpZW50SHRtbCA9IG9iXG4gICAgICAgICAgICAgID8gYDxkaXYgc3R5bGU9XCJmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO21heC13aWR0aDo2MDBweDttYXJnaW46MCBhdXRvO3BhZGRpbmc6MjRweFwiPlxuICAgICAgICAgICAgICAgICAgPGgyIHN0eWxlPVwiY29sb3I6IzM0QTg1M1wiPk1lcmNpICR7ZXNjYXBlSHRtbChmdWxsQ21kLnByZW5vbSl9ICEg8J+OiTwvaDI+XG4gICAgICAgICAgICAgICAgICA8cD5Wb3RyZSBwYWllbWVudCBkZSA8Yj4ke21vbnRhbnRFdXJvc33igqw8L2I+IGVzdCBjb25maXJtw6kgcG91ciA8Yj4ke2VzY2FwZUh0bWwoZnVsbENtZC5lbnRyZXByaXNlKX08L2I+LjwvcD5cbiAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJiYWNrZ3JvdW5kOiNmOGY5ZmE7Ym9yZGVyOjFweCBzb2xpZCAjZTBlMGUwO2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6MTZweDttYXJnaW46MjBweCAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxoMyBzdHlsZT1cIm1hcmdpbjowIDAgMTJweCAwO2NvbG9yOiM0Mjg1RjQ7Zm9udC1zaXplOjE0cHhcIj5Sw6ljYXBpdHVsYXRpZiBkZSBjb21tYW5kZTwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx0YWJsZSBzdHlsZT1cIndpZHRoOjEwMCU7Zm9udC1zaXplOjEzcHg7Y29sb3I6IzMzM1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDx0cj48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCAwO2NvbG9yOiM2NjZcIj5DbGllbnQgOjwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggMDtmb250LXdlaWdodDpib2xkXCI+JHtlc2NhcGVIdG1sKGZ1bGxDbWQucHJlbm9tKX0gJHtlc2NhcGVIdG1sKGZ1bGxDbWQubm9tKX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDA7Y29sb3I6IzY2NlwiPkVudHJlcHJpc2UgOjwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggMDtmb250LXdlaWdodDpib2xkXCI+JHtlc2NhcGVIdG1sKGZ1bGxDbWQuZW50cmVwcmlzZSl9PC90ZD48L3RyPlxuICAgICAgICAgICAgICAgICAgICAgIDx0cj48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCAwO2NvbG9yOiM2NjZcIj5QcmVzdGF0aW9uIDo8L3RkPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDBcIj5DcsOpYXRpb24gJiBvcHRpbWlzYXRpb24gZmljaGUgR29vZ2xlIEJ1c2luZXNzIFByb2ZpbGU8L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDA7Y29sb3I6IzY2NlwiPkRhdGUgOjwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggMFwiPiR7ZGF0ZVN0cn08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDA7Y29sb3I6IzY2NlwiPk1vbnRhbnQgOjwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggMDtmb250LXdlaWdodDpib2xkO2NvbG9yOiMzNEE4NTNcIj4ke21vbnRhbnRFdXJvc33igqw8L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxwPlZvdHJlIGJyaWVmaW5nIGVzdCA8Yj5lbnRyZSBsZXMgbWFpbnMgZGUgbm9zIGV4cGVydHM8L2I+LiBWb3VzIHJlY2V2cmV6IHZvdHJlIGZpY2hlIEdvb2dsZSBCdXNpbmVzcyBzb3VzIDcgam91cnMgb3V2csOpcy48L3A+XG4gICAgICAgICAgICAgICAgICA8cCBzdHlsZT1cImJhY2tncm91bmQ6I0ZFRjNDNztib3JkZXItbGVmdDo0cHggc29saWQgI0Y1OUUwQjtwYWRkaW5nOjEycHg7Zm9udC1zaXplOjEzcHg7Y29sb3I6Izc4MzUwRjtib3JkZXItcmFkaXVzOjZweFwiPlxuICAgICAgICAgICAgICAgICAgICA8Yj7DgCBub3RlciA6PC9iPiBkYW5zIGNlcnRhaW5zIGNhcywgR29vZ2xlIGV4aWdlIHVuZSB2w6lyaWZpY2F0aW9uIHBhciBjb3VycmllciBwb3N0YWwgcG91ciB2YWxpZGVyIGwnw6l0YWJsaXNzZW1lbnQsIGNlIHF1aSBwZXV0IHJhbGxvbmdlciBsZSBkw6lsYWkgZCdlbnZpcm9uIDE0IGpvdXJzLlxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgPHAgc3R5bGU9XCJjb2xvcjojNjY2O2ZvbnQtc2l6ZToxM3B4O21hcmdpbi10b3A6MzJweFwiPuKAlCBMJ8OpcXVpcGUgSG90YXZpczwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5gXG4gICAgICAgICAgICAgIDogYDxkaXYgc3R5bGU9XCJmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO21heC13aWR0aDo2MDBweDttYXJnaW46MCBhdXRvO3BhZGRpbmc6MjRweFwiPlxuICAgICAgICAgICAgICAgICAgPGgyIHN0eWxlPVwiY29sb3I6IzQyODVGNFwiPk1lcmNpICR7ZXNjYXBlSHRtbChmdWxsQ21kLnByZW5vbSl9ICE8L2gyPlxuICAgICAgICAgICAgICAgICAgPHA+Vm90cmUgcGFpZW1lbnQgZGUgPGI+JHttb250YW50RXVyb3N94oKsPC9iPiBhIGJpZW4gw6l0w6kgcmXDp3UgcG91ciA8Yj4ke2VzY2FwZUh0bWwoZnVsbENtZC5lbnRyZXByaXNlKX08L2I+LjwvcD5cbiAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJiYWNrZ3JvdW5kOiNmOGY5ZmE7Ym9yZGVyOjFweCBzb2xpZCAjZTBlMGUwO2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6MTZweDttYXJnaW46MjBweCAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxoMyBzdHlsZT1cIm1hcmdpbjowIDAgMTJweCAwO2NvbG9yOiM0Mjg1RjQ7Zm9udC1zaXplOjE0cHhcIj5Sw6ljYXBpdHVsYXRpZiBkZSBjb21tYW5kZTwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx0YWJsZSBzdHlsZT1cIndpZHRoOjEwMCU7Zm9udC1zaXplOjEzcHg7Y29sb3I6IzMzM1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDx0cj48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCAwO2NvbG9yOiM2NjZcIj5DbGllbnQgOjwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggMDtmb250LXdlaWdodDpib2xkXCI+JHtlc2NhcGVIdG1sKGZ1bGxDbWQucHJlbm9tKX0gJHtlc2NhcGVIdG1sKGZ1bGxDbWQubm9tKX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDA7Y29sb3I6IzY2NlwiPkVudHJlcHJpc2UgOjwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggMDtmb250LXdlaWdodDpib2xkXCI+JHtlc2NhcGVIdG1sKGZ1bGxDbWQuZW50cmVwcmlzZSl9PC90ZD48L3RyPlxuICAgICAgICAgICAgICAgICAgICAgIDx0cj48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCAwO2NvbG9yOiM2NjZcIj5QcmVzdGF0aW9uIDo8L3RkPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDBcIj5DcsOpYXRpb24gJiBvcHRpbWlzYXRpb24gZmljaGUgR29vZ2xlIEJ1c2luZXNzIFByb2ZpbGU8L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDA7Y29sb3I6IzY2NlwiPkRhdGUgOjwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggMFwiPiR7ZGF0ZVN0cn08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDA7Y29sb3I6IzY2NlwiPk1vbnRhbnQgOjwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggMDtmb250LXdlaWdodDpib2xkO2NvbG9yOiMzNEE4NTNcIj4ke21vbnRhbnRFdXJvc33igqw8L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxwPkRlcm5pw6hyZSDDqXRhcGUgOiByZW1wbGlzc2V6IGxlIGZvcm11bGFpcmUgZGUgYnJpZWZpbmcgKDEwIG1pbikgcG91ciBxdSdvbiBwdWlzc2UgY3LDqWVyIHZvdHJlIGZpY2hlIEdvb2dsZS48L3A+XG4gICAgICAgICAgICAgICAgICA8cCBzdHlsZT1cImNvbG9yOiM2NjY7Zm9udC1zaXplOjEzcHg7bWFyZ2luLXRvcDozMnB4XCI+4oCUIEwnw6lxdWlwZSBIb3RhdmlzPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PmA7XG5cbiAgICAgICAgICAgIGF3YWl0IHJlc2VuZC5lbWFpbHMuc2VuZCh7XG4gICAgICAgICAgICAgIGZyb206IEZST00sXG4gICAgICAgICAgICAgIHRvOiBbZnVsbENtZC5lbWFpbF0sXG4gICAgICAgICAgICAgIHN1YmplY3Q6IG9iXG4gICAgICAgICAgICAgICAgPyBcIuKchSBQYWllbWVudCBjb25maXJtw6kg4oCUIFZvdHJlIGRvc3NpZXIgZXN0IGVudHJlIG5vcyBtYWlucyAhXCJcbiAgICAgICAgICAgICAgICA6IFwi4pyFIFBhaWVtZW50IGNvbmZpcm3DqSDigJQgw4Agdm91cyBkZSBqb3VlciAhXCIsXG4gICAgICAgICAgICAgIGh0bWw6IGNsaWVudEh0bWwsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRW1haWwgc2VuZCBlcnJvciAoY29uZmlybVN0cmlwZVNlc3Npb24pOlwiLCBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7IHBhaWQ6IHRydWUgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgcGFpZDogZmFsc2UgfTtcbiAgfSk7XG4iXSwiZmlsZSI6IkM6L1VzZXJzL2Rhb3VkL0RvY3VtZW50cy9ob3RhdmlzLS12ZXJjZWwvaG90YXZpcy1ib29zdC9zcmMvbGliL2NvbW1hbmRlLmZ1bmN0aW9ucy50cyJ9