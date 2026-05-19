-- 1. Move btree_gist out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION btree_gist SET SCHEMA extensions;

-- 2. Revoke EXECUTE on internal SECURITY DEFINER functions from public/anon/authenticated.
-- Triggers fire as the table owner regardless of EXECUTE grants on the function.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.sync_role_from_profile()',
    'public.notify_welcome_on_profile()',
    'public.notify_studio_on_booking()',
    'public.prevent_booking_overlap()',
    'public.protect_booking_fields()',
    'public.validate_studio_social_urls()',
    'public.delete_auth_user_on_profile_delete()',
    'public.update_updated_at_column()',
    'public.finalize_past_bookings()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$;

-- has_role: keep it usable by RLS policies (which run as the invoker).
-- It's safe because it only returns boolean for the queried (user_id, role) pair.
-- No change needed.

-- 3. Disable bucket listing for studio-images while keeping public URL reads.
-- The bucket.public=true flag serves files via the public CDN without RLS.
-- Removing the broad storage.objects SELECT policy blocks the list() API.
DROP POLICY IF EXISTS "studio-images public read objects" ON storage.objects;