import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { getKanbanView, unblockCommande } from "@/lib/admin-agency.functions";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationsBell } from "@/components/admin/NotificationsBell";

export const Route = createFileRoute("/admin/kanban")({
  head: () => ({ meta: [{ title: "Kanban — Admin" }, { name: "robots", content: "noindex" }] }),
  component: KanbanPage,
});

type KanbanItem = {
  id: string;
  prenom: string;
  nom: string;
  entreprise: string;
  ville: string;
  statut: string;
  assigned_agent_id: string | null;
  agent_email: string | null;
};

function KanbanPage() {
  const qc = useQueryClient();
  const guard = useAdminGuard();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const fetchKanban = useServerFn(getKanbanView);
  const unblock = useServerFn(unblockCommande);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kanban"],
    queryFn: () => fetchKanban(),
    enabled: guard === "authorized",
    refetchInterval: 20000,
  });

  async function doUnblock(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setUnblockingId(id);
    try {
      await unblock({ data: { commande_id: id } });
      toast.success("Dossier débloqué et repassé en cours.");
      await qc.invalidateQueries({ queryKey: ["admin-kanban"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors du déblocage");
    } finally {
      setUnblockingId(null);
    }
  }

  if (guard !== "authorized" || isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Admin Hotavis</h1>
          <NotificationsBell />
        </div>
      </header>
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Column
          title="Nouveaux payés"
          color="bg-google-yellow/20 text-amber-800"
          items={data!.nouveaux as KanbanItem[]}
        />
        <Column
          title="En cours"
          color="bg-google-blue/15 text-google-blue"
          items={data!.en_cours as KanbanItem[]}
        />
        <Column
          title="Livrés (récents)"
          color="bg-google-green/15 text-google-green"
          items={data!.livrees as KanbanItem[]}
        />
        <Column
          title="Bloqués"
          color="bg-google-red/15 text-google-red"
          items={data!.bloques as KanbanItem[]}
          renderAction={(c) => (
            <button
              onClick={(e) => doUnblock(c.id, e)}
              disabled={unblockingId === c.id}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-google-red text-white px-3 py-1.5 text-xs font-semibold hover:bg-google-red/90 disabled:opacity-60"
            >
              {unblockingId === c.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlock className="h-3.5 w-3.5" />
              )}
              Débloquer
            </button>
          )}
        />
      </div>
    </div>
  );
}

function Column({
  title,
  color,
  items,
  renderAction,
}: {
  title: string;
  color: string;
  items: KanbanItem[];
  renderAction?: (c: KanbanItem) => React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-card">
      <div className={`px-4 py-3 rounded-t-2xl ${color}`}>
        <div className="font-bold flex justify-between items-center">
          <span className="inline-flex items-center gap-1.5">
            {title === "Bloqués" && <Lock className="h-4 w-4" />}
            {title}
          </span>
          <span className="text-xs">{items.length}</span>
        </div>
      </div>
      <div className="p-3 space-y-2 max-h-[70vh] overflow-auto">
        {items.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-6">Vide</p>
        )}
        {items.map((c) => (
          <Link
            key={c.id}
            to="/admin/$id"
            params={{ id: c.id }}
            className="block border border-border rounded-xl p-3 hover:bg-accent/30 transition"
          >
            <div className="font-semibold text-sm truncate">{c.entreprise}</div>
            <div className="text-xs text-muted-foreground truncate">
              {c.prenom} {c.nom} • {c.ville}
            </div>
            {c.agent_email && (
              <div className="mt-2 flex items-center gap-1.5">
                <Avatar email={c.agent_email} />
                <span className="text-[11px] text-muted-foreground truncate">{c.agent_email}</span>
              </div>
            )}
            {!c.agent_email && c.statut === "payé" && (
              <div className="mt-2 text-[11px] font-semibold text-amber-700">Non assigné</div>
            )}
            {renderAction && renderAction(c)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Avatar({ email }: { email: string }) {
  const initial = email[0]?.toUpperCase() || "?";
  return (
    <div className="h-5 w-5 rounded-full bg-google-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0">
      {initial}
    </div>
  );
}
