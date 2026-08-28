import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getUserRoles } from "@/lib/client/roles";

type GuardState = "loading" | "authorized" | "unauthenticated" | "forbidden";

/**
 * Garde-fou client pour les routes /admin/*.
 *
 * Vérifie :
 *  1. Qu'une session Supabase existe (sinon → /admin/login).
 *  2. Que l'utilisateur connecté possède le rôle "admin" dans user_roles
 *     (sinon → /agent ou /).
 *
 * Retourne :
 *  - "loading"        : vérification en cours (afficher un spinner).
 *  - "authorized"     : l'utilisateur est admin, afficher la page.
 *  - "unauthenticated": pas de session (redirection vers /admin/login).
 *  - "forbidden"      : session mais pas admin (redirection vers /agent ou /).
 */
export function useAdminGuard(): GuardState {
  const navigate = useNavigate();
  const [state, setState] = useState<GuardState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        setState("unauthenticated");
        navigate({ to: "/admin/login" });
        return;
      }

      const roles = await getUserRoles();
      if (cancelled) return;

      if (roles.includes("admin")) {
        setState("authorized");
      } else {
        setState("forbidden");
        navigate({ to: roles.includes("agent") ? "/agent" : "/" });
      }
    }

    check();

    // Re-vérifier si l'état d'auth change (déconnexion, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (cancelled) return;
      if (!session) {
        setState("unauthenticated");
        navigate({ to: "/admin/login" });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return state;
}
