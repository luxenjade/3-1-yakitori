# 📋 ShopAdmin Dashboard 実装計画書

> This is a placeholder

## プロジェクト概要

**ShopAdmin Dashboard** は、React + TypeScript + Tailwind CSS + shadcn/ui で構築された、EC サイト管理向けのモダンなダッシュボードアプリケーションです。

### 現在の技術スタック

- **Framework**: React 19 + Vite
- **Language**: TypeScript (完全移行済み)
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Icons**: Lucide React
- **デプロイ**: Netlify / Docker 対応

---

## 🎯 現在の実装状況

### 完了している機能 ✅

1. **ダッシュボード画面**
   - KPI サマリー（総売上、注文数、顧客数、返品率）
   - 売上推移エリアチャート（過去12ヶ月）
   - カテゴリ別売上パイチャート
   - 最近の注文リスト
   - 売れ筋商品リスト

2. **UI コンポーネント**
   - サイドバーナビゲーション（7項目）
   - ダークモード切り替え
   - レスポンシブレイアウト
   - shadcn/ui コンポーネント（Button, Card, Avatar, Input, etc.）

3. **開発環境**
   - TypeScript 完全対応
   - Docker 開発・本番環境
   - Netlify デプロイ設定
   - ESLint 設定

---

## 🚀 今後の開発計画

### Phase 1: 機能拡充（優先度：高）

#### 1-1. 注文管理画面の追加

```
目標: 注文の一覧表示、フィルタリング、ステータス更新機能
- [ ] 注文一覧テーブル（ページネーション付き）
- [ ] 注文詳細モーダル
- [ ] ステータス変更機能（処理中→配送中→完了）
- [ ] 日付範囲フィルター
- [ ] 検索機能（注文ID、顧客名）
- [ ] 一括操作（ステータス更新、エクスポート）
```

#### 1-2. 商品管理画面の追加

```
目標: 商品のCRUD操作と在庫管理
- [ ] 商品一覧グリッド/テーブル表示
- [ ] 商品追加・編集モーダル
- [ ] 画像アップロード機能
- [ ] 在庫数管理
- [ ] カテゴリ別フィルター
- [ ] 価格帯フィルター
```

#### 1-3. 顧客管理画面の追加

```
目標: 顧客情報の管理と分析
- [ ] 顧客一覧表示
- [ ] 顧客詳細ページ
- [ ] 購入履歴表示
- [ ] 顧客セグメンテーション
- [ ] メール送信機能（通知）
```

### Phase 2: データ可視化の強化（優先度：中）

#### 2-1. 分析レポート画面

```
- [ ] 売上詳細レポート（日別/週別/月別）
- [ ] 商品別売上ランキング
- [ ] 顧客購入頻度分析
- [ ] カテゴリ別トレンド分析
- [ ] レポートPDFエクスポート
```

#### 2-2. リアルタイムダッシュボード

```
- [ ] リアルタイム注文通知
- [ ] 在庫アラート
- [ ] 売上目標達成率表示
- [ ] WebSocket によるリアルタイム更新
```

### Phase 3: UX/UI 改善（優先度：中）

#### 3-1. ナビゲーション改善

```
- [ ] サブメニュー対応
- [ ] ブレッドクラムブ実装
- [ ] お気に入り機能
- [ ] 最近見たページの履歴
```

#### 3-2. アクセシビリティ向上

```
- [ ] キーボードナビゲーションの完全対応
- [ ] スクリーンリーダー対応
- [ ] フォーカスインジケーターの改善
- [ ] ARIA ラベルの充実
```

### Phase 4: 技術的改善（優先度：低）

#### 4-1. パフォーマンス最適化

```
- [ ] コード分割（React.lazy + Suspense）
- [ ] 仮想スクロール（大量データ対応）
- [ ] メモ化の最適化（useMemo, useCallback）
- [ ] バンドルサイズ削減
```

#### 4-2. テスト体制の強化

```
- [ ] 単体テスト（Vitest）
- [ ] コンポーネントテスト（React Testing Library）
- [ ] E2E テスト（Playwright）
- [ ] カバレッジ目標 80% 以上
```

#### 4-3. 国際化（i18n）

```
- [ ] 多言語対応（日本語/英語）
- [ ] react-i18next 導入
- [ ] 言語切り替えUI
```

---

## 📁 推奨ディレクトリ構造

```
src/
├── components/
│   ├── ui/              # shadcn/ui コンポーネント
│   ├── layout/          # レイアウトコンポーネント
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── dashboard/       # ダッシュボード専用コンポーネント
│   ├── orders/          # 注文管理コンポーネント
│   ├── products/        # 商品管理コンポーネント
│   └── customers/       # 顧客管理コンポーネント
├── pages/               # ページコンポーネント
│   ├── Dashboard.tsx
│   ├── Orders.tsx
│   ├── Products.tsx
│   ├── Customers.tsx
│   └── Reports.tsx
├── hooks/               # カスタムフック
│   ├── useOrders.ts
│   ├── useProducts.ts
│   └── useCustomers.ts
├── types/               # 型定義
│   ├── order.ts
│   ├── product.ts
│   └── customer.ts
├── utils/               #  utility 関数
├── data/                # モックデータ
└── App.tsx              # メインアプリケーション
```

---

## 🔧 必要な依存パッケージ（追加予定）

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.x", // 高度なテーブル機能
    "react-router-dom": "^6.x", // ページネーション
    "date-fns": "^3.x", // 日付操作
    "react-hook-form": "^7.x", // フォーム管理
    "zod": "^3.x", // バリデーション
    "@hookform/resolvers": "^3.x", // react-hook-form + zod
    "react-i18next": "^14.x", // 国際化
    "file-saver": "^2.x" // ファイルダウンロード
  },
  "devDependencies": {
    "@testing-library/react": "^14.x", // テスト
    "@testing-library/jest-dom": "^6.x",
    "vitest": "^1.x", // テストランナー
    "@playwright/test": "^1.x", // E2E テスト
    "@types/file-saver": "^2.x"
  }
}
```

---

## 📅 開発マイルストーン

| フェーズ | 期間（目安） | 主な成果物                     |
| -------- | ------------ | ------------------------------ |
| Phase 1  | 2-3週間      | 注文・商品・顧客管理画面       |
| Phase 2  | 1-2週間      | 分析レポート、リアルタイム機能 |
| Phase 3  | 1週間        | UX/UI 改善                     |
| Phase 4  | 1-2週間      | パフォーマンス、テスト、i18n   |

---

## 🎨 デザインシステムの方針

1. **一貫性の維持**
   - shadcn/ui のデザインシステムを継承
   - Tailwind CSS のユーティリティクラスを積極的に活用

2. **ダークモード完全対応**
   - 全ての新しいコンポーネントでダークモードをサポート

3. **レスポンシブデザイン**
   - モバイルファーストのアプローチ
   - タブレット、デスクトップでの最適化

---

## 📝 開発ガイドライン

### コーディング規約

1. **TypeScript**: 厳格な型チェック（`strict: true`）
2. **コンポーネント**: 単一責任の原則
3. **ネーミング**: 分かりやすい英語名を使用
4. **コメント**: 複雑なロジックには必ずコメント

### Git コミットメッセージ

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット変更
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド設定など
```

---

## 🔗 参考リンク

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Recharts Documentation](https://recharts.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Documentation](https://react.dev/)

---

_最終更新: 2026年6月3日_
