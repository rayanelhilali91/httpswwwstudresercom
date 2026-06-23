
-- 1. NOTIFICATIONS : policy DELETE pour les admins
DROP POLICY IF EXISTS "Admins delete any notification" ON public.notifications;
CREATE POLICY "Admins delete any notification"
ON public.notifications FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. BOOKINGS : CHECK status + policy UPDATE owner
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded'));

DROP POLICY IF EXISTS "Studio owner updates booking" ON public.bookings;
CREATE POLICY "Studio owner updates booking"
ON public.bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.studios s WHERE s.id = bookings.studio_id AND s.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.studios s WHERE s.id = bookings.studio_id AND s.owner_id = auth.uid())
  AND status IN ('confirmed', 'cancelled')
);

-- 3. STUDIO_SLOTS : index composites
CREATE INDEX IF NOT EXISTS idx_studio_slots_lookup
  ON public.studio_slots (studio_id, start_at, is_booked);
CREATE INDEX IF NOT EXISTS idx_studio_slots_room
  ON public.studio_slots (room_id, start_at) WHERE room_id IS NOT NULL;

-- 4. update_updated_at_column : SECURITY DEFINER + search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

-- 5. STUDIOS : index owner
CREATE INDEX IF NOT EXISTS idx_studios_owner ON public.studios (owner_id);

-- 6. BOOKINGS : index dashboard
CREATE INDEX IF NOT EXISTS idx_bookings_artist
  ON public.bookings (artist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_studio
  ON public.bookings (studio_id, start_at);

-- 7. NOTIFICATIONS : FK vers auth.users + index non-lues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_user_id_fkey'
      AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id, read_at) WHERE read_at IS NULL;

-- 8. STUDIO_CLAIMS : INSERT bloque si pending OU approved
DROP POLICY IF EXISTS "Users can create claims on unverified studios" ON public.studio_claims;
CREATE POLICY "Users can create claims on unverified studios"
ON public.studio_claims FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = studio_id
      AND s.status <> 'revendique_verifie'::public.studio_status
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.studio_claims sc
    WHERE sc.studio_id = studio_claims.studio_id
      AND sc.user_id = auth.uid()
      AND sc.status IN ('pending'::public.claim_status, 'approved'::public.claim_status)
  )
);

-- 10. PROFILES : longueur display_name
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) <= 100);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='artist_name'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_artist_name_length;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_artist_name_length
      CHECK (artist_name IS NULL OR char_length(artist_name) <= 100);
  END IF;
END $$;

-- BONUS : index bookings.status partiel
CREATE INDEX IF NOT EXISTS idx_bookings_status_end
  ON public.bookings (status, end_at)
  WHERE status NOT IN ('completed', 'cancelled');

-- BONUS : sécuriser fonctions admin
REVOKE EXECUTE ON FUNCTION public.approve_studio_claim(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.approve_studio_claim(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_studio_claim(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reject_studio_claim(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_studios_stats() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_studios_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_artists_stats() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_artists_stats() TO authenticated;
