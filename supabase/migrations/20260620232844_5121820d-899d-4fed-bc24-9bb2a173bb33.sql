
-- 1. Scope agent_notes SELECT to assigned commandes only
DROP POLICY IF EXISTS "Agents and admins read notes" ON public.agent_notes;
CREATE POLICY "Agents and admins read notes" ON public.agent_notes
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'agent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.commandes c
      WHERE c.id = agent_notes.commande_id
        AND c.assigned_agent_id = auth.uid()
    )
  )
);

-- 2. Add role check to UPDATE policy on agent_notes
DROP POLICY IF EXISTS "Authors update own notes" ON public.agent_notes;
CREATE POLICY "Authors update own notes" ON public.agent_notes
FOR UPDATE TO authenticated
USING (
  agent_id = auth.uid()
  AND (has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  agent_id = auth.uid()
  AND (has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- 3. Lock down onboardings INSERT — server-side (service role) handles inserts, so deny client INSERTs entirely
DROP POLICY IF EXISTS "Anyone can create onboarding" ON public.onboardings;

-- 4. Make storage policies on documents-gmb explicit: admins only for INSERT/UPDATE/DELETE
CREATE POLICY "Admins insert documents-gmb" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents-gmb' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update documents-gmb" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents-gmb' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'documents-gmb' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete documents-gmb" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents-gmb' AND has_role(auth.uid(), 'admin'::app_role));
