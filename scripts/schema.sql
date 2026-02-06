-- LLMO System Database Schema for Turso (libSQL)
-- Vector拡張機能を使用

-- analysis_logs テーブル
-- ベクトル次元: 768 (Gemini embedding-001用)
CREATE TABLE IF NOT EXISTS analysis_logs (
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

-- ベクトル検索用インデックス
CREATE INDEX IF NOT EXISTS idx_content_embedding
ON analysis_logs (libsql_vector_idx(content_embedding));

-- URLとクエリの組み合わせ検索用インデックス
CREATE INDEX IF NOT EXISTS idx_url_query
ON analysis_logs (url, target_query);

-- 日付検索用インデックス
CREATE INDEX IF NOT EXISTS idx_created_at
ON analysis_logs (created_at DESC);
