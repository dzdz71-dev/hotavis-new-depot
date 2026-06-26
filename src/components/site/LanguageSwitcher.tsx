import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LANGS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
] as const;

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(i18n.language?.slice(0, 2) || "fr");

  useEffect(() => {
    const onChange = (lng: string) => setCurrent(lng.slice(0, 2));
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, [i18n]);

  useEffect(() => {
    const close = () => setOpen(false);
    if (open) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [open]);

  const active = LANGS.find((l) => l.code === current) ?? LANGS[0];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Change language"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 hover:bg-white transition px-3 py-1.5 text-sm font-medium ${
          compact ? "" : ""
        }`}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="uppercase">{active.code}</span>
      </button>
      {open && (
        <ul className="absolute right-0 mt-2 min-w-[160px] rounded-xl border border-border bg-white shadow-elevated overflow-hidden z-50">
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => {
                  i18n.changeLanguage(l.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left ${
                  current === l.code ? "font-semibold bg-accent/50" : ""
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
