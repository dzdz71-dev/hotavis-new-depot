import { rateLimit, RateLimitError } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const schema = z.object({
  prenom: z.string().trim().min(1).max(60),
  nom: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  telephone: z.string().trim().min(6).max(30),
  entreprise: z.string().trim().min(1).max(120),
  ville: z.string().trim().min(1).max(120),
  activite: z.string().trim().min(1).max(120),
});

const MONTANT = 19900; // 199€

function buildRateLimitKey(request: Request): string {
  try {
    if (!request) return "no-req";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfIp = (request as any).cf?.ipCountry as string | undefined;
    const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = xff || cfIp || "unknown";
    return `cmd:${ip}`;
  } catch {
    return "cmd:unknown";
  }
}

export async function createCommandeHandler(data: z.infer<typeof schema>, request: Request) {
  try {
    // Rate-limit : 5 commandes / minute / IP
    rateLimit(buildRateLimitKey(request), 5, 60_000);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return { error: "RATE_LIMITED", retryAfterSec: e.retryAfterSec, message: e.message };
    }
    throw e;
  }

  const { data: commande, error } = await supabaseAdmin
    .from("commandes")
    .insert({
      prenom: data.prenom,
      nom: data.nom,
      email: data.email,
      telephone: data.telephone,
      entreprise: data.entreprise,
      ville: data.ville,
      activite: data.activite,
      montant_centimes: MONTANT,
      statut: "en_attente",
    })
    .select()
    .single();

  if (error || !commande) {
    console.error("Supabase error:", error);
    throw new Error(error?.message || "Erreur création commande");
  }
  return { commande_id: commande.id };
}
