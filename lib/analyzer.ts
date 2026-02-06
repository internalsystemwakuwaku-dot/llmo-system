import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ScrapedContent } from "./scraper";

export interface AnalysisResult {
  overallScore: number;
  comprehensiveness: {
    score: number;
    feedback: string;
  };
  structuredData: {
    score: number;
    feedback: string;
  };
  primarySource: {
    score: number;
    feedback: string;
  };
  improvements: string[];
  summary: string;
}

// 使用するLLMモデルを取得
function getModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google("gemini-2.0-flash");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai("gpt-4o-mini");
  }
  throw new Error("No LLM provider configured");
}

// LLMでコンテンツを分析
export async function analyzeContent(
  content: ScrapedContent,
  targetQuery: string,
  similarityScore: number
): Promise<AnalysisResult> {
  const model = getModel();

  const prompt = `あなたはLLMO（大規模言語モデル最適化）の専門家です。
以下のWebページコンテンツを分析し、AI検索（RAG）においてどれくらい参照されやすいかを評価してください。

【ターゲット質問】
${targetQuery}

【ページタイトル】
${content.title}

【ページ説明】
${content.description}

【見出し構造】
${content.headings.slice(0, 10).join("\n")}

【メインコンテンツ（抜粋）】
${content.mainContent.slice(0, 3000)}

【構造化データの有無】
${content.hasStructuredData ? "あり" : "なし"}

【ベクトル類似度スコア】
${Math.round(similarityScore * 100)}%

以下のJSON形式で回答してください（他の説明文は不要です）:
{
  "overallScore": 0-100の総合スコア,
  "comprehensiveness": {
    "score": 0-100の情報網羅性スコア,
    "feedback": "情報の網羅性についての評価（日本語で2-3文）"
  },
  "structuredData": {
    "score": 0-100の構造化スコア,
    "feedback": "構造化データと見出し構造についての評価（日本語で2-3文）"
  },
  "primarySource": {
    "score": 0-100の一次情報スコア,
    "feedback": "一次情報・独自性についての評価（日本語で2-3文）"
  },
  "improvements": [
    "具体的な改善提案1",
    "具体的な改善提案2",
    "具体的な改善提案3"
  ],
  "summary": "総評（日本語で3-4文）"
}`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  // JSONを抽出してパース
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse LLM response as JSON");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
    return result;
  } catch {
    throw new Error("Failed to parse LLM response as JSON");
  }
}

// 簡易スコア計算（LLMを使わない場合のフォールバック）
export function calculateBasicScore(content: ScrapedContent): number {
  let score = 50;

  // 見出しの数
  if (content.headings.length >= 5) score += 10;
  else if (content.headings.length >= 3) score += 5;

  // 構造化データ
  if (content.hasStructuredData) score += 15;

  // コンテンツの長さ
  if (content.wordCount >= 2000) score += 10;
  else if (content.wordCount >= 1000) score += 5;

  // 説明の有無
  if (content.description) score += 5;

  return Math.min(100, score);
}
