
-- Defense in depth: restrict UPDATE privilege on bookings to the `status` column only for authenticated role.
-- Admins use SECURITY DEFINER RPCs (or service_role) for any broader maintenance.
REVOKE UPDATE ON public.bookings FROM authenticated;
GRANT UPDATE (status) ON public.bookings TO authenticated;

-- service_role keeps full access (used by edge/admin code).
GRANT ALL ON public.bookings TO service_role;
