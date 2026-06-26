
-- Drop and recreate pg_net in extensions schema (it doesn't support ALTER SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hotavis-onboarding-reminders') THEN
    PERFORM cron.unschedule('hotavis-onboarding-reminders');
  END IF;
END $$;

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

SELECT cron.schedule(
  'hotavis-onboarding-reminders',
  '0 * * * *',
  $cron$
  SELECT extensions.http_get(
    url := 'https://project--f5895416-bbef-49a3-bdf7-1458d598ea3b.lovable.app/api/public/cron-reminders'
  ) AS request_id;
  $cron$
);

-- Restrict has_role EXECUTE to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Lock down photos-gmb storage. Server uploads use service role (bypass RLS).
-- Bucket stays public so existing image URLs keep serving via CDN.
DROP POLICY IF EXISTS "Anyone can upload photos to GMB" ON storage.objects;
DROP POLICY IF EXISTS "Photos GMB publiquement lisibles" ON storage.objects;

CREATE POLICY "Admins manage photos-gmb"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'photos-gmb' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'photos-gmb' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Tighten always-true permissive INSERT policies on public submission tables
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

DROP POLICY IF EXISTS "Anyone can create onboarding" ON public.onboardings;
CREATE POLICY "Anyone can create onboarding"
ON public.onboardings FOR INSERT TO anon, authenticated
WITH CHECK (
  commande_id IS NOT NULL
  AND length(coalesce(nom_commercial, '')) BETWEEN 1 AND 200
  AND length(coalesce(ville, '')) BETWEEN 1 AND 120
);
