
-- Geolocation
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  studio_id uuid,
  booking_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their notifications" ON public.notifications;
CREATE POLICY "Users see their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users update their notifications" ON public.notifications;
CREATE POLICY "Users update their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their notifications" ON public.notifications;
CREATE POLICY "Users delete their notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END$$;

-- Trigger: notify studio owner on new booking
CREATE OR REPLACE FUNCTION public.notify_studio_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_name  text;
  v_artist text;
BEGIN
  SELECT owner_id, name INTO v_owner, v_name FROM public.studios WHERE id = NEW.studio_id;
  SELECT display_name INTO v_artist FROM public.profiles WHERE id = NEW.artist_id;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, studio_id, booking_id)
    VALUES (
      v_owner,
      'booking_new',
      'Nouvelle réservation',
      COALESCE(v_artist, 'Un artiste') || ' a réservé ' || COALESCE(v_name, 'votre studio')
        || ' le ' || to_char(NEW.start_at AT TIME ZONE 'UTC', 'DD/MM HH24:MI'),
      '/studio/dashboard',
      NEW.studio_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_studio_on_booking ON public.bookings;
CREATE TRIGGER trg_notify_studio_on_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_studio_on_booking();
