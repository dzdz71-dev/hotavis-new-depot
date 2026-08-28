// Middleware d'authentification Supabase pour TanStack Start.
//
// Valide un JWT Bearer envoyé par le client (via auth-attacher.ts) et expose
// { supabase, userId, claims } dans le contexte des server functions.
//
// Stratégie de validation :
//   1. Tente supabase.auth.getClaims(token) — valide le JWT localement via JWKS
//      (asymétrique RS256/ES256, recommandé par Supabase).
//   2. Si getClaims échoue (JWT symétrique HS256, WebCrypto indisponible, JWKS
//      inaccessible, etc.), fallback sur supabase.auth.getUser(token) qui
//      interroge le serveur Auth.
//   3. Les deux chemins extraient `sub` (UUID utilisateur).
//
// Notes runtime (Node.js / Vercel) :
//   - WebCrypto est disponible nativement (Node 18+ / Vercel serverless functions).
//   - `process.env` est injecté par Nitro depuis .env (local) ou les
//     environment variables Vercel (production).
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type Claims = {
  sub: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  role?: string;
  email?: string;
  [key: string]: unknown;
};

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in .env (local) or Vercel env vars (production).`;
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }

    const request = getRequest();

    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // --- Étape 1 : getClaims (validation JWKS locale, recommandée) ---
    let claims: Claims | undefined;
    try {
      const { data, error } = await supabase.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        claims = data.claims as Claims;
      }
    } catch {
      // getClaims peut throw si WebCrypto indisponible ou JWKS injoignable.
      // On continue vers le fallback getUser.
    }

    // --- Étape 2 : fallback getUser (validation serveur Auth) ---
    if (!claims) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user?.id) {
        throw new Error("Unauthorized: Invalid token");
      }
      claims = {
        sub: data.user.id,
        email: data.user.email,
        role: (data.user as { role?: string }).role,
      };
    }

    if (!claims.sub) {
      throw new Error("Unauthorized: No user ID found in token");
    }

    return next({
      context: {
        supabase,
        userId: claims.sub,
        claims,
      },
    });
  },
);
