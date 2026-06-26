import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";

const ADMIN_EMAIL = "dz.societe.ecommerce@gmail.com";
const FROM = "Hotavis <onboarding@resend.dev>";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Accès refusé : admin requis");
}

export const CORRECT_QCM_Q1 = "B";

const candidatureSchema = z.object({
  prenom: z.string().trim().min(1).max(80),
  nom: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  telephone: z.string().trim().min(6).max(30),
  siret: z.string().trim().max(20).optional().or(z.literal("")),
  fiche_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  qcm_q1: z.enum(["A", "B", "C"]),
  q2_reponse: z.string().trim().min(10).max(2000),
  q3_reponse: z.string().trim().min(10).max(2000),
});

export const submitCandidature = createServerFn({ method: "POST" })
  .inputValidator((i) => candidatureSchema.parse(i))
  .handler(async ({ data }) => {
    const score = data.qcm_q1 === CORRECT_QCM_Q1 ? 1 : 0;

    // Rate-limit applicatif : max 3 candidatures par email sur 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("candidatures")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email.toLowerCase())
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      throw new Error("Trop de candidatures soumises depuis cet email (max 3/24h).");
    }

    const { error } = await supabaseAdmin.from("candidatures").insert({
      prenom: data.prenom,
      nom: data.nom,
      email: data.email.toLowerCase(),
      telephone: data.telephone,
      siret: data.siret || null,
      fiche_url: data.fiche_url || null,
      qcm_q1: data.qcm_q1,
      qcm_score: score,
      q2_reponse: data.q2_reponse,
      q3_reponse: data.q3_reponse,
    });
    if (error) throw new Error(error.message);

    // Envoi des emails (admin + candidat) — best-effort, ne bloque pas la réponse
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await Promise.all([
        // Email admin
        resend.emails.send({
          from: FROM,
          to: [ADMIN_EMAIL],
          subject: `📋 Nouvelle candidature Expert SEO — ${data.prenom} ${data.nom}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#4285F4">Nouvelle candidature reçue</h2>
            <p><b>Candidat :</b> ${escapeHtml(data.prenom)} ${escapeHtml(data.nom)}</p>
            <p><b>Email :</b> ${escapeHtml(data.email)}</p>
            <p><b>Téléphone :</b> ${escapeHtml(data.telephone)}</p>
            ${data.siret ? `<p><b>SIRET :</b> ${escapeHtml(data.siret)}</p>` : ""}
            ${data.fiche_url ? `<p><b>Fiche exemple :</b> <a href="${escapeHtml(data.fiche_url)}">${escapeHtml(data.fiche_url)}</a></p>` : ""}
            <p><b>QCM Q1 :</b> ${data.qcm_q1} ${score === 1 ? "✅ correct" : "❌ incorrect"}</p>
            <p><b>Réponse Q2 (fiche suspecte) :</b></p>
            <p style="background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap">${escapeHtml(data.q2_reponse)}</p>
            <p><b>Réponse Q3 (artisan sans local) :</b></p>
            <p style="background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap">${escapeHtml(data.q3_reponse)}</p>
            <p style="margin-top:32px"><a href="${process.env.PUBLIC_BASE_URL || "https://hotavis.com"}/admin/candidatures" style="background:#4285F4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Voir dans l'admin</a></p>
          </div>`,
        }).catch((e) => console.error("Candidature admin email error:", e)),
        // Email candidat
        resend.emails.send({
          from: FROM,
          to: [data.email],
          subject: "✅ Votre candidature chez Hotavis a bien été reçue",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#4285F4">Bonjour ${escapeHtml(data.prenom)} !</h2>
            <p>Nous avons bien reçu votre candidature pour rejoindre l'équipe Hotavis en tant qu'<b>Expert SEO Local</b>.</p>
            <p>Notre équipe va étudier votre profil et vous recontacter sous <b>5 jours ouvrés</b> à l'adresse ${escapeHtml(data.email)}.</p>
            <p style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px;font-size:13px;color:#78350F;border-radius:6px;margin:24px 0">
              <b>Pendant ce temps :</b> gardez un œil sur vos spams, et n'hésitez pas à nous écrire si vous avez une question.
            </p>
            <p style="color:#666;font-size:13px;margin-top:32px">— L'équipe Hotavis</p>
          </div>`,
        }).catch((e) => console.error("Candidature user email error:", e)),
      ]);
    }

    return { ok: true };
  });

export const listCandidatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("candidatures")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { candidatures: data || [], correct_q1: CORRECT_QCM_Q1 };
  });

export const updateCandidatureStatut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    statut: z.enum(["nouveau", "accepté", "rejeté"]),
    notes_admin: z.string().max(2000).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: { statut: "nouveau" | "accepté" | "rejeté"; notes_admin?: string } = { statut: data.statut };
    if (data.notes_admin !== undefined) patch.notes_admin = data.notes_admin;
    const { error } = await supabaseAdmin.from("candidatures").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
