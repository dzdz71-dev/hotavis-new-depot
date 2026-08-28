import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserRoles } from "@/lib/client/roles";
import { bootstrapAdmin } from "@/lib/admin-auth.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin — Connexion" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const callBootstrapAdmin = useServerFn(bootstrapAdmin);

  // Si l'utilisateur est déjà connecté ET admin, rediriger vers /admin.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const roles = await getUserRoles();
      if (cancelled) return;
      if (roles.includes("admin")) {
        navigate({ to: "/admin" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return toast.error(error.message);
      }

      // Vérifier le rôle admin côté client (lecture dans user_roles via RLS)
      const roles = await getUserRoles();
      if (!roles.includes("admin")) {
        await supabase.auth.signOut();
        setLoading(false);
        return toast.error("Ce compte n'a pas les droits administrateur.");
      }

      navigate({ to: "/admin" });
    } catch (err: unknown) {
      setLoading(false);
      toast.error((err as Error)?.message || "Erreur de connexion");
    }
  }

  async function signupAdmin() {
    if (password.length < 8) return toast.error("Mot de passe min. 8 caractères");
    setLoading(true);
    try {
      const res = await callBootstrapAdmin({ data: { email, password } });
      toast.success(res.message);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-elevated"
      >
        <div className="flex items-center gap-2 text-google-blue mb-6">
          <ShieldCheck className="h-6 w-6" />
          <span className="font-bold text-lg">Espace Admin Hotavis</span>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Mot de passe</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full gradient-cta text-white py-3 font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Se connecter
          </button>
          <button
            type="button"
            onClick={signupAdmin}
            disabled={loading}
            className="w-full text-xs text-muted-foreground hover:text-foreground underline"
          >
            Première connexion ? Créer le compte super-admin
          </button>
        </div>
      </form>
    </div>
  );
}
