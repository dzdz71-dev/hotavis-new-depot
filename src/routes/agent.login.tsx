import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserRoles } from "@/lib/client/roles";

export const Route = createFileRoute("/agent/login")({
  head: () => ({
    meta: [{ title: "Espace Agent — Hotavis" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentLogin,
});

function AgentLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Si l'utilisateur est déjà connecté ET agent/admin, rediriger vers /agent.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const roles = await getUserRoles();
      if (roles.includes("agent") || roles.includes("admin")) {
        // Un admin peut aussi consulter /agent
        navigate({ to: "/agent" });
      }
    });
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

      // Vérifier le rôle agent (ou admin) avant de rediriger
      const roles = await getUserRoles();
      if (!roles.includes("agent") && !roles.includes("admin")) {
        await supabase.auth.signOut();
        setLoading(false);
        return toast.error("Ce compte n'a pas accès à l'espace agent.");
      }

      navigate({ to: "/agent" });
    } catch (err: unknown) {
      setLoading(false);
      toast.error((err as Error)?.message || "Erreur de connexion");
    }
  }

  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-card p-8 space-y-5"
      >
        <div>
          <div className="inline-block bg-google-blue/15 text-google-blue text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2">
            Espace Agent
          </div>
          <h1 className="text-2xl font-extrabold">Connexion</h1>
          <p className="text-sm text-muted-foreground mt-1">Réservé aux membres de l'équipe.</p>
        </div>
        <div>
          <label className="text-sm font-semibold">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Mot de passe</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
          <div className="mt-2 text-right">
            <Link
              to="/agent/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>
        <button
          disabled={loading}
          className="w-full rounded-full bg-google-blue text-white font-semibold py-2.5 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
