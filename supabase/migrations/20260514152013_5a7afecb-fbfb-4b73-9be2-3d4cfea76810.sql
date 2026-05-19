
CREATE OR REPLACE FUNCTION public.admin_get_studios_stats()
RETURNS TABLE (
  studio_id uuid,
  studio_name text,
  owner_id uuid,
  owner_name text,
  city text,
  country text,
  is_published boolean,
  is_verified boolean,
  is_paused boolean,
  created_at timestamptz,
  total_bookings bigint,
  total_revenue numeric,
  total_commission numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.owner_id,
    p.display_name,
    s.city,
    s.country,
    s.is_published,
    s.is_verified,
    s.is_paused,
    s.created_at,
    COALESCE(b.bookings_count, 0)::bigint,
    COALESCE(b.revenue, 0)::numeric,
    COALESCE(c.commission_total, 0)::numeric
  FROM public.studios s
  LEFT JOIN public.profiles p ON p.id = s.owner_id
  LEFT JOIN (
    SELECT studio_id,
           COUNT(*) AS bookings_count,
           SUM(total_price) FILTER (WHERE status <> 'cancelled') AS revenue
    FROM public.bookings
    GROUP BY studio_id
  ) b ON b.studio_id = s.id
  LEFT JOIN (
    SELECT studio_id, SUM(commission_amount) AS commission_total
    FROM public.commissions
    WHERE status <> 'refunded'
    GROUP BY studio_id
  ) c ON c.studio_id = s.id
  ORDER BY s.created_at DESC;
END;
$$;
