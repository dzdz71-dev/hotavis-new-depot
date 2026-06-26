import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Renvoie uniquement le montant de la commission par fiche (en centimes).
 * Lecture seule, sans données sensibles : utilisable en public (page recrutement)
 * et par les agents (dashboard). Toute écriture passe par updateAgencySettings (admin only).
 */
export const getPublicCommissionAmount = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("agency_settings")
    .select("commission_centimes_per_fiche")
    .maybeSingle();
  const centimes = data?.commission_centimes_per_fiche ?? 5000;
  return { commission_centimes: centimes, commission_euros: Math.round(centimes / 100) };
});

/**
 * Renvoie l'email super-admin configuré dans agency_settings.
 * Utilisé par /admin/login pour vérifier si l'email saisie peut créer le compte
 * super-admin à la première connexion. Publique car ne fuite pas de données
 * sensibles (l'email est déjà connu de l'opérateur de la plateforme).
 *
 * Fallback : "dz.societe.ecommerce@gmail.com" pour backward compat.
 */
export const getSuperAdminEmail = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("agency_settings")
    .select("super_admin_email")
    .maybeSingle();
  return { email: data?.super_admin_email ?? "dz.societe.ecommerce@gmail.com" };
});

