-- Make auth -> profile sync resilient to incomplete or invalid signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type public.account_type := 'artist'::public.account_type;
  v_display_name text;
BEGIN
  IF NEW.raw_user_meta_data ? 'account_type'
     AND NEW.raw_user_meta_data->>'account_type' IN ('artist', 'studio') THEN
    v_account_type := (NEW.raw_user_meta_data->>'account_type')::public.account_type;
  END IF;

  v_display_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), '');
  IF v_display_name IS NULL THEN
    v_display_name := COALESCE(NULLIF(trim(NEW.email), ''), 'Utilisateur Stud.Reser');
  END IF;

  INSERT INTO public.profiles (id, account_type, display_name)
  VALUES (NEW.id, v_account_type, v_display_name)
  ON CONFLICT (id) DO UPDATE
  SET account_type = EXCLUDED.account_type,
      display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
      updated_at = now();

  RETURN NEW;
END;
$function$;

-- Create a draft studio row automatically for Studio accounts
CREATE OR REPLACE FUNCTION public.create_default_studio_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
BEGIN
  IF NEW.account_type <> 'studio'::public.account_type THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF(trim(NEW.display_name), ''), 'Nouveau studio');

  INSERT INTO public.studios (
    owner_id,
    name,
    city,
    country,
    tagline,
    description,
    price_per_hour,
    capacity,
    gallery,
    genres,
    equipment,
    is_published,
    is_paused,
    min_booking_hours,
    max_booking_hours,
    engineers
  )
  SELECT
    NEW.id,
    v_name,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    1,
    '[]'::jsonb,
    ARRAY[]::text[],
    ARRAY[]::text[],
    false,
    false,
    2,
    12,
    ARRAY[]::text[]
  WHERE NOT EXISTS (
    SELECT 1 FROM public.studios s WHERE s.owner_id = NEW.id
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS create_default_studio_for_profile_trigger ON public.profiles;
CREATE TRIGGER create_default_studio_for_profile_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_studio_for_profile();

-- Backfill studio draft rows for existing Studio profiles that do not have one yet
INSERT INTO public.studios (
  owner_id,
  name,
  city,
  country,
  tagline,
  description,
  price_per_hour,
  capacity,
  gallery,
  genres,
  equipment,
  is_published,
  is_paused,
  min_booking_hours,
  max_booking_hours,
  engineers
)
SELECT
  p.id,
  COALESCE(NULLIF(trim(p.display_name), ''), 'Nouveau studio'),
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  1,
  '[]'::jsonb,
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  false,
  2,
  12,
  ARRAY[]::text[]
FROM public.profiles p
WHERE p.account_type = 'studio'::public.account_type
  AND NOT EXISTS (
    SELECT 1 FROM public.studios s WHERE s.owner_id = p.id
  );

REVOKE EXECUTE ON FUNCTION public.create_default_studio_for_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;