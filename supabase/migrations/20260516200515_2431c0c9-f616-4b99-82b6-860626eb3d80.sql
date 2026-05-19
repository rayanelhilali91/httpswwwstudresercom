
-- 1. Recreate missing triggers

-- Profile -> user_roles sync
DROP TRIGGER IF EXISTS on_profile_sync_role ON public.profiles;
CREATE TRIGGER on_profile_sync_role
  AFTER INSERT OR UPDATE OF account_type ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_profile();

-- Profile -> welcome notification
DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_welcome_on_profile();

-- Booking -> studio owner notification
DROP TRIGGER IF EXISTS on_booking_notify_studio ON public.bookings;
CREATE TRIGGER on_booking_notify_studio
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_studio_on_booking();

-- updated_at automatic on profiles & studios
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_studios_updated_at ON public.studios;
CREATE TRIGGER update_studios_updated_at
  BEFORE UPDATE ON public.studios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_commissions_updated_at ON public.commissions;
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Re-ensure auth.users trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill missing profiles for existing auth.users
INSERT INTO public.profiles (id, account_type, display_name)
SELECT
  u.id,
  COALESCE((u.raw_user_meta_data->>'account_type')::public.account_type, 'artist'),
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'artist_name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4. Backfill missing user_roles based on profiles.account_type
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.account_type::text::public.app_role
FROM public.profiles p
LEFT JOIN public.user_roles r ON r.user_id = p.id AND r.role = p.account_type::text::public.app_role
WHERE r.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
