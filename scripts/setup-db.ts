import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function setupDatabase() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("🚀 Setting up Turso database...");

  try {
    // analysis_logs テーブル作成
    await client.execute(`
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
      )
    `);
    console.log("✅ Created analysis_logs table");

    // ベクトルインデックス作成
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_content_embedding
      ON analysis_logs (libsql_vector_idx(content_embedding))
    `);
    console.log("✅ Created vector index for content_embedding");

    console.log("\n🎉 Database setup complete!");
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    throw error;
  } finally {
    client.close();
  }
}

setupDatabase();
