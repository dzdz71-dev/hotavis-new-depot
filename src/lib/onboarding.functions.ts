import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";

// Schéma structuré pour les horaires (7 jours, format { mon: { ferme, ouverture, fermeture }, ... })
const horaireJourSchema = z.object({
  ferme: z.boolean(),
  ouverture: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis").optional().nullable(),
  fermeture: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis").optional().nullable(),
}).refine(
  (d) => d.ferme || (d.ouverture && d.fermeture),
  { message: "Si non fermé, ouverture et fermeture sont requises" }
);

const horairesSchema = z.object({
  mon: horaireJourSchema,
  tue: horaireJourSchema,
  wed: horaireJourSchema,
  thu: horaireJourSchema,
  fri: horaireJourSchema,
  sat: horaireJourSchema,
  sun: horaireJourSchema,
}).strict();  // refuse les clés inattendues

const schema = z.object({
  commande_id: z.string().uuid(),
  nom_commercial: z.string().trim().min(1).max(120),
  date_creation: z.string().optional().or(z.literal("")),
  adresse: z.string().trim().min(1).max(200),
  code_postal: z.string().trim().min(4).max(10),
  ville: z.string().trim().min(1).max(120),
  telephone_affiche: z.string().trim().min(6).max(30),
  site_web: z.string().trim().max(255).optional().or(z.literal("")),
  email_google: z.string().trim().max(255).optional().or(z.literal("")),
  pas_compte_google: z.boolean(),
  categorie_principale: z.string().trim().min(1).max(120),
  description: z.string().trim().min(20).max(750),
  type_presence: z.enum(["boutique", "domicile_clients", "les_deux"]),
  rayon_intervention_km: z.number().int().min(0).max(500).optional().nullable(),
  horaires: horairesSchema,
  services: z.array(z.string()).max(50),
  logo_url: z.string().url().optional().or(z.literal("")),
  couverture_url: z.string().url().optional().or(z.literal("")),
  photos_urls: z.array(z.string().url()).max(20),
  photos_etablissement: z.array(z.string().url()).max(20).optional().default([]),
  justificatif_url: z.string().max(500).optional().or(z.literal("")),
  justificatif_nom: z.string().max(200).optional().or(z.literal("")),
  justificatif_type: z.string().max(100).optional().or(z.literal("")),
  facture_url: z.string().max(500).optional().or(z.literal("")),
  facture_nom: z.string().max(200).optional().or(z.literal("")),
  facture_type: z.string().max(100).optional().or(z.literal("")),
  attributs: z.array(z.string()).max(30),
  commentaires: z.string().max(2000).optional(),
  cgv_acceptees: z.literal(true),
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


    const { error } = await supabaseAdmin.from("onboardings").upsert(
      {
        commande_id: data.commande_id,
        nom_commercial: data.nom_commercial,
        date_creation: data.date_creation || null,
        adresse: data.adresse,
        code_postal: data.code_postal,
        ville: data.ville,
        telephone_affiche: data.telephone_affiche,
        site_web: data.site_web || null,
        email_google: data.email_google || null,
        pas_compte_google: data.pas_compte_google,
        categorie_principale: data.categorie_principale,
        description: data.description,
        type_presence: data.type_presence,
        rayon_intervention_km: data.rayon_intervention_km ?? null,
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
        commentaires: data.commentaires || null,
        cgv_acceptees: data.cgv_acceptees,
      },
      { onConflict: "commande_id" },
    );
    if (error) throw new Error(error.message);

    // NOTE: statut is not bumped here. The Stripe webhook (or confirmStripeSession)
    // will set statut to "onboarding_complété" once payment is received.
    // Notify admin that a briefing was submitted (pre-payment).
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails
        .send({
          from: "Hotavis <onboarding@resend.dev>",
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
    z.object({
      commande_id: z.string().uuid(),
      filename: z.string().min(1).max(200),
      content_base64: z.string().min(10),
      content_type: z.string().min(3).max(100),
    }).parse(input),
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

// Private bucket: Kbis, factures, etc. Returns a storage path (not a public URL).
export const uploadOnboardingDocument = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      commande_id: z.string().uuid(),
      filename: z.string().min(1).max(200),
      content_base64: z.string().min(10),
      content_type: z.string().min(3).max(150),
    }).parse(input),
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

