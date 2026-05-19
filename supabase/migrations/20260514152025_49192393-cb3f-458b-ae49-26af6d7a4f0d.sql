
REVOKE EXECUTE ON FUNCTION public.admin_get_studios_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_studios_stats() TO authenticated;
