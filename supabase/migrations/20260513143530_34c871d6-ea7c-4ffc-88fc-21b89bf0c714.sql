
CREATE OR REPLACE FUNCTION public.notify_welcome_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.id,
    'welcome',
    'Bienvenue sur Stud.Reser',
    'Merci pour votre confiance. Toute l''équipe vous souhaite la bienvenue dans l''univers Stud.Reser — là où la créativité rencontre les meilleurs studios.',
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_welcome_on_profile ON public.profiles;
CREATE TRIGGER trg_notify_welcome_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_welcome_on_profile();
