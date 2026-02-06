import * as cheerio from "cheerio";

export interface ScrapedContent {
  title: string;
  description: string;
  mainContent: string;
  headings: string[];
  structuredData: object[];
  wordCount: number;
  hasStructuredData: boolean;
}

// URLからHTMLを取得
async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LLMOBot/1.0; +https://llmo-system.vercel.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`URL does not return HTML content: ${contentType}`);
  }

  return response.text();
}

// 不要な要素を除去
function removeUnwantedElements($: cheerio.CheerioAPI): void {
  // スクリプト、スタイル、ナビゲーション等を除去
  $(
    "script, style, nav, header, footer, aside, iframe, noscript, svg, form, button, input, [role='navigation'], [role='banner'], [role='contentinfo'], .sidebar, .navigation, .menu, .ad, .advertisement, .social-share, .comments"
  ).remove();
}

// メインコンテンツを抽出
function extractMainContent($: cheerio.CheerioAPI): string {
  // メインコンテンツエリアを優先的に探す
  const mainSelectors = [
    "main",
    "article",
    '[role="main"]',
    ".main-content",
    ".post-content",
    ".entry-content",
    ".content",
    "#content",
    "#main",
  ];

  for (const selector of mainSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      return element.text().trim();
    }
  }

  // フォールバック: body全体から抽出
  return $("body").text().trim();
}

// 見出しを抽出
function extractHeadings($: cheerio.CheerioAPI): string[] {
  const headings: string[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      headings.push(text);
    }
  });
  return headings;
}

// 構造化データ(JSON-LD)を抽出
function extractStructuredData($: cheerio.CheerioAPI): object[] {
  const structuredData: object[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "");
      structuredData.push(json);
    } catch {
      // パースエラーは無視
    }
  });

  return structuredData;
}

// テキストを正規化（余分な空白を削除）
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

// URLをスクレイピングしてコンテンツを抽出
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // タイトルとメタ情報を取得
  const title = $("title").text().trim() || $("h1").first().text().trim() || "";
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  // 構造化データを先に抽出
  const structuredData = extractStructuredData($);

  // 不要な要素を除去
  removeUnwantedElements($);

  // メインコンテンツを抽出
  const rawContent = extractMainContent($);
  const mainContent = normalizeText(rawContent);

  // 見出しを抽出
  const headings = extractHeadings($);

  // 単語数をカウント（日本語対応）
  const wordCount = mainContent.length;

  return {
    title,
    description,
    mainContent,
    headings,
    structuredData,
    wordCount,
    hasStructuredData: structuredData.length > 0,
  };
}

// コンテンツのプレビュー用に切り詰め
export function truncateContent(content: string, maxLength: number = 500): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "...";
}
