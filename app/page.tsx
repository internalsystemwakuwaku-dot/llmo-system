"use client";

import { useActionState } from "react";
import { diagnoseUrl, DiagnosisResult } from "./actions";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Database,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import { cn, getScoreColor, getScoreBgColor, getScoreLabel } from "@/lib/utils";

// スコア表示コンポーネント
function ScoreCard({
  title,
  score,
  feedback,
  icon: Icon,
}: {
  title: string;
  score: number;
  feedback: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-gray-600" />
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "text-2xl font-bold",
            getScoreColor(score)
          )}
        >
          {score}
          <span className="text-sm font-normal text-gray-500">/100</span>
        </div>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            getScoreBgColor(score),
            getScoreColor(score)
          )}
        >
          {getScoreLabel(score)}
        </span>
      </div>
      <p className="text-sm text-gray-600">{feedback}</p>
    </div>
  );
}

// メイン結果表示コンポーネント
function ResultDisplay({ result }: { result: DiagnosisResult }) {
  if (!result.success || !result.data) {
    return null;
  }

  const { data } = result;
  const { analysis } = data;

  return (
    <div className="mt-8 space-y-6">
      {/* ヘッダー情報 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {data.pageTitle || "タイトル未取得"}
            </h2>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              {data.url}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">総合LLMOスコア</div>
            <div
              className={cn(
                "text-4xl font-bold",
                getScoreColor(analysis.overallScore)
              )}
            >
              {analysis.overallScore}
              <span className="text-lg text-gray-400">/100</span>
            </div>
          </div>
        </div>

        {/* ターゲット質問 */}
        <div className="mt-4 p-3 bg-white/70 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">ターゲット質問</div>
          <div className="text-gray-800">{data.targetQuery}</div>
        </div>

        {/* 類似度スコア */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">
              ベクトル類似度（RAGでの見つけやすさ）
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  data.similarityPercentage >= 70
                    ? "bg-green-500"
                    : data.similarityPercentage >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
                )}
                style={{ width: `${data.similarityPercentage}%` }}
              />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {data.similarityPercentage}%
          </div>
        </div>
      </div>

      {/* 詳細スコア */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">詳細スコア</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <ScoreCard
            title="情報の網羅性"
            score={analysis.comprehensiveness.score}
            feedback={analysis.comprehensiveness.feedback}
            icon={FileText}
          />
          <ScoreCard
            title="構造化データ"
            score={analysis.structuredData.score}
            feedback={analysis.structuredData.feedback}
            icon={Database}
          />
          <ScoreCard
            title="一次情報・独自性"
            score={analysis.primarySource.score}
            feedback={analysis.primarySource.feedback}
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* 改善提案 */}
      <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          改善提案
        </h3>
        <ul className="space-y-3">
          {analysis.improvements.map((improvement, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-gray-700">{improvement}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 総評 */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">総評</h3>
        <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* コンテンツプレビュー */}
      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="p-4 cursor-pointer text-gray-700 hover:bg-gray-50 rounded-xl">
          抽出されたコンテンツを確認
        </summary>
        <div className="p-4 pt-0 border-t border-gray-200 mt-2">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {data.contentPreview}
          </p>
        </div>
      </details>
    </div>
  );
}

export default function HomePage() {
  const [result, formAction, isPending] = useActionState(diagnoseUrl, null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            LLMO診断ツール
          </h1>
          <p className="text-gray-600 mt-1">
            あなたのWebページがAI検索でどれくらい見つけやすいかを診断します
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 入力フォーム */}
        <form action={formAction} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            {/* URL入力 */}
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                診断したいURL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                placeholder="https://example.com/page"
                required
                disabled={isPending}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* ターゲット質問 */}
            <div>
              <label
                htmlFor="targetQuery"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ターゲット質問文
              </label>
              <textarea
                id="targetQuery"
                name="targetQuery"
                rows={3}
                placeholder="例: 「Next.jsでApp Routerを使ったSSRの実装方法は？」"
                required
                disabled={isPending}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                ユーザーがAIに質問しそうな内容を入力してください
              </p>
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "w-full py-3 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2",
                isPending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  診断中...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  診断を開始
                </>
              )}
            </button>
          </div>
        </form>

        {/* エラー表示 */}
        {result && !result.success && result.error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">エラーが発生しました</h3>
              <p className="text-red-600 text-sm mt-1">{result.error}</p>
            </div>
          </div>
        )}

        {/* 成功時の結果表示 */}
        {result && result.success && (
          <div className="mt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-green-800 font-medium">診断が完了しました</span>
            </div>
            <ResultDisplay result={result} />
          </div>
        )}

        {/* 説明セクション */}
        {!result && (
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">コンテンツ解析</h3>
              <p className="text-sm text-gray-600">
                URLからメインコンテンツを抽出し、AIが理解しやすい形式かを分析します
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">類似度計算</h3>
              <p className="text-sm text-gray-600">
                ターゲット質問との類似度をベクトル計算し、RAGでの参照されやすさを評価します
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">改善提案</h3>
              <p className="text-sm text-gray-600">
                LLMが具体的な改善ポイントを提案し、AI検索での順位向上をサポートします
              </p>
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          LLMO診断ツール - AI検索最適化のためのMVP
        </div>
      </footer>
    </div>
  );
}
