import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  created_at: string;
};

/**
 * Insère une notification en base pour un utilisateur donné.
 * Utilise supabaseAdmin (bypass RLS) — destinée aux fonctions serveur.
 */
export async function createNotification(userId: string, message: string): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    message,
  });
  if (error) console.error("createNotification error:", error.message);
}

/**
 * Récupère l'email d'un utilisateur via son ID.
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data?.user?.email || null;
}

/**
 * Récupère tous les IDs des utilisateurs admin.
 */
async function getAdminUserIds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error) return [];
  return (data || []).map((r) => r.user_id);
}

/**
 * Notifie tous les admins : insère une notification en base + envoie un email via Resend.
 */
export async function notifyAdmins(
  message: string,
  emailSubject: string,
  emailHtml: string,
): Promise<void> {
  const adminIds = await getAdminUserIds();
  for (const adminId of adminIds) {
    await createNotification(adminId, message);
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    for (const adminId of adminIds) {
      const email = await getUserEmail(adminId);
      if (email) {
        await resend.emails
          .send({
            from: "Hotavis <noreply@hotavis.fr>",
            to: [email],
            subject: emailSubject,
            html: emailHtml,
          })
          .catch((e) => console.error("notifyAdmins email error:", e));
      }
    }
  }
}

/**
 * Notifie un agent spécifique : insère une notification + envoie un email.
 */
export async function notifyAgent(
  agentId: string,
  message: string,
  emailSubject: string,
  emailHtml: string,
): Promise<void> {
  await createNotification(agentId, message);

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const email = await getUserEmail(agentId);
    if (email) {
      const resend = new Resend(resendKey);
      await resend.emails
        .send({
          from: "Hotavis <noreply@hotavis.fr>",
          to: [email],
          subject: emailSubject,
          html: emailHtml,
        })
        .catch((e) => console.error("notifyAgent email error:", e));
    }
  }
}

// --- Server functions pour le frontend ---

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id, message, read, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { notifications: (data || []) as Notification[] };
  });

export const markNotificationAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
