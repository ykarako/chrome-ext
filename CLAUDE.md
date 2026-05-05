# CLAUDE.md

## Language Preference

**IMPORTANT: Always respond in Japanese (日本語) when working with this codebase.**

- コード以外のコミュニケーション・コメント・ドキュメントは日本語
- コミットメッセージは日本語（feat/fix/refactor/docs プレフィックス付き）
- コード識別子（関数名、変数名等）は英語

## Workflows

- **新規実装開始**: `/start-issue <issue番号>` を使用
- **push**: 必ず `/push` を使用（直接 `git push` 禁止）
- **PR作成**: `gh pr create --base <ベースブランチ>` で `--base` を必ず明示指定
- **スコープ外の問題発見時**: 作業中の主旨から逸脱した問題（バグ、改善点、技術的負債等）を発見した場合、**必ず `AskUserQuestion` を呼び出して**「この問題について `/create-issue` でIssueを作成しますか？」とユーザーに提案すること。問題を無視して作業を続行してはならない
- **ユーザーへの質問**: yes/no・確認・方針選択・曖昧な指示の明確化など、ユーザーに問う場合は平文ではなく **`AskUserQuestion` を使う**こと。指示や説明の解釈が分かれる場合も推測で進めず確認する

## ドキュメントの保存場所

| 種類 | 保存先 | 例 |
|------|--------|-----|
| 作業ログ | Issueコメント | 実装中のメモ、進捗報告 |
| 中間的な知見 | **GitHub Discussions** | 技術調査の結果、設計判断の経緯、トラブルシュートの知見 |
| 静的ドキュメント | `docs/` またはモジュール内 `docs/` | セットアップ手順、アーキテクチャ説明、API仕様 |

**GitHub Discussions の運用ルール**:
- Issueで得られた知見のうち、後から参照する価値があるものはDiscussionに転記してからIssueをクローズする
- カテゴリで分類する（例: `技術調査`, `設計判断`）
- Issue/PRからは `Discussion #番号` でリンクする

## PR/Pushチェックリスト

PRの作成やコードのプッシュ後は、必ず簡単なサニティチェックを実行する。ターゲット環境にすべてのimport/依存関係が存在することを確認する。

## Unit Testing

新しいアルゴリズム関数を追加したら必ずテストも書くこと。

**テストファイル規約**: クラス名 `Test<対象>`, メソッド名 `test_<内容>`（日本語docstring）
