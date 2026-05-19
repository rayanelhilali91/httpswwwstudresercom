
-- 1. Drop duplicate triggers
DROP TRIGGER IF EXISTS on_booking_created_notify_studio ON public.bookings;
DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created_sync_role ON public.profiles;

-- 2. Update booking notification function: notify both studio owner AND artist
CREATE OR REPLACE FUNCTION public.notify_studio_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_name  text;
  v_artist text;
BEGIN
  SELECT owner_id, name INTO v_owner, v_name FROM public.studios WHERE id = NEW.studio_id;
  SELECT display_name INTO v_artist FROM public.profiles WHERE id = NEW.artist_id;

  -- Notify studio owner
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

  -- Notify artist
  IF NEW.artist_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, studio_id, booking_id)
    VALUES (
      NEW.artist_id,
      'booking_confirmed',
      'Réservation confirmée',
      'Votre réservation chez ' || COALESCE(v_name, 'le studio')
        || ' le ' || to_char(NEW.start_at AT TIME ZONE 'UTC', 'DD/MM HH24:MI') || ' est confirmée.',
      '/dashboard',
      NEW.studio_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;
