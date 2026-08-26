-- The client subscribes to item changes so stock and sold-out states stay in sync.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
