import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X, Mail, Briefcase } from "lucide-react";
import { HotavisLogo } from "./GoogleBrand";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({
  isExpertPage = false,
  isAgentLoginPage = false,
}: {
  isExpertPage?: boolean;
  isAgentLoginPage?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const NAV = [
    { to: "/", label: t("common.menu_home") },
    { to: "/#services", label: t("common.menu_services") },
    { to: "/#processus", label: t("common.menu_process") },
    { to: "/#tarifs", label: t("common.menu_pricing") },
    { to: "/#temoignages", label: t("common.menu_testimonials") },
    { to: "/#contact", label: t("common.menu_contact") },
  ];

  if (isExpertPage || isAgentLoginPage) {
    return (
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="h-16 flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2">
              <HotavisLogo />
            </Link>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {isExpertPage ? (
                <Link
                  to="/agent/login"
                  className="inline-flex items-center justify-center rounded-full bg-google-green text-white px-5 py-2 text-sm font-semibold shadow-card hover:opacity-90 hover:-translate-y-0.5 hover:shadow-elevated transition"
                >
                  Se connecter
                </Link>
              ) : (
                <Link
                  to="/recrutement"
                  className="inline-flex items-center gap-1.5 justify-center rounded-full bg-google-yellow text-foreground px-5 py-2 text-sm font-semibold shadow-card hover:opacity-90 hover:-translate-y-0.5 hover:shadow-elevated transition"
                >
                  <Briefcase className="h-4 w-4" />
                  Recrutement Expert SEO
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Bandeau contact */}
      <div className="bg-foreground text-white text-xs">
        <div className="container mx-auto px-4 h-9 flex items-center justify-center max-w-7xl">
          <a
            href="/#contact"
            className="inline-flex items-center gap-1.5 hover:opacity-80 transition"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>{t("common.contact_via_form")}</span>
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="h-16 flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2">
              <HotavisLogo />
            </Link>

            <nav className="hidden lg:flex items-center gap-7">
              {NAV.map((item) => (
                <a
                  key={item.to}
                  href={item.to}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <Link
                to="/commander"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-google-blue text-white px-5 py-2.5 text-sm font-semibold shadow-glow hover:shadow-elevated hover:-translate-y-0.5 transition"
              >
                {t("common.cta_start")}
              </Link>
              <button
                aria-label="Menu"
                onClick={() => setOpen(!open)}
                className="lg:hidden p-2 rounded-md hover:bg-accent"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {open && (
            <div className="lg:hidden pb-4 space-y-1">
              {NAV.map((item) => (
                <a
                  key={item.to}
                  href={item.to}
                  onClick={() => setOpen(false)}
                  className="block py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/commander"
                onClick={() => setOpen(false)}
                className="block mt-2 text-center rounded-full bg-google-blue text-white py-3 text-sm font-semibold sm:hidden"
              >
                {t("common.cta_start")}
              </Link>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
