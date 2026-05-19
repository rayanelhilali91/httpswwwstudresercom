-- Defense-in-depth: prevent client-tampered prices even if someone bypasses the server function.
-- Replace the permissive artist insert policy with one that forces total_price to match
-- studio.price_per_hour * duration_hours.

DROP POLICY IF EXISTS "Artist creates own booking" ON public.bookings;

CREATE POLICY "Artist creates own booking"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = artist_id
  AND end_at > start_at
  AND start_at >= now() - interval '1 minute'
  AND EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = bookings.studio_id
      AND s.is_published = true
      AND s.is_paused = false
      AND s.owner_id <> auth.uid()
      AND ROUND(
        (COALESCE(s.price_per_hour, 0))
        * (EXTRACT(EPOCH FROM (bookings.end_at - bookings.start_at)) / 3600.0)
      , 2) = ROUND(bookings.total_price, 2)
  )
);

-- Tighten studio owner UPDATE: cannot rewrite ownership / pricing fields.
DROP POLICY IF EXISTS "Studio owner updates booking" ON public.bookings;

CREATE POLICY "Studio owner updates booking"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.studios s
          WHERE s.id = bookings.studio_id AND s.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.studios s
          WHERE s.id = bookings.studio_id AND s.owner_id = auth.uid())
);