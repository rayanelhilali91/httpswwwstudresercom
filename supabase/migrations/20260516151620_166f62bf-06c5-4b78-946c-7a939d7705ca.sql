-- Nettoyage complet des données pour repartir sur un MVP propre
-- Ordre: dépendances d'abord
DELETE FROM public.commissions;
DELETE FROM public.notifications;
DELETE FROM public.bookings;
DELETE FROM public.studio_slots;
DELETE FROM public.studios;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;