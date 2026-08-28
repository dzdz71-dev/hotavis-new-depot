-- Migration: Ajout de la colonne attributs_personnalises à la table onboardings
-- Permet au client d'ajouter des attributs ou particularités personnalisés
-- qui ne sont pas proposés dans la liste prédéfinie Hotavis.

ALTER TABLE public.onboardings
  ADD COLUMN IF NOT EXISTS attributs_personnalises JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.onboardings.attributs_personnalises IS
  'Attributs ou particularités ajoutés librement par le client (non issus de la liste prédéfinie). Tableau JSON de chaînes de caractères.';