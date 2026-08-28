import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const { Client } = pg;

const bootstrapSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

/**
 * Crée (ou réinitialise) un compte admin avec n'importe quel email.
 *
 * Étapes :
 *  1. Se connecte à PostgreSQL via pg (DATABASE_URL).
 *  2. Exécute le schéma SQL complet (crée toutes les tables si elles n'existent pas).
 *  3. Crée/met à jour l'utilisateur via l'Admin API Supabase (service_role).
 *  4. Insère le rôle admin via la connection pg directe (bypass RLS).
 *
 * Publique (pas de middleware auth) — sert à créer le TOUT PREMIER admin.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((i) => bootstrapSchema.parse(i))
  .handler(async ({ data }) => {
    // 1) Garantir que le schéma complet existe (DDL via pg direct).
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL manquant. Ajoutez-le dans .env (Supabase Dashboard → Project Settings → Database → Connection string → URI).",
      );
    }

    // Lire le fichier SQL consolidé (schéma complet idempotent)
    // process.cwd() = racine du projet (fiable en dev SSR et en production)
    const sqlPath = resolve(
      process.cwd(),
      "supabase",
      "migrations",
      "20260705190000_full_schema.sql",
    );
    let fullSchemaSql: string;
    try {
      fullSchemaSql = readFileSync(sqlPath, "utf-8");
    } catch {
      // Fallback : si le fichier n'est pas trouvé (ex: build Vercel), on inline le SQL minimal
      console.error("[bootstrapAdmin] Fichier SQL non trouvé:", sqlPath);
      throw new Error("Fichier schéma SQL introuvable. Chemin tenté: " + sqlPath);
    }

    const pgClient = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    let userId: string;
    let existing = false;

    try {
      await pgClient.connect();

      // 2) Exécuter le schéma complet (crée toutes les tables, fonctions, policies, etc.)
      await pgClient.query(fullSchemaSql);

      // 3) Récupérer l'utilisateur existant via l'Admin API.
      const {
        data: { users },
        error: listErr,
      } = await supabaseAdmin.auth.admin.listUsers();

      if (listErr) {
        throw new Error(`Erreur recherche utilisateur: ${listErr.message}`);
      }

      const found = users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());

      if (found) {
        // 3a) Mettre à jour le mot de passe + confirmer l'email.
        existing = true;
        const { data: updated, error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
          found.id,
          { password: data.password, email_confirm: true },
        );
        if (updErr || !updated?.user) {
          throw new Error(
            `Impossible de mettre à jour l'utilisateur: ${updErr?.message ?? "inconnu"}`,
          );
        }
        userId = updated.user.id;
      } else {
        // 3b) Créer le nouvel utilisateur.
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
        });
        if (createErr || !created?.user) {
          throw new Error(`Impossible de créer l'utilisateur: ${createErr?.message ?? "inconnu"}`);
        }
        userId = created.user.id;
      }

      // 4) Insérer le rôle admin directement via pg (bypass RLS).
      await pgClient.query(
        `INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')
         ON CONFLICT (user_id, role) DO NOTHING`,
        [userId],
      );
    } finally {
      await pgClient.end();
    }

    return {
      ok: true,
      message: existing
        ? "Compte mis à jour. Vous pouvez vous connecter avec votre mot de passe."
        : "Compte admin créé. Vous pouvez vous connecter avec votre mot de passe.",
    };
  });
