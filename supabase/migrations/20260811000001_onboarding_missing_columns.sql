-- Migration: Ajout des colonnes manquantes à la table onboardings
-- Ces colonnes sont utilisées par le formulaire d'onboarding mais n'avaient pas encore été créées.

ALTER TABLE public.onboardings
  ADD COLUMN IF NOT EXISTS nom_legal TEXT,
  ADD COLUMN IF NOT EXISTS categories_secondaires JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS informations_complementaires TEXT,
  ADD COLUMN IF NOT EXISTS zones_desservies JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.onboardings.nom_legal IS 'Nom légal de l''entreprise (raison sociale), optionnel.';
COMMENT ON COLUMN public.onboardings.categories_secondaires IS 'Catégories secondaires d''activité. Tableau JSON de chaînes de caractères.';
COMMENT ON COLUMN public.onboardings.informations_complementaires IS 'Informations complémentaires libres fournies par le client.';
COMMENT ON COLUMN public.onboardings.zones_desservies IS 'Zones géographiques desservies (villes, codes postaux). Tableau JSON de chaînes de caractères.';