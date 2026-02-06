import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testEmbedding() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  console.log("API Key exists:", !!apiKey);

  if (!apiKey) {
    console.error("No API key found!");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    console.log("Testing model: gemini-embedding-001");
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent("テスト文章です");
    console.log("✅ Success! Embedding length:", result.embedding.values.length);
    console.log("First 5 values:", result.embedding.values.slice(0, 5));
  } catch (error: any) {
    console.error("❌ Failed:", error.message);
  }
}

testEmbedding();
