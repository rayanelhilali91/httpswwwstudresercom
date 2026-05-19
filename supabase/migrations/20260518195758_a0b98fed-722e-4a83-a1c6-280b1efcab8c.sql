
-- Remove duplicate triggers causing double notifications
DROP TRIGGER IF EXISTS on_booking_notify_studio ON public.bookings;
DROP TRIGGER IF EXISTS trg_notify_studio_on_booking ON public.bookings;
DROP TRIGGER IF EXISTS on_booking_created_notify_studio ON public.bookings;

DROP TRIGGER IF EXISTS trg_notify_welcome_on_profile ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;

DROP TRIGGER IF EXISTS profiles_sync_role ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created_sync_role ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_sync_role ON public.profiles;

DROP TRIGGER IF EXISTS trg_commissions_updated_at ON public.commissions;
DROP TRIGGER IF EXISTS update_commissions_updated_at ON public.commissions;

-- Recreate a single canonical trigger of each kind
CREATE TRIGGER on_booking_created_notify_studio
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_studio_on_booking();

CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_welcome_on_profile();

CREATE TRIGGER on_profile_created_sync_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_from_profile();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
