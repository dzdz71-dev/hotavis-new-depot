import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Vérifie que l'utilisateur donné possède le rôle admin.
 * Lève une erreur si ce n'est pas le cas ou si la requête échoue.
 *
 * À utiliser dans les server functions protégées (middleware requireSupabaseAuth).
 */
export async function assertAdmin(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Accès refusé : admin requis");
}
