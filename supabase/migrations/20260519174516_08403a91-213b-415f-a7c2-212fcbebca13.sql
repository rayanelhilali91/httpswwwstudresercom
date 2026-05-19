-- Re-attach all missing triggers in public schema

-- 1. Sync role + welcome notification on profile insert
DROP TRIGGER IF EXISTS sync_role_from_profile_trigger ON public.profiles;
CREATE TRIGGER sync_role_from_profile_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_profile();

DROP TRIGGER IF EXISTS notify_welcome_on_profile_trigger ON public.profiles;
CREATE TRIGGER notify_welcome_on_profile_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_welcome_on_profile();

-- 2. Protect account_type from non-admin changes
DROP TRIGGER IF EXISTS protect_account_type_trigger ON public.profiles;
CREATE TRIGGER protect_account_type_trigger
  BEFORE UPDATE OF account_type ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_account_type();

-- 3. updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_studios_updated_at ON public.studios;
CREATE TRIGGER update_studios_updated_at
  BEFORE UPDATE ON public.studios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_studio_rooms_updated_at ON public.studio_rooms;
CREATE TRIGGER update_studio_rooms_updated_at
  BEFORE UPDATE ON public.studio_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_commissions_updated_at ON public.commissions;
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Studio social URL validation
DROP TRIGGER IF EXISTS validate_studio_social_urls_trigger ON public.studios;
CREATE TRIGGER validate_studio_social_urls_trigger
  BEFORE INSERT OR UPDATE ON public.studios
  FOR EACH ROW EXECUTE FUNCTION public.validate_studio_social_urls();

-- 5. Booking anti-overlap + field protection + notifications
DROP TRIGGER IF EXISTS prevent_booking_overlap_trigger ON public.bookings;
CREATE TRIGGER prevent_booking_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_overlap();

DROP TRIGGER IF EXISTS protect_booking_fields_trigger ON public.bookings;
CREATE TRIGGER protect_booking_fields_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_booking_fields();

DROP TRIGGER IF EXISTS notify_studio_on_booking_trigger ON public.bookings;
CREATE TRIGGER notify_studio_on_booking_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_studio_on_booking();

-- 6. Cascade delete auth user when profile deleted (admin op)
DROP TRIGGER IF EXISTS delete_auth_user_on_profile_delete_trigger ON public.profiles;
CREATE TRIGGER delete_auth_user_on_profile_delete_trigger
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.delete_auth_user_on_profile_delete();

-- 7. Backfill: ensure every auth user has a profile + role (in case any were missed)
INSERT INTO public.profiles (id, account_type, display_name)
SELECT u.id,
       COALESCE((u.raw_user_meta_data->>'account_type')::public.account_type, 'artist'),
       COALESCE(u.raw_user_meta_data->>'display_name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.account_type::text::public.app_role
FROM public.profiles p
LEFT JOIN public.user_roles r ON r.user_id = p.id AND r.role = p.account_type::text::public.app_role
WHERE r.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;