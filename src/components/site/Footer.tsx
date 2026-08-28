import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { HotavisLogo } from "./GoogleBrand";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-foreground text-white/90">
      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <HotavisLogo className="text-white" />
            <p className="mt-3 text-sm text-white/70 max-w-md">{t("footer.tagline")}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-white">{t("footer.navigation")}</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="/#services" className="hover:text-white">
                  {t("common.menu_services")}
                </a>
              </li>
              <li>
                <a href="/#processus" className="hover:text-white">
                  {t("common.menu_process")}
                </a>
              </li>
              <li>
                <a href="/#tarifs" className="hover:text-white">
                  {t("common.menu_pricing")}
                </a>
              </li>
              <li>
                <Link to="/commander" className="hover:text-white">
                  {t("common.cta_start")}
                </Link>
              </li>
              <li>
                <Link to="/recrutement" className="hover:text-white">
                  Recrutement Expert SEO
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-white">{t("footer.contact")}</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="/#contact" className="inline-flex items-center gap-1.5 hover:text-white">
                  <Mail className="h-4 w-4" /> {t("common.menu_contact")}
                </a>
              </li>
              <li className="text-white/60">{t("footer.reply_24h")}</li>
              <li className="text-white/60">{t("footer.hours")}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/60">
          <div>
            © {new Date().getFullYear()} Hotavis. {t("footer.rights")}
          </div>
          <div>{t("footer.agency")}</div>
        </div>
      </div>
    </footer>
  );
}
