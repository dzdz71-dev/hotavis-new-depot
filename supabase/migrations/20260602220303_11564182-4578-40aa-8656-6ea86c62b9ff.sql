-- Active les extensions nécessaires pour planifier des tâches
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Supprime un éventuel job existant pour éviter les doublons (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hotavis-onboarding-reminders') THEN
    PERFORM cron.unschedule('hotavis-onboarding-reminders');
  END IF;
END $$;

-- Programme un appel HTTP toutes les heures vers l'endpoint de relance
-- L'URL stable du projet est project--{lovable-project-id}.lovable.app
-- L'authentification se fait via le header `apikey` avec la clé publishable.
SELECT cron.schedule(
  'hotavis-onboarding-reminders',
  '0 * * * *', -- toutes les heures à HH:00
  $$
  SELECT net.http_get(
    url := 'https://project--f5895416-bbef-49a3-bdf7-1458d598ea3b.lovable.app/api/public/cron-reminders',
    headers := jsonb_build_object(
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqc3lhbXF6eXFwY3V4cmRsdmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDA3NzksImV4cCI6MjA5NTIxNjc3OX0.OiWGjpaEQSCJnacjzMmQ6sHto5RS0tgpct8w7R6sVjs',
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
