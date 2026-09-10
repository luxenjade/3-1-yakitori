-- 旧・注文/キッチン/引換系オブジェクトを撤去
DROP FUNCTION IF EXISTS verify_pickup_order(TEXT, UUID);
DROP FUNCTION IF EXISTS advance_order_status(UUID);
DROP FUNCTION IF EXISTS checkout_order(UUID, VARCHAR, JSONB, TEXT, TEXT);

DROP TABLE IF EXISTS temporary_order_items;
DROP TABLE IF EXISTS temporary_orders;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS items;

-- 在庫プール（もも／かわ）
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  initial_stock INT NOT NULL,
  current_stock INT NOT NULL CHECK (current_stock >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 販売メニュー（味付け違い）。在庫プールに紐づく
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 会計担当が入力する販売記録（チケット/キッチン進行なし）
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_price INT NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash' | 'ic'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price INT NOT NULL
);

-- 待ち人数・売上目標（単一行）
CREATE TABLE store_status (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  waiting_count INT NOT NULL DEFAULT 0,
  sales_goal INT NOT NULL DEFAULT 50000,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
INSERT INTO store_status (id, waiting_count, sales_goal) VALUES (true, 0, 50000);

-- 初期メニュー（値段は仮値。実際の値に調整してください）
INSERT INTO stock_items (name, initial_stock, current_stock) VALUES
  ('もも', 150, 150),
  ('かわ', 80, 80);

INSERT INTO menu_items (stock_item_id, name, price)
SELECT id, 'もも（たれ）', 200 FROM stock_items WHERE name = 'もも';
INSERT INTO menu_items (stock_item_id, name, price)
SELECT id, 'もも（ガーリック塩）', 200 FROM stock_items WHERE name = 'もも';
INSERT INTO menu_items (stock_item_id, name, price)
SELECT id, 'かわ（たれ）', 180 FROM stock_items WHERE name = 'かわ';

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_status ENABLE ROW LEVEL SECURITY;

-- 在庫・メニュー・ステータスは誰でも閲覧可（トップ／サイネージ用）
CREATE POLICY "stock readable by everyone" ON stock_items FOR SELECT USING (true);
CREATE POLICY "menu readable by everyone" ON menu_items FOR SELECT USING (true);
CREATE POLICY "status readable by everyone" ON store_status FOR SELECT USING (true);

-- 販売明細はスタッフのみ閲覧（admin画面用）
CREATE POLICY "staff can read sales" ON sales FOR SELECT
  USING (public.has_role(ARRAY['pos', 'admin']::app_role[]));
CREATE POLICY "staff can read sale items" ON sale_items FOR SELECT
  USING (public.has_role(ARRAY['pos', 'admin']::app_role[]));

-- カタログ編集はadminのみ。それ以外はRPC経由
CREATE POLICY "admin manages stock" ON stock_items FOR ALL
  USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin manages menu" ON menu_items FOR ALL
  USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY "no direct sales insert" ON sales FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct sale item insert" ON sale_items FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct status update" ON store_status FOR UPDATE USING (false) WITH CHECK (false);

-- 販売を原子的に記録（在庫プールごとに1回ロックして減算）
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
  DELETE FROM _sale_lines;
  INSERT INTO _sale_lines (menu_item_id, quantity)
  SELECT (e->>'menu_item_id')::UUID, (e->>'quantity')::INT
  FROM jsonb_array_elements(p_lines) AS e;

  CREATE TEMP TABLE IF NOT EXISTS _stock_deductions (stock_item_id UUID, quantity INT) ON COMMIT DROP;
  DELETE FROM _stock_deductions;
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

-- 待ち人数・売上目標の更新（NULLを渡した項目は変更しない）
CREATE OR REPLACE FUNCTION update_store_status(
  p_waiting_count INT DEFAULT NULL,
  p_sales_goal INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['pos', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  UPDATE store_status
  SET
    waiting_count = COALESCE(p_waiting_count, waiting_count),
    sales_goal = COALESCE(p_sales_goal, sales_goal),
    updated_at = NOW()
  WHERE id = true;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION update_store_status(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_store_status(INT, INT) TO authenticated;

-- Realtime対象に追加
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_items; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.store_status; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sales; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items; EXCEPTION WHEN duplicate_object THEN NULL; END $$;