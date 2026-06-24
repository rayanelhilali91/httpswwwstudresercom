
-- ===== BOOKINGS =====
-- Drop the over-permissive duplicate policy
DROP POLICY IF EXISTS "Studio owner updates booking status only" ON public.bookings;

-- Extend protect_booking_fields trigger to also block `engineer` modifications
-- by non-admins (covers both studio owner and artist).
CREATE OR REPLACE FUNCTION public.protect_booking_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.studio_id IS DISTINCT FROM OLD.studio_id
     OR NEW.artist_id IS DISTINCT FROM OLD.artist_id
     OR NEW.total_price IS DISTINCT FROM OLD.total_price
     OR NEW.start_at IS DISTINCT FROM OLD.start_at
     OR NEW.end_at IS DISTINCT FROM OLD.end_at
     OR NEW.room_id IS DISTINCT FROM OLD.room_id
     OR NEW.engineer IS DISTINCT FROM OLD.engineer
     OR NEW.slot_id IS DISTINCT FROM OLD.slot_id
     OR NEW.artist_id IS DISTINCT FROM OLD.artist_id
  THEN
    RAISE EXCEPTION 'Modification interdite de ces champs sur une réservation.';
  END IF;

  RETURN NEW;
END;
$$;

-- ===== PROFILES =====
-- Replace the wide-open SELECT policy with scoped policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Anonymous visitors: only profiles that own a published studio
CREATE POLICY "Anon sees published studio owner profiles"
ON public.profiles FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.owner_id = profiles.id AND s.is_published = true
  )
);

-- Authenticated users: own profile, published studio owners,
-- and any profile they share a booking with (as artist or studio owner)
CREATE POLICY "Authenticated sees relevant profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.owner_id = profiles.id AND s.is_published = true
  )
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.studios s ON s.id = b.studio_id
    WHERE (
      -- viewer is the artist and target is the studio owner
      (b.artist_id = auth.uid() AND s.owner_id = profiles.id)
      OR
      -- viewer is the studio owner and target is the artist
      (s.owner_id = auth.uid() AND b.artist_id = profiles.id)
    )
  )
);
