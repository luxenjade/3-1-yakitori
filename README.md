# 🎓 文化祭食品販売用 PWA（注文・会計・リアルタイム在庫管理システム）

文化祭の模擬店（食品販売）における「大混雑の解消」「フードロスの完全防止」「スタッフのオペレーションミス撲滅」を目的とした高機能・低レイテンシ PWA (Progressive Web App) です。

---

## 🌟 システムの特徴

- **QRコード仮注文システム:** お客さんがスマホで事前に注文（QR生成）。レジでの会話ゼロ・爆速スキャン会計を実現。
- **バックレ＆ロス防止:** 仮注文段階では調理を開始せず、レジ決済（現金/交通系IC）が完了した瞬間に厨房（キッチンディスプレイ）へ即時伝送。
- **二重決済＆売りすぎ防止 (行ロック):** Supabase Edge Functions 内で `SELECT FOR UPDATE` による行ロックをかけ、激混み時のマイナス在庫を物理的に防ぎます。
- **4つの専用UI:** 「モバイルオーダー」「レジPOS」「キッチンディスプレイ」「サイネージ」を1つのPWAアプリ内に統合。
- **リアルタイム同期:** Supabase Realtime を活用し、レジ会計・調理進捗・在庫状況・呼び出し番号を全端末へ1秒未満で同期。
- **離脱対策 (Web Push):** 会計完了後、お客さんが他の展示へ移動しても商品完成時にスマホへ通知を送信。

---

## 🏗️ 技術スタック

- **フロントエンド:** React (TypeScript), Vite, Tailwind CSS, `qrcode.react`
- **バックエンド / DB:** Supabase (PostgreSQL, Supabase Realtime, Row Level Security)
- **サーバーレス API:** Supabase Edge Functions (Deno / TypeScript)
- **PWA / 通知:** `vite-plugin-pwa`, Web Push API (Service Worker)
- **ホスティング:** Netlify

---

## 🔄 全体データフロー

```
[1. お客さん (スマホ)]
  └─ 事前注文 ──► temporary_orders (仮注文QR作成)
                       │
             (レジでQRスキャン)
                       ▼
[2. レジPOS (スタッフ)]
  └─ 会計完了 ──► Supabase Edge Functions
                       ├─ スタッフ認証 (合言葉)
                       ├─ DB行ロック (SELECT FOR UPDATE)
                       ├─ 在庫減算 (items)
                       └─ 本注文昇格 (orders) ──[Realtime]──┐
                                                           │
┌──────────────────────────────────────────────────────────┘
▼
[3. 厨房 & サイネージ]
  ├─ キッチンディスプレイ: 確定注文がリアルタイム表示 (調理開始)
  ├─ サイネージ/呼び出し画面: 「只今の番号: 105番」表示
  └─ Web Push: バックグラウンドのスマホへ完成通知
                       │
             (商品受け取り / Verification)
                       ▼
[4. 提供口]
  └─ スマホ画面(偽造防止アニメーション付き番号)を目視確認 ➔ 手渡し完了！

```

---

## 📱 各画面 (UI) ルーティング一覧

| URL パス   | 画面名                   | 対象ユーザー  | 役割・機能                                                    |
| ---------- | ------------------------ | ------------- | ------------------------------------------------------------- |
| `/`        | **モバイルオーダー**     | 一般客        | 在庫確認、カート作成、仮注文QRコード表示、呼出番号確認        |
| `/pos`     | **会計レジ (POS)**       | 会計スタッフ  | 仮注文QRスキャン、手入力注文、現金/交通系IC決済               |
| `/kitchen` | **キッチンディスプレイ** | 厨房スタッフ  | 確定注文のリアルタイム表示、カード色変化 (時間経過)、提供済化 |
| `/signage` | **サイネージ**           | モニター/一般 | 現在の呼び出し番号、売上目標達成度、リアルタイム完売情報      |

---

## 🗄️ データベース設計 (Schema)

```sql
-- 1. 商品マスタ
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INT NOT NULL,
  initial_stock INT NOT NULL,
  current_stock INT NOT NULL CHECK (current_stock >= 0),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 仮注文 (モバイルオーダー)
CREATE TABLE temporary_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code VARCHAR(6) NOT NULL,
  total_price INT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE temporary_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temporary_order_id UUID REFERENCES temporary_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  quantity INT NOT NULL CHECK (quantity > 0)
);

-- 3. 確定注文 (会計完了分)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,
  total_price INT NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash' | 'ic'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'cooking' | 'ready' | 'completed'
  order_source TEXT NOT NULL, -- 'mobile' | 'pos'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  quantity INT NOT NULL
);

```

---

## 🚀 開発環境の立ち上げ手順

### 1. リポジトリのクローンとパッケージインストール

```bash
git clone https://github.com/your-org/school-festival-pwa.git
cd school-festival-pwa
pnpm install

```

### 2. 環境変数 (.env) の設定

プロジェクトルートに `.env` ファイルを作成し、Supabaseのキーを設定します（任意）。
未設定の場合は **メモリ内モックストア** で4画面フローをデモできます。

```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key

```

### 3. ローカル開発サーバーの起動

```bash
pnpm run dev

```

| パス       | 画面             |
| ---------- | ---------------- |
| `/`        | モバイルオーダー |
| `/pos`     | 会計レジ         |
| `/kitchen` | キッチン         |
| `/signage` | サイネージ       |

---

## 🛡️ 当日トラブルシューティング & 予備運用

1. **ネットワーク混雑によりQRコード画像がロードされない場合:**

- お客さんの画面に表示されている **6桁の英数字コード (例: `XF89B2`)** をレジのキーパッドで手入力して会計を行います。

2. **スマホを持っていない・非対応のお客さん:**

- 「通常レジ」に誘導し、紙の注文票または口頭で注文を聞き、レジPOSの「直接入力画面」から打刻します。

3. **誤って提供済みにした場合:**

- キッチンディスプレイの「完了履歴」タブから該当の注文をタップし、ステータスを `調理中 (cooking)` に戻します。
