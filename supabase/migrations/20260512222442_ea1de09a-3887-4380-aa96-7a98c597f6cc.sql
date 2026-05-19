ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_booking_hours integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_booking_hours integer NOT NULL DEFAULT 12;

DROP POLICY IF EXISTS "Published studios are viewable by everyone" ON public.studios;
CREATE POLICY "Published active studios are viewable by everyone"
  ON public.studios FOR SELECT
  USING (((is_published = true) AND (is_paused = false)) OR (auth.uid() = owner_id));