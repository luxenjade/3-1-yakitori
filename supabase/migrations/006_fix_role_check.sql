-- `NULL` is not a valid authorization result. Without COALESCE, PL/pgSQL
-- checks written as `IF NOT has_role(...)` do not reject anonymous requests.
CREATE OR REPLACE FUNCTION public.has_role(_roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() = ANY(_roles), FALSE)
$$;

REVOKE ALL ON FUNCTION public.has_role(app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(app_role[]) TO authenticated, anon;
