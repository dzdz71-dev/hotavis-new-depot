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
