import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";

/**
 * Cron public endpoint — appelle ce endpoint toutes les heures (depuis un
 * scheduler externe ou pg_cron) pour relancer les clients qui ont payé
 * mais n'ont pas complété leur briefing.
 *
 * Usage : GET /api/public/cron-reminders?secret=<CRON_SECRET>
 */
export const Route = createFileRoute("/api/public/cron-reminders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        // Accepte soit ?secret=CRON_SECRET, soit header apikey == SUPABASE_PUBLISHABLE_KEY
        // (pattern recommandé pour pg_cron interne).
        const provided = url.searchParams.get("secret");
        const apikey = request.headers.get("apikey") || request.headers.get("Apikey");
        const cronSecret = process.env.CRON_SECRET;
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const okSecret = cronSecret && provided === cronSecret;
        const okAnon = anonKey && apikey === anonKey;
        if (!okSecret && !okAnon) {
          return new Response("Unauthorized", { status: 401 });
        }


        // Cherche commandes payées il y a 1h+, statut=payé (pas d'onboarding),
        // et pas encore de relance envoyée
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: commandes, error } = await supabaseAdmin
          .from("commandes")
          .select("id, prenom, email, entreprise, paid_at")
          .eq("statut", "payé")
          .is("reminder_sent_at", null)
          .not("paid_at", "is", null)
          .lt("paid_at", oneHourAgo);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
          return new Response(JSON.stringify({ found: commandes?.length || 0, sent: 0, warning: "RESEND_API_KEY missing" }), { status: 200 });
        }
        const resend = new Resend(resendKey);
        const host = request.headers.get("host");
        const proto = (request.headers.get("x-forwarded-proto") || "https").split(",")[0];

        let sent = 0;
        for (const c of commandes || []) {
          const link = `${proto}://${host}/onboarding/${c.id}`;
          try {
            await resend.emails.send({
              from: "Hotavis <onboarding@resend.dev>",
              to: [c.email],
              subject: "⏰ Vos informations sont en attente — Finalisez votre briefing",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                  <h2 style="color:#4285F4">Bonjour ${escapeHtml(c.prenom)},</h2>
                  <p>Votre paiement pour <b>${escapeHtml(c.entreprise)}</b> a bien été reçu, mais nous n'avons pas encore vos informations.</p>
                  <p>Pour commencer à créer votre fiche Google My Business, complétez votre briefing (5 min) :</p>
                  <p style="text-align:center;margin:32px 0">
                    <a href="${link}" style="background:#4285F4;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">
                      📝 Reprendre mon briefing
                    </a>
                  </p>
                  <p style="font-size:13px;color:#666">Ce lien est personnel et sécurisé.</p>
                  <p style="color:#666;font-size:13px;margin-top:32px">— L'équipe Hotavis</p>
                </div>`,
            });
            await supabaseAdmin
              .from("commandes")
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq("id", c.id);
            sent++;
          } catch (e) {
            console.error("Reminder error", c.id, e);
          }
        }

        return new Response(JSON.stringify({ found: commandes?.length || 0, sent }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

