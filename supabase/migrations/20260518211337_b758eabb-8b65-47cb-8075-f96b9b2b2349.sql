
-- 1. Ingénieurs son : simple text[] sur studios (cohérent avec genres/equipment)
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS engineers text[] NOT NULL DEFAULT ARRAY[]::text[];

-- 2. Table des salles
CREATE TABLE IF NOT EXISTS public.studio_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_per_hour numeric NOT NULL DEFAULT 0,
  min_booking_hours integer NOT NULL DEFAULT 1,
  max_booking_hours integer NOT NULL DEFAULT 24,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_rooms_studio_id ON public.studio_rooms(studio_id);

ALTER TABLE public.studio_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rooms viewable by everyone" ON public.studio_rooms;
CREATE POLICY "Rooms viewable by everyone"
  ON public.studio_rooms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Studio owner manages rooms insert" ON public.studio_rooms;
CREATE POLICY "Studio owner manages rooms insert"
  ON public.studio_rooms FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = studio_rooms.studio_id AND s.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Studio owner manages rooms update" ON public.studio_rooms;
CREATE POLICY "Studio owner manages rooms update"
  ON public.studio_rooms FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = studio_rooms.studio_id AND s.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Studio owner manages rooms delete" ON public.studio_rooms;
CREATE POLICY "Studio owner manages rooms delete"
  ON public.studio_rooms FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = studio_rooms.studio_id AND s.owner_id = auth.uid()
  ));

DROP TRIGGER IF EXISTS update_studio_rooms_updated_at ON public.studio_rooms;
CREATE TRIGGER update_studio_rooms_updated_at
  BEFORE UPDATE ON public.studio_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Lier bookings et slots à une salle (nullable = rétro-compat)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.studio_rooms(id) ON DELETE SET NULL;

ALTER TABLE public.studio_slots
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.studio_rooms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_studio_slots_room_id ON public.studio_slots(room_id);

-- 4. RLS bookings : autoriser INSERT avec room_id (en complément de la règle existante)
--    On remplace l'expression pour gérer le prix à partir de la salle si room_id est fourni
DROP POLICY IF EXISTS "Artist creates own booking" ON public.bookings;
CREATE POLICY "Artist creates own booking"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = artist_id
    AND end_at > start_at
    AND start_at >= (now() - interval '1 minute')
    AND EXISTS (
      SELECT 1 FROM public.studios s
      WHERE s.id = bookings.studio_id
        AND s.is_published = true
        AND s.is_paused = false
        AND s.owner_id <> auth.uid()
    )
    AND (
      -- Réservation au tarif du studio
      (bookings.room_id IS NULL AND EXISTS (
        SELECT 1 FROM public.studios s
        WHERE s.id = bookings.studio_id
          AND round(COALESCE(s.price_per_hour, 0) * (EXTRACT(epoch FROM (bookings.end_at - bookings.start_at)) / 3600.0), 2)
              = round(bookings.total_price, 2)
      ))
      OR
      -- Réservation au tarif d'une salle
      (bookings.room_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.studio_rooms r
        WHERE r.id = bookings.room_id
          AND r.studio_id = bookings.studio_id
          AND r.is_active = true
          AND round(COALESCE(r.price_per_hour, 0) * (EXTRACT(epoch FROM (bookings.end_at - bookings.start_at)) / 3600.0), 2)
              = round(bookings.total_price, 2)
      ))
    )
  );

-- 5. Trigger notification : inclure le nom de la salle si présent
CREATE OR REPLACE FUNCTION public.notify_studio_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_name  text;
  v_artist text;
  v_room  text;
  v_suffix text := '';
BEGIN
  SELECT owner_id, name INTO v_owner, v_name FROM public.studios WHERE id = NEW.studio_id;
  SELECT display_name INTO v_artist FROM public.profiles WHERE id = NEW.artist_id;
  IF NEW.room_id IS NOT NULL THEN
    SELECT name INTO v_room FROM public.studio_rooms WHERE id = NEW.room_id;
    IF v_room IS NOT NULL THEN
      v_suffix := ' (' || v_room || ')';
    END IF;
  END IF;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, studio_id, booking_id)
    VALUES (
      v_owner,
      'booking_new',
      'Nouvelle réservation',
      COALESCE(v_artist, 'Un artiste') || ' a réservé ' || COALESCE(v_name, 'votre studio') || v_suffix
        || ' le ' || to_char(NEW.start_at AT TIME ZONE 'UTC', 'DD/MM HH24:MI'),
      '/studio/dashboard',
      NEW.studio_id,
      NEW.id
    );
  END IF;

  IF NEW.artist_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, studio_id, booking_id)
    VALUES (
      NEW.artist_id,
      'booking_confirmed',
      'Réservation confirmée',
      'Votre réservation chez ' || COALESCE(v_name, 'le studio') || v_suffix
        || ' le ' || to_char(NEW.start_at AT TIME ZONE 'UTC', 'DD/MM HH24:MI') || ' est confirmée.',
      '/dashboard',
      NEW.studio_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;
