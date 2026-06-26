
CREATE TYPE public.candidature_statut AS ENUM ('nouveau','accepté','rejeté');

CREATE TABLE public.candidatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT NOT NULL,
  siret TEXT,
  fiche_url TEXT,
  qcm_q1 TEXT NOT NULL,
  qcm_score INTEGER NOT NULL DEFAULT 0,
  q2_reponse TEXT NOT NULL,
  q3_reponse TEXT NOT NULL,
  statut public.candidature_statut NOT NULL DEFAULT 'nouveau',
  notes_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidatures TO authenticated;
GRANT INSERT ON public.candidatures TO anon;
GRANT ALL ON public.candidatures TO service_role;

ALTER TABLE public.candidatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can apply" ON public.candidatures
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read candidatures" ON public.candidatures
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update candidatures" ON public.candidatures
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete candidatures" ON public.candidatures
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER candidatures_updated_at
  BEFORE UPDATE ON public.candidatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
