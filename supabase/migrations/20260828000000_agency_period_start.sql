-- Période de référence des indicateurs "Total" et "CA total" du dashboard admin.
-- NULL (défaut) : toutes les commandes sont comptées (comportement d'origine).
-- Définie via le bouton "Commencer à zéro" : seules les commandes créées après
-- cette date sont comptées. Aucune donnée n'est supprimée ou modifiée.
ALTER TABLE public.agency_settings
  ADD COLUMN IF NOT EXISTS period_start_at timestamptz;
