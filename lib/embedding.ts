import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export type EmbeddingProvider = "google" | "openai";

// 使用するEmbeddingモデルの設定
const EMBEDDING_CONFIG = {
  google: {
    model: google.textEmbeddingModel("text-embedding-004"),
    dimensions: 768,
  },
  openai: {
    model: openai.embedding("text-embedding-3-small"),
    dimensions: 1536,
  },
};

// 環境変数からプロバイダーを自動選択
export function getEmbeddingProvider(): EmbeddingProvider {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return "google";
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  throw new Error(
    "No embedding provider configured. Set GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY"
  );
}

// テキストをベクトル化
export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  const config = EMBEDDING_CONFIG[provider];

  // テキストが長すぎる場合は切り詰め
  const maxLength = 8000;
  const truncatedText = text.length > maxLength ? text.slice(0, maxLength) : text;

  const { embedding } = await embed({
    model: config.model,
    value: truncatedText,
  });

  return embedding;
}

// 複数テキストを一括ベクトル化
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(texts.map((text) => embedText(text)));
  return embeddings;
}

// Embeddingの次元数を取得
export function getEmbeddingDimensions(): number {
  const provider = getEmbeddingProvider();
  return EMBEDDING_CONFIG[provider].dimensions;
}
