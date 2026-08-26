# ShopAdmin Dashboard

ShopAdminは、React、TypeScript、Tailwind CSS、およびshadcn/uiを使用して構築された、モダンでレスポンシブな管理者用ダッシュボードのデモアプリケーションです。

## 主な機能

- **売上分析ダッシュボード**: Rechartsを使用した月次売上推移とカテゴリ別売上の可視化。
- **KPIサマリー**: 総売上、注文数、顧客数、返品率のリアルタイムな要約。
- **注文管理セクション**: 最近の注文ステータスの確認。
- **売れ筋商品リスト**: 商品ごとのパフォーマンス追跡。
- **ダークモード対応**: モダンなデザインとユーザー設定に合わせたテーマ切り替え。
- **型安全な開発**: 全てのコンポーネントとデータ構造がTypeScriptで定義されています。

## 技術スタック

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

## 開発の進捗

このプロジェクトは、元々JSXで記述されていたベースを、より堅牢で保守性の高い開発環境を構築するために**完全にTypeScript (TSX) へ移行**しました。全てのUIコンポーネント（Button, Card, Avatarなど）とビジネスロジックに適切な型定義が追加されています。

## セットアップ

### ローカル開発

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
npm run dev
```

### ビルド

```bash
npm run build
```

## Dockerでの実行

このプロジェクトはDockerをサポートしており、開発環境と本番ビルドの両方を簡単に実行できます。

### 開発環境

ホットリロード（HMR）が有効なコンテナを起動します：

```bash
docker compose up
```

`http://localhost:5173` でアクセス可能です。

### 本番用ビルドと実行

Nginxを使用して静的ファイルを配信する本番用イメージをビルドします：

```bash
docker build -t shadcn-demo:latest .
```

コンテナをポート `8080` で実行：

```bash
docker run -d -p 8080:80 --name shadcn-demo-prod shadcn-demo:latest
```

`http://localhost:8080` でアクセス可能です。
