import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/agent/forgot-password")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Espace Agent Hotavis" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentForgotPassword,
});

function AgentForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/agent/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      setLoading(false);
      if (error) {
        return toast.error(error.message);
      }
      setSent(true);
      toast.success("Si votre email existe, un lien de réinitialisation vous a été envoyé.");
    } catch (err: unknown) {
      setLoading(false);
      toast.error((err as Error)?.message || "Une erreur est survenue.");
    }
  }

  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-card p-8 space-y-5">
        <div>
          <div className="inline-block bg-google-blue/15 text-google-blue text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2">
            Espace Agent
          </div>
          <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saisissez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              Si votre email existe, un lien de réinitialisation vous a été envoyé. Vérifiez votre
              boîte de réception (et vos spams).
            </div>
            <Link
              to="/agent/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-google-blue hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="agent@exemple.com"
              />
            </div>
            <button
              disabled={loading}
              className="w-full rounded-full bg-google-blue text-white font-semibold py-2.5 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin inline" />
              ) : (
                "Envoyer le lien de réinitialisation"
              )}
            </button>
            <div className="text-center">
              <Link
                to="/agent/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
