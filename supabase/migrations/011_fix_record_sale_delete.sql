-- record_sale の一時テーブルクリアで bare DELETE が失敗する問題を修正
-- (Supabase hosted Postgres は WHERE 句なしの DELETE をブロックする)

CREATE OR REPLACE FUNCTION record_sale(
  p_lines JSONB,
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line RECORD;
  v_sale_id UUID;
  v_total INT := 0;
  v_menu RECORD;
  v_stock RECORD;
  v_deduction RECORD;
BEGIN
  IF NOT public.has_role(ARRAY['pos', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', '商品が選択されていません');
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _sale_lines (menu_item_id UUID, quantity INT) ON COMMIT DROP;
  DELETE FROM _sale_lines WHERE true;
  INSERT INTO _sale_lines (menu_item_id, quantity)
  SELECT (e->>'menu_item_id')::UUID, (e->>'quantity')::INT
  FROM jsonb_array_elements(p_lines) AS e;

  CREATE TEMP TABLE IF NOT EXISTS _stock_deductions (stock_item_id UUID, quantity INT) ON COMMIT DROP;
  DELETE FROM _stock_deductions WHERE true;
  INSERT INTO _stock_deductions (stock_item_id, quantity)
  SELECT mi.stock_item_id, SUM(sl.quantity)
  FROM _sale_lines sl
  JOIN menu_items mi ON mi.id = sl.menu_item_id
  GROUP BY mi.stock_item_id;

  FOR v_deduction IN SELECT * FROM _stock_deductions ORDER BY stock_item_id LOOP
    SELECT * INTO v_stock FROM stock_items WHERE id = v_deduction.stock_item_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'message', '在庫情報が見つかりません');
    END IF;
    IF v_stock.current_stock < v_deduction.quantity THEN
      RETURN jsonb_build_object('ok', false, 'message', v_stock.name || ' の在庫が不足しています（残り' || v_stock.current_stock || '）');
    END IF;
    UPDATE stock_items SET current_stock = current_stock - v_deduction.quantity WHERE id = v_stock.id;
  END LOOP;

  FOR v_line IN SELECT * FROM _sale_lines LOOP
    SELECT * INTO v_menu FROM menu_items WHERE id = v_line.menu_item_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'message', '商品が見つかりません');
    END IF;
    v_total := v_total + v_menu.price * v_line.quantity;
  END LOOP;

  INSERT INTO sales (total_price, payment_method, created_by)
  VALUES (v_total, p_payment_method, auth.uid())
  RETURNING id INTO v_sale_id;

  INSERT INTO sale_items (sale_id, menu_item_id, quantity, unit_price)
  SELECT v_sale_id, sl.menu_item_id, sl.quantity, mi.price
  FROM _sale_lines sl JOIN menu_items mi ON mi.id = sl.menu_item_id;

  RETURN jsonb_build_object('ok', true, 'sale', jsonb_build_object(
    'id', v_sale_id, 'total_price', v_total, 'payment_method', p_payment_method
  ));
END;
$$;

REVOKE ALL ON FUNCTION record_sale(JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_sale(JSONB, TEXT) TO authenticated;