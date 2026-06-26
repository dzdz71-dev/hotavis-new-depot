import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Mail, Phone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { listCandidatures, updateCandidatureStatut } from "@/lib/candidature.functions";

export const Route = createFileRoute("/admin/candidatures")({
  head: () => ({ meta: [{ title: "Candidatures — Admin Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: AdminCandidatures,
});

const STATUT: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  nouveau: { label: "Nouveau", cls: "bg-google-blue/15 text-google-blue", icon: <Clock className="h-3.5 w-3.5" /> },
  "accepté": { label: "Accepté", cls: "bg-google-green/15 text-google-green", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  "rejeté": { label: "Rejeté", cls: "bg-google-red/15 text-google-red", icon: <XCircle className="h-3.5 w-3.5" /> },
};

function AdminCandidatures() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const fetchList = useServerFn(listCandidatures);
  const updateFn = useServerFn(updateCandidatureStatut);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin/login" });
      else setReady(true);
    });
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-candidatures"],
    queryFn: () => fetchList(),
    enabled: ready,
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; statut: "nouveau"|"accepté"|"rejeté" }) => updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-candidatures"] }),
  });

  if (!ready || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;
  }

  const candidatures = data?.candidatures || [];
  const correct = data?.correct_q1 || "B";

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Candidatures Experts</h1>
          <span className="text-sm text-muted-foreground">{candidatures.length} candidature(s)</span>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {candidatures.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
            Aucune candidature pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {candidatures.map((c) => {
              const s = STATUT[c.statut] || STATUT.nouveau;
              const q1ok = c.qcm_q1 === correct;
              return (
                <div key={c.id} className="bg-card border border-border rounded-xl p-5 shadow-card">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{c.prenom} {c.nom}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
                          {s.icon} {s.label}
                        </span>
                        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${q1ok ? "bg-google-green/15 text-google-green" : "bg-google-red/15 text-google-red"}`}>
                          QCM : {c.qcm_score}/1 {q1ok ? "✓" : "✗"}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="h-3.5 w-3.5" />{c.email}</a>
                        <a href={`tel:${c.telephone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3.5 w-3.5" />{c.telephone}</a>
                        {c.siret && <span>SIRET : {c.siret}</span>}
                        {c.fiche_url && <a href={c.fiche_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-google-blue hover:underline"><ExternalLink className="h-3.5 w-3.5" />Fiche exemple</a>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Reçu le {new Date(c.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => mut.mutate({ id: c.id, statut: "accepté" })} disabled={mut.isPending} className="rounded-full bg-google-green text-white text-sm font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-50">Accepter</button>
                      <button onClick={() => mut.mutate({ id: c.id, statut: "rejeté" })} disabled={mut.isPending} className="rounded-full bg-google-red text-white text-sm font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-50">Rejeter</button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-lg bg-accent/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Q1 — QCM (réponse correcte : {correct})</div>
                      <div className="mt-1 text-sm">Réponse du candidat : <b>{c.qcm_q1}</b> {q1ok ? <span className="text-google-green">✓ correct</span> : <span className="text-google-red">✗ incorrect</span>}</div>
                    </div>
                    <div className="rounded-lg bg-accent/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Q2 — Fiche suspendue pour activité suspecte</div>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{c.q2_reponse}</p>
                    </div>
                    <div className="rounded-lg bg-accent/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Q3 — Artisan sans local physique</div>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{c.q3_reponse}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
