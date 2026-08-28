// Helpers côté client pour la vérification de rôle après login.
// On utilise le client supabase (anon, soumis à la RLS) avec la table user_roles.
// La RLS permet à un user de lire ses propres rôles uniquement.

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "agent" | "user";

export async function getUserRoles(): Promise<AppRole[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);

  if (error) {
    // Ne pas planter l'UI, mais tracer l'erreur pour le debug.
    console.error("[getUserRoles] erreur lecture user_roles:", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.role as AppRole);
}

/** Vérifie que l'utilisateur connecté a au moins l'un des rôles requis. */
export async function hasAnyRole(required: AppRole[]): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.some((r) => required.includes(r));
}
