-- Pickup verification token support
-- - Customer shows `pickup_token` when the order becomes `ready`
-- - Staff verifies the token at the pickup counter

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_token TEXT,
  ADD COLUMN IF NOT EXISTS pickup_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS pickup_used_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS orders_pickup_token_idx ON orders (pickup_token);

CREATE OR REPLACE FUNCTION advance_order_status(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_next_status TEXT;
  v_token TEXT;
BEGIN
  IF NOT public.has_role(ARRAY['kitchen', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '注文が見つかりません');
  END IF;

  IF v_order.status = 'pending' THEN
    v_next_status := 'cooking';
  ELSIF v_order.status = 'cooking' THEN
    v_next_status := 'ready';
    v_token := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  ELSE
    RETURN jsonb_build_object('ok', false, 'message', 'この注文は進行できません');
  END IF;

  UPDATE orders
  SET
    status = v_next_status,
    pickup_token = CASE WHEN v_next_status = 'ready' THEN v_token ELSE NULL END,
    pickup_expires_at = CASE WHEN v_next_status = 'ready' THEN NOW() + INTERVAL '2 minutes' ELSE NULL END,
    pickup_used_at = NULL
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'status', v_next_status,
      'pickup_token', CASE WHEN v_next_status = 'ready' THEN v_token ELSE NULL END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION advance_order_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION advance_order_status(UUID) TO authenticated;

-- Verify pickup: validate token + status + expiry, then mark completed under a lock
CREATE OR REPLACE FUNCTION verify_pickup_order(
  p_token TEXT,
  p_order_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  IF NOT public.has_role(ARRAY['kitchen', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  IF p_order_id IS NOT NULL THEN
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_order
    FROM orders
    WHERE pickup_token = p_token
    FOR UPDATE;
  END IF;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '一致する注文が見つかりません');
  END IF;

  IF v_order.status <> 'ready' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'この注文は受け取り準備完了ではありません');
  END IF;

  IF v_order.pickup_token IS NULL OR v_order.pickup_expires_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '受け取りトークンが無効です');
  END IF;

  IF v_order.pickup_used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'この注文は既に確認済みです');
  END IF;

  IF v_order.pickup_expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'トークンの有効期限が切れています');
  END IF;

  IF v_order.pickup_token <> p_token THEN
    RETURN jsonb_build_object('ok', false, 'message', 'トークンが一致しません');
  END IF;

  UPDATE orders
  SET
    status = 'completed',
    pickup_used_at = NOW(),
    pickup_token = NULL,
    pickup_expires_at = NULL
  WHERE id = v_order.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION verify_pickup_order(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_pickup_order(TEXT, UUID) TO authenticated;

