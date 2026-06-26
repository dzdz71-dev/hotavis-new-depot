import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getInvitation, acceptInvitation } from "@/lib/invitation.functions";

export const Route = createFileRoute("/accept-invitation/$token")({
  head: () => ({ meta: [{ title: "Invitation — Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: AcceptInvitation,
});

function AcceptInvitation() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const fetchInv = useServerFn(getInvitation);
  const accept = useServerFn(acceptInvitation);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInv({ data: { token } }),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Mot de passe : 8 caractères minimum.");
    setLoading(true);
    try {
      const r = await accept({ data: { token, password } });
      // Login auto — peut échouer si l'email n'est pas confirmé ou si le
      // serveur Auth met du temps à propager le user. On gère l'échec en
      // redirigeant vers /agent/login avec un message.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: r.email,
        password,
      });
      if (signInError) {
        toast.success("Compte créé ! Veuillez vous connecter.");
        navigate({ to: "/agent/login" });
        return;
      }
      toast.success("Bienvenue dans l'équipe ! 🎉");
      navigate({ to: "/agent" });
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!data?.valid) {
    const reason = data && "reason" in data ? data.reason : "introuvable";
    const msg = reason === "expiree" ? "Cette invitation a expiré."
      : reason === "deja_utilisee" ? "Cette invitation a déjà été utilisée."
      : "Invitation introuvable.";
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-google-red mx-auto" />
          <h1 className="text-xl font-bold mt-3">{msg}</h1>
          <p className="text-muted-foreground mt-2">Demandez à l'admin de vous envoyer un nouveau lien.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-card border border-border rounded-2xl shadow-card p-8 space-y-5">
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 text-google-green mx-auto" />
          <h1 className="text-2xl font-extrabold mt-3">Bienvenue !</h1>
          <p className="text-sm text-muted-foreground mt-1">Créez votre mot de passe pour rejoindre l'équipe Hotavis.</p>
        </div>
        <div>
          <label className="text-sm font-semibold">Email</label>
          <input value={data.email} disabled className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-muted-foreground" />
        </div>
        <div>
          <label className="text-sm font-semibold">Mot de passe (8 caractères min.)</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </div>
        <button disabled={loading} className="w-full rounded-full bg-google-blue text-white font-semibold py-2.5 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Accepter et créer mon compte"}
        </button>
      </form>
    </div>
  );
}
