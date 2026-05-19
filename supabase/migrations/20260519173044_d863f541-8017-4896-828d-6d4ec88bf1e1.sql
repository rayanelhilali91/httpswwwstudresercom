-- =========================================================
-- 1. PREVENT DOUBLE-BOOKING AT DATABASE LEVEL
-- =========================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Trigger function to check overlapping bookings (sees ALL rows, bypasses RLS)
CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count int;
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookings b
  WHERE b.studio_id = NEW.studio_id
    AND b.id <> NEW.id
    AND b.status <> 'cancelled'
    AND b.start_at < NEW.end_at
    AND b.end_at > NEW.start_at
    AND (
      (NEW.room_id IS NULL AND b.room_id IS NULL)
      OR (NEW.room_id IS NOT NULL AND b.room_id = NEW.room_id)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé.' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_booking_overlap_trigger ON public.bookings;
CREATE TRIGGER prevent_booking_overlap_trigger
  BEFORE INSERT OR UPDATE OF start_at, end_at, status, room_id, studio_id
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_booking_overlap();

-- =========================================================
-- 2. RESTRICT studio_rooms & studio_slots TO PUBLISHED STUDIOS
-- =========================================================
DROP POLICY IF EXISTS "Rooms viewable by everyone" ON public.studio_rooms;
CREATE POLICY "Rooms viewable for published studios or owner"
ON public.studio_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = studio_rooms.studio_id
      AND (
        (s.is_published = true AND s.is_paused = false)
        OR s.owner_id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "Slots viewable by everyone" ON public.studio_slots;
CREATE POLICY "Slots viewable for published studios or owner"
ON public.studio_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = studio_slots.studio_id
      AND (
        (s.is_published = true AND s.is_paused = false)
        OR s.owner_id = auth.uid()
      )
  )
);

-- =========================================================
-- 3. RESTRICT STUDIO OWNER BOOKING UPDATES (status only)
-- =========================================================
DROP POLICY IF EXISTS "Studio owner updates booking" ON public.bookings;
CREATE POLICY "Studio owner updates booking status only"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = bookings.studio_id AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = bookings.studio_id AND s.owner_id = auth.uid()
  )
);

-- Trigger to prevent modification of financial/identity fields by anyone
-- except admins
CREATE OR REPLACE FUNCTION public.protect_booking_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can do anything
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Block changes to protected fields
  IF NEW.studio_id IS DISTINCT FROM OLD.studio_id
     OR NEW.artist_id IS DISTINCT FROM OLD.artist_id
     OR NEW.total_price IS DISTINCT FROM OLD.total_price
     OR NEW.start_at IS DISTINCT FROM OLD.start_at
     OR NEW.end_at IS DISTINCT FROM OLD.end_at
     OR NEW.room_id IS DISTINCT FROM OLD.room_id
  THEN
    RAISE EXCEPTION 'Modification interdite de ces champs sur une réservation.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_booking_fields_trigger ON public.bookings;
CREATE TRIGGER protect_booking_fields_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_booking_fields();

-- =========================================================
-- 4. PREVENT USER ROLE SELF-ESCALATION
-- =========================================================
-- Explicit deny: regular users cannot insert/update/delete on user_roles
-- (only the "Admins manage roles" ALL policy already allows admins).
-- Add a restrictive policy to make the intent explicit and bulletproof.
DROP POLICY IF EXISTS "Block non-admin role mutations" ON public.user_roles;
CREATE POLICY "Block non-admin role mutations"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Note: the sync_role_from_profile trigger runs as SECURITY DEFINER
-- and bypasses RLS, so signup still works.

-- =========================================================
-- 5. LOCK DOWN SECURITY DEFINER ADMIN FUNCTIONS
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.admin_get_artists_stats() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_artist_bookings(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_studios_stats() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.finalize_past_bookings() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_auth_user_on_profile_delete() FROM anon, authenticated, public;

-- These admin functions check has_role internally — grant back to authenticated
-- so the internal check decides. Functions remain SECURITY DEFINER but only
-- admins get past the guard.
GRANT EXECUTE ON FUNCTION public.admin_get_artists_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_artist_bookings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_studios_stats() TO authenticated;

-- Internal-only trigger/maintenance functions: no direct execute for clients
-- (triggers still fire because triggers don't require EXECUTE on the function
-- for the invoking role when the trigger owner has rights).

-- =========================================================
-- 6. STORAGE: PREVENT PUBLIC BUCKET LISTING
-- =========================================================
-- Drop overly broad SELECT policies on studio-images, keep object access by id/path only
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname ILIKE '%studio-images%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public read of individual objects (no listing). Listing requires bucket-level
-- SELECT which we do not grant.
CREATE POLICY "studio-images public read objects"
ON storage.objects
FOR SELECT
USING (bucket_id = 'studio-images');

-- Authenticated users can upload to their own folder
CREATE POLICY "studio-images authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "studio-images authenticated update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "studio-images authenticated delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =========================================================
-- 7. VALIDATE SOCIAL URLs (domain whitelist)
-- =========================================================
CREATE OR REPLACE FUNCTION public.validate_studio_social_urls()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_host text;
BEGIN
  IF NEW.instagram_url IS NOT NULL AND length(NEW.instagram_url) > 0 THEN
    IF NEW.instagram_url !~* '^https://([a-z0-9-]+\.)*instagram\.com(/.*)?$' THEN
      RAISE EXCEPTION 'Lien Instagram invalide (doit pointer vers instagram.com).';
    END IF;
  END IF;
  IF NEW.tiktok_url IS NOT NULL AND length(NEW.tiktok_url) > 0 THEN
    IF NEW.tiktok_url !~* '^https://([a-z0-9-]+\.)*tiktok\.com(/.*)?$' THEN
      RAISE EXCEPTION 'Lien TikTok invalide (doit pointer vers tiktok.com).';
    END IF;
  END IF;
  IF NEW.snapchat_url IS NOT NULL AND length(NEW.snapchat_url) > 0 THEN
    IF NEW.snapchat_url !~* '^https://([a-z0-9-]+\.)*snapchat\.com(/.*)?$' THEN
      RAISE EXCEPTION 'Lien Snapchat invalide (doit pointer vers snapchat.com).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_studio_social_urls_trigger ON public.studios;
CREATE TRIGGER validate_studio_social_urls_trigger
  BEFORE INSERT OR UPDATE OF instagram_url, tiktok_url, snapchat_url
  ON public.studios
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_studio_social_urls();