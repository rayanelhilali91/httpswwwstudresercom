
-- 1. Attach protect_booking_fields trigger (function exists but trigger was missing)
DROP TRIGGER IF EXISTS trg_protect_booking_fields ON public.bookings;
CREATE TRIGGER trg_protect_booking_fields
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.protect_booking_fields();

-- 2. Tighten storage policies for studio-images: require user to own a studio
DROP POLICY IF EXISTS "Studio owners upload images" ON storage.objects;
DROP POLICY IF EXISTS "Studio owners update images" ON storage.objects;
DROP POLICY IF EXISTS "Studio owners delete images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload studio images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update studio images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete studio images" ON storage.objects;

CREATE POLICY "Studio owners upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (SELECT 1 FROM public.studios s WHERE s.owner_id = auth.uid())
);

CREATE POLICY "Studio owners update images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (SELECT 1 FROM public.studios s WHERE s.owner_id = auth.uid())
);

CREATE POLICY "Studio owners delete images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (SELECT 1 FROM public.studios s WHERE s.owner_id = auth.uid())
);

-- 3. Restructure user_roles policies to remove permissive/restrictive ambiguity
DROP POLICY IF EXISTS "Block non-admin role mutations" ON public.user_roles;
DROP POLICY IF EXISTS "Roles viewable by self or admin" ON public.user_roles;

-- Permissive SELECT scoped to authenticated only
CREATE POLICY "Roles viewable by self or admin"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Restrictive: only admins may INSERT/UPDATE/DELETE
CREATE POLICY "Only admins may insert roles"
ON public.user_roles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins may update roles"
ON public.user_roles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins may delete roles"
ON public.user_roles AS RESTRICTIVE
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
