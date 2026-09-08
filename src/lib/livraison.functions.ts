import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "@/lib/admin-guard";
import { escapeHtml } from "@/lib/utils";
import {
  buildRapportPDF,
  imageDimensions,
  type RapportCapture,
} from "@/lib/rapport-pdf.server";

// =====================================================================
// WORKFLOW DE LIVRAISON (admin uniquement)
// Tableau prestations/statuts/observations -> PDF -> storage prive
// reports-gmb/{commande_id}/rapport-livraison.pdf -> email client.
// Le PDF et les captures restent rattaches a la commande.
// =====================================================================

const BUCKET = "reports-gmb";
const FROM = "Hotavis <noreply@hotavis.fr>";

const rapportPath = (commandeId: string) => `${commandeId}/rapport-livraison.pdf`;

const livraisonItemSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  categorie: z.string().min(1).max(120),
  statut: z.enum(["effectue", "partiel", "non_effectue", "en_attente"]),
  observation: z.string().max(500).optional().default(""),
});

const livraisonSchema = z.object({
  commande_id: z.string().uuid(),
  details: z.array(livraisonItemSchema).max(80),
  captures: z.array(z.string().min(1).max(300)).max(5).optional().default([]),
});

/** Securite : une capture doit appartenir au dossier de la commande. */
function assertCapturePath(commandeId: string, path: string): string {
  const prefix = `${commandeId}/captures/`;
  if (!path.startsWith(prefix) || path.includes("..")) {
    throw new Error("Chemin de capture invalide");
  }
  return path;
}

export const getLivraison = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commande_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .select(
        "id, statut, delivered_at, livraison_details, rapport_url, rapport_sent_at, rapport_captures",
      )
      .eq("id", data.commande_id)
      .single();
    if (error || !commande) throw new Error("Commande introuvable");

    // URLs signees (1h) : le bucket est prive, seul l'admin passe par ici.
    let rapportViewUrl: string | null = null;
    let rapportDownloadUrl: string | null = null;
    if (commande.rapport_url) {
      const { data: view } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(commande.rapport_url, 60 * 60);
      rapportViewUrl = view?.signedUrl || null;
      const { data: dl } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(commande.rapport_url, 60 * 60, {
          download: "rapport-livraison.pdf",
        });
      rapportDownloadUrl = dl?.signedUrl || null;
    }

    const capturePaths = Array.isArray(commande.rapport_captures)
      ? (commande.rapport_captures as string[])
      : [];
    const captures: { path: string; signedUrl: string | null }[] = [];
    for (const p of capturePaths) {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(p, 60 * 60);
      captures.push({ path: p, signedUrl: signed?.signedUrl || null });
    }

    return {
      statut: commande.statut as string,
      delivered_at: commande.delivered_at as string | null,
      livraison_details: commande.livraison_details,
      rapport_url: commande.rapport_url as string | null,
      rapport_sent_at: commande.rapport_sent_at as string | null,
      rapportViewUrl,
      rapportDownloadUrl,
      captures,
    };
  });

export const saveLivraison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => livraisonSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const captures = data.captures.map((p) => assertCapturePath(data.commande_id, p));
    const { error } = await supabaseAdmin
      .from("commandes")
      .update({ livraison_details: data.details, rapport_captures: captures })
      .eq("id", data.commande_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createRapportCaptureUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        commande_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        content_type: z.string().min(3).max(100),
        size: z.number().int().positive(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!["image/jpeg", "image/png"].includes(data.content_type)) {
      throw new Error("Format non supporté (JPG ou PNG uniquement).");
    }
    if (10 * 1024 * 1024 < data.size) {
      throw new Error("Capture trop lourde (10 Mo max).");
    }
    const safe = data.filename.replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${data.commande_id}/captures/${Date.now()}_${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message || "Impossible de préparer l'upload");
    return { signedUrl: signed.signedUrl, path };
  });
function buildEmailHtml(commande: { prenom: string; entreprise: string }): string {
  const prenom = escapeHtml(commande.prenom);
  const entreprise = escapeHtml(commande.entreprise);
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
    <h2 style="color:#4285F4;margin-bottom:16px">Bonjour ${prenom},</h2>
    <p>Votre prestation Hotavis pour <b>${entreprise}</b> est desormais <b>terminee et livree</b>.</p>
    <p>Vous trouverez en <b>piece jointe</b> votre <b>rapport de livraison detaille</b> : il recapitule, element par element, le travail realise sur votre fiche Google Business Profile, avec le statut de chaque prestation et nos observations.</p>
    <div style="background:#f5f6f8;border-radius:8px;padding:14px 16px;margin:20px 0;font-size:14px;line-height:1.6">
      <b>Bon a savoir :</b> si la verification Google est indiquee "En attente" dans le rapport, c'est tout a fait normal : la validation finale depend de Google. Notre equipe reste a vos cotes pour vous accompagner dans cette procedure.
    </div>
    <p>Une question sur votre rapport ou votre fiche ? Nous restons a votre entiere disposition :</p>
    <p style="text-align:center;margin:28px 0">
      <a href="https://hotavis.fr/#contact" style="display:inline-block;background:#4285F4;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 32px;border-radius:8px;font-size:16px">Nous contacter</a>
    </p>
    <p>Merci de votre confiance !</p>
    <p style="color:#666;font-size:13px;margin-top:32px">A tres vite,<br>- L'équipe Hotavis</p>
  </div>`;
}

async function sendRapportEmail(
  email: string,
  prenom: string,
  entreprise: string,
  pdfBytes: Uint8Array,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY non configurée");
  const resend = new Resend(resendKey);
  const safeName = entreprise.replace(/[^\w.-]+/g, "-").toLowerCase();
  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: `Votre rapport de livraison Hotavis - ${entreprise}`,
    html: buildEmailHtml({ prenom, entreprise }),
    attachments: [
      {
        filename: `rapport-livraison-${safeName}.pdf`,
        content: Buffer.from(pdfBytes).toString("base64"),
      },
    ],
  });
  if (error) throw new Error(error.message);
}

export const livrerCommande = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => livraisonSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: commande, error: cmdErr } = await supabaseAdmin
      .from("commandes")
      .select("id, email, prenom, nom, entreprise")
      .eq("id", data.commande_id)
      .single();
    if (cmdErr || !commande) throw new Error("Commande introuvable");

    const captures = data.captures.map((p) => assertCapturePath(data.commande_id, p));

    // 1. Telecharge les captures pour les integrer au PDF
    const pdfCaptures: RapportCapture[] = [];
    for (const path of captures) {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(path);
      if (dlErr || !blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const dims = imageDimensions(bytes);
      if (!dims) continue;
      pdfCaptures.push({
        base64: Buffer.from(bytes).toString("base64"),
        format: dims.format,
        width: dims.width,
        height: dims.height,
      });
    }

    // 2. Genere le PDF
    const now = new Date().toISOString();
    const pdfBytes = buildRapportPDF({
      commandeId: commande.id,
      entreprise: commande.entreprise,
      prenom: commande.prenom,
      nom: commande.nom,
      email: commande.email,
      dateLivraison: now,
      items: data.details.map((d) => ({
        label: d.label,
        categorie: d.categorie,
        statut: d.statut,
        observation: d.observation || undefined,
      })),
      captures: pdfCaptures,
    });

    // 3. Stocke le PDF dans le dossier de la commande
    const path = rapportPath(commande.id);
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(`Stockage du rapport impossible : ${upErr.message}`);

    // 4. Met a jour la commande (statut Livrée)
    const { error: updErr } = await supabaseAdmin
      .from("commandes")
      .update({
        livraison_details: data.details,
        rapport_captures: captures,
        rapport_url: path,
        statut: "livrée",
        delivered_at: now,
      })
      .eq("id", commande.id);
    if (updErr) throw new Error(updErr.message);

    // 5. Envoie le rapport au client (erreur remontee, jamais masquee)
    try {
      await sendRapportEmail(commande.email, commande.prenom, commande.entreprise, pdfBytes);
      await supabaseAdmin
        .from("commandes")
        .update({ rapport_sent_at: new Date().toISOString() })
        .eq("id", commande.id);
      return { ok: true, email_sent: true };
    } catch (e) {
      return {
        ok: true,
        email_sent: false,
        email_error: (e as Error)?.message || "Erreur d'envoi inconnue",
      };
    }
  });

export const renvoyerRapport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commande_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .select("id, email, prenom, entreprise, rapport_url")
      .eq("id", data.commande_id)
      .single();
    if (error || !commande) throw new Error("Commande introuvable");
    if (!commande.rapport_url) throw new Error("Aucun rapport généré pour cette commande");

    // Reutilise le PDF deja genere : aucun nouveau rapport n'est cree.
    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(commande.rapport_url);
    if (dlErr || !blob) throw new Error("Rapport introuvable dans le stockage");
    const pdfBytes = new Uint8Array(await blob.arrayBuffer());

    try {
      await sendRapportEmail(commande.email, commande.prenom, commande.entreprise, pdfBytes);
      await supabaseAdmin
        .from("commandes")
        .update({ rapport_sent_at: new Date().toISOString() })
        .eq("id", commande.id);
      return { ok: true, email_sent: true };
    } catch (e) {
      return {
        ok: true,
        email_sent: false,
        email_error: (e as Error)?.message || "Erreur d'envoi inconnue",
      };
    }
  });