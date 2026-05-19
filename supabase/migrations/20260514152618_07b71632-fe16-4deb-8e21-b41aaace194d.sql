
CREATE OR REPLACE FUNCTION public.admin_get_artists_stats()
RETURNS TABLE (
  artist_id uuid,
  display_name text,
  created_at timestamptz,
  total_bookings bigint,
  total_hours numeric,
  total_spent numeric
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
    p.id,
    p.display_name,
    p.created_at,
    COALESCE(b.bookings_count, 0)::bigint,
    COALESCE(b.hours_total, 0)::numeric,
    COALESCE(b.spent_total, 0)::numeric
  FROM public.profiles p
  LEFT JOIN (
    SELECT
      artist_id,
      COUNT(*) AS bookings_count,
      SUM(EXTRACT(epoch FROM (end_at - start_at)) / 3600.0) AS hours_total,
      SUM(total_price) FILTER (WHERE status <> 'cancelled') AS spent_total
    FROM public.bookings
    GROUP BY artist_id
  ) b ON b.artist_id = p.id
  WHERE p.account_type = 'artist'
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_artist_bookings(_artist_id uuid)
RETURNS TABLE (
  booking_id uuid,
  studio_id uuid,
  studio_name text,
  start_at timestamptz,
  end_at timestamptz,
  hours numeric,
  total_price numeric,
  status text,
  created_at timestamptz
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
    b.id,
    b.studio_id,
    s.name,
    b.start_at,
    b.end_at,
    ROUND((EXTRACT(epoch FROM (b.end_at - b.start_at)) / 3600.0)::numeric, 2),
    b.total_price,
    b.status,
    b.created_at
  FROM public.bookings b
  LEFT JOIN public.studios s ON s.id = b.studio_id
  WHERE b.artist_id = _artist_id
  ORDER BY b.start_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_artists_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_artist_bookings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_artists_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_artist_bookings(uuid) TO authenticated;
