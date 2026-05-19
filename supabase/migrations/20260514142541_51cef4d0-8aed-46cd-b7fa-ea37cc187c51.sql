-- Step 3: lock down notifications inserts
-- Remove the permissive INSERT policy that lets any authenticated user notify anyone.
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;

-- No replacement INSERT policy: notifications can now only be created by
-- SECURITY DEFINER trigger functions (notify_studio_on_booking, notify_welcome_on_profile),
-- which bypass RLS by design. Direct client inserts are blocked.