-- ÉTAPE 1 : Flux de recrutement des agents
--
-- Table agent_applications : candidatures simplifiées pour devenir agent.
CREATE TABLE IF NOT EXISTS public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  motivation text NOT NULL,
  status text NOT NULL DEFAULT 'en_attente'
);

-- Index pour filtrer par statut côté admin
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON public.agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_applications_created_at ON public.agent_applications(created_at DESC);

-- RLS : lecture admin uniquement, insertion publique
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

-- Lecture : uniquement les admins
CREATE POLICY "Admins read agent_applications" ON public.agent_applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insertion : publique (anon + authenticated)
CREATE POLICY "Anyone can submit agent_application" ON public.agent_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Update/Delete : admin uniquement
CREATE POLICY "Admins update agent_applications" ON public.agent_applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete agent_applications" ON public.agent_applications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_applications TO authenticated;
GRANT INSERT ON public.agent_applications TO anon;