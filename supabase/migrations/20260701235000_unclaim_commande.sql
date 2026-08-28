-- Fonction atomique unclaim_commande : libère une mission
-- Remet le statut à 'payé' et vide assigned_agent_id / assigned_at
-- Seul l'agent assigné (ou service_role) peut libérer la mission.
CREATE OR REPLACE FUNCTION public.unclaim_commande(_commande_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _row record;
  _uid uuid := auth.uid();
BEGIN
  SELECT id, statut, assigned_agent_id INTO _row
  FROM public.commandes WHERE id = _commande_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Vérifie que l'appelant est bien l'agent assigné
  IF _row.assigned_agent_id IS NULL OR _row.assigned_agent_id <> _uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_assigned');
  END IF;

  -- On ne peut libérer que les dossiers non livrés
  IF _row.statut = 'livrée' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_delivered');
  END IF;

  UPDATE public.commandes
  SET assigned_agent_id = NULL,
      assigned_at = NULL,
      statut = 'payé'::commande_statut
  WHERE id = _commande_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.unclaim_commande(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unclaim_commande(uuid) TO authenticated, service_role;