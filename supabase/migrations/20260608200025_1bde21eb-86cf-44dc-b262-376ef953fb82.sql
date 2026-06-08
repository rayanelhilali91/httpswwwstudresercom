-- 1. Enums
CREATE TYPE public.studio_status AS ENUM ('non_revendique', 'revendication_en_attente', 'revendique_verifie');
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. studios.status column + backfill, then drop is_verified
ALTER TABLE public.studios ADD COLUMN status public.studio_status NOT NULL DEFAULT 'non_revendique';

UPDATE public.studios SET status = 'revendique_verifie' WHERE is_verified = true;

-- Studios créés par un trigger profile-of-type-studio appartiennent déjà à un vrai owner.
-- On les considère vérifiés (l'utilisateur a créé son propre studio).
UPDATE public.studios s
SET status = 'revendique_verifie'
WHERE EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = s.owner_id AND p.account_type = 'studio'::public.account_type
);

ALTER TABLE public.studios DROP COLUMN is_verified;

-- Mettre à jour la fonction qui crée un studio par défaut : nouveau studio = revendique_verifie
CREATE OR REPLACE FUNCTION public.create_default_studio_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.account_type <> 'studio'::public.account_type THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF(trim(NEW.display_name), ''), 'Nouveau studio');

  INSERT INTO public.studios (
    owner_id, name, city, country, tagline, description,
    price_per_hour, capacity, gallery, genres, equipment,
    is_published, is_paused, min_booking_hours, max_booking_hours,
    engineers, status
  )
  SELECT
    NEW.id, v_name, NULL, NULL, NULL, NULL,
    0, 1, '[]'::jsonb, ARRAY[]::text[], ARRAY[]::text[],
    false, false, 2, 12,
    ARRAY[]::text[], 'revendique_verifie'::public.studio_status
  WHERE NOT EXISTS (
    SELECT 1 FROM public.studios s WHERE s.owner_id = NEW.id
  );

  RETURN NEW;
END;
$$;

-- Mettre à jour admin_get_studios_stats : remplacer is_verified par status='revendique_verifie'
CREATE OR REPLACE FUNCTION public.admin_get_studios_stats()
RETURNS TABLE(studio_id uuid, studio_name text, owner_id uuid, owner_name text, city text, country text, is_published boolean, is_verified boolean, is_paused boolean, created_at timestamp with time zone, total_bookings bigint, total_revenue numeric, total_commission numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    s.id, s.name, s.owner_id, p.display_name, s.city, s.country,
    s.is_published,
    (s.status = 'revendique_verifie'::public.studio_status) AS is_verified,
    s.is_paused, s.created_at,
    COALESCE(b.bookings_count, 0)::bigint,
    COALESCE(b.revenue, 0)::numeric,
    COALESCE(c.commission_total, 0)::numeric
  FROM public.studios s
  LEFT JOIN public.profiles p ON p.id = s.owner_id
  LEFT JOIN (
    SELECT studio_id, COUNT(*) AS bookings_count,
           SUM(total_price) FILTER (WHERE status <> 'cancelled') AS revenue
    FROM public.bookings GROUP BY studio_id
  ) b ON b.studio_id = s.id
  LEFT JOIN (
    SELECT studio_id, SUM(commission_amount) AS commission_total
    FROM public.commissions WHERE status <> 'refunded' GROUP BY studio_id
  ) c ON c.studio_id = s.id
  ORDER BY s.created_at DESC;
END;
$$;

-- 3. Trigger : protéger owner_id et status sur studios (admin ou SECURITY DEFINER uniquement)
CREATE OR REPLACE FUNCTION public.protect_studio_owner_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Les admins peuvent tout faire
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Modification du propriétaire interdite.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Modification du statut de revendication interdite.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_studio_owner_status_trg ON public.studios;
CREATE TRIGGER protect_studio_owner_status_trg
BEFORE UPDATE ON public.studios
FOR EACH ROW EXECUTE FUNCTION public.protect_studio_owner_status();

-- Restreindre la policy "Studio owners can update" : ne s'applique qu'aux studios revendique_verifie
DROP POLICY IF EXISTS "Studio owners can update" ON public.studios;
CREATE POLICY "Studio owners can update verified studios"
ON public.studios FOR UPDATE TO authenticated
USING (auth.uid() = owner_id AND status = 'revendique_verifie'::public.studio_status)
WITH CHECK (auth.uid() = owner_id AND status = 'revendique_verifie'::public.studio_status);

-- 4. Table studio_claims
CREATE TABLE public.studio_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.claim_status NOT NULL DEFAULT 'pending',
  verification_notes text,
  admin_notes text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_studio_claims_studio_id ON public.studio_claims(studio_id);
CREATE INDEX idx_studio_claims_user_id ON public.studio_claims(user_id);
CREATE INDEX idx_studio_claims_status ON public.studio_claims(status);

-- Unicité : un seul claim pending par (studio, user)
CREATE UNIQUE INDEX uq_studio_claims_pending
ON public.studio_claims(studio_id, user_id)
WHERE status = 'pending';

GRANT SELECT, INSERT ON public.studio_claims TO authenticated;
GRANT ALL ON public.studio_claims TO service_role;

ALTER TABLE public.studio_claims ENABLE ROW LEVEL SECURITY;

-- SELECT : demandeur voit ses claims, admin voit tout
CREATE POLICY "Users can view their own claims"
ON public.studio_claims FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- INSERT : utilisateur authentifié pour lui-même, studio non encore vérifié
CREATE POLICY "Users can create claims on unverified studios"
ON public.studio_claims FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = studio_id
      AND s.status <> 'revendique_verifie'::public.studio_status
  )
);

-- UPDATE/DELETE : admin uniquement (les fonctions approve/reject sont DEFINER de toute façon)
CREATE POLICY "Admins can update claims"
ON public.studio_claims FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete claims"
ON public.studio_claims FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Trigger sur INSERT studio_claims : passe le studio en revendication_en_attente + notifie admins
CREATE OR REPLACE FUNCTION public.handle_new_studio_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_studio_name text;
  v_claimer_name text;
  v_admin record;
BEGIN
  -- Passer le studio en "en attente" s'il n'est pas déjà vérifié
  UPDATE public.studios
  SET status = 'revendication_en_attente'::public.studio_status
  WHERE id = NEW.studio_id
    AND status = 'non_revendique'::public.studio_status;

  SELECT name INTO v_studio_name FROM public.studios WHERE id = NEW.studio_id;
  SELECT display_name INTO v_claimer_name FROM public.profiles WHERE id = NEW.user_id;

  -- Notifier tous les admins
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::public.app_role LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link, studio_id)
    VALUES (
      v_admin.user_id,
      'claim_pending',
      'Nouvelle revendication de studio',
      COALESCE(v_claimer_name, 'Un utilisateur') || ' revendique ' || COALESCE(v_studio_name, 'un studio') || '.',
      '/admin/claims',
      NEW.studio_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_new_studio_claim_trg ON public.studio_claims;
CREATE TRIGGER handle_new_studio_claim_trg
AFTER INSERT ON public.studio_claims
FOR EACH ROW EXECUTE FUNCTION public.handle_new_studio_claim();

-- 6. Fonctions admin approve / reject
CREATE OR REPLACE FUNCTION public.approve_studio_claim(_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claim record;
  v_studio_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT * INTO v_claim FROM public.studio_claims WHERE id = _claim_id;
  IF v_claim IS NULL THEN RAISE EXCEPTION 'Claim introuvable.'; END IF;
  IF v_claim.status <> 'pending'::public.claim_status THEN
    RAISE EXCEPTION 'Cette revendication a déjà été traitée.';
  END IF;

  -- Transférer la propriété et passer le studio en revendique_verifie
  UPDATE public.studios
  SET owner_id = v_claim.user_id,
      status = 'revendique_verifie'::public.studio_status,
      updated_at = now()
  WHERE id = v_claim.studio_id;

  -- Marquer ce claim approved
  UPDATE public.studio_claims
  SET status = 'approved'::public.claim_status,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = _claim_id;

  -- Rejeter automatiquement les autres claims pending sur ce studio
  UPDATE public.studio_claims
  SET status = 'rejected'::public.claim_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = 'Une autre revendication a été validée.'
  WHERE studio_id = v_claim.studio_id
    AND status = 'pending'::public.claim_status
    AND id <> _claim_id;

  SELECT name INTO v_studio_name FROM public.studios WHERE id = v_claim.studio_id;

  -- Notifier le demandeur
  INSERT INTO public.notifications (user_id, type, title, body, link, studio_id)
  VALUES (
    v_claim.user_id,
    'claim_approved',
    'Revendication approuvée',
    'Votre revendication pour ' || COALESCE(v_studio_name, 'le studio') || ' a été approuvée. Vous pouvez maintenant gérer la fiche.',
    '/studio/dashboard',
    v_claim.studio_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_studio_claim(_claim_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claim record;
  v_remaining int;
  v_studio_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT * INTO v_claim FROM public.studio_claims WHERE id = _claim_id;
  IF v_claim IS NULL THEN RAISE EXCEPTION 'Claim introuvable.'; END IF;
  IF v_claim.status <> 'pending'::public.claim_status THEN
    RAISE EXCEPTION 'Cette revendication a déjà été traitée.';
  END IF;

  UPDATE public.studio_claims
  SET status = 'rejected'::public.claim_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = NULLIF(trim(_reason), '')
  WHERE id = _claim_id;

  -- S'il n'y a plus aucun claim pending, repasser le studio en non_revendique
  -- (seulement si le studio n'est pas déjà vérifié)
  SELECT COUNT(*) INTO v_remaining
  FROM public.studio_claims
  WHERE studio_id = v_claim.studio_id AND status = 'pending'::public.claim_status;

  IF v_remaining = 0 THEN
    UPDATE public.studios
    SET status = 'non_revendique'::public.studio_status,
        updated_at = now()
    WHERE id = v_claim.studio_id
      AND status = 'revendication_en_attente'::public.studio_status;
  END IF;

  SELECT name INTO v_studio_name FROM public.studios WHERE id = v_claim.studio_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, studio_id)
  VALUES (
    v_claim.user_id,
    'claim_rejected',
    'Revendication refusée',
    'Votre revendication pour ' || COALESCE(v_studio_name, 'le studio') || ' a été refusée.'
      || CASE WHEN _reason IS NOT NULL AND length(trim(_reason)) > 0 THEN ' Motif : ' || _reason ELSE '' END,
    NULL,
    v_claim.studio_id
  );
END;
$$;