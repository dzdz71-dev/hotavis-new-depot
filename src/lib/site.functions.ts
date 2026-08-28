import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { getRequest } from "@tanstack/react-start/server";

const contactSchema = z.object({
  prenom: z.string().trim().min(1).max(60),
  nom: z.string().trim().min(1).max(60),
  entreprise: z.string().trim().min(1).max(120),
  secteur: z.string().trim().min(1).max(60),
  ville: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  ficheExistante: z.enum(["oui", "non", "je_ne_sais_pas"]),
  message: z.string().trim().max(2000).optional().default(""),
  rgpd: z.literal(true),
});

const ADMIN_EMAIL = "dz.societe.ecommerce@gmail.com";
const FROM = "Hotavis <noreply@hotavis.fr>";

function buildRateLimitKey(): string {
  try {
    const req = getRequest();
    if (!req) return "no-req";
    const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const cfIp = (req as Request & { cf?: { ipCountry?: string } }).cf?.ipCountry;
    const ip = xff || cfIp || "unknown";
    return `contact:${ip}`;
  } catch {
    return "contact:unknown";
  }
}

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    // Rate-limit : 3 messages / minute / IP
    rateLimit(buildRateLimitKey(), 3, 60_000);

    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY non configurée");
    const resend = new Resend(key);

    const ficheLabel = {
      oui: "Oui",
      non: "Non",
      je_ne_sais_pas: "Je ne sais pas",
    }[data.ficheExistante];

    const adminHtml = `
      <h2>Nouvelle demande — Landing Google My Business</h2>
      <p><b>De :</b> ${escapeHtml(data.prenom)} ${escapeHtml(data.nom)} &lt;${escapeHtml(data.email)}&gt;</p>
      <p><b>Entreprise :</b> ${escapeHtml(data.entreprise)}</p>
      <p><b>Secteur :</b> ${escapeHtml(data.secteur)}</p>
      <p><b>Ville :</b> ${escapeHtml(data.ville)}</p>
      <p><b>Fiche Google existante :</b> ${escapeHtml(ficheLabel)}</p>
      <p><b>Message :</b></p>
      <p>${escapeHtml(data.message || "(aucun message)").replace(/\n/g, "<br/>")}</p>
    `;

    const userHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#4285F4">Merci ${escapeHtml(data.prenom)} !</h2>
        <p>Nous avons bien reçu votre demande concernant <b>${escapeHtml(data.entreprise)}</b>.</p>
        <p>Notre équipe vous répondra par email sous 24h.</p>
        <p style="color:#666;font-size:13px">— L'équipe Hotavis</p>
      </div>
    `;

    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: [ADMIN_EMAIL],
        subject: `📩 Demande Landing — ${data.entreprise} (${data.ville})`,
        html: adminHtml,
        replyTo: data.email,
      }),
      resend.emails.send({
        from: FROM,
        to: [data.email],
        subject: "✅ Votre demande a bien été reçue — Hotavis",
        html: userHtml,
      }),
    ]);

    return { ok: true };
  });
