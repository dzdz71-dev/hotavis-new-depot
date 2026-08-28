-- Ajout de la colonne videos_urls pour stocker les URLs des vidéos de l'onboarding
-- Type jsonb pour stocker un tableau d'URLs de vidéos

ALTER TABLE public.onboardings
ADD COLUMN IF NOT EXISTS videos_urls jsonb DEFAULT '[]'::jsonb;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN public.onboardings.videos_urls IS 'Tableau d\'URLs de vidéos uploadées par le client (max 10 vidéos, formats MP4, MOV, WMV, max 75 Mo par vidéo, max 30s)';