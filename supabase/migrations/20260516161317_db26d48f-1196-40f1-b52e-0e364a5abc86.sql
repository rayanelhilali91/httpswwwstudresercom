-- 1) Drop FKs existantes (explicite, pour éviter les conflits)
ALTER TABLE public.profiles      DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.user_roles    DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.studios       DROP CONSTRAINT IF EXISTS studios_owner_id_fkey;
ALTER TABLE public.studio_slots  DROP CONSTRAINT IF EXISTS studio_slots_studio_id_fkey;
ALTER TABLE public.bookings      DROP CONSTRAINT IF EXISTS bookings_artist_id_fkey;
ALTER TABLE public.bookings      DROP CONSTRAINT IF EXISTS bookings_studio_id_fkey;
ALTER TABLE public.bookings      DROP CONSTRAINT IF EXISTS bookings_slot_id_fkey;
ALTER TABLE public.commissions   DROP CONSTRAINT IF EXISTS commissions_artist_id_fkey;
ALTER TABLE public.commissions   DROP CONSTRAINT IF EXISTS commissions_studio_id_fkey;
ALTER TABLE public.commissions   DROP CONSTRAINT IF EXISTS commissions_booking_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_studio_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_booking_id_fkey;

-- 2) Nettoyer les orphelins
DELETE FROM public.notifications WHERE user_id   IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users      u WHERE u.id = user_id);
UPDATE public.notifications SET studio_id  = NULL WHERE studio_id  IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.studios  s WHERE s.id = studio_id);
UPDATE public.notifications SET booking_id = NULL WHERE booking_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id);
DELETE FROM public.bookings      WHERE artist_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users      u WHERE u.id = artist_id);
DELETE FROM public.bookings      WHERE studio_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.studios  s WHERE s.id = studio_id);
DELETE FROM public.studio_slots  WHERE studio_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.studios  s WHERE s.id = studio_id);
DELETE FROM public.commissions   WHERE artist_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users      u WHERE u.id = artist_id);
DELETE FROM public.commissions   WHERE studio_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.studios  s WHERE s.id = studio_id);
DELETE FROM public.commissions   WHERE booking_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id);
DELETE FROM public.studios       WHERE owner_id  IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users      u WHERE u.id = owner_id);
DELETE FROM public.user_roles    WHERE user_id   IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users      u WHERE u.id = user_id);
DELETE FROM public.profiles      WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = profiles.id);

-- 3) FKs en cascade
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.studios
  ADD CONSTRAINT studios_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.studio_slots
  ADD CONSTRAINT studio_slots_studio_id_fkey
  FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES auth.users(id)        ON DELETE CASCADE,
  ADD CONSTRAINT bookings_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id)    ON DELETE CASCADE,
  ADD CONSTRAINT bookings_slot_id_fkey   FOREIGN KEY (slot_id)   REFERENCES public.studio_slots(id) ON DELETE SET NULL;

ALTER TABLE public.commissions
  ADD CONSTRAINT commissions_artist_id_fkey  FOREIGN KEY (artist_id)  REFERENCES auth.users(id)      ON DELETE CASCADE,
  ADD CONSTRAINT commissions_studio_id_fkey  FOREIGN KEY (studio_id)  REFERENCES public.studios(id)  ON DELETE CASCADE,
  ADD CONSTRAINT commissions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey    FOREIGN KEY (user_id)    REFERENCES auth.users(id)      ON DELETE CASCADE,
  ADD CONSTRAINT notifications_studio_id_fkey  FOREIGN KEY (studio_id)  REFERENCES public.studios(id)  ON DELETE SET NULL,
  ADD CONSTRAINT notifications_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

-- 4) Trigger : supprimer un profil supprime aussi le compte auth
--    (la FK profiles.id ON DELETE CASCADE gère le sens inverse).
--    pg_trigger_depth() évite la récursion.
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() = 1 THEN
    DELETE FROM auth.users WHERE id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_deleted_remove_auth_user ON public.profiles;
CREATE TRIGGER on_profile_deleted_remove_auth_user
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.delete_auth_user_on_profile_delete();

-- 5) (Re)brancher les triggers métiers existants au cas où
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_created_sync_role ON public.profiles;
CREATE TRIGGER on_profile_created_sync_role AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_profile();

DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_welcome AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_welcome_on_profile();

DROP TRIGGER IF EXISTS on_booking_created_notify_studio ON public.bookings;
CREATE TRIGGER on_booking_created_notify_studio AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_studio_on_booking();