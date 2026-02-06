import { createClient, Client } from "@libsql/client";

let client: Client | null = null;

export function getTursoClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

    if (!url) {
      throw new Error("TURSO_DATABASE_URL is not set");
    }

    client = createClient({
      url,
      authToken,
    });
  }

  return client;
}

// ベクトルをFloat32Arrayに変換
export function vectorToFloat32Array(vector: number[]): Float32Array {
  return new Float32Array(vector);
}

// Float32ArrayをBase64に変換（Turso保存用）
export function vectorToBase64(vector: number[]): string {
  const float32 = new Float32Array(vector);
  const buffer = Buffer.from(float32.buffer);
  return buffer.toString("base64");
}

// コサイン類似度を計算（Turso Vector関数がない場合のフォールバック）
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

// 類似度スコアを0-100のパーセンテージに変換
export function scoreToPercentage(similarity: number): number {
  // コサイン類似度は-1から1の範囲
  // 0-100%にマッピング（0.5以上を50%以上として扱う）
  return Math.round(((similarity + 1) / 2) * 100);
}
