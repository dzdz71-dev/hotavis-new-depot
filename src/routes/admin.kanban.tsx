import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getKanbanView } from "@/lib/admin-agency.functions";
import { AdminNav } from "@/components/admin/AdminNav";

export const Route = createFileRoute("/admin/kanban")({
  head: () => ({ meta: [{ title: "Kanban — Admin" }, { name: "robots", content: "noindex" }] }),
  component: KanbanPage,
});

function KanbanPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const fetchKanban = useServerFn(getKanbanView);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin/login" });
      else setReady(true);
    });
  }, [navigate]);

  const { data, isLoading } = useQuery({ queryKey: ["admin-kanban"], queryFn: () => fetchKanban(), enabled: ready, refetchInterval: 20000 });

  if (!ready || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-extrabold">Admin Hotavis</h1>
        </div>
      </header>
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-4">
        <Column title="Nouveaux payés" color="bg-google-yellow/20 text-amber-800" items={data!.nouveaux} />
        <Column title="En cours" color="bg-google-blue/15 text-google-blue" items={data!.en_cours} />
        <Column title="Livrés (récents)" color="bg-google-green/15 text-google-green" items={data!.livrees} />
      </div>
    </div>
  );
}

function Column({ title, color, items }: { title: string; color: string; items: any[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-card">
      <div className={`px-4 py-3 rounded-t-2xl ${color}`}>
        <div className="font-bold flex justify-between items-center">
          <span>{title}</span><span className="text-xs">{items.length}</span>
        </div>
      </div>
      <div className="p-3 space-y-2 max-h-[70vh] overflow-auto">
        {items.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">Vide</p>}
        {items.map((c) => (
          <Link key={c.id} to="/admin/$id" params={{ id: c.id }} className="block border border-border rounded-xl p-3 hover:bg-accent/30 transition">
            <div className="font-semibold text-sm truncate">{c.entreprise}</div>
            <div className="text-xs text-muted-foreground truncate">{c.prenom} {c.nom} • {c.ville}</div>
            {c.agent_email && (
              <div className="mt-2 flex items-center gap-1.5">
                <Avatar email={c.agent_email} />
                <span className="text-[11px] text-muted-foreground truncate">{c.agent_email}</span>
              </div>
            )}
            {!c.agent_email && c.statut === "payé" && <div className="mt-2 text-[11px] font-semibold text-amber-700">Non assigné</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Avatar({ email }: { email: string }) {
  const initial = email[0]?.toUpperCase() || "?";
  return <div className="h-5 w-5 rounded-full bg-google-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0">{initial}</div>;
}
