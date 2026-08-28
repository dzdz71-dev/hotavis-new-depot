import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/agent/update-password")({
  head: () => ({
    meta: [
      { title: "Mise à jour du mot de passe — Espace Agent Hotavis" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentUpdatePassword,
});

function AgentUpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Route protégée : l'utilisateur doit avoir une session valide
  // (issue du clic sur le lien de réinitialisation dans l'email).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/agent/login" });
        return;
      }
      setCheckingSession(false);
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      return toast.error("Le mot de passe doit contenir au moins 8 caractères.");
    }
    if (password !== confirm) {
      return toast.error("Les mots de passe ne correspondent pas.");
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) {
        return toast.error(error.message);
      }
      toast.success("Mot de passe mis à jour avec succès.");
      navigate({ to: "/agent" });
    } catch (err: unknown) {
      setLoading(false);
      toast.error((err as Error)?.message || "Une erreur est survenue.");
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );
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
          <h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choisissez un nouveau mot de passe pour votre compte.
          </p>
        </div>
        <div>
          <label className="text-sm font-semibold">Nouveau mot de passe</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="Minimum 8 caractères"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Confirmer le mot de passe</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="Répétez le mot de passe"
          />
        </div>
        <button
          disabled={loading}
          className="w-full rounded-full bg-google-blue text-white font-semibold py-2.5 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Mettre à jour"}
        </button>
      </form>
    </div>
  );
}
