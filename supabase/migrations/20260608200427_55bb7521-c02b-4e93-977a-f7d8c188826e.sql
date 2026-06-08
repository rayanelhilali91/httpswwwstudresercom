
-- 1) Empêcher la création automatique de studio à l'inscription
DROP TRIGGER IF EXISTS create_default_studio_for_profile_trigger ON public.profiles;
DROP TRIGGER IF EXISTS trg_create_default_studio_for_profile ON public.profiles;

-- 2) INSERT : admin uniquement
DROP POLICY IF EXISTS "Studio owners can insert" ON public.studios;
CREATE POLICY "Only admins can create studios"
ON public.studios
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) DELETE : admin uniquement
DROP POLICY IF EXISTS "Studio owners can delete" ON public.studios;
CREATE POLICY "Only admins can delete studios"
ON public.studios
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
