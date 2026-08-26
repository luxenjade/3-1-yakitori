-- Atomic checkout with row locks (called from Edge Function via rpc)

CREATE OR REPLACE FUNCTION checkout_order(
  p_temporary_order_id UUID DEFAULT NULL,
  p_short_code VARCHAR DEFAULT NULL,
  p_lines JSONB DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_order_source TEXT DEFAULT 'pos'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_temp_id UUID;
  v_line RECORD;
  v_order_id UUID;
  v_total INT := 0;
  v_stock INT;
  v_item_id UUID;
  v_qty INT;
  v_price INT;
  v_ticket INT;
BEGIN
  IF p_temporary_order_id IS NOT NULL OR p_short_code IS NOT NULL THEN
    SELECT id INTO v_temp_id
    FROM temporary_orders
    WHERE (p_temporary_order_id IS NOT NULL AND id = p_temporary_order_id)
       OR (p_short_code IS NOT NULL AND short_code = upper(p_short_code))
    FOR UPDATE;

    IF v_temp_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'message', '仮注文が見つかりません');
    END IF;

    IF EXISTS (
      SELECT 1 FROM temporary_orders WHERE id = v_temp_id AND expires_at < NOW()
    ) THEN
      RETURN jsonb_build_object('ok', false, 'message', '仮注文の有効期限が切れています');
    END IF;
  END IF;

  -- Build working lines into a temp table
  CREATE TEMP TABLE IF NOT EXISTS _checkout_lines (
    item_id UUID,
    quantity INT
  ) ON COMMIT DROP;
  DELETE FROM _checkout_lines;

  IF p_lines IS NOT NULL AND jsonb_array_length(p_lines) > 0 THEN
    INSERT INTO _checkout_lines (item_id, quantity)
    SELECT (e->>'item_id')::UUID, (e->>'quantity')::INT
    FROM jsonb_array_elements(p_lines) AS e;
  ELSIF v_temp_id IS NOT NULL THEN
    INSERT INTO _checkout_lines (item_id, quantity)
    SELECT item_id, quantity FROM temporary_order_items WHERE temporary_order_id = v_temp_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'message', '注文内容が空です');
  END IF;

  FOR v_line IN SELECT * FROM _checkout_lines LOOP
    SELECT current_stock, price INTO v_stock, v_price
    FROM items WHERE id = v_line.item_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'message', '商品が見つかりません');
    END IF;
    IF v_stock < v_line.quantity THEN
      RETURN jsonb_build_object('ok', false, 'message', '在庫不足');
    END IF;

    UPDATE items
    SET current_stock = current_stock - v_line.quantity,
        status = CASE WHEN current_stock - v_line.quantity <= 0 THEN 'sold_out' ELSE status END
    WHERE id = v_line.item_id;

    v_total := v_total + v_price * v_line.quantity;
  END LOOP;

  INSERT INTO orders (total_price, payment_method, status, order_source)
  VALUES (v_total, p_payment_method, 'pending', p_order_source)
  RETURNING id, ticket_number INTO v_order_id, v_ticket;

  INSERT INTO order_items (order_id, item_id, quantity)
  SELECT v_order_id, item_id, quantity FROM _checkout_lines;

  IF v_temp_id IS NOT NULL THEN
    DELETE FROM temporary_orders WHERE id = v_temp_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'id', v_order_id,
      'ticket_number', v_ticket,
      'total_price', v_total,
      'payment_method', p_payment_method,
      'status', 'pending',
      'order_source', p_order_source
    )
  );
END;
$$;
