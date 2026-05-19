-- 1. Prevent users from changing their own account_type (anti role-switch)
CREATE OR REPLACE FUNCTION public.protect_account_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Modification du type de compte interdite.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_account_type() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_account_type_trigger ON public.profiles;
CREATE TRIGGER protect_account_type_trigger
  BEFORE UPDATE OF account_type ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_account_type();

-- 2. Restrict studio-images bucket to safe image MIME types (no SVG)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'],
    file_size_limit = 5242880
WHERE id = 'studio-images';