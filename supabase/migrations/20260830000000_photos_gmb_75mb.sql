-- Limite de taille du bucket photos-gmb portée à 75 MiB (78 643 200 octets).
-- Nécessaire pour autoriser l'upload DIRECT de vidéos jusqu'à 75 Mo (limite
-- Google Business Profile) vers Supabase Storage : le fichier ne transite pas
-- par une Vercel Function, seule la limite du bucket s'applique.
-- Idempotent : ré-exécutable sans effet de bord.
UPDATE storage.buckets
SET file_size_limit = 78643200
WHERE id = 'photos-gmb';