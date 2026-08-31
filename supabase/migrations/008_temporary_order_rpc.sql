-- 会計後の注文と仮注文を紐付けるための列（FKは張らない: checkout時に仮注文行は削除されるため）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_temporary_order_id UUID;

-- 匿名客: 仮注文を作成する
CREATE OR REPLACE FUNCTION create_temporary_order(p_lines JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line RECORD;
  v_price INT;
  v_stock INT;
  v_total INT := 0;
  v_id UUID := gen_random_uuid();
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'カートが空です');
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _new_temp_lines (item_id UUID, quantity INT) ON COMMIT DROP;
  DELETE FROM _new_temp_lines WHERE true;

  INSERT INTO _new_temp_lines (item_id, quantity)
  SELECT (e->>'item_id')::UUID, (e->>'quantity')::INT
  FROM jsonb_array_elements(p_lines) AS e;

  FOR v_line IN SELECT * FROM _new_temp_lines LOOP
    IF v_line.quantity IS NULL OR v_line.quantity <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'message', '数量が不正です');
    END IF;

    SELECT current_stock, price INTO v_stock, v_price
    FROM items WHERE id = v_line.item_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'message', '商品が見つかりません');
    END IF;
    IF v_stock < v_line.quantity THEN
      RETURN jsonb_build_object('ok', false, 'message', '在庫不足です');
    END IF;

    v_total := v_total + v_price * v_line.quantity;
  END LOOP;

  LOOP
    v_code := upper(substr(md5(random()::text), 1, 6));
    BEGIN
      INSERT INTO temporary_orders (id, short_code, total_price)
      VALUES (v_id, v_code, v_total);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt > 10 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'コード生成に失敗しました。再試行してください');
      END IF;
    END;
  END LOOP;

  INSERT INTO temporary_order_items (temporary_order_id, item_id, quantity)
  SELECT v_id, item_id, quantity FROM _new_temp_lines;

  RETURN jsonb_build_object(
    'ok', true,
    'temporary_order', jsonb_build_object(
      'id', v_id,
      'short_code', v_code,
      'total_price', v_total,
      'expires_at', (NOW() + INTERVAL '30 minutes'),
      'items', (
        SELECT jsonb_agg(jsonb_build_object('item_id', item_id, 'quantity', quantity))
        FROM _new_temp_lines
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION create_temporary_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_temporary_order(JSONB) TO anon, authenticated;

-- POSスタッフ: コード/IDで仮注文を検索する
CREATE OR REPLACE FUNCTION find_temporary_order(p_short_code TEXT DEFAULT NULL, p_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row temporary_orders%ROWTYPE;
BEGIN
  IF NOT public.has_role(ARRAY['pos', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  SELECT * INTO v_row
  FROM temporary_orders
  WHERE (p_id IS NOT NULL AND id = p_id)
     OR (p_short_code IS NOT NULL AND short_code = upper(p_short_code));

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '仮注文が見つかりません');
  END IF;

  IF v_row.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'message', '仮注文の有効期限が切れています');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'temporary_order', jsonb_build_object(
      'id', v_row.id,
      'short_code', v_row.short_code,
      'total_price', v_row.total_price,
      'expires_at', v_row.expires_at,
      'items', (
        SELECT jsonb_agg(jsonb_build_object('item_id', item_id, 'quantity', quantity))
        FROM temporary_order_items WHERE temporary_order_id = v_row.id
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION find_temporary_order(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_temporary_order(TEXT, UUID) TO authenticated;

-- 匿名客: 自分の仮注文が会計されたか（チケット番号・状態・受け取りトークン）をポーリングで確認する
CREATE OR REPLACE FUNCTION get_order_by_temporary_order(p_temporary_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE source_temporary_order_id = p_temporary_order_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'found', false);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'found', true,
    'order', jsonb_build_object(
      'ticket_number', v_order.ticket_number,
      'status', v_order.status,
      'total_price', v_order.total_price,
      'pickup_token', CASE WHEN v_order.status = 'ready' THEN v_order.pickup_token ELSE NULL END,
      'pickup_expires_at', CASE WHEN v_order.status = 'ready' THEN v_order.pickup_expires_at ELSE NULL END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION get_order_by_temporary_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_order_by_temporary_order(UUID) TO anon, authenticated;