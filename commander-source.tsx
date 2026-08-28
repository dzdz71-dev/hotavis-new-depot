import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/commander.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=92e22543"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import { createFileRoute, useNavigate } from "/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/node_modules/@tanstack/react-router/dist/esm/index.dev.js?v=92e22543";
import { useServerFn } from "/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/node_modules/@tanstack/react-start/dist/esm/index.js?v=92e22543";
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=92e22543"; const useState = __vite__cjsImport3_react["useState"];
import { useTranslation } from "/node_modules/.vite/deps/react-i18next.js?v=92e22543";
import { toast } from "/node_modules/.vite/deps/sonner.js?v=92e22543";
import { Check, Loader2, ShieldCheck, Sparkles } from "/node_modules/.vite/deps/lucide-react.js?v=92e22543";
import { createCommande } from "/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/lib/commande.functions.ts";
import { Section } from "/@fs/C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/components/site/Section.tsx";
export const Route = createFileRoute("/commander")({
  head: () => ({ meta: [{ title: "Commander mon pack Hotavis — 379€" }] }),
  component: CommanderPage
});
function CommanderPage() {
  _s();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useServerFn(createCommande);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    entreprise: "",
    ville: "",
    activite: ""
  });
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await create({ data: form });
      if (result && typeof result === "object" && "error" in result && result.error === "RATE_LIMITED") {
        const retryAfter = result.retryAfterSec;
        toast.error(`Trop de requêtes. Réessayez dans ${retryAfter}s.`);
        setLoading(false);
        return;
      }
      const { commande_id } = result;
      navigate({ to: "/onboarding/$commandeId", params: { commandeId: commande_id } });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Une erreur est survenue");
      setLoading(false);
    }
  };
  const features = [
    t("commander.feature_1"),
    t("commander.feature_2"),
    t("commander.feature_3"),
    t("commander.feature_4"),
    t("commander.feature_5"),
    t("commander.feature_6")
  ];
  return /* @__PURE__ */ jsxDEV(Section, { className: "!py-12 md:!py-16", children: /* @__PURE__ */ jsxDEV("div", { className: "grid lg:grid-cols-[1.2fr_1fr] gap-10 max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl md:text-4xl font-extrabold tracking-tight", children: [
        t("commander.title"),
        " ",
        /* @__PURE__ */ jsxDEV("span", { className: "text-google-blue", children: "Hotavis" }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 73,
          columnNumber: 36
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 72,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "mt-3 text-muted-foreground", children: t("commander.subtitle") }, void 0, false, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 75,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("form", { onSubmit: submit, className: "mt-8 space-y-5", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "grid sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxDEV(
            Field,
            {
              label: t("commander.first_name"),
              value: form.prenom,
              onChange: update("prenom"),
              required: true
            },
            void 0,
            false,
            {
              fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
              lineNumber: 79,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            Field,
            {
              label: t("commander.last_name"),
              value: form.nom,
              onChange: update("nom"),
              required: true
            },
            void 0,
            false,
            {
              fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
              lineNumber: 85,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 78,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxDEV(
            Field,
            {
              label: t("commander.email"),
              type: "email",
              value: form.email,
              onChange: update("email"),
              required: true
            },
            void 0,
            false,
            {
              fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
              lineNumber: 93,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            Field,
            {
              label: t("commander.phone"),
              type: "tel",
              value: form.telephone,
              onChange: update("telephone"),
              required: true
            },
            void 0,
            false,
            {
              fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
              lineNumber: 100,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 92,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          Field,
          {
            label: t("commander.company"),
            value: form.entreprise,
            onChange: update("entreprise"),
            required: true
          },
          void 0,
          false,
          {
            fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
            lineNumber: 108,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "grid sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxDEV(
            Field,
            {
              label: t("commander.city"),
              value: form.ville,
              onChange: update("ville"),
              required: true
            },
            void 0,
            false,
            {
              fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
              lineNumber: 115,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            Field,
            {
              label: t("commander.activity"),
              value: form.activite,
              onChange: update("activite"),
              placeholder: t("commander.activity_placeholder"),
              required: true
            },
            void 0,
            false,
            {
              fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
              lineNumber: 121,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 114,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "submit",
            disabled: loading,
            className: "w-full rounded-full gradient-cta text-white px-6 py-4 font-bold text-lg shadow-glow disabled:opacity-60 flex items-center justify-center gap-2",
            children: loading ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV(Loader2, { className: "h-5 w-5 animate-spin" }, void 0, false, {
                fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
                lineNumber: 137,
                columnNumber: 19
              }, this),
              " Création de votre dossier…"
            ] }, void 0, true, {
              fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
              lineNumber: 136,
              columnNumber: 15
            }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: "Continuer vers le briefing →" }, void 0, false, {
              fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
              lineNumber: 140,
              columnNumber: 15
            }, this)
          },
          void 0,
          false,
          {
            fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
            lineNumber: 130,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-center text-muted-foreground", children: "Étape 1/3 · Aucun paiement à cette étape. Vous remplirez d'abord le briefing (10 min), puis vous finaliserez le paiement sécurisé." }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 144,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5", children: [
          /* @__PURE__ */ jsxDEV(ShieldCheck, { className: "h-4 w-4 text-google-green" }, void 0, false, {
            fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
            lineNumber: 150,
            columnNumber: 15
          }, this),
          t("commander.secure_line")
        ] }, void 0, true, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 149,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 77,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
      lineNumber: 71,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("aside", { className: "lg:sticky lg:top-24 h-fit", children: /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border border-border bg-card p-6 shadow-elevated", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-google-yellow", children: [
        /* @__PURE__ */ jsxDEV(Sparkles, { className: "h-5 w-5" }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 159,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-semibold uppercase tracking-wider", children: t("commander.recap") }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 160,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 158,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "mt-3 text-xl font-bold", children: t("commander.pack") }, void 0, false, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 164,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mt-1 flex items-baseline gap-2", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-4xl font-extrabold", children: "379€" }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 166,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-muted-foreground", children: t("commander.price_meta") }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 167,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 165,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("ul", { className: "mt-5 space-y-2.5 text-sm", children: features.map(
        (txt) => /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
          /* @__PURE__ */ jsxDEV(Check, { className: "h-4 w-4 text-google-green mt-0.5 flex-shrink-0" }, void 0, false, {
            fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
            lineNumber: 173,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: txt }, void 0, false, {
            fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
            lineNumber: 174,
            columnNumber: 19
          }, this)
        ] }, txt, true, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 172,
          columnNumber: 15
        }, this)
      ) }, void 0, false, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 170,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mt-6 rounded-xl border-2 border-google-green/30 bg-google-green/5 p-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-xs font-bold uppercase tracking-wider text-google-green", children: t("guarantee.tag") }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 180,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "mt-1 font-bold", children: t("guarantee.title") }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 183,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "mt-1.5 text-xs text-muted-foreground leading-relaxed", children: t("guarantee.body") }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 184,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 179,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs leading-relaxed text-amber-900", children: [
        /* @__PURE__ */ jsxDEV("b", { children: "Délais de livraison :" }, void 0, false, {
          fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
          lineNumber: 190,
          columnNumber: 15
        }, this),
        " sous 7 jours ouvrés. Attention : dans certains cas, Google exige une vérification par courrier postal pour valider l'établissement, ce qui peut rallonger le délai d'environ 14 jours."
      ] }, void 0, true, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 189,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
      lineNumber: 157,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
      lineNumber: 156,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
    lineNumber: 70,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
    lineNumber: 69,
    columnNumber: 5
  }, this);
}
_s(CommanderPage, "s1YykX5VFaU8torq3t+ohR0F3MA=", false, function() {
  return [useTranslation, useNavigate, useServerFn];
});
_c = CommanderPage;
function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder
}) {
  return /* @__PURE__ */ jsxDEV("label", { className: "block", children: [
    /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-semibold text-foreground", children: [
      label,
      required && /* @__PURE__ */ jsxDEV("span", { className: "text-google-red", children: " *" }, void 0, false, {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 220,
        columnNumber: 22
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
      lineNumber: 218,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "input",
      {
        type,
        value,
        onChange,
        required,
        placeholder,
        className: "mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-google-blue focus:border-google-blue transition"
      },
      void 0,
      false,
      {
        fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
        lineNumber: 222,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx",
    lineNumber: 217,
    columnNumber: 5
  }, this);
}
_c2 = Field;
var _c, _c2;
$RefreshReg$(_c, "CommanderPage");
$RefreshReg$(_c2, "Field");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "C:/Users/daoud/Documents/hotavis--vercel/hotavis-boost/src/routes/commander.tsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QW9CO0FBQUFBLEVBQ0FDLE9BQU87QUFBQSxFQUNQQztBQUFBQSxFQUNBQztBQVFGLEdBQUc7QUFDRCxTQUNFLHVCQUFDLFdBQU0sV0FBVSxTQUNmO0FBQUEsMkJBQUMsVUFBSyxXQUFVLHlDQUNiSjtBQUFBQTtBQUFBQSxNQUNBRyxZQUFZLHVCQUFDLFVBQUssV0FBVSxtQkFBa0Isa0JBQWxDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBb0M7QUFBQSxTQUZuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBR0E7QUFBQSxJQUNBO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQztBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBLFdBQVU7QUFBQTtBQUFBLE1BTlo7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBTXVMO0FBQUEsT0FYekw7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWFBO0FBRUo7QUFBQ0UsTUEvQlFOO0FBQUssSUFBQU8sSUFBQUQ7QUFBQSxhQUFBQyxJQUFBO0FBQUEsYUFBQUQsS0FBQSIsIm5hbWVzIjpbImNyZWF0ZUZpbGVSb3V0ZSIsInVzZU5hdmlnYXRlIiwidXNlU2VydmVyRm4iLCJ1c2VTdGF0ZSIsInVzZVRyYW5zbGF0aW9uIiwidG9hc3QiLCJDaGVjayIsIkxvYWRlcjIiLCJTaGllbGRDaGVjayIsIlNwYXJrbGVzIiwiY3JlYXRlQ29tbWFuZGUiLCJTZWN0aW9uIiwiUm91dGUiLCJoZWFkIiwibWV0YSIsInRpdGxlIiwiY29tcG9uZW50IiwiQ29tbWFuZGVyUGFnZSIsIl9zIiwidCIsIm5hdmlnYXRlIiwiY3JlYXRlIiwibG9hZGluZyIsInNldExvYWRpbmciLCJmb3JtIiwic2V0Rm9ybSIsInByZW5vbSIsIm5vbSIsImVtYWlsIiwidGVsZXBob25lIiwiZW50cmVwcmlzZSIsInZpbGxlIiwiYWN0aXZpdGUiLCJ1cGRhdGUiLCJrIiwiZSIsImYiLCJ0YXJnZXQiLCJ2YWx1ZSIsInN1Ym1pdCIsInByZXZlbnREZWZhdWx0IiwicmVzdWx0IiwiZGF0YSIsImVycm9yIiwicmV0cnlBZnRlciIsInJldHJ5QWZ0ZXJTZWMiLCJjb21tYW5kZV9pZCIsInRvIiwicGFyYW1zIiwiY29tbWFuZGVJZCIsImVyciIsImNvbnNvbGUiLCJtZXNzYWdlIiwiZmVhdHVyZXMiLCJtYXAiLCJ0eHQiLCJGaWVsZCIsImxhYmVsIiwib25DaGFuZ2UiLCJ0eXBlIiwicmVxdWlyZWQiLCJwbGFjZWhvbGRlciIsIl9jMiIsIl9jIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImNvbW1hbmRlci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlRmlsZVJvdXRlLCB1c2VOYXZpZ2F0ZSB9IGZyb20gXCJAdGFuc3RhY2svcmVhY3Qtcm91dGVyXCI7XG5pbXBvcnQgeyB1c2VTZXJ2ZXJGbiB9IGZyb20gXCJAdGFuc3RhY2svcmVhY3Qtc3RhcnRcIjtcbmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyB1c2VUcmFuc2xhdGlvbiB9IGZyb20gXCJyZWFjdC1pMThuZXh0XCI7XG5pbXBvcnQgeyB0b2FzdCB9IGZyb20gXCJzb25uZXJcIjtcbmltcG9ydCB7IENoZWNrLCBMb2FkZXIyLCBTaGllbGRDaGVjaywgU3BhcmtsZXMgfSBmcm9tIFwibHVjaWRlLXJlYWN0XCI7XG5pbXBvcnQgeyBjcmVhdGVDb21tYW5kZSB9IGZyb20gXCJAL2xpYi9jb21tYW5kZS5mdW5jdGlvbnNcIjtcbmltcG9ydCB7IFNlY3Rpb24gfSBmcm9tIFwiQC9jb21wb25lbnRzL3NpdGUvU2VjdGlvblwiO1xuXG5leHBvcnQgY29uc3QgUm91dGUgPSBjcmVhdGVGaWxlUm91dGUoXCIvY29tbWFuZGVyXCIpKHtcbiAgaGVhZDogKCkgPT4gKHsgbWV0YTogW3sgdGl0bGU6IFwiQ29tbWFuZGVyIG1vbiBwYWNrIEhvdGF2aXMg4oCUIDM3OeKCrFwiIH1dIH0pLFxuICBjb21wb25lbnQ6IENvbW1hbmRlclBhZ2UsXG59KTtcblxuZnVuY3Rpb24gQ29tbWFuZGVyUGFnZSgpIHtcbiAgY29uc3QgeyB0IH0gPSB1c2VUcmFuc2xhdGlvbigpO1xuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZU5hdmlnYXRlKCk7XG4gIGNvbnN0IGNyZWF0ZSA9IHVzZVNlcnZlckZuKGNyZWF0ZUNvbW1hbmRlKTtcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbZm9ybSwgc2V0Rm9ybV0gPSB1c2VTdGF0ZSh7XG4gICAgcHJlbm9tOiBcIlwiLFxuICAgIG5vbTogXCJcIixcbiAgICBlbWFpbDogXCJcIixcbiAgICB0ZWxlcGhvbmU6IFwiXCIsXG4gICAgZW50cmVwcmlzZTogXCJcIixcbiAgICB2aWxsZTogXCJcIixcbiAgICBhY3Rpdml0ZTogXCJcIixcbiAgfSk7XG5cbiAgY29uc3QgdXBkYXRlID0gKGs6IGtleW9mIHR5cGVvZiBmb3JtKSA9PiAoZTogUmVhY3QuQ2hhbmdlRXZlbnQ8SFRNTElucHV0RWxlbWVudD4pID0+XG4gICAgc2V0Rm9ybSgoZikgPT4gKHsgLi4uZiwgW2tdOiBlLnRhcmdldC52YWx1ZSB9KSk7XG5cbiAgY29uc3Qgc3VibWl0ID0gYXN5bmMgKGU6IFJlYWN0LkZvcm1FdmVudCkgPT4ge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBzZXRMb2FkaW5nKHRydWUpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGUoeyBkYXRhOiBmb3JtIH0pO1xuICAgICAgLy8gSGFuZGxlIHJhdGUgbGltaXQgZXJyb3IgcmVzcG9uc2VcbiAgICAgIGlmIChcbiAgICAgICAgcmVzdWx0ICYmXG4gICAgICAgIHR5cGVvZiByZXN1bHQgPT09IFwib2JqZWN0XCIgJiZcbiAgICAgICAgXCJlcnJvclwiIGluIHJlc3VsdCAmJlxuICAgICAgICByZXN1bHQuZXJyb3IgPT09IFwiUkFURV9MSU1JVEVEXCJcbiAgICAgICkge1xuICAgICAgICBjb25zdCByZXRyeUFmdGVyID0gKHJlc3VsdCBhcyB7IHJldHJ5QWZ0ZXJTZWM6IG51bWJlciB9KS5yZXRyeUFmdGVyU2VjO1xuICAgICAgICB0b2FzdC5lcnJvcihgVHJvcCBkZSByZXF1w6p0ZXMuIFLDqWVzc2F5ZXogZGFucyAke3JldHJ5QWZ0ZXJ9cy5gKTtcbiAgICAgICAgc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHsgY29tbWFuZGVfaWQgfSA9IHJlc3VsdCBhcyB7IGNvbW1hbmRlX2lkOiBzdHJpbmcgfTtcbiAgICAgIG5hdmlnYXRlKHsgdG86IFwiL29uYm9hcmRpbmcvJGNvbW1hbmRlSWRcIiwgcGFyYW1zOiB7IGNvbW1hbmRlSWQ6IGNvbW1hbmRlX2lkIH0gfSk7XG4gICAgfSBjYXRjaCAoZXJyOiB1bmtub3duKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICB0b2FzdC5lcnJvcigoZXJyIGFzIEVycm9yKT8ubWVzc2FnZSB8fCBcIlVuZSBlcnJldXIgZXN0IHN1cnZlbnVlXCIpO1xuICAgICAgc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGZlYXR1cmVzID0gW1xuICAgIHQoXCJjb21tYW5kZXIuZmVhdHVyZV8xXCIpLFxuICAgIHQoXCJjb21tYW5kZXIuZmVhdHVyZV8yXCIpLFxuICAgIHQoXCJjb21tYW5kZXIuZmVhdHVyZV8zXCIpLFxuICAgIHQoXCJjb21tYW5kZXIuZmVhdHVyZV80XCIpLFxuICAgIHQoXCJjb21tYW5kZXIuZmVhdHVyZV81XCIpLFxuICAgIHQoXCJjb21tYW5kZXIuZmVhdHVyZV82XCIpLFxuICBdO1xuXG4gIHJldHVybiAoXG4gICAgPFNlY3Rpb24gY2xhc3NOYW1lPVwiIXB5LTEyIG1kOiFweS0xNlwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGxnOmdyaWQtY29scy1bMS4yZnJfMWZyXSBnYXAtMTAgbWF4LXctNnhsIG14LWF1dG9cIj5cbiAgICAgICAgPGRpdj5cbiAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0zeGwgbWQ6dGV4dC00eGwgZm9udC1leHRyYWJvbGQgdHJhY2tpbmctdGlnaHRcIj5cbiAgICAgICAgICAgIHt0KFwiY29tbWFuZGVyLnRpdGxlXCIpfSA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWdvb2dsZS1ibHVlXCI+SG90YXZpczwvc3Bhbj5cbiAgICAgICAgICA8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1tdXRlZC1mb3JlZ3JvdW5kXCI+e3QoXCJjb21tYW5kZXIuc3VidGl0bGVcIil9PC9wPlxuXG4gICAgICAgICAgPGZvcm0gb25TdWJtaXQ9e3N1Ym1pdH0gY2xhc3NOYW1lPVwibXQtOCBzcGFjZS15LTVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBzbTpncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgICAgICA8RmllbGRcbiAgICAgICAgICAgICAgICBsYWJlbD17dChcImNvbW1hbmRlci5maXJzdF9uYW1lXCIpfVxuICAgICAgICAgICAgICAgIHZhbHVlPXtmb3JtLnByZW5vbX1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17dXBkYXRlKFwicHJlbm9tXCIpfVxuICAgICAgICAgICAgICAgIHJlcXVpcmVkXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIDxGaWVsZFxuICAgICAgICAgICAgICAgIGxhYmVsPXt0KFwiY29tbWFuZGVyLmxhc3RfbmFtZVwiKX1cbiAgICAgICAgICAgICAgICB2YWx1ZT17Zm9ybS5ub219XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9e3VwZGF0ZShcIm5vbVwiKX1cbiAgICAgICAgICAgICAgICByZXF1aXJlZFxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgc206Z3JpZC1jb2xzLTIgZ2FwLTRcIj5cbiAgICAgICAgICAgICAgPEZpZWxkXG4gICAgICAgICAgICAgICAgbGFiZWw9e3QoXCJjb21tYW5kZXIuZW1haWxcIil9XG4gICAgICAgICAgICAgICAgdHlwZT1cImVtYWlsXCJcbiAgICAgICAgICAgICAgICB2YWx1ZT17Zm9ybS5lbWFpbH1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17dXBkYXRlKFwiZW1haWxcIil9XG4gICAgICAgICAgICAgICAgcmVxdWlyZWRcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPEZpZWxkXG4gICAgICAgICAgICAgICAgbGFiZWw9e3QoXCJjb21tYW5kZXIucGhvbmVcIil9XG4gICAgICAgICAgICAgICAgdHlwZT1cInRlbFwiXG4gICAgICAgICAgICAgICAgdmFsdWU9e2Zvcm0udGVsZXBob25lfVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXt1cGRhdGUoXCJ0ZWxlcGhvbmVcIil9XG4gICAgICAgICAgICAgICAgcmVxdWlyZWRcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPEZpZWxkXG4gICAgICAgICAgICAgIGxhYmVsPXt0KFwiY29tbWFuZGVyLmNvbXBhbnlcIil9XG4gICAgICAgICAgICAgIHZhbHVlPXtmb3JtLmVudHJlcHJpc2V9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXt1cGRhdGUoXCJlbnRyZXByaXNlXCIpfVxuICAgICAgICAgICAgICByZXF1aXJlZFxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBzbTpncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgICAgICA8RmllbGRcbiAgICAgICAgICAgICAgICBsYWJlbD17dChcImNvbW1hbmRlci5jaXR5XCIpfVxuICAgICAgICAgICAgICAgIHZhbHVlPXtmb3JtLnZpbGxlfVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXt1cGRhdGUoXCJ2aWxsZVwiKX1cbiAgICAgICAgICAgICAgICByZXF1aXJlZFxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8RmllbGRcbiAgICAgICAgICAgICAgICBsYWJlbD17dChcImNvbW1hbmRlci5hY3Rpdml0eVwiKX1cbiAgICAgICAgICAgICAgICB2YWx1ZT17Zm9ybS5hY3Rpdml0ZX1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17dXBkYXRlKFwiYWN0aXZpdGVcIil9XG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9e3QoXCJjb21tYW5kZXIuYWN0aXZpdHlfcGxhY2Vob2xkZXJcIil9XG4gICAgICAgICAgICAgICAgcmVxdWlyZWRcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJzdWJtaXRcIlxuICAgICAgICAgICAgICBkaXNhYmxlZD17bG9hZGluZ31cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIHJvdW5kZWQtZnVsbCBncmFkaWVudC1jdGEgdGV4dC13aGl0ZSBweC02IHB5LTQgZm9udC1ib2xkIHRleHQtbGcgc2hhZG93LWdsb3cgZGlzYWJsZWQ6b3BhY2l0eS02MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMlwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHtsb2FkaW5nID8gKFxuICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICA8TG9hZGVyMiBjbGFzc05hbWU9XCJoLTUgdy01IGFuaW1hdGUtc3BpblwiIC8+IENyw6lhdGlvbiBkZSB2b3RyZSBkb3NzaWVy4oCmXG4gICAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgPD5Db250aW51ZXIgdmVycyBsZSBicmllZmluZyDihpI8Lz5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtY2VudGVyIHRleHQtbXV0ZWQtZm9yZWdyb3VuZFwiPlxuICAgICAgICAgICAgICDDiXRhcGUgMS8zIMK3IEF1Y3VuIHBhaWVtZW50IMOgIGNldHRlIMOpdGFwZS4gVm91cyByZW1wbGlyZXogZCdhYm9yZCBsZSBicmllZmluZyAoMTAgbWluKSxcbiAgICAgICAgICAgICAgcHVpcyB2b3VzIGZpbmFsaXNlcmV6IGxlIHBhaWVtZW50IHPDqWN1cmlzw6kuXG4gICAgICAgICAgICA8L3A+XG5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1jZW50ZXIgdGV4dC1tdXRlZC1mb3JlZ3JvdW5kIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xLjVcIj5cbiAgICAgICAgICAgICAgPFNoaWVsZENoZWNrIGNsYXNzTmFtZT1cImgtNCB3LTQgdGV4dC1nb29nbGUtZ3JlZW5cIiAvPlxuICAgICAgICAgICAgICB7dChcImNvbW1hbmRlci5zZWN1cmVfbGluZVwiKX1cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxhc2lkZSBjbGFzc05hbWU9XCJsZzpzdGlja3kgbGc6dG9wLTI0IGgtZml0XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLWJvcmRlciBiZy1jYXJkIHAtNiBzaGFkb3ctZWxldmF0ZWRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC1nb29nbGUteWVsbG93XCI+XG4gICAgICAgICAgICAgIDxTcGFya2xlcyBjbGFzc05hbWU9XCJoLTUgdy01XCIgLz5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LXNlbWlib2xkIHVwcGVyY2FzZSB0cmFja2luZy13aWRlclwiPlxuICAgICAgICAgICAgICAgIHt0KFwiY29tbWFuZGVyLnJlY2FwXCIpfVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJtdC0zIHRleHQteGwgZm9udC1ib2xkXCI+e3QoXCJjb21tYW5kZXIucGFja1wiKX08L2gzPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xIGZsZXggaXRlbXMtYmFzZWxpbmUgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC00eGwgZm9udC1leHRyYWJvbGRcIj4zNznigqw8L3NwYW4+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtbXV0ZWQtZm9yZWdyb3VuZFwiPnt0KFwiY29tbWFuZGVyLnByaWNlX21ldGFcIil9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJtdC01IHNwYWNlLXktMi41IHRleHQtc21cIj5cbiAgICAgICAgICAgICAge2ZlYXR1cmVzLm1hcCgodHh0KSA9PiAoXG4gICAgICAgICAgICAgICAgPGxpIGtleT17dHh0fSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICA8Q2hlY2sgY2xhc3NOYW1lPVwiaC00IHctNCB0ZXh0LWdvb2dsZS1ncmVlbiBtdC0wLjUgZmxleC1zaHJpbmstMFwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj57dHh0fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvdWw+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiByb3VuZGVkLXhsIGJvcmRlci0yIGJvcmRlci1nb29nbGUtZ3JlZW4vMzAgYmctZ29vZ2xlLWdyZWVuLzUgcC00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIHRleHQtZ29vZ2xlLWdyZWVuXCI+XG4gICAgICAgICAgICAgICAge3QoXCJndWFyYW50ZWUudGFnXCIpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xIGZvbnQtYm9sZFwiPnt0KFwiZ3VhcmFudGVlLnRpdGxlXCIpfTwvZGl2PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xLjUgdGV4dC14cyB0ZXh0LW11dGVkLWZvcmVncm91bmQgbGVhZGluZy1yZWxheGVkXCI+XG4gICAgICAgICAgICAgICAge3QoXCJndWFyYW50ZWUuYm9keVwiKX1cbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNCByb3VuZGVkLXhsIGJnLWFtYmVyLTUwIGJvcmRlciBib3JkZXItYW1iZXItMjAwIHAtMyB0ZXh0LXhzIGxlYWRpbmctcmVsYXhlZCB0ZXh0LWFtYmVyLTkwMFwiPlxuICAgICAgICAgICAgICA8Yj5Ew6lsYWlzIGRlIGxpdnJhaXNvbiA6PC9iPiBzb3VzIDcgam91cnMgb3V2csOpcy4gQXR0ZW50aW9uIDogZGFucyBjZXJ0YWlucyBjYXMsXG4gICAgICAgICAgICAgIEdvb2dsZSBleGlnZSB1bmUgdsOpcmlmaWNhdGlvbiBwYXIgY291cnJpZXIgcG9zdGFsIHBvdXIgdmFsaWRlciBsJ8OpdGFibGlzc2VtZW50LCBjZSBxdWlcbiAgICAgICAgICAgICAgcGV1dCByYWxsb25nZXIgbGUgZMOpbGFpIGQnZW52aXJvbiAxNCBqb3Vycy5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2FzaWRlPlxuICAgICAgPC9kaXY+XG4gICAgPC9TZWN0aW9uPlxuICApO1xufVxuXG5mdW5jdGlvbiBGaWVsZCh7XG4gIGxhYmVsLFxuICB2YWx1ZSxcbiAgb25DaGFuZ2UsXG4gIHR5cGUgPSBcInRleHRcIixcbiAgcmVxdWlyZWQsXG4gIHBsYWNlaG9sZGVyLFxufToge1xuICBsYWJlbDogc3RyaW5nO1xuICB2YWx1ZTogc3RyaW5nO1xuICBvbkNoYW5nZTogKGU6IFJlYWN0LkNoYW5nZUV2ZW50PEhUTUxJbnB1dEVsZW1lbnQ+KSA9PiB2b2lkO1xuICB0eXBlPzogc3RyaW5nO1xuICByZXF1aXJlZD86IGJvb2xlYW47XG4gIHBsYWNlaG9sZGVyPzogc3RyaW5nO1xufSkge1xuICByZXR1cm4gKFxuICAgIDxsYWJlbCBjbGFzc05hbWU9XCJibG9ja1wiPlxuICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtZm9yZWdyb3VuZFwiPlxuICAgICAgICB7bGFiZWx9XG4gICAgICAgIHtyZXF1aXJlZCAmJiA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWdvb2dsZS1yZWRcIj4gKjwvc3Bhbj59XG4gICAgICA8L3NwYW4+XG4gICAgICA8aW5wdXRcbiAgICAgICAgdHlwZT17dHlwZX1cbiAgICAgICAgdmFsdWU9e3ZhbHVlfVxuICAgICAgICBvbkNoYW5nZT17b25DaGFuZ2V9XG4gICAgICAgIHJlcXVpcmVkPXtyZXF1aXJlZH1cbiAgICAgICAgcGxhY2Vob2xkZXI9e3BsYWNlaG9sZGVyfVxuICAgICAgICBjbGFzc05hbWU9XCJtdC0xLjUgdy1mdWxsIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1pbnB1dCBiZy1iYWNrZ3JvdW5kIHB4LTQgcHktMyB0ZXh0LWJhc2UgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOnJpbmctMiBmb2N1czpyaW5nLWdvb2dsZS1ibHVlIGZvY3VzOmJvcmRlci1nb29nbGUtYmx1ZSB0cmFuc2l0aW9uXCJcbiAgICAgIC8+XG4gICAgPC9sYWJlbD5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiQzovVXNlcnMvZGFvdWQvRG9jdW1lbnRzL2hvdGF2aXMtLXZlcmNlbC9ob3RhdmlzLWJvb3N0L3NyYy9yb3V0ZXMvY29tbWFuZGVyLnRzeCJ9