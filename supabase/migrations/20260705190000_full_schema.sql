-- =====================================================================
-- SCHÉMA COMPLET HOTAVIS — Consolidation idempotente (2026-07-05)
-- =====================================================================
-- Crée TOUT le schéma de l'application de façon idempotente.
-- Exécuté automatiquement par bootstrapAdmin() au premier clic sur
-- "Créer le compte super-admin" — aucun SQL editor requis.
-- =====================================================================

-- =====================================================================
-- 1. ENUMS
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.commande_statut AS ENUM (
    'en_attente','payé','onboarding_complété','en_cours','livrée','annulée','bloque'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user','agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.candidature_statut AS ENUM ('nouveau','accepté','rejeté');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 2. TABLES
-- =====================================================================

-- commandes
CREATE TABLE IF NOT EXISTS public.commandes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom          TEXT NOT NULL,
  nom             TEXT NOT NULL,
  email           TEXT NOT NULL,
  telephone       TEXT NOT NULL,
  entreprise      TEXT NOT NULL,
  ville           TEXT NOT NULL,
  activite        TEXT NOT NULL,
  montant_centimes INTEGER NOT NULL DEFAULT 34900,
  statut          public.commande_statut NOT NULL DEFAULT 'en_attente',
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  notes_admin     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at     TIMESTAMPTZ,
  commission_centimes INTEGER,
  commission_paid BOOLEAN NOT NULL DEFAULT false,
  facture_status  TEXT NOT NULL DEFAULT 'non_emise'
    CHECK (facture_status IN ('non_emise','emise','payee'))
);

CREATE INDEX IF NOT EXISTS idx_commandes_statut ON public.commandes(statut);
CREATE INDEX IF NOT EXISTS idx_commandes_created_at ON public.commandes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commandes_stripe_session ON public.commandes(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_commandes_assigned_agent ON public.commandes(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_commandes_commission_paid
  ON public.commandes(assigned_agent_id, commission_paid) WHERE statut = 'livrée';
CREATE INDEX IF NOT EXISTS idx_commandes_facture_status ON public.commandes(facture_status);
CREATE INDEX IF NOT EXISTS idx_commandes_email ON public.commandes(email);

-- onboardings
CREATE TABLE IF NOT EXISTS public.onboardings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id     UUID NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE UNIQUE,
  nom_commercial  TEXT NOT NULL,
  adresse         TEXT NOT NULL,
  code_postal     TEXT NOT NULL,
  ville           TEXT NOT NULL,
  telephone_affiche TEXT NOT NULL,
  site_web        TEXT,
  email_google    TEXT,
  pas_compte_google BOOLEAN NOT NULL DEFAULT false,
  categorie_principale TEXT NOT NULL,
  description     TEXT NOT NULL,
  type_presence   TEXT NOT NULL,
  rayon_intervention_km INTEGER,
  horaires        JSONB NOT NULL DEFAULT '{}'::jsonb,
  services        JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_url        TEXT,
  couverture_url  TEXT,
  photos_urls     JSONB NOT NULL DEFAULT '[]'::jsonb,
  attributs       JSONB NOT NULL DEFAULT '[]'::jsonb,
  commentaires    TEXT,
  cgv_acceptees   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_creation   DATE,
  facture_url     TEXT,
  facture_nom     TEXT,
  facture_type    TEXT,
  justificatif_url TEXT,
  justificatif_nom TEXT,
  justificatif_type TEXT,
  photos_etablissement JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_onboardings_commande ON public.onboardings(commande_id);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- agency_settings (singleton)
CREATE TABLE IF NOT EXISTS public.agency_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_centimes_per_fiche INTEGER NOT NULL DEFAULT 5000,
  super_admin_email           TEXT NOT NULL DEFAULT 'dz.societe.ecommerce@gmail.com',
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  singleton                   BOOLEAN NOT NULL DEFAULT true UNIQUE
);

-- agent_notes
CREATE TABLE IF NOT EXISTS public.agent_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenu     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- agent_invitations
CREATE TABLE IF NOT EXISTS public.agent_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  invited_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- candidatures
CREATE TABLE IF NOT EXISTS public.candidatures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom      TEXT NOT NULL,
  nom         TEXT NOT NULL,
  email       TEXT NOT NULL,
  telephone   TEXT NOT NULL,
  siret       TEXT,
  fiche_url   TEXT,
  linkedin_url TEXT,
  presentation TEXT,
  qcm_q1      TEXT NOT NULL,
  qcm_score   INTEGER NOT NULL DEFAULT 0,
  q2_reponse  TEXT NOT NULL,
  q3_reponse  TEXT NOT NULL,
  statut      public.candidature_statut NOT NULL DEFAULT 'nouveau',
  notes_admin TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidatures_email ON public.candidatures(email);

-- agent_applications
CREATE TABLE IF NOT EXISTS public.agent_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT NOT NULL,
  motivation  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'en_attente'
);
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON public.agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_applications_created_at ON public.agent_applications(created_at DESC);

-- app_secrets
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- =====================================================================
-- 3. GRANTS
-- =====================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commandes TO authenticated;
GRANT ALL ON public.commandes TO service_role;
GRANT INSERT ON public.commandes TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboardings TO authenticated;
GRANT ALL ON public.onboardings TO service_role;
GRANT INSERT ON public.onboardings TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.agency_settings TO authenticated;
GRANT ALL ON public.agency_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_notes TO authenticated;
GRANT ALL ON public.agent_notes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_invitations TO authenticated;
GRANT ALL ON public.agent_invitations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidatures TO authenticated;
GRANT INSERT ON public.candidatures TO anon;
GRANT ALL ON public.candidatures TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_applications TO authenticated;
GRANT INSERT ON public.agent_applications TO anon;
GRANT ALL ON public.agent_applications TO service_role;

GRANT ALL ON public.app_secrets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- =====================================================================
-- 4. FONCTIONS (avant les policies qui les utilisent)
-- =====================================================================

-- has_role() — SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- update_updated_at_column()
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- get_app_secret()
CREATE OR REPLACE FUNCTION public.get_app_secret(_key text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT value FROM public.app_secrets WHERE key = _key;
$$;
REVOKE ALL ON FUNCTION public.get_app_secret(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_secret(text) TO authenticated, service_role;

-- claim_commande()
CREATE OR REPLACE FUNCTION public.claim_commande(_commande_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  SELECT commission_centimes_per_fiche INTO _commission
  FROM public.agency_settings WHERE singleton = true LIMIT 1;
  IF _commission IS NULL THEN
    _commission := 5000;
  END IF;

  UPDATE public.commandes
  SET assigned_agent_id = _uid,
      assigned_at = now(),
      commission_centimes = _commission,
      statut = CASE WHEN statut = 'payé' THEN 'en_cours'::commande_statut ELSE statut END
  WHERE id = _commande_id;

  RETURN jsonb_build_object('ok', true, 'commission_centimes', _commission);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_commande(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_commande(uuid) TO authenticated, service_role;

-- unclaim_commande()
CREATE OR REPLACE FUNCTION public.unclaim_commande(_commande_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _row record;
  _uid uuid := auth.uid();
BEGIN
  SELECT id, statut, assigned_agent_id INTO _row
  FROM public.commandes WHERE id = _commande_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _row.assigned_agent_id IS NULL OR _row.assigned_agent_id <> _uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_assigned');
  END IF;

  IF _row.statut = 'livrée' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_delivered');
  END IF;

  UPDATE public.commandes
  SET assigned_agent_id = NULL,
      assigned_at = NULL,
      statut = 'payé'::commande_statut
  WHERE id = _commande_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.unclaim_commande(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unclaim_commande(uuid) TO authenticated, service_role;

-- grant_super_admin_on_signup()
CREATE OR REPLACE FUNCTION public.grant_super_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
REVOKE ALL ON FUNCTION public.grant_super_admin_on_signup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_super_admin_on_signup() TO service_role, supabase_auth_admin;

-- =====================================================================
-- 5. RLS + POLICIES
-- =====================================================================

-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- commandes
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can create a commande" ON public.commandes;
CREATE POLICY "Anyone can create a commande"
  ON public.commandes FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(coalesce(email, '')) BETWEEN 5 AND 255
    AND length(coalesce(prenom, '')) BETWEEN 1 AND 80
    AND length(coalesce(nom, '')) BETWEEN 1 AND 80
    AND length(coalesce(entreprise, '')) BETWEEN 1 AND 200
    AND statut = 'en_attente'::commande_statut
    AND stripe_payment_id IS NULL
    AND paid_at IS NULL
    AND delivered_at IS NULL
    AND assigned_agent_id IS NULL
  );
DROP POLICY IF EXISTS "Admins can view all commandes" ON public.commandes;
CREATE POLICY "Admins can view all commandes"
  ON public.commandes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update commandes" ON public.commandes;
CREATE POLICY "Admins can update commandes"
  ON public.commandes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete commandes" ON public.commandes;
CREATE POLICY "Admins can delete commandes"
  ON public.commandes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Agents read pool and assigned" ON public.commandes;
CREATE POLICY "Agents read pool and assigned"
  ON public.commandes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND (
      (statut = 'payé' AND assigned_agent_id IS NULL)
      OR assigned_agent_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Agents update assigned commandes" ON public.commandes;
CREATE POLICY "Agents update assigned commandes"
  ON public.commandes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND assigned_agent_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND assigned_agent_id = auth.uid()
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

-- onboardings
ALTER TABLE public.onboardings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all onboardings" ON public.onboardings;
CREATE POLICY "Admins can view all onboardings"
  ON public.onboardings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update onboardings" ON public.onboardings;
CREATE POLICY "Admins can update onboardings"
  ON public.onboardings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Agents read assigned onboardings" ON public.onboardings;
CREATE POLICY "Agents read assigned onboardings"
  ON public.onboardings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.commandes c
      WHERE c.id = onboardings.commande_id AND c.assigned_agent_id = auth.uid()
    )
  );

-- agency_settings
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage agency settings" ON public.agency_settings;
CREATE POLICY "Admins manage agency settings"
  ON public.agency_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- agent_notes
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents and admins read notes" ON public.agent_notes;
CREATE POLICY "Agents and admins read notes"
  ON public.agent_notes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'agent'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.commandes c
        WHERE c.id = agent_notes.commande_id
          AND c.assigned_agent_id = auth.uid()
      )
    )
  );
DROP POLICY IF EXISTS "Agents write own notes" ON public.agent_notes;
CREATE POLICY "Agents write own notes"
  ON public.agent_notes FOR INSERT TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    AND (public.has_role(auth.uid(), 'agent'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  );
DROP POLICY IF EXISTS "Authors update own notes" ON public.agent_notes;
CREATE POLICY "Authors update own notes"
  ON public.agent_notes FOR UPDATE TO authenticated
  USING (
    agent_id = auth.uid()
    AND (public.has_role(auth.uid(), 'agent'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    agent_id = auth.uid()
    AND (public.has_role(auth.uid(), 'agent'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  );
DROP POLICY IF EXISTS "Admins delete notes" ON public.agent_notes;
CREATE POLICY "Admins delete notes"
  ON public.agent_notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- agent_invitations
ALTER TABLE public.agent_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage invitations" ON public.agent_invitations;
CREATE POLICY "Admins manage invitations"
  ON public.agent_invitations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- candidatures
ALTER TABLE public.candidatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can apply" ON public.candidatures;
CREATE POLICY "Anyone can apply"
  ON public.candidatures FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(coalesce(email, '')) BETWEEN 5 AND 255
    AND length(coalesce(prenom, '')) BETWEEN 1 AND 80
    AND length(coalesce(nom, '')) BETWEEN 1 AND 80
    AND statut = 'nouveau'::candidature_statut
    AND notes_admin IS NULL
  );
DROP POLICY IF EXISTS "Admins read candidatures" ON public.candidatures;
CREATE POLICY "Admins read candidatures"
  ON public.candidatures FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins update candidatures" ON public.candidatures;
CREATE POLICY "Admins update candidatures"
  ON public.candidatures FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins delete candidatures" ON public.candidatures;
CREATE POLICY "Admins delete candidatures"
  ON public.candidatures FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- agent_applications
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read agent_applications" ON public.agent_applications;
CREATE POLICY "Admins read agent_applications"
  ON public.agent_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can submit agent_application" ON public.agent_applications;
CREATE POLICY "Anyone can submit agent_application"
  ON public.agent_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Admins update agent_applications" ON public.agent_applications;
CREATE POLICY "Admins update agent_applications"
  ON public.agent_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins delete agent_applications" ON public.agent_applications;
CREATE POLICY "Admins delete agent_applications"
  ON public.agent_applications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- app_secrets (aucune policy = seul service_role bypass RLS)
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 6. VUE
-- =====================================================================
CREATE OR REPLACE VIEW public.commandes_agent_view
WITH (security_invoker=on) AS
  SELECT
    id, prenom, nom, entreprise, ville, activite, statut,
    assigned_agent_id, assigned_at, created_at, paid_at, delivered_at
  FROM public.commandes;
GRANT SELECT ON public.commandes_agent_view TO authenticated;

-- =====================================================================
-- 7. TRIGGERS
-- =====================================================================
DROP TRIGGER IF EXISTS update_commandes_updated_at ON public.commandes;
CREATE TRIGGER update_commandes_updated_at
  BEFORE UPDATE ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboardings_updated_at ON public.onboardings;
CREATE TRIGGER update_onboardings_updated_at
  BEFORE UPDATE ON public.onboardings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS candidatures_updated_at ON public.candidatures;
CREATE TRIGGER candidatures_updated_at
  BEFORE UPDATE ON public.candidatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_on_signup();

-- =====================================================================
-- 8. STORAGE BUCKETS
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos-gmb', 'photos-gmb', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents-gmb', 'documents-gmb', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies : photos-gmb
DROP POLICY IF EXISTS "Admins manage photos-gmb" ON storage.objects;
CREATE POLICY "Admins manage photos-gmb"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'photos-gmb' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'photos-gmb' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Photos GMB publiquement lisibles" ON storage.objects;
CREATE POLICY "Photos GMB publiquement lisibles"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos-gmb');

-- Storage policies : documents-gmb
DROP POLICY IF EXISTS "Admins read documents-gmb" ON storage.objects;
CREATE POLICY "Admins read documents-gmb"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents-gmb' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins insert documents-gmb" ON storage.objects;
CREATE POLICY "Admins insert documents-gmb"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents-gmb' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update documents-gmb" ON storage.objects;
CREATE POLICY "Admins update documents-gmb"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents-gmb' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'documents-gmb' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete documents-gmb" ON storage.objects;
CREATE POLICY "Admins delete documents-gmb"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents-gmb' AND public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 9. DONNÉES INITIALES
-- =====================================================================
INSERT INTO public.agency_settings (commission_centimes_per_fiche, super_admin_email)
VALUES (5000, 'dz.societe.ecommerce@gmail.com')
ON CONFLICT (singleton) DO NOTHING;

-- =====================================================================
-- FIN
-- =====================================================================