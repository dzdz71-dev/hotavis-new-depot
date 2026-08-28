-- =====================================================================
-- Réseaux sociaux structurés pour l'onboarding
-- Remplace le champ texte unique "reseaux_sociaux" (mélangé dans commentaires)
-- par des colonnes dédiées et lisibles.
-- =====================================================================

ALTER TABLE public.onboardings
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS reseaux_autres JSONB NOT NULL DEFAULT '[]'::jsonb;
-- reseaux_autres : tableau d'objets { label: string, url: string }
-- ex : [{"label":"Pinterest","url":"https://pinterest.com/..."}]