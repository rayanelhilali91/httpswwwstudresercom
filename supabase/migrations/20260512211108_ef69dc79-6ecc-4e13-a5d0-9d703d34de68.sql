REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_role_from_profile() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;

-- Restrict bucket listing while still allowing direct file reads via public URL
DROP POLICY IF EXISTS "Studio images are publicly readable" ON storage.objects;
CREATE POLICY "Studio images public read by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-images');