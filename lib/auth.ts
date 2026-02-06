// Better Auth 骨組み（将来の拡張用）
// 現時点では認証なしでMVPを動作させる

import { betterAuth } from "better-auth";

// Better Auth インスタンス（将来用）
// 実際に使用する場合はデータベースアダプターを設定
export const auth = betterAuth({
  // 将来の設定用プレースホルダー
  // database: {
  //   provider: "sqlite",
  //   url: process.env.TURSO_DATABASE_URL,
  // },
  // emailAndPassword: {
  //   enabled: true,
  // },
});

// 認証が必要かチェックするヘルパー（現在は常にtrue）
export function isAuthenticated(): boolean {
  // MVP段階では認証をスキップ
  return true;
}

// 将来の拡張: ユーザー情報を取得
export async function getCurrentUser() {
  // MVP段階ではnullを返す
  return null;
}
