import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAgencySettings, updateAgencySettings } from "@/lib/admin-agency.functions";
import { AdminNav } from "@/components/admin/AdminNav";

export const Route = createFileRoute("/admin/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const fetchSettings = useServerFn(getAgencySettings);
  const update = useServerFn(updateAgencySettings);

  const [euros, setEuros] = useState("50");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin/login" });
      else setReady(true);
    });
  }, [navigate]);

  const { data } = useQuery({ queryKey: ["agency-settings"], queryFn: () => fetchSettings(), enabled: ready });

  useEffect(() => {
    if (data?.settings) setEuros((data.settings.commission_centimes_per_fiche / 100).toString());
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(euros) * 100);
    if (isNaN(cents) || cents < 0) return toast.error("Montant invalide");
    setSaving(true);
    try {
      await update({ data: { commission_centimes_per_fiche: cents } });
      toast.success("Paramètres enregistrés");
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
    } catch (e: any) { toast.error(e?.message || "Erreur"); }
    finally { setSaving(false); }
  }

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-google-blue" /></div>;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4"><h1 className="text-xl font-extrabold">Admin Hotavis</h1></div>
      </header>
      <AdminNav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Paramètres de l'agence</h2>
        <form onSubmit={save} className="bg-card border border-border rounded-2xl shadow-card p-6 space-y-5">
          <div>
            <label className="font-semibold">Commission par fiche livrée (€)</label>
            <p className="text-sm text-muted-foreground mb-2">Montant versé à l'agent pour chaque fiche qu'il marque comme terminée. Modifiable à tout moment — les commissions déjà attribuées ne bougent pas.</p>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" min="0" max="1000" required value={euros} onChange={(e) => setEuros(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 w-32 text-right font-semibold" />
              <span className="font-semibold">€ / fiche</span>
            </div>
          </div>
          <button disabled={saving} className="rounded-full bg-google-blue text-white font-semibold px-5 py-2 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
