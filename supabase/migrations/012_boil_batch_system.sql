-- テント⇔解凍室(湯煎)の需給連携システム
-- 決済は別端末に移行したため、この機能は既存の売上系テーブルとは独立して追加する。

CREATE TABLE boil_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  momo_qty INT NOT NULL DEFAULT 0 CHECK (momo_qty >= 0 AND momo_qty % 10 = 0),
  kawa_qty INT NOT NULL DEFAULT 0 CHECK (kawa_qty >= 0 AND kawa_qty % 10 = 0),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'delivered', 'cancelled')),
  requested_by UUID REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT total_within_pot CHECK (momo_qty + kawa_qty > 0 AND momo_qty + kawa_qty <= 60)
);

-- 未受理(requested)は常に最大1件まで、という業務ルールをDBレベルで強制する
-- (status='requested' の行はすべて同じ値になるため、2件目の挿入でユニーク制約違反になる)
CREATE UNIQUE INDEX one_open_request ON boil_batches (status) WHERE status = 'requested';

ALTER TABLE boil_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can read boil batches"
ON boil_batches FOR SELECT
USING (public.has_role(ARRAY['pos', 'kitchen', 'admin']::app_role[]));

-- adminは手動修正できるようにしておく
CREATE POLICY "admin manages boil batches"
ON boil_batches FOR ALL
USING (public.current_app_role() = 'admin')
WITH CHECK (public.current_app_role() = 'admin');

-- それ以外の直接書き込みは拒否。操作はすべてSECURITY DEFINER RPC経由。
CREATE POLICY "no direct boil batch insert" ON boil_batches FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct boil batch update" ON boil_batches FOR UPDATE USING (false) WITH CHECK (false);

-- テント側: 次の配分をリクエスト
CREATE OR REPLACE FUNCTION request_boil_batch(
  p_momo_qty INT,
  p_kawa_qty INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.has_role(ARRAY['pos', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  IF p_momo_qty IS NULL OR p_kawa_qty IS NULL OR p_momo_qty < 0 OR p_kawa_qty < 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', '本数が不正です');
  END IF;
  IF p_momo_qty % 10 <> 0 OR p_kawa_qty % 10 <> 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', '本数は10本単位で指定してください');
  END IF;
  IF p_momo_qty + p_kawa_qty <= 0 OR p_momo_qty + p_kawa_qty > 60 THEN
    RETURN jsonb_build_object('ok', false, 'message', '合計は1〜60本の範囲で指定してください');
  END IF;

  IF EXISTS (SELECT 1 FROM boil_batches WHERE status = 'requested') THEN
    RETURN jsonb_build_object('ok', false, 'message', '前回のリクエストがまだ受理されていません');
  END IF;

  INSERT INTO boil_batches (momo_qty, kawa_qty, requested_by)
  VALUES (p_momo_qty, p_kawa_qty, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION request_boil_batch(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_boil_batch(INT, INT) TO authenticated;

-- テント側: 受理前なら自分のリクエストを取り消せる
CREATE OR REPLACE FUNCTION cancel_boil_batch(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch boil_batches%ROWTYPE;
BEGIN
  IF NOT public.has_role(ARRAY['pos', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  SELECT * INTO v_batch FROM boil_batches WHERE id = p_id FOR UPDATE;
  IF v_batch.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'リクエストが見つかりません');
  END IF;
  IF v_batch.status <> 'requested' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'すでに受理済みのため取り消せません');
  END IF;

  UPDATE boil_batches SET status = 'cancelled' WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION cancel_boil_batch(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_boil_batch(UUID) TO authenticated;

-- 調理室側: リクエストを受理し、湯煎開始
CREATE OR REPLACE FUNCTION accept_boil_batch(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch boil_batches%ROWTYPE;
BEGIN
  IF NOT public.has_role(ARRAY['kitchen', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  SELECT * INTO v_batch FROM boil_batches WHERE id = p_id FOR UPDATE;
  IF v_batch.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'リクエストが見つかりません');
  END IF;
  IF v_batch.status <> 'requested' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'このリクエストは受理できません');
  END IF;

  UPDATE boil_batches
  SET status = 'accepted', accepted_by = auth.uid(), accepted_at = NOW()
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION accept_boil_batch(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_boil_batch(UUID) TO authenticated;

-- 調理室側: テントへ配達完了
CREATE OR REPLACE FUNCTION deliver_boil_batch(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch boil_batches%ROWTYPE;
BEGIN
  IF NOT public.has_role(ARRAY['kitchen', 'admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'message', '権限がありません');
  END IF;

  SELECT * INTO v_batch FROM boil_batches WHERE id = p_id FOR UPDATE;
  IF v_batch.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'リクエストが見つかりません');
  END IF;
  IF v_batch.status <> 'accepted' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'このリクエストは配達完了にできません');
  END IF;

  UPDATE boil_batches SET status = 'delivered', delivered_at = NOW() WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION deliver_boil_batch(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deliver_boil_batch(UUID) TO authenticated;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.boil_batches; EXCEPTION WHEN duplicate_object THEN NULL; END $$;