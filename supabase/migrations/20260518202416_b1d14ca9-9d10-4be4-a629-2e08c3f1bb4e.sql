
-- Recreate canonical triggers (one per action, idempotent)

-- 1. Booking → notify studio owner
DROP TRIGGER IF EXISTS notify_studio_on_booking_trigger ON public.bookings;
CREATE TRIGGER notify_studio_on_booking_trigger
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_studio_on_booking();

-- 2. Profile → welcome notification
DROP TRIGGER IF EXISTS notify_welcome_on_profile_trigger ON public.profiles;
CREATE TRIGGER notify_welcome_on_profile_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_welcome_on_profile();

-- 3. Profile → sync role into user_roles
DROP TRIGGER IF EXISTS sync_role_from_profile_trigger ON public.profiles;
CREATE TRIGGER sync_role_from_profile_trigger
AFTER INSERT OR UPDATE OF account_type ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_profile();

-- 4. Updated_at timestamps
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
