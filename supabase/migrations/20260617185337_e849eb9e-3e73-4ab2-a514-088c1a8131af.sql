
REVOKE EXECUTE ON FUNCTION public.claim_commande(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_commande(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.grant_super_admin_on_signup() FROM PUBLIC, anon, authenticated;
-- Function runs as a trigger; only the trigger owner needs to invoke it.
GRANT EXECUTE ON FUNCTION public.grant_super_admin_on_signup() TO service_role, supabase_auth_admin;
