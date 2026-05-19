CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  studio_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  gross_amount numeric(10,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.10,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  collected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commissions_studio ON public.commissions(studio_id);
CREATE INDEX idx_commissions_artist ON public.commissions(artist_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist sees own commissions"
ON public.commissions FOR SELECT
USING (auth.uid() = artist_id);

CREATE POLICY "Studio owner sees own commissions"
ON public.commissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.studios s
  WHERE s.id = commissions.studio_id AND s.owner_id = auth.uid()
));

CREATE POLICY "Admins see all commissions"
ON public.commissions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_commissions_updated_at
BEFORE UPDATE ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();