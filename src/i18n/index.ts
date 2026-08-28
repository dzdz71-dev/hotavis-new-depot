import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

// IMPORTANT: pas de LanguageDetector au boot (sinon hydration mismatch SSR/CSR — React #418).
// On initialise en FR (qui correspond à <html lang="fr">) puis on switch côté client après hydratation.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
    },
    lng: "fr",
    fallbackLng: "fr",
    supportedLngs: ["fr", "en", "es"],
    interpolation: { escapeValue: false },
    returnObjects: true,
    react: { useSuspense: false },
  });
}

// Après hydratation côté client uniquement, on récupère la préférence stockée.
if (typeof window !== "undefined") {
  try {
    const saved = window.localStorage.getItem("hotavis_lang");
    const nav = (navigator.language || "fr").slice(0, 2);
    const target = saved || (["fr", "en", "es"].includes(nav) ? nav : "fr");
    if (target && target !== i18n.language) {
      // Attendre le prochain tick pour ne pas perturber l'hydration React.
      queueMicrotask(() => i18n.changeLanguage(target));
    }
    i18n.on("languageChanged", (lng) => {
      try {
        window.localStorage.setItem("hotavis_lang", lng);
      } catch {
        /* localStorage indisponible (mode privé) */
      }
    });
  } catch {
    /* i18n init échoué — fallback FR par défaut */
  }
}

export default i18n;
