
-- 1) Add document/justificatif fields to onboardings
ALTER TABLE public.onboardings
  ADD COLUMN IF NOT EXISTS justificatif_url text,
  ADD COLUMN IF NOT EXISTS justificatif_nom text,
  ADD COLUMN IF NOT EXISTS justificatif_type text,
  ADD COLUMN IF NOT EXISTS photos_etablissement jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Private storage bucket for sensitive documents (Kbis, factures...)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents-gmb', 'documents-gmb', false)
ON CONFLICT (id) DO NOTHING;

-- Admin-only read on documents bucket; uploads go through service-role server fn
DROP POLICY IF EXISTS "Admins read documents-gmb" ON storage.objects;
CREATE POLICY "Admins read documents-gmb"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents-gmb' AND public.has_role(auth.uid(), 'admin'));

-- 3) Auto-grant admin role to the super-admin email on signup
CREATE OR REPLACE FUNCTION public.grant_super_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'dz.societe.ecommerce@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_on_signup();

-- 4) Backfill: if the super-admin already exists, ensure the role is granted
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = 'dz.societe.ecommerce@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
