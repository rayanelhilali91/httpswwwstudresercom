ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS engineer text;

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
  v_room  text;
  v_suffix text := '';
  v_eng_suffix text := '';
BEGIN
  SELECT owner_id, name INTO v_owner, v_name FROM public.studios WHERE id = NEW.studio_id;
  SELECT display_name INTO v_artist FROM public.profiles WHERE id = NEW.artist_id;
  IF NEW.room_id IS NOT NULL THEN
    SELECT name INTO v_room FROM public.studio_rooms WHERE id = NEW.room_id;
    IF v_room IS NOT NULL THEN
      v_suffix := ' (' || v_room || ')';
    END IF;
  END IF;
  IF NEW.engineer IS NOT NULL AND length(NEW.engineer) > 0 THEN
    v_eng_suffix := ' — ingé son : ' || NEW.engineer;
  END IF;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, studio_id, booking_id)
    VALUES (
      v_owner, 'booking_new', 'Nouvelle réservation',
      COALESCE(v_artist, 'Un artiste') || ' a réservé ' || COALESCE(v_name, 'votre studio') || v_suffix
        || ' le ' || to_char(NEW.start_at AT TIME ZONE 'UTC', 'DD/MM HH24:MI') || v_eng_suffix,
      '/studio/dashboard', NEW.studio_id, NEW.id
    );
  END IF;

  IF NEW.artist_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, studio_id, booking_id)
    VALUES (
      NEW.artist_id, 'booking_confirmed', 'Réservation confirmée',
      'Votre réservation chez ' || COALESCE(v_name, 'le studio') || v_suffix
        || ' le ' || to_char(NEW.start_at AT TIME ZONE 'UTC', 'DD/MM HH24:MI') || ' est confirmée.' || v_eng_suffix,
      '/dashboard', NEW.studio_id, NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;