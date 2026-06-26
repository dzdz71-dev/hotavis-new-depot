import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, UserPlus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listAgents, inviteAgent, revokeAgent } from "@/lib/admin-agency.functions";
import { AdminNav } from "@/components/admin/AdminNav";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({ meta: [{ title: "Agents — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AgentsPage,
});

function AgentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchAgents = useServerFn(listAgents);
  const invite = useServerFn(inviteAgent);
  const revoke = useServerFn(revokeAgent);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin/login" });
      else setReady(true);
    });
  }, [navigate]);

  const { data, isLoading } = useQuery({ queryKey: ["admin-agents"], queryFn: () => fetchAgents(), enabled: ready });

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      await invite({ data: { email } });
      toast.success(`Invitation envoyée à ${email}`);
      setEmail(""); setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (e: any) { toast.error(e?.message || "Erreur"); }
    finally { setInviting(false); }
  }

  async function doRevoke(uid: string, email: string) {
    if (!confirm(`Retirer le rôle agent à ${email} ?`)) return;
    try {
      await revoke({ data: { user_id: uid } });
      toast.success("Rôle retiré");
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (e: any) { toast.error(e?.message || "Erreur"); }
  }

  if (!ready || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4"><h1 className="text-xl font-extrabold">Admin Hotavis</h1></div>
      </header>
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Équipe ({data?.agents.length || 0})</h2>
            <p className="text-sm text-muted-foreground">Agents qui prennent en charge les fiches clients.</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-google-blue text-white font-semibold px-4 py-2 text-sm">
            <UserPlus className="h-4 w-4" /> Inviter un agent
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold text-right">Fiches ce mois</th>
                <th className="px-4 py-3 font-semibold text-right">Total fiches</th>
                <th className="px-4 py-3 font-semibold text-right">Commission due (ce mois)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.agents || []).length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucun agent. Cliquez sur "Inviter un agent".</td></tr>}
              {(data?.agents || []).map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{a.email}</td>
                  <td className="px-4 py-3 text-right">{a.fiches_mois}</td>
                  <td className="px-4 py-3 text-right">{a.fiches_total}</td>
                  <td className="px-4 py-3 text-right font-semibold">{(a.commission_due_centimes / 100).toFixed(2)}€</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => doRevoke(a.id, a.email)} className="text-google-red hover:underline text-xs inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Retirer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalOpen(false)}>
          <form onSubmit={submitInvite} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg">Inviter un agent</h3>
              <button type="button" onClick={() => setModalOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">L'agent recevra un email avec un lien pour créer son compte (valable 7 jours).</p>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@exemple.com" className="w-full rounded-lg border border-border bg-background px-3 py-2 mb-4" />
            <button disabled={inviting} className="w-full rounded-full bg-google-blue text-white font-semibold py-2.5 disabled:opacity-50">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Envoyer l'invitation"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
