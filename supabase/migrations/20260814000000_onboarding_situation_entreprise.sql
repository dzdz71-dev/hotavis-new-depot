-- Migration: Ajout de l'étape 6 "Situation de votre entreprise" à la table onboardings
-- Champs : entreprise_statut_creation (creee / en_cours / non_creee)
--          validation_google_comprise (boolean, défaut false)
-- Cette migration est idempotente et ne modifie pas les données existantes.

ALTER TABLE public.onboardings
  ADD COLUMN IF NOT EXISTS entreprise_statut_creation TEXT;

ALTER TABLE public.onboardings
  ADD COLUMN IF NOT EXISTS validation_google_comprise BOOLEAN NOT NULL DEFAULT false;

-- Contrainte CHECK idempotente pour restreindre les valeurs autorisées
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'onboardings_entreprise_statut_creation_check'
      AND conrelid = 'public.onboardings'::regclass
  ) THEN
    ALTER TABLE public.onboardings
      ADD CONSTRAINT onboardings_entreprise_statut_creation_check
      CHECK (entreprise_statut_creation IS NULL OR entreprise_statut_creation IN ('creee', 'en_cours', 'non_creee'));
  END IF;
END $$;

COMMENT ON COLUMN public.onboardings.entreprise_statut_creation IS
  'Statut de création de l''entreprise (étape 6). Valeurs autorisées : creee, en_cours, non_creee.';
COMMENT ON COLUMN public.onboardings.validation_google_comprise IS
  'Le client confirme avoir pris connaissance de sa situation actuelle et souhaite poursuivre sa commande (étape 6).';