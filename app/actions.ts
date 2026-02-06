"use server";

import { z } from "zod";
import { getTursoClient, cosineSimilarity, vectorToBase64 } from "@/lib/turso";
import { embedText } from "@/lib/embedding";
import { scrapeUrl, truncateContent } from "@/lib/scraper";
import { analyzeContentWithFallback, AnalysisResult } from "@/lib/analyzer";

// 入力バリデーションスキーマ
const analyzeInputSchema = z.object({
  url: z.string().url("有効なURLを入力してください"),
  targetQuery: z
    .string()
    .min(5, "質問文は5文字以上で入力してください")
    .max(500, "質問文は500文字以内で入力してください"),
});

export interface DiagnosisResult {
  success: boolean;
  error?: string;
  data?: {
    url: string;
    targetQuery: string;
    pageTitle: string;
    contentPreview: string;
    similarityScore: number;
    similarityPercentage: number;
    analysis: AnalysisResult;
    scrapedAt: string;
    isSPA: boolean;
  };
}

// メイン診断処理
export async function diagnoseUrl(
  prevState: DiagnosisResult | null,
  formData: FormData
): Promise<DiagnosisResult> {
  try {
    // 入力バリデーション
    const rawInput = {
      url: formData.get("url"),
      targetQuery: formData.get("targetQuery"),
    };

    const validatedInput = analyzeInputSchema.safeParse(rawInput);
    if (!validatedInput.success) {
      return {
        success: false,
        error: validatedInput.error.errors[0].message,
      };
    }

    const { url, targetQuery } = validatedInput.data;

    // 1. URLのスクレイピング
    console.log(`[LLMO] Scraping URL: ${url}`);
    const scrapedContent = await scrapeUrl(url);

    console.log(`[LLMO] Scraped content length: ${scrapedContent.mainContent.length}, isSPA: ${scrapedContent.isSPA}`);

    // コンテンツチェック（SPAサイトはメタ情報のみでも許容）
    const minContentLength = scrapedContent.isSPA ? 50 : 100;
    if (!scrapedContent.mainContent || scrapedContent.mainContent.length < minContentLength) {
      const errorMessage = scrapedContent.isSPA
        ? "このサイトはJavaScriptで動的に生成されるため、コンテンツを十分に取得できませんでした。静的なHTMLページをお試しください。"
        : "ページからコンテンツを十分に取得できませんでした。";
      return {
        success: false,
        error: errorMessage,
      };
    }

    // 2. Embedding生成
    console.log("[LLMO] Generating embeddings...");
    const [contentEmbedding, queryEmbedding] = await Promise.all([
      embedText(scrapedContent.mainContent),
      embedText(targetQuery),
    ]);

    // 3. コサイン類似度計算
    const similarityScore = cosineSimilarity(contentEmbedding, queryEmbedding);
    const similarityPercentage = Math.round(((similarityScore + 1) / 2) * 100);

    console.log(`[LLMO] Similarity score: ${similarityScore} (${similarityPercentage}%)`);

    // 4. LLMによる詳細分析
    console.log("[LLMO] Analyzing content with LLM...");
    const analysis = await analyzeContentWithFallback(scrapedContent, targetQuery, similarityScore);

    // 5. 結果をデータベースに保存
    console.log("[LLMO] Saving to database...");
    const db = getTursoClient();
    const contentPreview = truncateContent(scrapedContent.mainContent, 500);

    await db.execute({
      sql: `
        INSERT INTO analysis_logs (
          url, target_query, page_title, content_preview,
          similarity_score, content_embedding, query_embedding, advice
        ) VALUES (?, ?, ?, ?, ?, vector(?), vector(?), ?)
      `,
      args: [
        url,
        targetQuery,
        scrapedContent.title,
        contentPreview,
        similarityScore,
        `[${contentEmbedding.join(",")}]`,
        `[${queryEmbedding.join(",")}]`,
        JSON.stringify(analysis),
      ],
    });

    return {
      success: true,
      data: {
        url,
        targetQuery,
        pageTitle: scrapedContent.title,
        contentPreview,
        similarityScore,
        similarityPercentage,
        analysis,
        scrapedAt: new Date().toISOString(),
        isSPA: scrapedContent.isSPA,
      },
    };
  } catch (error) {
    console.error("[LLMO] Error:", error);

    if (error instanceof Error) {
      // ユーザーフレンドリーなエラーメッセージ
      if (error.message.includes("Failed to fetch")) {
        return {
          success: false,
          error: "URLにアクセスできませんでした。URLが正しいか確認してください。",
        };
      }
      if (error.message.includes("embedding")) {
        return {
          success: false,
          error: "Embedding処理中にエラーが発生しました。APIキーを確認してください。",
        };
      }
    }

    return {
      success: false,
      error: "診断中にエラーが発生しました。しばらく後に再度お試しください。",
    };
  }
}

// 過去の診断履歴を取得
export async function getAnalysisHistory(limit: number = 10) {
  try {
    const db = getTursoClient();
    const result = await db.execute({
      sql: `
        SELECT id, url, target_query, page_title, similarity_score, created_at
        FROM analysis_logs
        ORDER BY created_at DESC
        LIMIT ?
      `,
      args: [limit],
    });

    return {
      success: true,
      data: result.rows.map((row) => ({
        id: row.id as number,
        url: row.url as string,
        targetQuery: row.target_query as string,
        pageTitle: row.page_title as string,
        similarityScore: row.similarity_score as number,
        createdAt: row.created_at as string,
      })),
    };
  } catch (error) {
    console.error("[LLMO] Error fetching history:", error);
    return {
      success: false,
      error: "履歴の取得に失敗しました",
      data: [],
    };
  }
}
