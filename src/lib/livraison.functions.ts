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
import { buildFacturePDF, factureFilename } from "@/lib/facture-pdf.server";

// =====================================================================
// WORKFLOW DE LIVRAISON (admin uniquement) — cloture complete :
// Tableau prestations/statuts/observations -> rapport PDF + facture PDF
// -> storage prive reports-gmb/{commande_id}/ -> UN seul email client
// avec les deux pieces jointes -> facture "Emise" + commande "Livree".
// Les PDF et les captures restent rattaches a la commande.
// =====================================================================

const BUCKET = "reports-gmb";
const FROM = "Hotavis <noreply@hotavis.fr>";

const rapportPath = (commandeId: string) => `${commandeId}/rapport-livraison.pdf`;
const facturePath = (commandeId: string) => `${commandeId}/facture.pdf`;

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
        "id, statut, delivered_at, livraison_details, rapport_url, rapport_sent_at, rapport_captures, facture_url, facture_emise_at, facture_status, montant_centimes, email",
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

    // Facture generee (persistee dans reports-gmb pendant la livraison)
    let factureViewUrl: string | null = null;
    let factureDownloadUrl: string | null = null;
    if (commande.facture_url) {
      const { data: fView } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(commande.facture_url, 60 * 60);
      factureViewUrl = fView?.signedUrl || null;
      const { data: fDl } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(commande.facture_url, 60 * 60, {
          download: factureFilename(commande.id),
        });
      factureDownloadUrl = fDl?.signedUrl || null;
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
      facture_url: commande.facture_url as string | null,
      facture_emise_at: commande.facture_emise_at as string | null,
      facture_status: commande.facture_status as string,
      montant_centimes: commande.montant_centimes as number,
      email: commande.email as string,
      rapportViewUrl,
      rapportDownloadUrl,
      factureViewUrl,
      factureDownloadUrl,
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
type LivraisonDoc = { kind: "rapport" | "facture"; filename: string; content: Uint8Array };

const rapportFilename = (entreprise: string) =>
  `rapport-livraison-${entreprise.replace(/[^\w.-]+/g, "-").toLowerCase()}.pdf`;

function buildEmailHtml(
  commande: { prenom: string; entreprise: string },
  docs: LivraisonDoc[],
): string {
  const prenom = escapeHtml(commande.prenom);
  const entreprise = escapeHtml(commande.entreprise);
  const hasRapport = docs.some((d) => d.kind === "rapport");
  const both = hasRapport && docs.some((d) => d.kind === "facture");
  const docItems = docs
    .map((d) =>
      d.kind === "rapport"
        ? "<li>votre <b>rapport de livraison detaille</b> : il recapitule, element par element, le travail realise sur votre fiche Google Business Profile, avec le statut de chaque prestation et nos observations ;</li>"
        : "<li>votre <b>facture</b>.</li>",
    )
    .join("");
  const intro = hasRapport
    ? `<p>Votre prestation Hotavis pour <b>${entreprise}</b> est desormais <b>terminee et livree</b>.</p>`
    : `<p>Voici un document relatif a votre commande Hotavis pour <b>${entreprise}</b>.</p>`;
  const googleNote = hasRapport
    ? `
    <div style="background:#f5f6f8;border-radius:8px;padding:14px 16px;margin:20px 0;font-size:14px;line-height:1.6">
      <b>Bon a savoir :</b> si la verification Google est indiquee "En attente" dans le rapport, c'est tout a fait normal : la validation finale depend de Google. Notre equipe reste a vos cotes pour vous accompagner dans cette procedure.
    </div>`
    : "";
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
    <h2 style="color:#4285F4;margin-bottom:16px">Bonjour ${prenom},</h2>
    ${intro}
    <p>Vous trouverez en <b>piece${both ? "s" : ""} jointe${both ? "s" : ""}</b> :<ul style="line-height:1.7;margin:8px 0 0 18px">${docItems}</ul></p>${googleNote}
    <p>Une question sur votre rapport ou votre fiche ? Nous restons a votre entiere disposition :</p>
    <p style="text-align:center;margin:28px 0">
      <a href="https://hotavis.fr/#contact" style="display:inline-block;background:#4285F4;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 32px;border-radius:8px;font-size:16px">Nous contacter</a>
    </p>
    <p>Merci de votre confiance !</p>
    <p style="color:#666;font-size:13px;margin-top:32px">A tres vite,<br>- L'équipe Hotavis</p>
  </div>`;
}

async function sendLivraisonEmail(
  email: string,
  prenom: string,
  entreprise: string,
  docs: LivraisonDoc[],
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY non configurée");
  const resend = new Resend(resendKey);
  const hasRapport = docs.some((d) => d.kind === "rapport");
  const hasFacture = docs.some((d) => d.kind === "facture");
  const subject =
    hasRapport && hasFacture
      ? `Votre commande Hotavis est livree - rapport et facture - ${entreprise}`
      : hasFacture
        ? `Votre facture Hotavis - ${entreprise}`
        : `Votre rapport de livraison Hotavis - ${entreprise}`;
  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject,
    html: buildEmailHtml({ prenom, entreprise }, docs),
    attachments: docs.map((d) => ({
      filename: d.filename,
      content: Buffer.from(d.content).toString("base64"),
    })),
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
      .select(
        "id, email, prenom, nom, entreprise, activite, ville, telephone, montant_centimes, created_at, paid_at, facture_url, facture_status, facture_emise_at",
      )
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

    // 3. Facture : reutilise le PDF existant s'il a deja ete genere,
    //    sinon le genere (numero deterministe -> jamais de doublon).
    let factureBytes: Uint8Array;
    let factureAlreadyStored = false;
    if (commande.facture_url) {
      const { data: fBlob, error: fDlErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(commande.facture_url);
      if (fDlErr || !fBlob) throw new Error("Facture existante introuvable dans le stockage");
      factureBytes = new Uint8Array(await fBlob.arrayBuffer());
      factureAlreadyStored = true;
    } else {
      factureBytes = buildFacturePDF({
        commandeId: commande.id,
        prenom: commande.prenom,
        nom: commande.nom,
        email: commande.email,
        telephone: commande.telephone,
        entreprise: commande.entreprise,
        ville: commande.ville,
        activite: commande.activite,
        montantCentimes: commande.montant_centimes,
        createdAt: commande.created_at,
        paidAt: commande.paid_at,
      });
    }

    // 4. Stocke les PDF (echec = throw : rien n'est marque livre tant que
    //    les documents ne sont pas stockes)
    const path = rapportPath(commande.id);
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(`Stockage du rapport impossible : ${upErr.message}`);

    const fPath = facturePath(commande.id);
    if (!factureAlreadyStored) {
      const { error: fUpErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(fPath, factureBytes, { contentType: "application/pdf", upsert: true });
      if (fUpErr) throw new Error(`Stockage de la facture impossible : ${fUpErr.message}`);
    }

    // 5. Un seul UPDATE : commande Livree + facture Emise (jamais de
    //    retrogradation d'une facture deja payee)
    const { error: updErr } = await supabaseAdmin
      .from("commandes")
      .update({
        livraison_details: data.details,
        rapport_captures: captures,
        rapport_url: path,
        facture_url: commande.facture_url || fPath,
        facture_emise_at: commande.facture_emise_at || now,
        facture_status: commande.facture_status === "payee" ? "payee" : "emise",
        statut: "livrée",
        delivered_at: now,
      })
      .eq("id", commande.id);
    if (updErr) throw new Error(updErr.message);

    // 6. Un seul email au client : rapport + facture en pieces jointes
    //    (echec non bloquant : documents conserves, renvoi possible)
    try {
      await sendLivraisonEmail(commande.email, commande.prenom, commande.entreprise, [
        { kind: "rapport", filename: rapportFilename(commande.entreprise), content: pdfBytes },
        { kind: "facture", filename: factureFilename(commande.id), content: factureBytes },
      ]);
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

/** Renvoie les documents deja generes (aucune regeneration) :
 *  only = "all" (rapport + facture dans un seul email), "rapport" ou "facture". */
export const renvoyerDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        commande_id: z.string().uuid(),
        only: z.enum(["all", "rapport", "facture"]).optional().default("all"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .select("id, email, prenom, entreprise, rapport_url, facture_url")
      .eq("id", data.commande_id)
      .single();
    if (error || !commande) throw new Error("Commande introuvable");

    const wantRapport = data.only !== "facture";
    const wantFacture = data.only !== "rapport";

    // Reutilise les PDF deja stockes : aucune regeneration.
    const docs: LivraisonDoc[] = [];
    if (wantRapport) {
      if (!commande.rapport_url) throw new Error("Aucun rapport généré pour cette commande");
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(commande.rapport_url);
      if (dlErr || !blob) throw new Error("Rapport introuvable dans le stockage");
      docs.push({
        kind: "rapport",
        filename: rapportFilename(commande.entreprise),
        content: new Uint8Array(await blob.arrayBuffer()),
      });
    }
    if (wantFacture) {
      if (!commande.facture_url) throw new Error("Aucune facture générée pour cette commande");
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(commande.facture_url);
      if (dlErr || !blob) throw new Error("Facture introuvable dans le stockage");
      docs.push({
        kind: "facture",
        filename: factureFilename(commande.id),
        content: new Uint8Array(await blob.arrayBuffer()),
      });
    }

    try {
      await sendLivraisonEmail(commande.email, commande.prenom, commande.entreprise, docs);
      if (wantRapport) {
        await supabaseAdmin
          .from("commandes")
          .update({ rapport_sent_at: new Date().toISOString() })
          .eq("id", commande.id);
      }
      return { ok: true, email_sent: true };
    } catch (e) {
      return {
        ok: true,
        email_sent: false,
        email_error: (e as Error)?.message || "Erreur d'envoi inconnue",
      };
    }
  });