# LLMO診断ツール

WebページがAI検索（RAG）においてどれくらい参照されやすいかを診断するMVPツールです。

## 機能

- **コンテンツ取得**: 指定URLからメインコンテンツを自動抽出
- **ベクトル類似度計算**: ターゲット質問文との類似度をEmbeddingで計算
- **LLM分析**: 情報網羅性・構造化データ・一次情報の観点から評価
- **改善提案**: 具体的な改善ポイントを提示

## 技術スタック

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Database**: Turso (libSQL) with Vector Search
- **AI SDK**: Vercel AI SDK
- **LLM**: Google Gemini / OpenAI
- **Styling**: Tailwind CSS

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env.local`にコピーして、必要な値を設定:

```bash
cp .env.example .env.local
```

```env
# Turso Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token

# Google Gemini API（推奨）
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# または OpenAI
OPENAI_API_KEY=your-openai-api-key
```

### 3. Turso データベースのセットアップ

#### Turso CLIでデータベース作成

```bash
# Turso CLIをインストール（まだの場合）
curl -sSfL https://get.tur.so/install.sh | bash

# ログイン
turso auth login

# データベース作成
turso db create llmo-system

# 接続情報を取得
turso db show llmo-system --url
turso db tokens create llmo-system
```

#### スキーマの適用

```bash
npm run db:setup
```

または、Turso CLIで直接SQLを実行:

```bash
turso db shell llmo-system < scripts/schema.sql
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## Vercelへのデプロイ

### 1. Vercelプロジェクトを作成

```bash
npx vercel
```

### 2. 環境変数を設定

Vercelダッシュボードで以下の環境変数を設定:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `GOOGLE_GENERATIVE_AI_API_KEY` または `OPENAI_API_KEY`

### 3. デプロイ

```bash
npx vercel --prod
```

## データベーススキーマ

```sql
CREATE TABLE analysis_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  target_query TEXT NOT NULL,
  page_title TEXT,
  content_preview TEXT,
  similarity_score REAL,
  content_embedding F32_BLOB(768),
  query_embedding F32_BLOB(768),
  advice TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API

### Server Actions

#### `diagnoseUrl(formData: FormData)`

URLとターゲット質問文を受け取り、LLMO診断を実行します。

**入力:**
- `url`: 診断対象のURL
- `targetQuery`: ターゲット質問文

**出力:**
- `success`: 成功/失敗
- `data`: 診断結果（類似度スコア、LLM分析結果、改善提案）

## ライセンス

MIT
