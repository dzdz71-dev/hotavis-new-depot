import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import { CheckCircle2, Mail, Home } from "lucide-react";

export const Route = createFileRoute("/merci")({
  head: () => ({ meta: [{ title: "Merci ! — Hotavis" }, { name: "robots", content: "noindex" }] }),
  component: MerciPage,
});

function MerciPage() {
  const { t } = useTranslation();
  useEffect(() => {
    const end = Date.now() + 1500;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#4285F4", "#34A853", "#FBBC05", "#EA4335"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#4285F4", "#34A853", "#FBBC05", "#EA4335"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-google-green/15 text-google-green">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="mt-6 text-3xl md:text-4xl font-extrabold">{t("merci.title")}</h1>
        <p className="mt-4 text-muted-foreground text-lg">{t("merci.body")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full gradient-cta text-white px-6 py-3 font-semibold shadow-glow"
          >
            <Home className="h-4 w-4" /> {t("merci.back")}
          </Link>
        </div>
        <p className="mt-8 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <Mail className="h-4 w-4" /> {t("merci.question")}
        </p>
      </div>
    </div>
  );
}
