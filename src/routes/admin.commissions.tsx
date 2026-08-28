import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Download, CheckCircle2, Clock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  getCommissionsReport,
  listAgents,
  markCommissionsAsPaid,
} from "@/lib/admin-agency.functions";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/admin/commissions")({
  head: () => ({
    meta: [{ title: "Commissions — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: CommissionsPage,
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function CommissionsPage() {
  const queryClient = useQueryClient();
  const guard = useAdminGuard();
  const [month, setMonth] = useState(currentMonth());
  const [agentId, setAgentId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const fetchReport = useServerFn(getCommissionsReport);
  const fetchAgents = useServerFn(listAgents);
  const markPaid = useServerFn(markCommissionsAsPaid);

  const { data: agentsData } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => fetchAgents(),
    enabled: guard === "authorized",
  });
  const { data, isLoading } = useQuery({
    queryKey: ["commissions", month, agentId],
    queryFn: () => fetchReport({ data: { month, agent_id: agentId || undefined } }),
    enabled: guard === "authorized",
  });

  // Réinitialise la sélection quand les données changent (mois/agent).
  useEffect(() => {
    setSelected(new Set());
  }, [month, agentId]);

  // Toutes les fiches impayées affichées (pour "tout sélectionner").
  const allUnpaidIds = useMemo(() => {
    const ids: string[] = [];
    for (const a of data?.agents || []) {
      for (const f of a.fiches) {
        if (!f.commission_paid) ids.push(f.id);
      }
    }
    return ids;
  }, [data]);

  const allUnpaidSelected = allUnpaidIds.length > 0 && allUnpaidIds.every((id) => selected.has(id));

  function toggleFiche(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAgentUnpaid(fiches: { id: string; commission_paid: boolean }[]) {
    const unpaidIds = fiches.filter((f) => !f.commission_paid).map((f) => f.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = unpaidIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of unpaidIds) next.delete(id);
      } else {
        for (const id of unpaidIds) next.add(id);
      }
      return next;
    });
  }

  function toggleAllUnpaid() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allUnpaidSelected) {
        for (const id of allUnpaidIds) next.delete(id);
      } else {
        for (const id of allUnpaidIds) next.add(id);
      }
      return next;
    });
  }

  async function doMarkPaid(ids: string[], label: string) {
    if (ids.length === 0) {
      toast.error("Aucune commission à payer.");
      return;
    }
    setMarking(true);
    try {
      const res = await markPaid({ data: { commande_ids: ids } });
      toast.success(
        `${res.updated} commission${res.updated > 1 ? "s" : ""} marquée${res.updated > 1 ? "s" : ""} comme payée${res.updated > 1 ? "s" : ""} — ${label}`,
      );
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["commissions"] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erreur lors du marquage");
    } finally {
      setMarking(false);
    }
  }

  function exportCsv() {
    if (!data) return;
    const rows = [["Agent", "Fiche (entreprise)", "Livrée le", "Commission (€)", "Statut"]];
    for (const a of data.agents) {
      for (const f of a.fiches) {
        rows.push([
          a.email,
          f.entreprise,
          (f.delivered_at ? new Date(f.delivered_at) : new Date()).toLocaleDateString("fr-FR"),
          (f.commission_centimes / 100).toFixed(2),
          f.commission_paid ? "Payé" : "En attente",
        ]);
      }
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commissions-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (guard !== "authorized")
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );

  const totalGeneral = data?.agents.reduce((s, a) => s + a.total_commission_centimes, 0) || 0;
  const totalFiches = data?.agents.reduce((s, a) => s + a.count, 0) || 0;
  const totalPaye =
    data?.agents.reduce(
      (s, a) =>
        s +
        a.fiches.filter((f) => f.commission_paid).reduce((t, f) => t + f.commission_centimes, 0),
      0,
    ) || 0;
  const totalEnAttente = totalGeneral - totalPaye;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Admin Hotavis</h1>
          <NotificationsBell />
        </div>
      </header>
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Mois</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="block mt-1 rounded-lg border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="block mt-1 rounded-lg border border-border bg-background px-3 py-2 min-w-[200px]"
            >
              <option value="">Tous les agents</option>
              {(agentsData?.agents || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={exportCsv}
            disabled={!data || data.total === 0}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50 ml-auto"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Fiches livrées" value={totalFiches.toString()} />
          <Stat label="Commission totale" value={`${(totalGeneral / 100).toFixed(2)}€`} />
          <Stat
            label="Payé"
            value={`${(totalPaye / 100).toFixed(2)}€`}
            icon={<CheckCircle2 className="h-4 w-4 text-google-green" />}
          />
          <Stat
            label="En attente"
            value={`${(totalEnAttente / 100).toFixed(2)}€`}
            icon={<Clock className="h-4 w-4 text-amber-600" />}
          />
        </div>

        {/* Barre d'action globale */}
        {allUnpaidIds.length > 0 && (
          <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-card">
            <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
              <Checkbox
                checked={allUnpaidSelected}
                onCheckedChange={toggleAllUnpaid}
                disabled={marking}
              />
              Tout sélectionner (impayées)
            </label>
            <span className="text-sm text-muted-foreground">
              {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => doMarkPaid(Array.from(selected), "sélection")}
              disabled={marking || selected.size === 0}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-google-green text-white font-semibold px-4 py-2 text-sm disabled:opacity-50"
            >
              {marking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Marquer comme payées
            </button>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {isLoading && (
            <div className="p-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin inline" />
            </div>
          )}
          {!isLoading && (data?.agents.length || 0) === 0 && (
            <div className="p-10 text-center text-muted-foreground">
              Aucune fiche livrée sur la période.
            </div>
          )}
          {!isLoading &&
            (data?.agents || []).map((a) => {
              const unpaidIds = a.fiches.filter((f) => !f.commission_paid).map((f) => f.id);
              const allAgentUnpaidSelected =
                unpaidIds.length > 0 && unpaidIds.every((id) => selected.has(id));
              return (
                <div key={a.agent_id} className="border-b border-border last:border-b-0 p-5">
                  <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {unpaidIds.length > 0 && (
                        <Checkbox
                          checked={allAgentUnpaidSelected}
                          onCheckedChange={() => toggleAgentUnpaid(a.fiches)}
                          disabled={marking}
                        />
                      )}
                      <div>
                        <div className="font-bold">{a.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.count} fiche{a.count > 1 ? "s" : ""} livrée{a.count > 1 ? "s" : ""}
                          {unpaidIds.length < a.count ? ` · ${unpaidIds.length} en attente` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-google-green">
                          {(a.total_commission_centimes / 100).toFixed(2)}€
                        </div>
                        <div className="text-xs text-muted-foreground">à verser</div>
                      </div>
                      {unpaidIds.length > 0 && (
                        <button
                          onClick={() => doMarkPaid(unpaidIds, a.email)}
                          disabled={marking}
                          className="inline-flex items-center gap-2 rounded-full border border-google-green/30 text-google-green px-3 py-1.5 text-xs font-semibold hover:bg-google-green/10 disabled:opacity-50"
                        >
                          {marking ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Marquer tout le mois comme payé
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1 pl-4 border-l-2 border-border">
                    {a.fiches.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between gap-3 text-muted-foreground"
                      >
                        <span className="inline-flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={selected.has(f.id)}
                            onCheckedChange={() => toggleFiche(f.id)}
                            disabled={marking || f.commission_paid}
                          />
                          <span className="truncate">
                            {f.entreprise}{" "}
                            <span className="text-xs">
                              (
                              {(f.delivered_at
                                ? new Date(f.delivered_at)
                                : new Date()
                              ).toLocaleDateString("fr-FR")}
                              )
                            </span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-3 shrink-0">
                          <span>{(f.commission_centimes / 100).toFixed(2)}€</span>
                          <PaidBadge paid={f.commission_paid} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function PaidBadge({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-google-green/10 text-google-green px-2.5 py-1 text-xs font-semibold">
      <CheckCircle2 className="h-3 w-3" /> Payé
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-semibold">
      <Clock className="h-3 w-3" /> En attente
    </span>
  );
}
