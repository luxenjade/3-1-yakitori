# Supabase 接続手順

## 1. 環境変数を設定する

プロジェクトルートの `.env` に次を設定する。値は Supabase Dashboard の **Project Settings → API** から取得する。

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-key または anon key>
```

既存の `VITE_SUPABASE_KEY` も後方互換のため利用できるが、新規設定では `VITE_SUPABASE_ANON_KEY` を使う。

## 2. DBを適用する

Supabase CLIを使える環境で、migrationを番号順に適用する。

```bash
supabase link --project-ref <project-ref>
supabase db push
```

`005_enable_items_realtime.sql` により、商品の在庫・完売状態がブラウザへRealtime反映される。

> 注意: 現在の `002_checkout_rpc.sql` は `004_auth_roles_and_rls.sql` で作成する `app_role`／`has_role` に依存している。新規プロジェクトへ適用する前に、これらの定義を会計RPCより先に作成するようmigration順を整理する必要がある。既存DBには影響しない。

## 3. Edge Functionをデプロイする

スタッフ操作を実DBで行うには、次をデプロイする。

```bash
supabase functions deploy checkout
supabase functions deploy advance_order_status
supabase functions deploy verify_pickup
```

これらはスタッフのSupabase Authセッションとロールを要求する。ログインUI、顧客用仮注文API、注文状態のRealtime同期は次フェーズで実装する（[NEXT_STEPS.md](NEXT_STEPS.md)参照）。

## 4. 接続を確認する

```bash
pnpm run check:supabase
pnpm run dev
```

`check:supabase` は `items` テーブルへの読み取り接続だけを確認し、認証情報の値は出力しない。アプリ起動後、モバイル注文画面の商品・在庫がSupabaseの `items` テーブルと一致することを確認する。
