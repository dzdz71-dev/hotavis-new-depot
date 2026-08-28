import { createFileRoute } from "@tanstack/react-router";
import { Clock, AlertTriangle, CheckCircle2, HandHelping, XCircle } from "lucide-react";
import { AgentLayout } from "@/components/agent/AgentLayout";

export const Route = createFileRoute("/agent/rules")({
  head: () => ({
    meta: [{ title: "Règles du jeu — Hotavis" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentRules,
});

function AgentRules() {
  return (
    <AgentLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-extrabold">Règles du jeu</h2>
          <p className="text-sm text-muted-foreground">
            Les engagements qui garantissent la qualité de notre service et la satisfaction client.
          </p>
        </div>

        {/* Engagement 1 */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-google-blue/15 text-google-blue">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg">1. Livrer sous 7 jours ouvrés</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Chaque fiche Google Business Profile doit être créée et mise en ligne dans un délai
            maximum de <strong>7 jours ouvrés</strong> à compter de la prise en charge de la
            mission. Ce délai garantit une expérience client fluide et professionnelle.
          </p>
        </div>

        {/* Engagement 2 */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-google-yellow/20 text-amber-700">
              <HandHelping className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg">2. Ne pas bloquer un dossier plus de 48h</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Un dossier ne doit pas rester <strong>plus de 48h sans avancement</strong>. Si vous ne
            pouvez pas traiter une mission, utilisez le bouton « Abandonner » pour la remettre dans
            le pool et permettre à un autre agent de la prendre.
          </p>
        </div>

        {/* Engagement 3 */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-google-red/15 text-google-red">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg">3. Signaler immédiatement tout blocage</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Si vous rencontrez un problème (client injoignable, documents manquants, refus de
            coopération, etc.), utilisez immédiatement le bouton{" "}
            <strong>« Signaler un blocage »</strong> sur la page du dossier. L'administration sera
            notifiée et pourra intervenir rapidement.
          </p>
        </div>

        {/* Résumé des actions */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <h3 className="font-bold text-lg">Vos actions disponibles</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-google-green shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Marquer comme terminé</div>
                <p className="text-xs text-muted-foreground">
                  Livre la fiche au client et déclenche l'email de notification.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-google-red shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Signaler un blocage</div>
                <p className="text-xs text-muted-foreground">
                  Marque le dossier comme bloqué et notifie l'administration.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Abandonner la mission</div>
                <p className="text-xs text-muted-foreground">
                  Libère le dossier et le remet dans le pool des missions disponibles.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HandHelping className="h-5 w-5 text-google-blue shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Réclamer une mission</div>
                <p className="text-xs text-muted-foreground">
                  Prend en charge un dossier du pool. Un engagement est requis avant validation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
