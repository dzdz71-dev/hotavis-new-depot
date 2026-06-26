import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Sparkles, Rocket, Eye, Mail } from "lucide-react";
import { confirmStripeSession } from "@/lib/commande.functions";

export const Route = createFileRoute("/onboarding-success/$commandeId")({
  head: () => ({ meta: [{ title: "Dossier reçu — Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  const { commandeId } = Route.useParams();
  const confirm = useServerFn(confirmStripeSession);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = new URLSearchParams(window.location.search).get("session_id");
    if (!sid) return;
    confirm({ data: { commande_id: commandeId, session_id: sid } }).catch(() => {});
  }, [commandeId, confirm]);

  return (
    <div className="min-h-screen bg-surface-alt flex items-start justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
          <div className="bg-gradient-to-br from-google-green/15 via-google-blue/10 to-google-yellow/10 p-8 sm:p-10 text-center">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-google-green/15 mb-4">
              <CheckCircle2 className="h-12 w-12 text-google-green" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Félicitations, votre dossier est entre nos mains ! 🎉
            </h1>
            <p className="mt-3 text-muted-foreground">
              Un expert Hotavis va prendre en charge votre fiche Google et la livrer sous 7 jours ouvrés.
            </p>
          </div>

          <div className="p-8 sm:p-10">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-google-blue" />
              Les 3 prochaines étapes
            </h2>

            <ol className="space-y-5">
              <TimelineStep
                num={1}
                title="Prise en charge par un expert"
                desc="Un de nos agents certifiés Google Business Profile récupère votre dossier dans les prochaines heures."
                icon={<Eye className="h-5 w-5" />}
                color="text-google-blue bg-google-blue/15"
                active
              />
              <TimelineStep
                num={2}
                title="Optimisation de votre fiche"
                desc="Création/optimisation complète : catégories, description, photos, horaires, services, attributs."
                icon={<Sparkles className="h-5 w-5" />}
                color="text-google-yellow bg-google-yellow/20"
              />
              <TimelineStep
                num={3}
                title="Mise en ligne & confirmation"
                desc="Vous recevez un email dès que votre fiche est validée par Google et apparaît dans les résultats."
                icon={<Rocket className="h-5 w-5" />}
                color="text-google-green bg-google-green/15"
              />
            </ol>

            <div className="mt-8 p-4 rounded-xl bg-google-blue/5 border border-google-blue/15 flex gap-3">
              <Mail className="h-5 w-5 text-google-blue shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold">Un email de confirmation vous a été envoyé</div>
                <div className="text-muted-foreground">Avec le récap de votre briefing. Pensez à vérifier vos spams si vous ne le recevez pas.</div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="rounded-full bg-google-blue text-white font-semibold px-6 py-3 text-center hover:opacity-90 transition">
                Retour à l'accueil
              </Link>
              <a href={`mailto:contact@hotavis.fr?subject=Suivi%20dossier%20${commandeId.slice(0,8)}`} className="rounded-full border border-border font-semibold px-6 py-3 text-center hover:bg-accent transition">
                Une question ?
              </a>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">Dossier n° {commandeId.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>
  );
}

function TimelineStep({ num, title, desc, icon, color, active }: { num: number; title: string; desc: string; icon: React.ReactNode; color: string; active?: boolean }) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${color} ${active ? "ring-4 ring-google-blue/20" : ""}`}>
          {icon}
        </div>
        {num < 3 && <div className="flex-1 w-px bg-border mt-2" />}
      </div>
      <div className="pb-4">
        <div className="font-bold flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Étape {num}</span>
          {active && <span className="text-[10px] uppercase tracking-wider bg-google-blue text-white px-2 py-0.5 rounded-full font-bold">En cours</span>}
        </div>
        <div className="font-semibold mt-0.5">{title}</div>
        <div className="text-sm text-muted-foreground mt-1">{desc}</div>
      </div>
    </li>
  );
}
