import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";

// Schéma structuré pour les horaires (7 jours, format { mon: { ferme, ouverture, fermeture }, ... })
const horaireJourSchema = z
  .object({
    ferme: z.boolean(),
    ouverture: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Format HH:MM requis")
      .optional()
      .nullable(),
    fermeture: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Format HH:MM requis")
      .optional()
      .nullable(),
  })
  .refine((d) => d.ferme || (d.ouverture && d.fermeture), {
    message: "Si non fermé, ouverture et fermeture sont requises",
  });

const horairesSchema = z
  .object({
    mon: horaireJourSchema,
    tue: horaireJourSchema,
    wed: horaireJourSchema,
    thu: horaireJourSchema,
    fri: horaireJourSchema,
    sat: horaireJourSchema,
    sun: horaireJourSchema,
  })
  .strict(); // refuse les clés inattendues

const schema = z.object({
  commande_id: z.string().uuid(),
  nom_commercial: z.string().trim().min(1).max(120),
  nom_legal: z.string().trim().max(120).optional().or(z.literal("")).nullable(),
  date_creation: z.string().optional().or(z.literal("")).nullable(),
  adresse: z.string().trim().min(1).max(200),
  code_postal: z.string().trim().min(4).max(10),
  ville: z.string().trim().min(1).max(120),
  telephone_affiche: z.string().trim().min(6).max(30),
  site_web: z.string().trim().max(255).optional().or(z.literal("")).nullable(),
  email_google: z.string().trim().max(255).optional().or(z.literal("")).nullable(),
  pas_compte_google: z.boolean(),
  categorie_principale: z.string().trim().min(1).max(120),
  categories_secondaires: z.array(z.string().trim().max(120)).max(10).optional().default([]),
  description: z.string().trim().min(100).max(750),
  informations_complementaires: z.string().trim().max(2000).optional().or(z.literal("")).nullable(),
  type_presence: z.enum(["boutique", "domicile_clients", "les_deux"]),
  zones_desservies: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  horaires: horairesSchema,
  services: z.array(z.string()).max(50),
  logo_url: z.string().url().optional().or(z.literal("")).nullable(),
  couverture_url: z.string().url().optional().or(z.literal("")).nullable(),
  photos_urls: z.array(z.string().url()).max(20),
  photos_etablissement: z.array(z.string().url()).max(20).optional().default([]),
  justificatif_url: z.string().max(500).optional().or(z.literal("")).nullable(),
  justificatif_nom: z.string().max(200).optional().or(z.literal("")).nullable(),
  justificatif_type: z.string().max(100).optional().or(z.literal("")).nullable(),
  facture_url: z.string().max(500).optional().or(z.literal("")).nullable(),
  facture_nom: z.string().max(200).optional().or(z.literal("")).nullable(),
  facture_type: z.string().max(100).optional().or(z.literal("")).nullable(),
  attributs: z.array(z.string()).max(30),
  attributs_personnalises: z
    .array(z.string().trim().min(1).max(200))
    .max(20)
    .optional()
    .default([]),
  facebook_url: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
  instagram_url: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
  youtube_url: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
  linkedin_url: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
  tiktok_url: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
  reseaux_autres: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        url: z.string().trim().min(1).max(500),
      }),
    )
    .max(10)
    .optional()
    .default([]),
  photos_metier: z.array(z.string().url()).max(20).optional().default([]),
  photos_metier_description: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
  photos_exterieures: z.array(z.string().url()).max(20).optional().default([]),
  photos_interieures: z.array(z.string().url()).max(20).optional().default([]),
  photos_equipe: z.array(z.string().url()).max(20).optional().default([]),
  videos_urls: z.array(z.string().url()).max(10).optional().default([]),
  commentaires: z.string().max(2000).optional(),
  cgv_acceptees: z.literal(true),
  entreprise_statut_creation: z.enum(["creee", "en_cours", "non_creee"]),
  validation_google_comprise: z.literal(true),
});

export const saveOnboarding = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    const { data: commande, error: cErr } = await supabaseAdmin
      .from("commandes")
      .select("id, statut, prenom, nom, email, entreprise")
      .eq("id", data.commande_id)
      .single();
    if (cErr || !commande) throw new Error("Commande introuvable");
    // Briefing is filled BEFORE payment now — no statut gate.

    const upsertData = {
      commande_id: data.commande_id,
      nom_commercial: data.nom_commercial,
      nom_legal: data.nom_legal || null,
      date_creation: data.date_creation || null,
      adresse: data.adresse,
      code_postal: data.code_postal,
      ville: data.ville,
      telephone_affiche: data.telephone_affiche,
      site_web: data.site_web || null,
      email_google: data.email_google || null,
      pas_compte_google: data.pas_compte_google,
      categorie_principale: data.categorie_principale,
      categories_secondaires: data.categories_secondaires ?? [],
      description: data.description,
      informations_complementaires: data.informations_complementaires || null,
      type_presence: data.type_presence,
      zones_desservies: data.zones_desservies ?? [],
      horaires: data.horaires,
      services: data.services,
      logo_url: data.logo_url || null,
      couverture_url: data.couverture_url || null,
      photos_urls: data.photos_urls,
      photos_etablissement: data.photos_etablissement ?? [],
      justificatif_url: data.justificatif_url || null,
      justificatif_nom: data.justificatif_nom || null,
      justificatif_type: data.justificatif_type || null,
      facture_url: data.facture_url || null,
      facture_nom: data.facture_nom || null,
      facture_type: data.facture_type || null,
      attributs: data.attributs,
      attributs_personnalises: data.attributs_personnalises ?? [],
      facebook_url: data.facebook_url || null,
      instagram_url: data.instagram_url || null,
      youtube_url: data.youtube_url || null,
      linkedin_url: data.linkedin_url || null,
      tiktok_url: data.tiktok_url || null,
      reseaux_autres: data.reseaux_autres ?? [],
      photos_metier: data.photos_metier ?? [],
      photos_metier_description: data.photos_metier_description || null,
      photos_exterieures: data.photos_exterieures ?? [],
      photos_interieures: data.photos_interieures ?? [],
      photos_equipe: data.photos_equipe ?? [],
      videos_urls: data.videos_urls ?? [],
      commentaires: data.commentaires || null,
      cgv_acceptees: data.cgv_acceptees,
      entreprise_statut_creation: data.entreprise_statut_creation,
      validation_google_comprise: data.validation_google_comprise,
    };

    const { error } = await supabaseAdmin
      .from("onboardings")
      .upsert(upsertData, { onConflict: "commande_id" });
    if (error) throw new Error(error.message);

    // NOTE: statut is not bumped here. The Stripe webhook (or confirmStripeSession)
    // will set statut to "onboarding_complété" once payment is received.
    // Notify admin that a briefing was submitted (pre-payment).
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails
        .send({
          from: "Hotavis <noreply@hotavis.fr>",
          to: ["dz.societe.ecommerce@gmail.com"],
          subject: `📋 Briefing soumis (paiement en cours) — ${commande.entreprise}`,
          html: `<h2>Briefing reçu — en attente de paiement</h2>
            <p><b>${commande.prenom} ${commande.nom}</b> (${commande.email}) vient de compléter son briefing pour <b>${data.nom_commercial}</b>.</p>
            <p>Le client est redirigé vers Stripe pour finaliser le paiement.</p>`,
        })
        .catch((e) => console.error(e));
    }

    return { ok: true };
  });

export const uploadOnboardingPhoto = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        commande_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        content_base64: z.string().min(10),
        content_type: z.string().min(3).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const buffer = Uint8Array.from(atob(data.content_base64), (c) => c.charCodeAt(0));
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.commande_id}/${Date.now()}_${safe}`;
    const { error } = await supabaseAdmin.storage
      .from("photos-gmb")
      .upload(path, buffer, { contentType: data.content_type, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("photos-gmb").getPublicUrl(path);
    return { url: pub.publicUrl };
  });

// Upload vidéo pour l'onboarding (bucket photos-gmb réutilisé pour les vidéos).
// Les Vercel Functions limitent le corps de requête à 4,5 Mo → tout fichier vidéo
// envoyé en base64 via une server function déclenchait un 413 "Request Entity Too
// Large". Désormais : le serveur délivre une URL d'upload SIGNÉE (petit appel sans
// fichier), le navigateur/téléphone envoie le fichier DIRECTEMENT vers Supabase
// Storage (sans transiter par Vercel), puis l'URL publique (déterministe) est
// enregistrée dans la base via le formulaire existant.
export const createVideoUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        commande_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        content_type: z.string().min(3).max(100),
        size: z.number().int().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Mêmes règles qu'auparavant (validation serveur avant délivrance de l'URL)
    // Vérification taille max 75 Mo
    if (data.size > 75 * 1024 * 1024) throw new Error("Vidéo trop volumineuse (max 75 Mo)");
    // Vérification type MIME autorisé
    const allowedTypes = ["video/mp4", "video/quicktime", "video/x-ms-wmv"];
    if (!allowedTypes.includes(data.content_type)) {
      throw new Error("Format vidéo non supporté. Formats acceptés : MP4, MOV, WMV");
    }
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.commande_id}/videos/${Date.now()}_${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("photos-gmb")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("photos-gmb").getPublicUrl(path);
    return { signedUrl: signed.signedUrl, publicUrl: pub.publicUrl };
  });

// Private bucket: Kbis, factures, etc. Returns a storage path (not a public URL).
export const uploadOnboardingDocument = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        commande_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        content_base64: z.string().min(10),
        content_type: z.string().min(3).max(150),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const buffer = Uint8Array.from(atob(data.content_base64), (c) => c.charCodeAt(0));
    if (buffer.length > 10 * 1024 * 1024) throw new Error("Fichier trop volumineux (max 10 Mo)");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.commande_id}/${Date.now()}_${safe}`;
    const { error } = await supabaseAdmin.storage
      .from("documents-gmb")
      .upload(path, buffer, { contentType: data.content_type, upsert: false });
    if (error) throw new Error(error.message);
    return { path, filename: safe, contentType: data.content_type };
  });
