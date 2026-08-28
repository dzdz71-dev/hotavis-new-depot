-- =====================================================================
-- Photos métier (menus, réalisations, etc.) pour l'onboarding
-- Ajoute un champ pour les photos + une description de ce qu'elles représentent
-- =====================================================================

ALTER TABLE public.onboardings
  ADD COLUMN IF NOT EXISTS photos_metier JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photos_metier_description TEXT;
-- photos_metier : tableau d'URLs (string[])
-- photos_metier_description : description libre (ex: "Menu de notre restaurant")