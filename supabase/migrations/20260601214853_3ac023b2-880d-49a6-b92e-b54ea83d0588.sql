
ALTER TABLE public.onboardings
  ADD COLUMN IF NOT EXISTS date_creation date,
  ADD COLUMN IF NOT EXISTS facture_url text,
  ADD COLUMN IF NOT EXISTS facture_nom text,
  ADD COLUMN IF NOT EXISTS facture_type text;

ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone;
