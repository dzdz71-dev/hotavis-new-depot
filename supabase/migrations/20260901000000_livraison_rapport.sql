-- Migration: Workflow de livraison avec rapport PDF
-- 1. Colonnes de livraison sur commandes (tableau admin + rapport)
-- 2. Bucket prive reports-gmb (rapports PDF + captures d'ecran)
-- Idempotente, ne modifie aucune donnee existante.

ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS livraison_details jsonb,
  ADD COLUMN IF NOT EXISTS rapport_url text,
  ADD COLUMN IF NOT EXISTS rapport_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS rapport_captures jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.commandes.livraison_details IS 'Tableau de livraison renseigne par l''admin : [{key,label,categorie,statut,observation}]';
COMMENT ON COLUMN public.commandes.rapport_url IS 'Chemin Storage du rapport PDF dans reports-gmb';
COMMENT ON COLUMN public.commandes.rapport_sent_at IS 'Date du dernier envoi du rapport au client';
COMMENT ON COLUMN public.commandes.rapport_captures IS 'Captures d''ecran jointes au rapport : [chemins Storage]';

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('reports-gmb', 'reports-gmb', false, 26214400)
ON CONFLICT (id) DO NOTHING;