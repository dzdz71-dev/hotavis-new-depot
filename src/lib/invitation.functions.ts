import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getInvitation = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ token: z.string().min(10).max(200) }).parse(i))
  .handler(async ({ data }) => {
    const { data: inv, error } = await supabaseAdmin
      .from("agent_invitations")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { valid: false as const, reason: "introuvable" };
    if (inv.accepted_at) return { valid: false as const, reason: "deja_utilisee" };
    if (new Date(inv.expires_at) < new Date()) return { valid: false as const, reason: "expiree" };
    return { valid: true as const, email: inv.email };
  });

export const acceptInvitation = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        token: z.string().min(10).max(200),
        password: z.string().min(8).max(72),
        full_name: z.string().trim().min(2).max(120),
        phone: z.string().trim().min(6).max(30),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { data: inv, error } = await supabaseAdmin
      .from("agent_invitations")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Invitation introuvable");
    if (inv.accepted_at) throw new Error("Cette invitation a déjà été utilisée");
    if (new Date(inv.expires_at) < new Date()) throw new Error("Cette invitation a expiré");

    // Crée ou récupère l'utilisateur
    let userId: string;
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email?.toLowerCase() === inv.email.toLowerCase());

    if (found) {
      userId = found.id;
      // met à jour le mot de passe + user_metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name, phone: data.phone },
      });
    } else {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: inv.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name, phone: data.phone },
      });
      if (cErr || !created.user) throw new Error(cErr?.message || "Création du compte échouée");
      userId = created.user.id;
    }

    // Attribue le rôle agent
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "agent" })
      .then((r) => {
        if (r.error && !r.error.message.includes("duplicate")) throw new Error(r.error.message);
      });

    // Marque l'invitation comme acceptée
    await supabaseAdmin
      .from("agent_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("token", data.token);

    return { ok: true, email: inv.email };
  });
