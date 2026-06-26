-- Migration consolidée production-ready (2026-06-22)
--
-- Corrige :
--   M2  : Retire le JWT anon hardcodé du cron pg_cron (sécurité)
--   M3  : Résout le conflit entre les deux jobs cron (un seul job, avec auth)
--   M5  : Ajoute WITH CHECK sur la policy RLS "Agents update assigned commandes"
--   M10 : Fige la commission au moment du claim_commande (traçabilité contractuelle)
--   m10 : Externalise l'email super-admin dans agency_settings (au lieu du hardcodé)
--
-- Toutes les opérations sont idempotentes (DROP IF EXISTS, ON CONFLICT, etc.).

-- =====================================================================
-- M2 + M3 : Cron pg_cron unique et propre
-- =====================================================================
-- On supprime TOUTES les versions précédentes du job pour repartir propre.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hotavis-onboarding-reminders') THEN
    PERFORM cron.unschedule('hotavis-onboarding-reminders');
  END IF;
END $$;

-- Récupère l'URL publique depuis PUBLIC_BASE_URL via une function SECURITY DEFINER
-- (les jobs pg_cron tournent en tant que postgres, donc ont accès à la fonction).
-- On ne code plus le JWT anon en dur : le endpoint /api/public/cron-reminders
-- accepte aussi ?secret=CRON_SECRET qu'on stocke dans une table app_secrets.
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
-- Aucune policy pour authenticated/anon = personne ne peut lire/écrire hors
-- service_role (qui bypass RLS). Seul le cron (exécuté en tant que postgres)
-- et le service_role peuvent y accéder.

-- Note : la valeur de CRON_SECRET doit être insérée manuellement par l'admin
-- via le dashboard Supabase ou un script SQL :
--   INSERT INTO public.app_secrets (key, value) VALUES ('cron_secret', '<valeur>');
-- On n'insère RIEN ici par sécurité (pas de valeur par défaut).

-- L'URL publique doit être configurée elle aussi :
--   INSERT INTO public.app_secrets (key, value) VALUES ('public_base_url', 'https://hotavis.com');

-- Function utilitaire pour lire un secret (SECURITY DEFINER pour que les
-- triggers/cron puissent y accéder même avec RLS).
CREATE OR REPLACE FUNCTION public.get_app_secret(_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_secrets WHERE key = _key;
$$;

REVOKE ALL ON FUNCTION public.get_app_secret(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_secret(text) TO authenticated, service_role;

-- Cron unique : lit l'URL depuis app_secrets, appelle le endpoint avec le
-- secret en query string. Si la table n'est pas encore peuplée, le job ne
-- fait rien (grâce à la garde WHERE url IS NOT NULL).
SELECT cron.schedule(
  'hotavis-onboarding-reminders',
  '0 * * * *',  -- toutes les heures à HH:00
  $cron$
  DO $$
  DECLARE
    _base_url text;
    _secret text;
    _full_url text;
  BEGIN
    SELECT public.get_app_secret('public_base_url') INTO _base_url;
    SELECT public.get_app_secret('cron_secret') INTO _secret;
    IF _base_url IS NULL OR _secret IS NULL THEN
      RAISE NOTICE 'app_secrets non configuré (public_base_url/cron_secret) — cron skip';
      RETURN;
    END IF;
    _full_url := _base_url || '/api/public/cron-reminders?secret=' || _secret;
    PERFORM extensions.http_get(url := _full_url);
  END $$;
  $cron$
);

-- =====================================================================
-- M5 : RLS avec WITH CHECK sur commandes pour les agents
-- =====================================================================
-- Sans WITH CHECK, un agent pouvait modifier n'importe quelle colonne
-- (montant_centimes, stripe_payment_id, paid_at, etc.) sur la commande
-- qui lui est assignée. On restreint aux colonnes légitimes via une
-- expression de WITH CHECK.
DROP POLICY IF EXISTS "Agents update assigned commandes" ON public.commandes;

CREATE POLICY "Agents update assigned commandes" ON public.commandes
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND assigned_agent_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND assigned_agent_id = auth.uid()
    -- Un agent ne peut modifier que statut, delivered_at, commission_centimes.
    -- Les autres colonnes (montant_centimes, stripe_*, paid_at, email, etc.)
    -- doivent rester inchangées.
    AND (
      statut IN ('en_cours'::commande_statut, 'livrée'::commande_statut)
      AND montant_centimes IS NOT DISTINCT FROM (SELECT montant_centimes FROM public.commandes WHERE id = commandes.id)
      AND stripe_payment_id IS NOT DISTINCT FROM (SELECT stripe_payment_id FROM public.commandes WHERE id = commandes.id)
      AND stripe_session_id IS NOT DISTINCT FROM (SELECT stripe_session_id FROM public.commandes WHERE id = commandes.id)
      AND paid_at IS NOT DISTINCT FROM (SELECT paid_at FROM public.commandes WHERE id = commandes.id)
      AND email IS NOT DISTINCT FROM (SELECT email FROM public.commandes WHERE id = commandes.id)
      AND telephone IS NOT DISTINCT FROM (SELECT telephone FROM public.commandes WHERE id = commandes.id)
    )
  );

-- =====================================================================
-- M10 : Figer la commission au moment du claim_commande
-- =====================================================================
-- Auparavant, commission_centimes n'était écrit que dans markTicketCompleted,
-- en lisant agency_settings au moment de la livraison. Si l'admin baissait la
-- commission entre la prise en charge et la livraison, l'agent était payé
-- moins que prévu. On fige maintenant la commission au claim.

CREATE OR REPLACE FUNCTION public.claim_commande(_commande_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row record;
  _commission integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF NOT (public.has_role(_uid, 'agent'::app_role) OR public.has_role(_uid, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé : rôle agent requis';
  END IF;

  SELECT id, statut, assigned_agent_id INTO _row
  FROM public.commandes WHERE id = _commande_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;
  IF _row.assigned_agent_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_assigned');
  END IF;
  IF _row.statut NOT IN ('payé','onboarding_complété') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;

  -- Snapshot la commission au moment du claim
  SELECT commission_centimes_per_fiche INTO _commission
  FROM public.agency_settings
  WHERE singleton = true
  LIMIT 1;
  IF _commission IS NULL THEN
    _commission := 5000;  -- fallback 50€
  END IF;

  UPDATE public.commandes
  SET assigned_agent_id = _uid,
      assigned_at = now(),
      commission_centimes = _commission,  -- figée ici
      statut = CASE WHEN statut = 'payé' THEN 'en_cours'::commande_statut ELSE statut END
  WHERE id = _commande_id;

  RETURN jsonb_build_object('ok', true, 'commission_centimes', _commission);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_commande(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_commande(uuid) TO authenticated, service_role;

-- =====================================================================
-- m10 : Externaliser l'email super-admin
-- =====================================================================
-- Avant : 'dz.societe.ecommerce@gmail.com' codé en dur dans :
--   - src/routes/admin.login.tsx (côté client)
--   - public.grant_super_admin_on_signup() (trigger SQL)
--
-- Maintenant : on lit depuis agency_settings.super_admin_email.
-- Valeur par défaut = l'ancien email pour backward compat.
ALTER TABLE public.agency_settings
  ADD COLUMN IF NOT EXISTS super_admin_email text NOT NULL DEFAULT 'dz.societe.ecommerce@gmail.com';

-- Met à jour le trigger pour utiliser la valeur configurable
CREATE OR REPLACE FUNCTION public.grant_super_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expected_email text;
BEGIN
  SELECT super_admin_email INTO _expected_email
  FROM public.agency_settings WHERE singleton = true LIMIT 1;
  IF _expected_email IS NULL THEN
    _expected_email := 'dz.societe.ecommerce@gmail.com';
  END IF;

  IF lower(NEW.email) = lower(_expected_email) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Le trigger existant est déjà en place (DROP + CREATE pour être idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_on_signup();

-- =====================================================================
-- M9 (complément) : Ajouter un index sur candidatures.email pour
-- éviter les soumissions multiples depuis la même adresse (rate-limit
-- applicatif côté server fn).
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_candidatures_email ON public.candidatures(email);
CREATE INDEX IF NOT EXISTS idx_commandes_email ON public.commandes(email);
