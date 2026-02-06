import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini gemini-embedding-001の次元数
export const EMBEDDING_DIMENSIONS = 3072;

// Gemini APIを使用してテキストをベクトル化
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  // テキストが長すぎる場合は切り詰め
  const maxLength = 8000;
  const truncatedText = text.length > maxLength ? text.slice(0, maxLength) : text;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  const result = await model.embedContent(truncatedText);
  return result.embedding.values;
}

// 複数テキストを一括ベクトル化
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(texts.map((text) => embedText(text)));
  return embeddings;
}
