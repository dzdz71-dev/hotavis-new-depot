import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  LogOut,
  Package,
  ClipboardList,
  Cog,
  CheckCircle2,
  Euro,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { deleteCommandeAdmin, listCommandes, resetStatsPeriod } from "@/lib/admin.functions";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
  payé: { label: "Informations en attente", cls: "bg-google-yellow/20 text-amber-700" },
  onboarding_complété: { label: "À faire", cls: "bg-google-blue/15 text-google-blue" },
  en_cours: { label: "En cours", cls: "bg-google-yellow/20 text-amber-700" },
  livrée: { label: "Livrée", cls: "bg-google-green/15 text-google-green" },
  annulée: { label: "Annulée", cls: "bg-google-red/15 text-google-red" },
  bloque: { label: "Bloqué", cls: "bg-google-red/15 text-google-red" },
};

type StatutFiltre = "recue" | "en_cours" | "bloque" | "livrée";

// Options du filtre de statut : "En cours" (uniquement le statut réel "en_cours",
// attribué à la prise en charge du dossier par l'admin ou l'agent), "Bloqués", "Livrés".
// Le filtre par défaut "Commandes reçues" est inséré en tête lors du rendu via
// la clé de traduction admin.filter_received. Les commandes "en_attente"
// n'apparaissent dans aucun filtre (exclusion globale, voir filteredCommandes).
const FILTRES: { key: StatutFiltre; label: string }[] = [
  { key: "en_cours", label: "En cours" },
  { key: "bloque", label: "Bloqués" },
  { key: "livrée", label: "Livrés" },
];

// Filtre par défaut "Commandes reçues" : uniquement les commandes réellement
// finalisées et payées non encore livrées. Le paiement Stripe confirmé fait
// passer la commande en statut "payé" (paid_at renseigné) ; elle progresse
// ensuite vers onboarding_complété / en_cours / bloque si problème. Les
// commandes livrées n'apparaissent QUE via le filtre dédié "Livrés".
// Les commandes en attente de paiement ("en_attente") sont TOTALEMENT exclues
// de l'affichage du dashboard (aucun filtre, aucune liste) : elles ne sont ni
// supprimées ni modifiées dans Supabase. Aucun statut existant n'est modifié.
const STATUTS_RECUES: readonly string[] = ["payé", "onboarding_complété", "en_cours", "bloque"];

/** Colonnes renvoyées par listCommandes (src/lib/admin.functions.ts). */
interface AdminCommande {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  entreprise: string;
  ville: string;
  activite: string;
  statut: string;
  montant_centimes: number;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  assigned_agent_id: string | null;
  facture_status: string;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const guard = useAdminGuard();
  const fetchCommandes = useServerFn(listCommandes);
  const fetchDelete = useServerFn(deleteCommandeAdmin);
  const fetchResetPeriod = useServerFn(resetStatsPeriod);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-commandes"],
    queryFn: () => fetchCommandes(),
    enabled: guard === "authorized",
  });

  const [search, setSearch] = useState("");
  // Filtre par défaut : "Commandes reçues" ("en_attente" exclues de tout
  // affichage, "livrée" réservée au filtre "Livrés").
  const [filtre, setFiltre] = useState<StatutFiltre>("recue");
  const [deleteTarget, setDeleteTarget] = useState<AdminCommande | null>(null);
  // Dialogue "Commencer à zéro" (cartes Total / CA total)
  const [resetOpen, setResetOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetchDelete({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commandes"] });
      setDeleteTarget(null);
      toast.success(t("admin.deleted_success"));
    },
    onError: () => {
      toast.error(t("admin.delete_error"));
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await fetchResetPeriod();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commandes"] });
      setResetOpen(false);
      toast.success(t("admin.reset_success"));
    },
    onError: () => {
      toast.error(t("admin.reset_error"));
    },
  });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  // Filtrage en mémoire (réactif instantané, sans refetch)
  // Hooks doivent être appelés avant tout early return.
  const {
    commandes,
    stats,
    agentEmails,
    period_start_at: periodStart,
  } = data ?? {
    commandes: [],
    stats: { total: 0, non_traites: 0, en_cours: 0, livrees: 0, ca_total: 0 },
    agentEmails: {},
    period_start_at: null as string | null,
  };
  // Sous-titre "depuis le ..." des cartes Total / CA total quand une période
  // de référence a été définie via "Commencer à zéro".
  const periodLabel = periodStart
    ? t("admin.period_since", { date: new Date(periodStart).toLocaleDateString() })
    : null;
  const resetButton = (
    <button
      type="button"
      onClick={() => setResetOpen(true)}
      title={t("admin.reset_stats")}
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
    >
      <RotateCcw className="h-3 w-3" />
      {t("admin.reset_stats")}
    </button>
  );

  const filteredCommandes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commandes.filter((c) => {
      // Exclusion totale des commandes en attente de paiement ("en_attente") :
      // elles ne s'affichent dans aucun filtre ni aucune liste du dashboard.
      // Elles restent présentes en base, sans aucune modification de données.
      if (c.statut === "en_attente") return false;
      // Filtres de statut (par défaut : "Commandes reçues"). "en_cours", "bloque"
      // et "livrée" filtrent directement sur le statut exact de la commande.
      if (filtre === "recue") {
        if (!STATUTS_RECUES.includes(c.statut)) return false;
      } else if (c.statut !== filtre) {
        return false;
      }
      // Recherche fuzzy (entreprise, ville, email agent)
      if (q) {
        const entreprise = (c.entreprise || "").toLowerCase();
        const ville = (c.ville || "").toLowerCase();
        const agentEmail = c.assigned_agent_id
          ? (agentEmails[c.assigned_agent_id] || "").toLowerCase()
          : "";
        if (!entreprise.includes(q) && !ville.includes(q) && !agentEmail.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [commandes, search, filtre, agentEmails]);

  if (guard !== "authorized" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-xl font-bold text-google-red">Erreur</h1>
          <p className="text-muted-foreground mt-2">{(error as Error).message}</p>
          <button
            onClick={logout}
            className="mt-4 rounded-full border border-border px-5 py-2 text-sm"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold">Admin Hotavis</h1>
            <p className="text-xs text-muted-foreground">Gestion des commandes</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        </div>
      </header>
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Stat
            icon={<Package className="h-5 w-5" />}
            label="Total"
            value={stats.total}
            subtitle={periodLabel}
            action={resetButton}
          />
          <Stat
            icon={<ClipboardList className="h-5 w-5" />}
            label={t("admin.stat_unprocessed")}
            value={stats.non_traites}
          />
          <Stat icon={<Cog className="h-5 w-5" />} label="En cours" value={stats.en_cours} />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Livrées" value={stats.livrees} />
          <Stat
            icon={<Euro className="h-5 w-5" />}
            label="CA total"
            value={`${(stats.ca_total / 100).toFixed(0)}€`}
            subtitle={periodLabel}
            action={resetButton}
          />
        </div>

        {/* Recherche + Filtres */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par entreprise, ville ou agent…"
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ key: "recue" as StatutFiltre, label: t("admin.filter_received") }, ...FILTRES].map(
              (f) => (
                <Button
                  key={f.key}
                  variant={filtre === f.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltre(f.key)}
                >
                  {f.label}
                </Button>
              ),
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Entreprise</th>
                  <th className="px-4 py-3 font-semibold">Activité</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Délai</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCommandes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      {commandes.length === 0
                        ? "Aucune commande pour le moment."
                        : "Aucune commande ne correspond à votre recherche."}
                    </td>
                  </tr>
                )}
                {filteredCommandes.map((c) => {
                  const s = STATUT_LABEL[c.statut] || { label: c.statut, cls: "bg-muted" };
                  const delai = computeDelai(c);
                  const agentEmail = c.assigned_agent_id
                    ? agentEmails[c.assigned_agent_id] || null
                    : null;
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {c.prenom} {c.nom}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.entreprise}</div>
                        <div className="text-xs text-muted-foreground">{c.ville}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.activite}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {agentEmail ? (
                          <span className="text-xs text-muted-foreground">{agentEmail}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Non assigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {delai ? (
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${delai.cls}`}
                          >
                            {delai.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to="/admin/$id"
                            params={{ id: c.id }}
                            className="text-google-blue font-semibold hover:underline"
                          >
                            Détails →
                          </Link>
                          {/* Suppression manuelle — Admin uniquement */}
                          <button
                            type="button"
                            aria-label={t("admin.delete")}
                            title={t("admin.delete")}
                            disabled={deleteMutation.isPending}
                            onClick={() => setDeleteTarget(c)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-google-red hover:bg-google-red/10 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("admin.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation de suppression (Admin uniquement) */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("admin.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget || deleteMutation.isPending) return;
                deleteMutation.mutate(deleteTarget.id);
              }}
              className="bg-google-red text-white hover:bg-google-red/90 inline-flex items-center gap-2 cursor-pointer"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("admin.delete_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation "Commencer à zéro" (Total / CA total) — Admin uniquement */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.reset_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.reset_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>
              {t("admin.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={resetMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (resetMutation.isPending) return;
                resetMutation.mutate();
              }}
              className="inline-flex items-center gap-2 cursor-pointer"
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {t("admin.reset_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1.5">
          {action}
          {icon}
        </div>
      </div>
      <div className="mt-1.5 text-2xl font-extrabold">{value}</div>
      {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

/** Jours ouvrés restants sur la garantie 7 jours, à partir de paid_at. */
function computeDelai(c: { statut: string; paid_at: string | null; delivered_at: string | null }) {
  if (c.statut === "livrée")
    return { label: "Livrée ✓", cls: "bg-google-green/15 text-google-green" };
  if (c.statut === "annulée" || !c.paid_at) return null;
  const start = new Date(c.paid_at);
  const now = new Date();
  // Compte les jours ouvrés écoulés (lun-ven)
  let used = 0;
  const cursor = new Date(start);
  while (cursor < now) {
    cursor.setDate(cursor.getDate() + 1);
    const d = cursor.getDay();
    if (d !== 0 && d !== 6) used += 1;
  }
  const remaining = 7 - used;
  if (remaining <= 0)
    return { label: `⚠ Retard ${Math.abs(remaining)}j`, cls: "bg-google-red/15 text-google-red" };
  if (remaining <= 2)
    return { label: `⏰ ${remaining}j restants`, cls: "bg-google-yellow/20 text-amber-700" };
  return { label: `${remaining}j restants`, cls: "bg-google-blue/15 text-google-blue" };
}
