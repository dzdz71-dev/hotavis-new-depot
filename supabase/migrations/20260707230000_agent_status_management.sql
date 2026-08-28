-- =====================================================================
-- Gestion du statut des agents (suspendre / supprimer / réactiver)
-- =====================================================================
-- Ajoute les colonnes status, suspended_at, deleted_at à user_roles
-- pour permettre la suspension et la suppression (soft delete) des agents.
-- =====================================================================

-- 1. Ajout des colonnes de statut sur user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Index pour filtrer rapidement les agents actifs/suspendus/supprimés
CREATE INDEX IF NOT EXISTS idx_user_roles_status ON public.user_roles(status);

-- 3. Les policies existantes ("Admins can manage roles") couvrent déjà
--    les UPDATE/DELETE sur user_roles pour les admins, aucune policy
--    supplémentaire n'est nécessaire.