
-- Enum statut commande
CREATE TYPE public.commande_statut AS ENUM (
  'en_attente',
  'payé',
  'onboarding_complété',
  'en_cours',
  'livrée',
  'annulée'
);

-- Table commandes
CREATE TABLE public.commandes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT NOT NULL,
  entreprise TEXT NOT NULL,
  ville TEXT NOT NULL,
  activite TEXT NOT NULL,
  montant_centimes INTEGER NOT NULL DEFAULT 34900,
  statut public.commande_statut NOT NULL DEFAULT 'en_attente',
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  notes_admin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_commandes_statut ON public.commandes(statut);
CREATE INDEX idx_commandes_created_at ON public.commandes(created_at DESC);
CREATE INDEX idx_commandes_stripe_session ON public.commandes(stripe_session_id);

-- Table onboardings
CREATE TABLE public.onboardings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id UUID NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE UNIQUE,
  -- Étape 1
  nom_commercial TEXT NOT NULL,
  adresse TEXT NOT NULL,
  code_postal TEXT NOT NULL,
  ville TEXT NOT NULL,
  telephone_affiche TEXT NOT NULL,
  site_web TEXT,
  email_google TEXT,
  pas_compte_google BOOLEAN NOT NULL DEFAULT false,
  categorie_principale TEXT NOT NULL,
  -- Étape 2
  description TEXT NOT NULL,
  type_presence TEXT NOT NULL, -- 'physique' ou 'deplacement'
  rayon_intervention_km INTEGER,
  horaires JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Étape 3
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_url TEXT,
  couverture_url TEXT,
  photos_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Étape 4
  attributs JSONB NOT NULL DEFAULT '[]'::jsonb,
  commentaires TEXT,
  cgv_acceptees BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboardings_commande ON public.onboardings(commande_id);

-- Système de rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

-- RLS user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable RLS sur commandes & onboardings
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboardings ENABLE ROW LEVEL SECURITY;

-- Pas de policy publique de SELECT sur commandes (seul l'admin lit)
-- Insert public car le tunnel de commande est anonyme — l'admin garde le contrôle via RLS sur SELECT/UPDATE
CREATE POLICY "Anyone can create a commande"
ON public.commandes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all commandes"
ON public.commandes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update commandes"
ON public.commandes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete commandes"
ON public.commandes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Onboardings : insertion publique liée à une commande payée (vérifiée côté serveur)
CREATE POLICY "Anyone can create onboarding"
ON public.onboardings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all onboardings"
ON public.onboardings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update onboardings"
ON public.onboardings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_commandes_updated_at
  BEFORE UPDATE ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboardings_updated_at
  BEFORE UPDATE ON public.onboardings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket photos-gmb (public en lecture pour l'admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos-gmb', 'photos-gmb', true);

CREATE POLICY "Anyone can upload photos to GMB"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'photos-gmb');

CREATE POLICY "Photos GMB publiquement lisibles"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'photos-gmb');

CREATE POLICY "Admins can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos-gmb' AND public.has_role(auth.uid(), 'admin'));
