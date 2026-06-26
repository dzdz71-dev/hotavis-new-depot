// vite.config.ts — Reconstruction sans @lovable.dev/vite-tanstack-config
//
// Replique fidèlement le comportement du paquet Lovable (v2.3.2) :
//   1. tailwindcss (Vite plugin)
//   2. tsConfigPaths (vite-tsconfig-paths)
//   3. dev server-fn error logger (dev only, simplifié)
//   4. dev SSR error logger (dev only, simplifié)
//   5. tanstackStart (avec importProtection server-only)
//   6. nitro (build only, preset vercel) — si installé
//   7. viteReact
//
// Config commune :
//   - import.meta.env.VITE_* injection
//   - css.transformer = "lightningcss" (parité dev/build)
//   - alias "@" → ./src
//   - dedupe React/Tanstack (évite les doubles instances)
//   - server.host "::", port 8080
//   - watch.awaitWriteFinish (stability 1s, poll 100ms)
//
// Migration Cloudflare → Vercel (2026-06-24) :
//   - preset "cloudflare-module" (workerd, incompatible Windows ARM64) → "vercel"
//   - output.dir "dist" conservé pour compatibilité avec les scripts existants
//   - plus de dépendance à wrangler/workerd pour le build/preview
//
// Référence : node_modules/@lovable.dev/vite-tanstack-config/dist/index.js (v2.3.2)

import { defineConfig, loadEnv, type Plugin, type PluginOption, type UserConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Plugin 3 — Dev server-fn error logger (simplifié)
// ---------------------------------------------------------------------------
// Le paquet Lovable patche @tanstack/start-server-core/server-functions-handler
// pour capturer les erreurs des server functions et les remonter via WebSocket
// HMR. Version simplifiée : on écoute juste les unhandledRejection côté serveur
// Vite et on logge proprement. Suffisant en dev local hors Lovable.
function devServerFnErrorLogger(): Plugin {
  return {
    name: "dev-server-fn-error-logger",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      const onUnhandled = (reason: unknown) => {
        const err = reason instanceof Error ? reason : new Error(String(reason));
        server.config.logger.error(`[server-fn] ${err.message}${err.stack ? "\n" + err.stack : ""}`, { timestamp: true });
      };
      process.on("unhandledRejection", onUnhandled);
      server.httpServer?.once("close", () => {
        process.off("unhandledRejection", onUnhandled);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Plugin 4 — Dev SSR error logger (simplifié)
// ---------------------------------------------------------------------------
// Version Lovable : patche request-response.ts pour capturer les throws SSR.
// Version locale : on intercepte juste les erreurs globales et on logge.
function devSsrErrorLogger(): Plugin {
  return {
    name: "dev-ssr-error-logger",
    apply: "serve",
    configureServer(server) {
      const capture = (error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        server.config.logger.error(`[ssr] ${err.message}${err.stack ? "\n" + err.stack : ""}`, { timestamp: true });
      };
      const g = globalThis as { addEventListener?: (type: string, cb: (e: unknown) => void) => void };
      if (typeof g.addEventListener === "function") {
        g.addEventListener("error", (e: unknown) => {
          const ev = e as ErrorEvent;
          capture(ev?.error ?? ev);
        });
        g.addEventListener("unhandledrejection", (e: unknown) => {
          const ev = e as PromiseRejectionEvent;
          capture(ev?.reason);
        });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Config principale
// ---------------------------------------------------------------------------
export default defineConfig(async (env) => {
  const { command, mode } = env;

  // --- Chargement des variables VITE_* pour injection côté client ---
  const loadedEnv = loadEnv(mode, projectRoot, "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  // --- Plugins dynamiques (ordre identique à Lovable) ---
  const internalPlugins: PluginOption[] = [];

  // 1. Tailwind 4
  const tailwindcss = (await import("@tailwindcss/vite")).default;
  internalPlugins.push(tailwindcss());

  // 2. tsconfig paths (alias @/* → ./src/* via tsconfig.json)
  const tsConfigPaths = (await import("vite-tsconfig-paths")).default;
  internalPlugins.push(tsConfigPaths({ projects: ["./tsconfig.json"] }));

  // 3 & 4. Dev error loggers (dev only)
  if (command === "serve") {
    internalPlugins.push(devServerFnErrorLogger());
    internalPlugins.push(devSsrErrorLogger());
  }

  // 5. TanStack Start plugin (retourne Plugin | Plugin[])
  const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
  internalPlugins.push(
    tanstackStart({
      // Reprend l'option du projet : entry server custom
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
  );

  // 6. Nitro (build only, preset vercel — compatible Windows ARM64 + Vercel)
  //    Anciennement "cloudflare-module" qui nécessitait workerd (incompatible
  //    Windows ARM64). Le preset "vercel" produit un build Node.js standard
  //    déployable sur Vercel sans workerd.
  if (command === "build") {
    try {
      const { nitro } = await import("nitro/vite");
      internalPlugins.push(
        nitro({
          preset: "vercel",
          output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
        }),
      );
    } catch (err) {
      console.warn(
        `[vite.config] nitro/vite n'a pas pu être chargé — build Node fallback.\n` +
          `Installez "nitro" en devDependency pour le build Vercel.\n` +
          `Erreur: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // 7. React Fast Refresh
  const viteReact = (await import("@vitejs/plugin-react")).default;
  internalPlugins.push(viteReact());

  // --- Config de base (identique à Lovable hors sandbox) ---
  const baseConfig: UserConfig = {
    define: envDefine,
    // Lightning CSS en dev ET build pour parité de rendu
    css: { transformer: "lightningcss" },
    resolve: {
      alias: {
        "@": resolve(projectRoot, "src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: internalPlugins,
    server: {
      host: "::",
      port: 8080,
      watch: {
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100,
        },
      },
    },
  };

  return baseConfig;
});
