-- Migration: Nouvelles colonnes photos pour onboarding
-- Ajoute photos_exterieures, photos_interieures, photos_equipe

ALTER TABLE onboardings
  ADD COLUMN IF NOT EXISTS photos_exterieures JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photos_interieures JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photos_equipe JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN onboardings.photos_exterieures IS 'Photos de l''extérieur (façade, enseigne, entrée, parking, terrasse)';
COMMENT ON COLUMN onboardings.photos_interieures IS 'Photos de l''intérieur (accueil, salle, bureaux, atelier)';
COMMENT ON COLUMN onboardings.photos_equipe IS 'Photos de l''équipe (équipe complète, collaborateurs, artisans)';