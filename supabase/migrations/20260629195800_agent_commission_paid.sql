-- ÉTAPE 3 : Suivi du paiement des commissions agent
--
-- Ajoute une colonne `commission_paid` (boolean, défaut false) sur commandes.
-- Permet à l'admin de marquer une commission comme "payée" et à l'agent de
-- voir le statut de paiement dans son historique de revenus.
ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS commission_paid boolean NOT NULL DEFAULT false;

-- Index pour filtrer rapidement les commissions impayées d'un agent
CREATE INDEX IF NOT EXISTS idx_commandes_commission_paid
  ON public.commandes(assigned_agent_id, commission_paid)
  WHERE statut = 'livrée';