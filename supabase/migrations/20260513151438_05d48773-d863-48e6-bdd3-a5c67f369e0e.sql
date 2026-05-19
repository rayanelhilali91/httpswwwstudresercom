
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.finalize_past_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'completed'
  WHERE end_at <= now()
    AND status NOT IN ('completed', 'cancelled');
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finalize-past-bookings') THEN
    PERFORM cron.schedule(
      'finalize-past-bookings',
      '* * * * *',
      $cron$ SELECT public.finalize_past_bookings(); $cron$
    );
  END IF;
END $$;
