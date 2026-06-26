
-- Colonnes additionnelles sur commandes
ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS commission_centimes integer;

CREATE INDEX IF NOT EXISTS idx_commandes_assigned_agent ON public.commandes(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON public.commandes(statut);

-- Table agent_notes
CREATE TABLE IF NOT EXISTS public.agent_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id uuid NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_notes TO authenticated;
GRANT ALL ON public.agent_notes TO service_role;
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents and admins read notes" ON public.agent_notes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents write own notes" ON public.agent_notes
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid() AND (public.has_role(auth.uid(), 'agent'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authors update own notes" ON public.agent_notes
  FOR UPDATE TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Admins delete notes" ON public.agent_notes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Table agency_settings (singleton)
CREATE TABLE IF NOT EXISTS public.agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_centimes_per_fiche integer NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  singleton boolean NOT NULL DEFAULT true UNIQUE
);
GRANT SELECT, INSERT, UPDATE ON public.agency_settings TO authenticated;
GRANT ALL ON public.agency_settings TO service_role;
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage agency settings" ON public.agency_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.agency_settings (commission_centimes_per_fiche)
VALUES (5000)
ON CONFLICT (singleton) DO NOTHING;

-- Table agent_invitations
CREATE TABLE IF NOT EXISTS public.agent_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_invitations TO authenticated;
GRANT ALL ON public.agent_invitations TO service_role;
ALTER TABLE public.agent_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invitations" ON public.agent_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Vue commandes_agent_view : pour agents (exclut financier + PII client)
CREATE OR REPLACE VIEW public.commandes_agent_view
WITH (security_invoker=on) AS
  SELECT
    id, prenom, nom, entreprise, ville, activite, statut,
    assigned_agent_id, assigned_at, created_at, paid_at, delivered_at
  FROM public.commandes;

GRANT SELECT ON public.commandes_agent_view TO authenticated;

-- Policies: agents lisent le pool et leurs dossiers (table de base)
CREATE POLICY "Agents read pool and assigned" ON public.commandes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND (
      (statut = 'payé' AND assigned_agent_id IS NULL)
      OR assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents update assigned commandes" ON public.commandes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'agent'::app_role) AND assigned_agent_id = auth.uid());

CREATE POLICY "Agents read assigned onboardings" ON public.onboardings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.commandes c
      WHERE c.id = onboardings.commande_id AND c.assigned_agent_id = auth.uid()
    )
  );

-- Fonction atomique claim_commande
CREATE OR REPLACE FUNCTION public.claim_commande(_commande_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row record;
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

  UPDATE public.commandes
  SET assigned_agent_id = _uid,
      assigned_at = now(),
      statut = CASE WHEN statut = 'payé' THEN 'en_cours'::commande_statut ELSE statut END
  WHERE id = _commande_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_commande(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_commande(uuid) TO authenticated;
