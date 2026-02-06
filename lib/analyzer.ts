import { google } from "@ai-sdk/google";
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

// 利用可能なGeminiモデルのリスト（優先度順）
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-001",
  "gemini-2.5-pro",
];

// プロンプトを生成
function createPrompt(
  content: ScrapedContent,
  targetQuery: string,
  similarityScore: number
): string {
  return `あなたはLLMO（大規模言語モデル最適化）の専門家です。
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
}

// クォータ超過エラーかどうかを判定
function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("quota") ||
      message.includes("rate limit") ||
      message.includes("resource_exhausted") ||
      message.includes("429")
    );
  }
  return false;
}

// LLMでコンテンツを分析（モデル自動フォールバック付き）
export async function analyzeContent(
  content: ScrapedContent,
  targetQuery: string,
  similarityScore: number
): Promise<AnalysisResult> {
  const prompt = createPrompt(content, targetQuery, similarityScore);
  let lastError: Error | null = null;

  // 各モデルを順番に試行
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`[LLMO] Trying model: ${modelName}`);
      const model = google(modelName);

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

      const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
      console.log(`[LLMO] Successfully analyzed with model: ${modelName}`);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[LLMO] Model ${modelName} failed:`, (error as Error).message.slice(0, 100));

      // クォータ超過エラーの場合は次のモデルを試行
      if (isQuotaError(error)) {
        console.log(`[LLMO] Quota exceeded for ${modelName}, trying next model...`);
        continue;
      }

      // モデルが見つからないエラーの場合も次を試行
      if ((error as Error).message.includes("not found") || (error as Error).message.includes("NOT_FOUND")) {
        console.log(`[LLMO] Model ${modelName} not found, trying next model...`);
        continue;
      }

      // その他のエラーは再スロー
      throw error;
    }
  }

  // 全モデルが失敗した場合
  throw lastError || new Error("All Gemini models failed");
}

// 簡易スコア計算（LLMを使わない場合のフォールバック）
export function calculateBasicScore(content: ScrapedContent, similarityScore: number): AnalysisResult {
  let overallScore = Math.round(similarityScore * 50) + 25;

  let structuredScore = 40;
  if (content.headings.length >= 5) structuredScore = 70;
  else if (content.headings.length >= 3) structuredScore = 55;
  if (content.hasStructuredData) structuredScore += 20;

  let comprehensivenessScore = 40;
  if (content.wordCount >= 2000) comprehensivenessScore = 70;
  else if (content.wordCount >= 1000) comprehensivenessScore = 55;
  else if (content.wordCount >= 500) comprehensivenessScore = 45;

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

// LLM分析を試行し、全モデル失敗時はフォールバック
export async function analyzeContentWithFallback(
  content: ScrapedContent,
  targetQuery: string,
  similarityScore: number
): Promise<AnalysisResult> {
  try {
    return await analyzeContent(content, targetQuery, similarityScore);
  } catch (error) {
    console.warn("[LLMO] All LLM models failed, using basic analysis:", (error as Error).message);
    return calculateBasicScore(content, similarityScore);
  }
}
