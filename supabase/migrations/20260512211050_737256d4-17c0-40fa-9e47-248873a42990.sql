-- 1) Roles system (artist | studio | admin)
CREATE TYPE public.app_role AS ENUM ('artist', 'studio', 'admin');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Roles viewable by self or admin"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Mirror profile.account_type into user_roles automatically
CREATE OR REPLACE FUNCTION public.sync_role_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.account_type::text::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_sync_role
AFTER INSERT OR UPDATE OF account_type ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_profile();

-- Backfill roles from existing profiles
INSERT INTO public.user_roles (user_id, role)
SELECT id, account_type::text::public.app_role FROM public.profiles
ON CONFLICT DO NOTHING;

-- 2) Verified studio flag
ALTER TABLE public.studios ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

-- Admins can update is_verified (existing policy already lets owner update)
CREATE POLICY "Admins update studios"
ON public.studios FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 3) City index for filtering
CREATE INDEX IF NOT EXISTS idx_studios_city ON public.studios (city);
CREATE INDEX IF NOT EXISTS idx_studios_published ON public.studios (is_published);

-- 4) Storage bucket for studio images
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-images', 'studio-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Studio images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-images');

CREATE POLICY "Studio owners upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Studio owners update own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Studio owners delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'studio-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);