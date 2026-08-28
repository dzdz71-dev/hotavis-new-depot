-- Ajout des champs "présentation" (obligatoire) et "linkedin_url" (optionnel) à la table candidatures
ALTER TABLE public.candidatures
  ADD COLUMN IF NOT EXISTS presentation TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
