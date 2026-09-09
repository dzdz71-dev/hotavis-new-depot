import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml } from "@/lib/utils";
import { assertAdmin } from "@/lib/admin-guard";

export const listCommandes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("commandes")
      .select(
        "id, prenom, nom, email, telephone, entreprise, ville, activite, statut, montant_centimes, created_at, paid_at, delivered_at, assigned_agent_id, facture_status",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Période de référence des cartes "Total" et "CA total" (bouton "Commencer
    // à zéro") : NULL = toutes les commandes sont comptées (comportement d'origine).
    const { data: periodRow } = await supabaseAdmin
      .from("agency_settings")
      .select("period_start_at")
      .maybeSingle();
    const periodStart: string | null = periodRow?.period_start_at ?? null;
    const inPeriod = (created_at: string) =>
      !periodStart || new Date(created_at) >= new Date(periodStart);

    const stats = {
      total: data.filter((c) => inPeriod(c.created_at)).length,
      non_traites: data.filter((c) => c.statut === "onboarding_complété").length,
      en_cours: data.filter((c) => c.statut === "en_cours").length,
      livrees: data.filter((c) => c.statut === "livrée").length,
      ca_total: data
        .filter(
          (c) => inPeriod(c.created_at) && c.statut !== "en_attente" && c.statut !== "annulée",
        )
        .reduce((s, c) => s + c.montant_centimes, 0),
    };

    // Map agent_id → email pour la recherche côté client
    const agentIds = Array.from(
      new Set(data.map((c) => c.assigned_agent_id).filter(Boolean)),
    ) as string[];
    const agentEmails: Record<string, string> = {};
    for (const uid of agentIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (u?.user) agentEmails[uid] = u.user.email || "—";
    }

    return { commandes: data, stats, agentEmails, period_start_at: periodStart };
  });

/** "Commencer à zéro" : fixe le début de période des cartes Total / CA total. */
export const resetStatsPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("agency_settings")
      .update({ period_start_at: now, updated_at: now })
      .eq("singleton", true)
      .select("id");
    if (error) throw new Error(error.message);
    // Ligne singleton absente (cas théorique) : on la crée.
    if (!data || data.length === 0) {
      const { error: insertError } = await supabaseAdmin
        .from("agency_settings")
        .insert({ period_start_at: now, updated_at: now });
      if (insertError) throw new Error(insertError.message);
    }
    return { ok: true, period_start_at: now };
  });

export const getCommandeAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !commande) throw new Error("Commande introuvable");
    const { data: onboarding } = await supabaseAdmin
      .from("onboardings")
      .select("*")
      .eq("commande_id", data.id)
      .maybeSingle();

    // Signed URLs for private documents (1h)
    let justificatifSignedUrl: string | null = null;
    let factureSignedUrl: string | null = null;
    if (onboarding?.justificatif_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("documents-gmb")
        .createSignedUrl(onboarding.justificatif_url, 60 * 60);
      justificatifSignedUrl = signed?.signedUrl || null;
    }
    const onboardingRow = onboarding as { facture_url?: string | null } | null;
    if (onboardingRow?.facture_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("documents-gmb")
        .createSignedUrl(onboardingRow.facture_url, 60 * 60);
      factureSignedUrl = signed?.signedUrl || null;
    }

    // Facture GENEREE a la livraison (bucket prive reports-gmb) —
    // distincte de la facture_url du client (onboarding, documents-gmb).
    let factureGenViewUrl: string | null = null;
    let factureGenDownloadUrl: string | null = null;
    if (commande.facture_url) {
      const { data: v } = await supabaseAdmin.storage
        .from("reports-gmb")
        .createSignedUrl(commande.facture_url, 60 * 60);
      factureGenViewUrl = v?.signedUrl || null;
      const { data: d } = await supabaseAdmin.storage
        .from("reports-gmb")
        .createSignedUrl(commande.facture_url, 60 * 60, {
          download: `facture-FAC-${commande.id.slice(0, 8).toUpperCase()}.pdf`,
        });
      factureGenDownloadUrl = d?.signedUrl || null;
    }

    return {
      commande,
      onboarding,
      justificatifSignedUrl,
      factureSignedUrl,
      factureGenViewUrl,
      factureGenDownloadUrl,
    };
  });

export const getCommandeNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commande_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: notes, error } = await supabaseAdmin
      .from("agent_notes")
      .select("id, agent_id, contenu, created_at")
      .eq("commande_id", data.commande_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    // Détermine pour chaque note si l'auteur est admin (pour l'affichage chat)
    const authorIds = Array.from(new Set((notes || []).map((n) => n.agent_id)));
    const adminSet = new Set<string>();
    for (const uid of authorIds) {
      const { data: role } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (role) adminSet.add(uid);
    }

    return {
      notes: (notes || []).map((n) => ({
        id: n.id,
        agent_id: n.agent_id,
        contenu: n.contenu,
        created_at: n.created_at,
        is_admin: adminSet.has(n.agent_id),
        is_mine: n.agent_id === context.userId,
      })),
    };
  });

export const addAdminNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        commande_id: z.string().uuid(),
        contenu: z.string().trim().min(1).max(2000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("agent_notes").insert({
      commande_id: data.commande_id,
      agent_id: context.userId,
      contenu: data.contenu,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateFactureStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        commande_id: z.string().uuid(),
        facture_status: z.enum(["non_emise", "emise", "payee"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("commandes")
      .update({ facture_status: data.facture_status })
      .eq("id", data.commande_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type CommandeStatut =
  | "en_attente"
  | "payé"
  | "onboarding_complété"
  | "en_cours"
  | "livrée"
  | "annulée"
  | "bloque";

export const updateCommandeStatut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid(),
        statut: z.enum([
          "en_attente",
          "payé",
          "onboarding_complété",
          "en_cours",
          "livrée",
          "annulée",
        ]),
        notes_admin: z.string().max(2000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const update: {
      statut: CommandeStatut;
      notes_admin?: string;
      delivered_at?: string;
    } = { statut: data.statut };
    if (data.notes_admin !== undefined) update.notes_admin = data.notes_admin;

    const wasDelivered = data.statut === "livrée";
    if (wasDelivered) update.delivered_at = new Date().toISOString();

    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .update(update)
      .eq("id", data.id)
      .select()
      .single();
    if (error || !commande) throw new Error(error?.message || "Erreur");

    if (wasDelivered) {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        await resend.emails
          .send({
            from: "Hotavis <noreply@hotavis.fr>",
            to: [commande.email],
            subject: `🚀 Votre fiche Google ${escapeHtml(commande.entreprise)} est en ligne ! Nos conseils pour démarrer.`,
            html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
              <h2 style="color:#34A853;margin-bottom:16px">Bonjour ${escapeHtml(commande.prenom)},</h2>
              <p>Félicitations ! Votre fiche Google Business Profile pour <b>${escapeHtml(commande.entreprise)}</b> est désormais officiellement en ligne et entièrement optimisée par nos soins.</p>
              <p>Vous pouvez dès à présent rechercher votre entreprise sur Google pour voir le résultat.</p>

              <h3 style="color:#1f2937;margin-top:32px;margin-bottom:12px">📈 Nos 3 conseils d'experts pour booster votre visibilité dès aujourd'hui :</h3>
              <p style="margin-bottom:16px">Pour que l'algorithme de Google vous place devant vos concurrents, la mise en ligne n'est que la première étape. Voici comment faire vivre votre fiche pour attirer un maximum de clients :</p>

              <ol style="padding-left:20px;line-height:1.7">
                <li style="margin-bottom:14px"><b>Décrochez vos premiers avis 5 étoiles (Votre priorité) :</b> N'attendez pas, sollicitez vos clients les plus fidèles dès aujourd'hui. La quantité et la régularité des avis sont le critère n°1 pour remonter sur Google Maps.</li>
                <li style="margin-bottom:14px"><b>Ajoutez des photos régulièrement :</b> L'algorithme adore les fiches actives. N'hésitez pas à publier souvent des photos de vos réalisations, de vos produits ou de votre équipe.</li>
                <li style="margin-bottom:14px"><b>Répondez à tous vos avis :</b> Qu'ils soient positifs ou négatifs, prenez toujours le temps de répondre. Cela montre votre professionnalisme aux futurs clients qui vous lisent.</li>
              </ol>

              <p style="margin-top:28px">Une question sur votre nouvelle fiche ou un besoin particulier ?<br>Nous restons à votre entière disposition pour vous accompagner. N'hésitez pas à nous écrire directement via notre formulaire de contact :</p>

              <p style="text-align:center;margin:28px 0">
                <a href="https://hotavis.fr/#contact" style="display:inline-block;background:#34A853;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 32px;border-radius:8px;font-size:16px">👉 Nous contacter</a>
              </p>

              <p style="margin-top:24px">Nous vous souhaitons beaucoup de succès pour ce lancement !</p>
              <p style="color:#666;font-size:13px;margin-top:32px">À très vite,<br>— L'équipe Hotavis</p>
            </div>`,
          })
          .catch((e) => console.error(e));
      }
    }
    return { ok: true };
  });

// =====================================================================
// SUPPRESSION MANUELLE D'UNE COMMANDE (Admin uniquement)
// =====================================================================
// - Protégée par requireSupabaseAuth + assertAdmin (rôle vérifié en base).
// - Les fichiers Storage liés sont supprimés AVANT la ligne SQL afin de ne
//   laisser aucune donnée orpheline :
//     • bucket privé  documents-gmb  → justificatif_url / facture_url
//     • bucket public photos-gmb     → tout le dossier `${commande_id}/`
//       (photos, vidéos, logo, couverture… paths `${commande_id}/**`)
// - La suppression de la ligne `commandes` déclenche les ON DELETE CASCADE
//   déjà présentes dans le schéma (onboardings.commande_id,
//   agent_notes.commande_id) → briefing + notes agents purgés en base.
// - Ciblage strict : seuls les chemins préfixés par l'id de la commande sont
//   touchés → aucune donnée d'un autre client n'est affectée.
// =====================================================================

/** Extrait le chemin Storage interne d'une référence (chemin simple ou URL publique). */
function collectStoragePath(commandeId: string, ref: string | null | undefined): string | null {
  if (!ref) return null;
  let path = ref;
  const marker = "/storage/v1/object/";
  if (path.includes(marker)) {
    try {
      path = decodeURIComponent(path.slice(path.indexOf(marker) + marker.length));
      path = path.replace(/^public\//, "").replace(/^sign\//, "");
    } catch {
      return null;
    }
  }
  for (const bucket of ["photos-gmb", "documents-gmb"]) {
    if (path.startsWith(`${bucket}/`)) path = path.slice(bucket.length + 1);
  }
  // Sécurité : le fichier DOIT appartenir à cette commande.
  return path.startsWith(`${commandeId}/`) ? path : null;
}

/** Liste récursivement tous les fichiers sous `${commandeId}/` dans photos-gmb. */
async function listBucketPaths(bucket: string, commandeId: string): Promise<string[]> {
  const paths: string[] = [];
  async function walk(prefix: string): Promise<void> {
    const { data } = await supabaseAdmin.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (!data || data.length === 0) return;
    for (const entry of data) {
      const child = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Storage renvoie id=null pour les pseudo-dossiers
      if ((entry as { id: string | null }).id === null) {
        await walk(child);
      } else {
        paths.push(child);
      }
    }
  }
  await walk(commandeId);
  return paths;
}

export const deleteCommandeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // 0. La commande ciblée doit exister
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("commandes")
      .select("id")
      .eq("id", data.id)
      .single();
    if (existErr || !existing) throw new Error("Commande introuvable");

    let storageErrors = 0;

    // 1. Documents privés référencés par l'onboarding (justificatif / facture)
    try {
      const { data: onboarding } = await supabaseAdmin
        .from("onboardings")
        .select("justificatif_url, facture_url")
        .eq("commande_id", data.id)
        .maybeSingle();
      const docPaths = onboarding
        ? [
            collectStoragePath(data.id, onboarding.justificatif_url),
            collectStoragePath(data.id, onboarding.facture_url),
          ].filter((p): p is string => Boolean(p))
        : [];
      if (docPaths.length > 0) {
        const { error } = await supabaseAdmin.storage.from("documents-gmb").remove(docPaths);
        if (error) {
          console.error("[deleteCommandeAdmin] documents-gmb:", error.message);
          storageErrors += 1;
        }
      }
    } catch (e) {
      console.error("[deleteCommandeAdmin] documents-gmb exception:", e);
      storageErrors += 1;
    }

    // 2. Dossier complet photos/vidéos/logos de la commande (photos-gmb)
    try {
      const photoPaths = await listBucketPaths("photos-gmb", data.id);
      if (photoPaths.length > 0) {
        const { error } = await supabaseAdmin.storage.from("photos-gmb").remove(photoPaths);
        if (error) {
          console.error("[deleteCommandeAdmin] photos-gmb:", error.message);
          storageErrors += 1;
        }
      }
    } catch (e) {
      console.error("[deleteCommandeAdmin] photos-gmb exception:", e);
      storageErrors += 1;
    }

    // 2b. Rapports de livraison + captures (reports-gmb)
    try {
      const reportPaths = await listBucketPaths("reports-gmb", data.id);
      if (0 < reportPaths.length) {
        const { error } = await supabaseAdmin.storage.from("reports-gmb").remove(reportPaths);
        if (error) {
          console.error("[deleteCommandeAdmin] reports-gmb:", error.message);
          storageErrors += 1;
        }
      }
    } catch (e) {
      console.error("[deleteCommandeAdmin] reports-gmb exception:", e);
      storageErrors += 1;
    }

    // 3. Suppression de la ligne commande → cascade DB sur onboardings + agent_notes
    const { error } = await supabaseAdmin.from("commandes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true, storage_warnings: storageErrors };
  });
