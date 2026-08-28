# Hotavis-Boost

Application full-stack SSR pour **Hotavis**, agence française spécialisée dans la création et l'optimisation de fiches **Google Business Profile** à 379 €.

## Stack technique

| Couche                 | Technologie                                   |
| ---------------------- | --------------------------------------------- |
| Méta-framework         | TanStack Start ^1.167                         |
| Routeur                | TanStack Router ^1.168 (file-based)           |
| Build                  | Vite 7 + Nitro 3 (preset `cloudflare-module`) |
| Runtime                | Cloudflare Workers (`nodejs_compat`)          |
| UI                     | React 19 + Tailwind 4 + shadcn/ui + Radix UI  |
| Data fetching          | TanStack Query ^5.83                          |
| Backend-as-a-Service   | Supabase (Postgres + Auth + Storage + RLS)    |
| Paiement               | Stripe Checkout                               |
| Emails transactionnels | Resend                                        |
| i18n                   | i18next + react-i18next (FR/EN/ES)            |
| Forms/validation       | react-hook-form + Zod ^4                      |
| Animations             | framer-motion ^12                             |
| Scheduler              | pg_cron + pg_net (côté Supabase)              |
| Langage                | TypeScript 5.8 strict                         |

## Prérequis

- **Bun** ≥ 1.3 (recommandé) — ou Node ≥ 22 + npm/pnpm
- Un compte **Supabase** (project + service role key)
- Un compte **Stripe** (test ou live)
- Un compte **Resend** (pour les emails)
- Un compte **Cloudflare** (pour le déploiement Workers)

## Installation

```bash
# 1. Cloner le dépôt
git clone <votre-repo-url> hotavis-boost
cd hotavis-boost

# 2. Installer les dépendances (447 paquets, ~2s avec Bun)
bun install

# 3. Copier le template d'env et renseigner les variables
cp .env.example .env
# Éditer .env avec vos clés Supabase, Stripe, Resend...

# 4. Pour le dev local avec Wrangler (Cloudflare Workers), copier aussi .dev.vars
cp .env .dev.vars
```

## Variables d'environnement

Voir `.env.example` pour la liste complète. Résumé :

| Variable                        | Rôle                                               | Obligatoire |
| ------------------------------- | -------------------------------------------------- | ----------- |
| `SUPABASE_URL`                  | URL du projet Supabase                             | ✅          |
| `SUPABASE_PUBLISHABLE_KEY`      | Clé publique (anon) Supabase                       | ✅          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Clé service role (bypass RLS) — serveur only       | ✅          |
| `STRIPE_SECRET_KEY`             | Clé secrète Stripe (`sk_test_` ou `sk_live_`)      | ✅          |
| `STRIPE_WEBHOOK_SECRET`         | Secret du webhook Stripe (`whsec_`)                | ✅          |
| `RESEND_API_KEY`                | Clé API Resend (`re_`)                             | ✅          |
| `CRON_SECRET`                   | Secret pour sécuriser `/api/public/cron-reminders` | ✅          |
| `PUBLIC_BASE_URL`               | URL publique (pour emails d'invitation)            | ✅          |
| `VITE_SUPABASE_URL`             | URL Supabase (injectée côté client)                | ✅          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon (injectée côté client)                    | ✅          |

## Configuration Supabase

### 1. Appliquer les migrations

```bash
# Avec la CLI Supabase
supabase db push

# Ou via le Dashboard Supabase → SQL Editor
# Exécuter les 11 fichiers dans supabase/migrations/ dans l'ordre
```

### 2. Configurer les secrets applicatifs

Après avoir appliqué la migration `20260622184308_production_ready_consolidated.sql`,
insérer les secrets dans la table `app_secrets` via le Dashboard Supabase (SQL Editor) :

```sql
INSERT INTO public.app_secrets (key, value) VALUES
  ('public_base_url', 'https://votre-domaine.com'),
  ('cron_secret', '<valeur-aleatoire-longue>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

### 3. Configurer le super-admin

L'email super-admin est stocké dans `agency_settings.super_admin_email`. La valeur
par défaut est `dz.societe.ecommerce@gmail.com`. Pour la modifier :

```sql
UPDATE public.agency_settings
SET super_admin_email = 'admin@votre-domaine.com'
WHERE singleton = true;
```

### 4. Configurer le cron pg_cron

La migration `20260622184308_production_ready_consolidated.sql` crée un job pg_cron
unique qui lit `public_base_url` et `cron_secret` depuis `app_secrets`. Une fois les
secrets insérés (étape 2), le cron appellera automatiquement
`https://votre-domaine.com/api/public/cron-reminders?secret=<cron_secret>` toutes
les heures.

### 5. Configurer le webhook Stripe

Dans le Dashboard Stripe → Developers → Webhooks → Add endpoint :

- **Endpoint URL** : `https://votre-domaine.com/api/public/stripe-webhook`
- **Events to send** : `checkout.session.completed`
- Récupérer le **Signing secret** (`whsec_...`) et l'ajouter à `STRIPE_WEBHOOK_SECRET`

## Commandes

```bash
# Développement (HMR, http://localhost:8080)
bun run dev

# Build production (génère dist/server + dist/client)
bun run build

# Preview du build (SSR Cloudflare Worker via Miniflare)
npx nitro preview

# Preview via Wrangler
npx wrangler dev dist/server/index.mjs

# Typecheck
bun run typecheck

# Lint
bun run lint

# Format
bun run format
```

## Déploiement Cloudflare

### 1. Configurer les secrets

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CRON_SECRET
npx wrangler secret put PUBLIC_BASE_URL
```

### 2. Déployer

```bash
bun run build
npx wrangler deploy
```

### 3. Configurer le domaine personnalisé

Dans le Dashboard Cloudflare → Workers & Pages → hotavis-boost → Triggers → Custom Domains.

## Structure du projet

```
hotavis-boost/
├── .env, .env.example, .dev.vars    # Variables d'env (ne pas committer)
├── bunfig.toml                       # Config Bun (supply-chain guard 24h)
├── components.json                   # Config shadcn/ui
├── package.json                      # Dépendances (sans Lovable)
├── tsconfig.json                     # TypeScript strict
├── vite.config.ts                    # Config Vite (reconstruite sans Lovable)
├── wrangler.jsonc                    # Config Cloudflare Workers
├── public/
│   └── images/
│       ├── gmb-demo/                 # 5 PNG démo fiches Google
│       └── recrutement-banner.svg    # Bannière OG (placeholder)
├── supabase/
│   ├── config.toml
│   └── migrations/                   # 11 migrations SQL
└── src/
    ├── server.ts                     # Entrypoint Cloudflare (wrapper erreurs SSR)
    ├── start.ts                      # createStart + middlewares
    ├── router.tsx                    # createRouter + QueryClient
    ├── routeTree.gen.ts              # Auto-généré par TanStack Router
    ├── styles.css                    # Tailwind 4 + thème Google colors
    ├── i18n/                         # i18next FR/EN/ES
    ├── integrations/supabase/
    │   ├── types.ts                  # Types Database auto-générés
    │   ├── client.ts                 # Client anon (lazy Proxy)
    │   ├── client.server.ts          # Client admin (service role, bypass RLS)
    │   ├── auth-middleware.ts        # requireSupabaseAuth (getClaims + fallback getUser)
    │   └── auth-attacher.ts          # Attache le bearer côté client sur les serverFn
    ├── lib/
    │   ├── *.functions.ts            # 7 fichiers server functions (RPC)
    │   ├── utils.ts                  # cn() + escapeHtml()
    │   ├── rate-limit.ts             # Rate-limit in-memory (anti-DoS)
    │   ├── client/roles.ts           # Helpers rôle côté client
    │   └── error-capture.ts/error-page.ts
    ├── components/
    │   ├── site/                     # Header, Footer, Section, GoogleBrand...
    │   ├── ui/                       # 35 composants shadcn/ui
    │   └── admin/AdminNav.tsx
    ├── hooks/use-mobile.tsx
    └── routes/                       # 20 routes TanStack (file-based)
        ├── __root.tsx
        ├── index.tsx                 # Home (827 lignes)
        ├── commander.tsx
        ├── onboarding.$commandeId.tsx # Briefing 7 étapes
        ├── onboarding-success.$commandeId.tsx
        ├── merci.tsx
        ├── recrutement.tsx
        ├── accept-invitation.$token.tsx
        ├── admin.{index,$id,kanban,agents,candidatures,commissions,parametres,login}.tsx
        ├── agent.{index,$id,login}.tsx
        └── api/public/{stripe-webhook,cron-reminders}.ts
```

## Parcours utilisateur

### Funnel client

```
/                → page d'accueil + CTA "Commencer — 379€"
  ↓
/commander       → formulaire coordonnées (prenom/nom/email/telephone/entreprise/ville/activite)
  ↓ (createCommande → insert Supabase)
/onboarding/$id  → briefing 7 étapes (infos entreprise, activité, horaires, photos, attributs, documents, CGV)
  ↓ (saveOnboarding → createCheckoutForCommande → Stripe Checkout)
/onboarding-success/$id → confirmation + 3 prochaines étapes
  ↓ (confirmStripeSession fallback si webhook en retard)
[l'équipe prend en charge via /agent, marque livrée → email au client]
```

### Espace admin

```
/admin/login     → saisie email/password + vérif rôle admin
  ↓
/admin           → dashboard (stats + table commandes)
/admin/$id       → détail commande + changer statut + notes admin
/admin/kanban    → vue kanban (3 colonnes : nouveaux / en cours / livrés)
/admin/agents    → liste agents + invitation (token + email)
/admin/candidatures → liste candidatures experts SEO
/admin/commissions → rapport commissions + export CSV
/admin/parametres → montant commission par fiche + email super-admin
```

### Espace agent

```
/agent/login     → saisie email/password + vérif rôle agent/admin
  ↓
/agent           → dashboard (pool de dossiers disponibles + mes missions)
/agent/$id       → détail dossier + notes internes + marquer livré
```

## Sécurité

- **RLS activée** sur toutes les tables Supabase (policies strictes par rôle)
- **`requireSupabaseAuth`** middleware sur toutes les server functions admin/agent
- **`assertAdmin`** / **`assertAgentOrAdmin`** checks dans chaque handler
- **Rate-limit** in-memory sur les server functions publiques (3-5 req/min/IP)
- **`escapeHtml`** centralisé sur tous les emails HTML (anti-XSS)
- **`getClaims`** (validation JWKS locale) + fallback `getUser` (validation serveur)
- **Webhook Stripe** vérifié via signature HMAC
- **Cron endpoint** protégé par `?secret=` OU header `apikey`
- **WITH CHECK** sur la policy RLS des agents (ne peut modifier que statut/delivered_at/commission_centimes)
- **Commission figée** au moment du `claim_commande` (traçabilité contractuelle)
- **Variables sensibles** jamais committées (`.env`, `.dev.vars` dans `.gitignore`)

## Tests

```bash
# Tests unitaires (à venir — vitest)
bun test
```

Pour l'instant, aucun test automatisé. Avant la mise en production, ajouter au minimum :

- Test d'intégration sur `claim_commande` (RPC SQL)
- Test sur `saveOnboarding` (validation Zod)
- Test sur `confirmStripeSession` (idempotence + retry)
- Test sur le rate-limit

## Migration depuis Lovable Cloud

Ce projet a été reconstruit pour sortir de la dépendance `@lovable.dev/vite-tanstack-config`. La configuration Vite a été réécrite dans `vite.config.ts` pour répliquer fidèlement le comportement du paquet Lovable (ordre des plugins, config Lightning CSS, dedupe React, etc.) sans aucune référence au registre privé Lovable.

## Licence

Propriétaire — Hotavis © 2026
