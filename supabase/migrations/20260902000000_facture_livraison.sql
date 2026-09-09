-- =====================================================================
-- CLOTURE COMPLETE DE COMMANDE : persistance de la facture generee
-- lors de la livraison (rapport PDF + facture PDF dans un seul email).
--
-- facture_url      : chemin du PDF dans le bucket PRIVE reports-gmb
--                    ({commande_id}/facture.pdf). NULL = jamais generee.
-- facture_emise_at : date de passage du statut facture a "Emise".
--
-- Le statut lui-meme reutilise la colonne existante
-- commandes.facture_status ('non_emise' | 'emise' | 'payee') :
-- aucune nouvelle contrainte, aucun nouvel enum.
--
-- Aucun nouveau bucket : reports-gmb (prive) existe deja, et la purge
-- a la suppression de commande couvre tout le dossier {commande_id}/
-- (rapport-livraison.pdf, captures/, facture.pdf).
-- =====================================================================

ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS facture_url text,
  ADD COLUMN IF NOT EXISTS facture_emise_at timestamptz;
