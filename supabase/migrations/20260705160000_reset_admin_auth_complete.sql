-- =====================================================================
-- RESET COMPLET de la mécanique d'authentification admin (2026-07-05)
-- =====================================================================
-- Objectif : repartir de zéro avec un système simple et robuste.
--
-- 1. Supprime (DROP) les anciennes tables user_roles et agency_settings.
-- 2. Recrée user_roles avec RLS correct + GRANT explicites (le bug principal
--    était l'absence de GRANT SELECT TO authenticated, ce qui faisait
--    silencieusement échouer toutes les lectures côté client).
-- 3. Recrée agency_settings (singleton) avec RLS + GRANT.
-- 4. Recrée la fonction has_role() (SECURITY DEFINER).
-- 5. Recrée le trigger grant_super_admin_on_signup qui donne automatiquement
--    le rôle admin à dz.societe.ecommerce@gmail.com à l'inscription
--    (insensible à la casse).
-- 6. Backfill : donne le rôle admin à l'utilisateur existant si son email
--    correspond.
--
-- ⚠️  À EXÉCUTER UNE SEULE FOIS dans l'éditeur SQL Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ÉTAPE 1 — Nettoyage : trigger, fonction, tables
-- ---------------------------------------------------------------------

-- Supprimer le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;

-- Supprimer la fonction de grant
DROP FUNCTION IF EXISTS public.grant_super_admin_on_signup();

-- Supprimer les anciennes tables (CASCADE pour emporter policies/index/FK)
DROP TABLE IF EXISTS public.agency_settings CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- ---------------------------------------------------------------------
-- ÉTAPE 2 — Enum app_role (on s'assure que 'agent' existe)
-- ---------------------------------------------------------------------
-- L'enum n'est pas droppé avec la table, on s'assure juste qu'il est complet.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';

-- ---------------------------------------------------------------------
-- ÉTAPE 3 — Table user_roles (cœur du système de rôles)
-- ---------------------------------------------------------------------
CREATE TABLE public.user_roles (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- ⚠️ GRANT explicites — c'est ce qui manquait et causait le bug !
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL              ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Un utilisateur lit SES propres rôles (nécessaire pour getUserRoles() côté client)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Un admin peut lire tous les rôles (pour la gestion des agents)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Un admin peut gérer les rôles (attribuer/révoquer le rôle agent)
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- ÉTAPE 4 — Fonction has_role() (utilisée par toutes les policies RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- ÉTAPE 5 — Table agency_settings (singleton : commission + config)
-- ---------------------------------------------------------------------
CREATE TABLE public.agency_settings (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_centimes_per_fiche INTEGER    NOT NULL DEFAULT 5000,
  super_admin_email           TEXT        NOT NULL DEFAULT 'dz.societe.ecommerce@gmail.com',
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  singleton                   BOOLEAN     NOT NULL DEFAULT true UNIQUE
);

GRANT SELECT, INSERT, UPDATE ON public.agency_settings TO authenticated;
GRANT ALL                   ON public.agency_settings TO service_role;

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage agency settings"
  ON public.agency_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Ligne singleton par défaut
INSERT INTO public.agency_settings (commission_centimes_per_fiche, super_admin_email)
VALUES (5000, 'dz.societe.ecommerce@gmail.com')
ON CONFLICT (singleton) DO NOTHING;

-- ---------------------------------------------------------------------
-- ÉTAPE 6 — Trigger : rôle admin automatique à l'inscription
-- ---------------------------------------------------------------------
-- Donne le rôle admin à dz.societe.ecommerce@gmail.com dès la création
-- du compte auth.users (insensible à la casse).
CREATE OR REPLACE FUNCTION public.grant_super_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'dz.societe.ecommerce@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_on_signup();

-- ---------------------------------------------------------------------
-- ÉTAPE 7 — Backfill : donner le rôle admin à l'utilisateur existant
-- ---------------------------------------------------------------------
-- Si le compte super-admin existe DÉJÀ dans auth.users (créé avant le
-- trigger), on lui attribue le rôle admin maintenant.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = 'dz.societe.ecommerce@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------------------------------------------------------------------
-- FIN — Vérification rapide (optionnelle, à commenter si besoin)
-- ---------------------------------------------------------------------
-- Affiche les rôles attribués au super-admin pour confirmer :
-- SELECT u.email, ur.role
-- FROM auth.users u
-- JOIN public.user_roles ur ON ur.user_id = u.id
-- WHERE lower(u.email) = 'dz.societe.ecommerce@gmail.com';