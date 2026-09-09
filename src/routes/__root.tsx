import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import "@/i18n";
import appCss from "../styles.css?url";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingCallButton } from "@/components/site/FloatingCallButton";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-google-blue">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-google-blue px-6 py-2.5 text-sm font-semibold text-white hover:shadow-glow transition"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-google-blue px-5 py-2 text-sm font-semibold text-white"
          >
            Réessayer
          </button>
          <a href="/" className="rounded-full border border-border px-5 py-2 text-sm font-semibold">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hotavis — Votre fiche Google Business optimisée en 5 jours" },
      {
        name: "description",
        content:
          "Hotavis crée et optimise votre fiche Google Business Profile en 5 jours. SEO local, photos, services, avis — tout est géré pour vous. À partir de 379€.",
      },
      { name: "author", content: "Hotavis" },
      { property: "og:title", content: "Hotavis — Votre fiche Google professionnelle en 5 jours" },
      {
        property: "og:description",
        content:
          "Création et optimisation complète de votre fiche Google Business Profile. À partir de 379€, garanti satisfait ou remboursé.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
        {/* Google Analytics 4 (gtag.js) - tag global, identifiant G-BV9B359H3Z.
            Insere dans le document racine (SSR) : charge sur toutes les pages.
            Les navigations SPA sont suivies par la mesure amelioree GA4
            (changements d'historique), aucun code supplementaire requis. */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-BV9B359H3Z" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-BV9B359H3Z');`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  const isAgent = pathname.startsWith("/agent");
  const isOnboarding = pathname.startsWith("/onboarding") || pathname.startsWith("/merci");
  const isRecrutement = pathname === "/recrutement";
  const isAgentLogin = pathname === "/agent/login";
  const hideChrome = isAdmin || isAgent || isOnboarding;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        {!hideChrome && <Header isExpertPage={isRecrutement} isAgentLoginPage={isAgentLogin} />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!hideChrome && !isAgentLogin && <Footer />}
        {!isAdmin && !isAgent && <FloatingCallButton />}
      </div>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
