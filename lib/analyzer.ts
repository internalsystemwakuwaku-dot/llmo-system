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
export function calculateBasicScore(content: ScrapedContent, similarityScore: number): AnalysisResult {
  let overallScore = Math.round(similarityScore * 50) + 25; // 類似度をベースに

  // 見出しの数
  let structuredScore = 40;
  if (content.headings.length >= 5) structuredScore = 70;
  else if (content.headings.length >= 3) structuredScore = 55;

  // 構造化データ
  if (content.hasStructuredData) structuredScore += 20;

  // コンテンツの長さ
  let comprehensivenessScore = 40;
  if (content.wordCount >= 2000) comprehensivenessScore = 70;
  else if (content.wordCount >= 1000) comprehensivenessScore = 55;
  else if (content.wordCount >= 500) comprehensivenessScore = 45;

  // 説明の有無
  let primaryScore = 50;
  if (content.description && content.description.length > 50) primaryScore = 60;

  overallScore = Math.round((overallScore + structuredScore + comprehensivenessScore + primaryScore) / 4);

  return {
    overallScore: Math.min(100, overallScore),
    comprehensiveness: {
      score: comprehensivenessScore,
      feedback: `コンテンツ量は${content.wordCount}文字です。${content.wordCount >= 1000 ? "十分な情報量があります。" : "より詳細な情報を追加することを推奨します。"}`,
    },
    structuredData: {
      score: structuredScore,
      feedback: `見出しが${content.headings.length}個検出されました。${content.hasStructuredData ? "構造化データ（JSON-LD）が設定されています。" : "構造化データ（JSON-LD）の追加を推奨します。"}`,
    },
    primarySource: {
      score: primaryScore,
      feedback: content.description ? "メタ説明が設定されています。" : "メタ説明（description）の設定を推奨します。",
    },
    improvements: [
      content.hasStructuredData ? "構造化データをさらに充実させましょう" : "JSON-LD形式の構造化データを追加しましょう",
      content.headings.length < 5 ? "見出し（h2, h3）を追加してコンテンツを整理しましょう" : "見出し構造は良好です",
      "ターゲット質問に対する直接的な回答を含めましょう",
    ],
    summary: `ベクトル類似度${Math.round(similarityScore * 100)}%で、ターゲット質問との関連性は${similarityScore > 0.7 ? "高い" : similarityScore > 0.5 ? "中程度" : "改善の余地がある"}です。（※簡易分析結果）`,
  };
}

// LLM分析を試行し、失敗した場合はフォールバック
export async function analyzeContentWithFallback(
  content: ScrapedContent,
  targetQuery: string,
  similarityScore: number
): Promise<AnalysisResult> {
  try {
    return await analyzeContent(content, targetQuery, similarityScore);
  } catch (error) {
    console.warn("[LLMO] LLM analysis failed, using fallback:", error);
    return calculateBasicScore(content, similarityScore);
  }
}
