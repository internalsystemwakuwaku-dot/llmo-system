import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function recreateTable() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("🗑️ Dropping old table...");
  await client.execute("DROP TABLE IF EXISTS analysis_logs");

  console.log("📦 Creating new table with 3072 dimensions (gemini-embedding-001)...");
  await client.execute(`
    CREATE TABLE analysis_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      target_query TEXT NOT NULL,
      page_title TEXT,
      content_preview TEXT,
      similarity_score REAL,
      content_embedding F32_BLOB(3072),
      query_embedding F32_BLOB(3072),
      advice TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("🔍 Creating vector index...");
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_content_embedding
    ON analysis_logs (libsql_vector_idx(content_embedding))
  `);

  console.log("✅ Done!");
  client.close();
}

recreateTable().catch(console.error);
