import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCommissionsReport, listAgents } from "@/lib/admin-agency.functions";
import { AdminNav } from "@/components/admin/AdminNav";

export const Route = createFileRoute("/admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions — Admin" }, { name: "robots", content: "noindex" }] }),
  component: CommissionsPage,
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function CommissionsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [agentId, setAgentId] = useState<string>("");
  const fetchReport = useServerFn(getCommissionsReport);
  const fetchAgents = useServerFn(listAgents);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin/login" });
      else setReady(true);
    });
  }, [navigate]);

  const { data: agentsData } = useQuery({ queryKey: ["admin-agents"], queryFn: () => fetchAgents(), enabled: ready });
  const { data, isLoading } = useQuery({
    queryKey: ["commissions", month, agentId],
    queryFn: () => fetchReport({ data: { month, agent_id: agentId || undefined } }),
    enabled: ready,
  });

  function exportCsv() {
    if (!data) return;
    const rows = [["Agent", "Fiche (entreprise)", "Livrée le", "Commission (€)"]];
    for (const a of data.agents) {
      for (const f of a.fiches) {
        rows.push([a.email, f.entreprise, new Date(f.delivered_at).toLocaleDateString("fr-FR"), (f.commission_centimes / 100).toFixed(2)]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `commissions-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;

  const totalGeneral = data?.agents.reduce((s, a) => s + a.total_commission_centimes, 0) || 0;
  const totalFiches = data?.agents.reduce((s, a) => s + a.count, 0) || 0;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4"><h1 className="text-xl font-extrabold">Admin Hotavis</h1></div>
      </header>
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Mois</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="block mt-1 rounded-lg border border-border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Agent</label>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="block mt-1 rounded-lg border border-border bg-background px-3 py-2 min-w-[200px]">
              <option value="">Tous les agents</option>
              {(agentsData?.agents || []).map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
            </select>
          </div>
          <button onClick={exportCsv} disabled={!data || data.total === 0} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50 ml-auto">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <Stat label="Fiches livrées" value={totalFiches.toString()} />
          <Stat label="Commission totale" value={`${(totalGeneral / 100).toFixed(2)}€`} />
          <Stat label="Agents actifs" value={(data?.agents.length || 0).toString()} />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {isLoading && <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>}
          {!isLoading && (data?.agents.length || 0) === 0 && <div className="p-10 text-center text-muted-foreground">Aucune fiche livrée sur la période.</div>}
          {!isLoading && (data?.agents || []).map((a) => (
            <div key={a.agent_id} className="border-b border-border last:border-b-0 p-5">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="font-bold">{a.email}</div>
                  <div className="text-xs text-muted-foreground">{a.count} fiche{a.count > 1 ? "s" : ""} livrée{a.count > 1 ? "s" : ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-google-green">{(a.total_commission_centimes / 100).toFixed(2)}€</div>
                  <div className="text-xs text-muted-foreground">à verser</div>
                </div>
              </div>
              <div className="text-sm space-y-1 pl-4 border-l-2 border-border">
                {a.fiches.map((f) => (
                  <div key={f.id} className="flex justify-between text-muted-foreground">
                    <span>{f.entreprise} <span className="text-xs">({new Date(f.delivered_at).toLocaleDateString("fr-FR")})</span></span>
                    <span>{(f.commission_centimes / 100).toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
