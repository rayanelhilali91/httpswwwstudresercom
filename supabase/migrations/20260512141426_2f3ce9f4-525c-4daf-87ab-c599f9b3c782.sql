
-- Enum for account types
CREATE TYPE public.account_type AS ENUM ('artist', 'studio');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type public.account_type NOT NULL DEFAULT 'artist',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Studios table
CREATE TABLE public.studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  tagline TEXT,
  description TEXT,
  price_per_hour NUMERIC(10,2) DEFAULT 0,
  capacity INT DEFAULT 1,
  image_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  genres TEXT[] DEFAULT ARRAY[]::TEXT[],
  equipment TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published studios are viewable by everyone" ON public.studios FOR SELECT USING (is_published = true OR auth.uid() = owner_id);
CREATE POLICY "Studio owners can insert" ON public.studios FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Studio owners can update" ON public.studios FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Studio owners can delete" ON public.studios FOR DELETE USING (auth.uid() = owner_id);

-- Slots
CREATE TABLE public.studio_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slots viewable by everyone" ON public.studio_slots FOR SELECT USING (true);
CREATE POLICY "Studio owner manages slots insert" ON public.studio_slots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.studios s WHERE s.id = studio_id AND s.owner_id = auth.uid()));
CREATE POLICY "Studio owner manages slots update" ON public.studio_slots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.studios s WHERE s.id = studio_id AND s.owner_id = auth.uid()));
CREATE POLICY "Studio owner manages slots delete" ON public.studio_slots FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.studios s WHERE s.id = studio_id AND s.owner_id = auth.uid()));

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.studio_slots(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist sees own bookings" ON public.bookings FOR SELECT
  USING (auth.uid() = artist_id OR EXISTS (SELECT 1 FROM public.studios s WHERE s.id = studio_id AND s.owner_id = auth.uid()));
CREATE POLICY "Artist creates own booking" ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Studio owner updates booking" ON public.bookings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.studios s WHERE s.id = studio_id AND s.owner_id = auth.uid()));

-- Auto-create profile on signup, picking account_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, account_type, display_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'artist'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
