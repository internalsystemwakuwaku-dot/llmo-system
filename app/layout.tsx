import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LLMO診断ツール - AI検索最適化スコア",
  description:
    "あなたのWebページがAI検索（RAG）でどれくらい参照されやすいかを診断。LLMOスコアと改善提案を提供します。",
  keywords: ["LLMO", "LLM最適化", "AI検索", "RAG", "SEO", "コンテンツ最適化"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
