-- Shared staff accounts + role-based RLS
-- Expected accounts:
--   pos@festival.local
--   kitchen@festival.local
--   signage@festival.local
--   admin@festival.local

CREATE TYPE app_role AS ENUM ('pos', 'kitchen', 'signage', 'admin');

CREATE TABLE public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() = ANY(_roles), FALSE)
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated, anon;

REVOKE ALL ON FUNCTION public.has_role(app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(app_role[]) TO authenticated, anon;

CREATE POLICY "user can read own role"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "admin can manage user roles"
ON public.user_roles
FOR ALL
USING (public.current_app_role() = 'admin')
WITH CHECK (public.current_app_role() = 'admin');

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Items:
-- - customer/anon: readable
-- - staff: readable
-- - admin: manage stock and catalog
CREATE POLICY "items readable by everyone"
ON public.items
FOR SELECT
USING (true);

CREATE POLICY "admin manages items"
ON public.items
FOR ALL
USING (public.current_app_role() = 'admin')
WITH CHECK (public.current_app_role() = 'admin');

-- Temporary orders are never directly exposed from the browser.
-- Use Edge Functions / RPC for create + lookup.
CREATE POLICY "temporary orders hidden from clients"
ON public.temporary_orders
FOR SELECT
USING (false);

CREATE POLICY "temporary order items hidden from clients"
ON public.temporary_order_items
FOR SELECT
USING (false);

-- Staff-facing read models
CREATE POLICY "staff can read orders"
ON public.orders
FOR SELECT
USING (public.has_role(ARRAY['pos', 'kitchen', 'signage', 'admin']::app_role[]));

CREATE POLICY "staff can read order items"
ON public.order_items
FOR SELECT
USING (public.has_role(ARRAY['pos', 'kitchen', 'signage', 'admin']::app_role[]));

-- Direct writes are denied; operational changes go through SECURITY DEFINER RPCs.
CREATE POLICY "no direct order insert"
ON public.orders
FOR INSERT
WITH CHECK (false);

CREATE POLICY "no direct order update"
ON public.orders
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "no direct order item insert"
ON public.order_items
FOR INSERT
WITH CHECK (false);

CREATE POLICY "no direct order item update"
ON public.order_items
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "no direct temp order insert"
ON public.temporary_orders
FOR INSERT
WITH CHECK (false);

CREATE POLICY "no direct temp order update"
ON public.temporary_orders
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "no direct temp order item insert"
ON public.temporary_order_items
FOR INSERT
WITH CHECK (false);

CREATE POLICY "no direct temp order item update"
ON public.temporary_order_items
FOR UPDATE
USING (false)
WITH CHECK (false);

-- Seed role mappings after auth users are created.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'pos'::app_role
FROM auth.users
WHERE email = 'pos@festival.local'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'kitchen'::app_role
FROM auth.users
WHERE email = 'kitchen@festival.local'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'signage'::app_role
FROM auth.users
WHERE email = 'signage@festival.local'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@festival.local'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
