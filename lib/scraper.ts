import * as cheerio from "cheerio";

export interface ScrapedContent {
  title: string;
  description: string;
  mainContent: string;
  headings: string[];
  structuredData: object[];
  wordCount: number;
  hasStructuredData: boolean;
  isSPA: boolean;
}

// URLからHTMLを取得
async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
  $(
    "script, style, nav, header, footer, aside, iframe, noscript, svg, form, button, input, [role='navigation'], [role='banner'], [role='contentinfo'], .sidebar, .navigation, .menu, .ad, .advertisement, .social-share, .comments"
  ).remove();
}

// メインコンテンツを抽出
function extractMainContent($: cheerio.CheerioAPI): string {
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
      const text = element.text().trim();
      if (text.length > 50) {
        return text;
      }
    }
  }

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

// OGP・メタ情報を抽出してコンテンツ化
function extractMetaContent($: cheerio.CheerioAPI): string {
  const metaParts: string[] = [];

  // OGP情報
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDescription = $('meta[property="og:description"]').attr("content");
  const ogSiteName = $('meta[property="og:site_name"]').attr("content");

  // Twitter Card
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  const twitterDescription = $('meta[name="twitter:description"]').attr("content");

  // 通常のmeta
  const description = $('meta[name="description"]').attr("content");
  const keywords = $('meta[name="keywords"]').attr("content");

  if (ogSiteName) metaParts.push(`サイト名: ${ogSiteName}`);
  if (ogTitle || twitterTitle) metaParts.push(`タイトル: ${ogTitle || twitterTitle}`);
  if (ogDescription || twitterDescription || description) {
    metaParts.push(`説明: ${ogDescription || twitterDescription || description}`);
  }
  if (keywords) metaParts.push(`キーワード: ${keywords}`);

  return metaParts.join("\n");
}

// 構造化データからテキストを抽出
function extractTextFromStructuredData(structuredData: object[]): string {
  const texts: string[] = [];

  for (const data of structuredData) {
    extractTextsFromObject(data, texts);
  }

  return texts.join("\n");
}

function extractTextsFromObject(obj: unknown, texts: string[]): void {
  if (!obj || typeof obj !== "object") return;

  const record = obj as Record<string, unknown>;

  // 重要なプロパティからテキストを抽出
  const textProperties = [
    "name",
    "description",
    "headline",
    "articleBody",
    "text",
    "about",
    "slogan",
    "knowsAbout",
    "areaServed",
    "address",
    "telephone",
    "email",
  ];

  for (const prop of textProperties) {
    if (record[prop] && typeof record[prop] === "string") {
      texts.push(record[prop] as string);
    }
  }

  // 再帰的に探索
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        extractTextsFromObject(item, texts);
      }
    } else if (typeof value === "object") {
      extractTextsFromObject(value, texts);
    }
  }
}

// SPAサイトかどうかを検出
function detectSPA($: cheerio.CheerioAPI, bodyText: string): boolean {
  // body内のテキストが極端に少ない
  const hasMinimalContent = bodyText.length < 100;

  // SPA関連のフレームワーク検出
  const hasSPAIndicators =
    $('[id="app"]').length > 0 ||
    $('[id="root"]').length > 0 ||
    $('[id="__next"]').length > 0 ||
    $('[id="__nuxt"]').length > 0 ||
    $(".StudioCanvas").length > 0 ||
    $('[data-reactroot]').length > 0 ||
    $('[ng-app]').length > 0 ||
    $('[data-v-]').length > 0;

  return hasMinimalContent && hasSPAIndicators;
}

// テキストを正規化
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
  const title =
    $("title").text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    "";

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  // 構造化データを先に抽出
  const structuredData = extractStructuredData($);

  // 不要な要素を除去する前にbodyテキストを取得（SPA検出用）
  const rawBodyText = $("body").text().trim();

  // 不要な要素を除去
  removeUnwantedElements($);

  // メインコンテンツを抽出
  let rawContent = extractMainContent($);
  let mainContent = normalizeText(rawContent);

  // SPAサイト検出
  const isSPA = detectSPA($, mainContent);

  // コンテンツが少ない場合、メタ情報や構造化データから補完
  if (mainContent.length < 100) {
    const contentParts: string[] = [];

    // タイトルと説明を追加
    if (title) contentParts.push(`【タイトル】${title}`);
    if (description) contentParts.push(`【概要】${description}`);

    // メタ情報を追加
    const metaContent = extractMetaContent($);
    if (metaContent) contentParts.push(`【メタ情報】\n${metaContent}`);

    // 構造化データからテキストを抽出
    if (structuredData.length > 0) {
      const structuredText = extractTextFromStructuredData(structuredData);
      if (structuredText) contentParts.push(`【構造化データ】\n${structuredText}`);
    }

    // 元のコンテンツも追加
    if (mainContent) contentParts.push(`【ページ内テキスト】\n${mainContent}`);

    mainContent = contentParts.join("\n\n");
  }

  // 見出しを抽出
  const headings = extractHeadings($);

  // 単語数をカウント
  const wordCount = mainContent.length;

  return {
    title,
    description,
    mainContent,
    headings,
    structuredData,
    wordCount,
    hasStructuredData: structuredData.length > 0,
    isSPA,
  };
}

// コンテンツのプレビュー用に切り詰め
export function truncateContent(content: string, maxLength: number = 500): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "...";
}
