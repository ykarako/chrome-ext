---
name: work-report
description: Use this skill when the user wants to generate a work summary report, review recent activity, or extract insights from Issues/PRs/commits.
---

指定期間の作業概要と知見をレポートします。

## 1. 期間の確認

ユーザーから期間を取得:
- 開始日（必須）: `YYYY-MM-DD` 形式
- 終了日（省略時は今日）

例: `/work-report 2026-01-27` → 2026-01-27〜今日

## 2. 情報収集

リポジトリのowner/repo名を取得:
```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

以下のコマンドを**並列実行**して情報を収集:

```bash
# PR一覧（期間中にマージされたもの + 期間中に作成されたもの）
gh pr list --state all --search "created:>=<開始日>" --json number,title,state,createdAt,mergedAt,author,labels --limit 100

# Issue一覧（期間中にクローズされたもの）
# 注意: created:>=ではなくclosed:で検索すること。期間前に作成され期間中にクローズされたIssueを漏らさないため。
gh issue list --state closed --search "closed:<開始日>..<終了日>" --json number,title,state,createdAt,closedAt,author,labels --limit 100

# Issue一覧（期間中に作成されオープンのもの）
gh issue list --state open --search "created:>=<開始日>" --json number,title,state,createdAt,closedAt,author,labels --limit 100

# コミット一覧
git log --since="<開始日>" --until="<終了日+1>" --all --oneline --date-order --format="%h %ad %s" --date=short
```

## 3. 作業概要レポート生成

以下の形式でMarkdownレポートを出力:

```markdown
# 作業概要レポート（YYYY/MM/DD 〜 YYYY/MM/DD）

## サマリー
| カテゴリ | 件数 |
|----------|------|
| マージ済みPR | X件 |
| クローズ済みIssue | X件 |
| オープンIssue | X件 |
| コミット数 | 約X件 |

## Pull Requests（マージ済み）
| PR | タイトル | マージ日 |
|----|----------|----------|
| [PR #XXX](https://github.com/<owner>/<repo>/pull/XXX) | タイトル | YYYY-MM-DD |

## Issues
### クローズ済み（期間中にクローズ）
| Issue | タイトル | ラベル | クローズ日 |
|-------|----------|--------|------------|
| [Issue #XXX](https://github.com/<owner>/<repo>/issues/XXX) | タイトル | ラベル | YYYY-MM-DD |

### オープン（期間中に作成）
| Issue | タイトル | ラベル | 作成日 |
|-------|----------|--------|--------|
| [Issue #XXX](https://github.com/<owner>/<repo>/issues/XXX) | タイトル | ラベル | YYYY-MM-DD |

## 主要な開発内容
（PRとコミットから主要な作業をカテゴリ別に整理。参照は `[Issue #XXX](...)` / `[PR #XXX](...)` 形式でリンク化する）
```

## 4. 知見抽出（デフォルト有効）

デフォルトで知見抽出を実行する。`--no-insights` 指定時はスキップ。

### 4.1 詳細取得対象の選定
以下の基準で重要なIssueを選定:
- クローズ済みで、コメントがある
- タイトルに「調査」「分析」「最適化」「改善」などのキーワード

### 4.2 Issue詳細の取得
```bash
gh issue view <issue番号> --comments
```

### 4.3 知見の抽出と整理
以下の観点で知見を抽出:
- **計測データ**: 数値、テスト結果、ベンチマーク
- **原因分析**: 問題の真因、誤解していた点
- **設計判断**: 採用/不採用の理由、トレードオフ
- **教訓**: 今後に活かせる学び

### 4.4 知見レポート形式
```markdown
# 知見レポート

## 1. [テーマ]（[Issue #XXX](https://github.com/<owner>/<repo>/issues/XXX)）
### 発見
- ポイント1

### 計測データ（あれば）
| 項目 | 値 |
|------|-----|

### 教訓
- 学び

## まとめ
（全体を通しての重要な教訓）
```

## 5. 簡潔版サマリー

レポートの最後に、主要な開発内容をカテゴリ別にグルーピングして簡潔にまとめたセクションを追加する。

```markdown
## 主要な開発内容（簡潔版）

### カテゴリA
- テーマ名: 説明

### カテゴリB
- テーマ名: 説明
```

ルール:
- カテゴリは内容に応じて自動判断する（固定リストなし）
  - 例: 不具合修正、リファクタリング、機能追加、ドキュメント、テスト・検証、パフォーマンス改善、インフラ・環境、調査・分析 など
  - その週の内容に合うカテゴリだけを使い、該当なしのカテゴリは出さない
- 各項目は `- テーマ名: 説明` の形式（Issue番号・PR番号は不要）
- 説明は簡潔に1文で、**必ず1行に収める**（改行して2行にしない）
- 関連Issueが多い場合は件数表記（例: 「8件」）も可
- 知見レポートがある場合はその後に配置する

## 6. 出力

レポートを画面に直接出力し、同時に `tmp/YYYY-MM-DD_report.md` にファイル保存する。
ファイル名の日付は**レポート生成日（今日）**を使用する。

## 使用例

```
/work-report 2026-01-27                 # 知見抽出付き（デフォルト）
/work-report 2026-01-01 2026-01-31      # 期間指定
/work-report 2026-01-27 --no-insights   # 知見抽出なし（概要のみ）
```

## 注意事項
- 大量のIssue/PRがある場合は主要なもののみ抽出
- 知見抽出はデフォルト有効（不要な場合は `--no-insights`）
- コミット数は概算で表示（正確なカウントは不要）
- **Issue/PRの参照は必ず種別を明示しリンク化する**: `[Issue #XXX](https://github.com/<owner>/<repo>/issues/XXX)` / `[PR #XXX](https://github.com/<owner>/<repo>/pull/XXX)`（`#XXX` 単体は使わない）
- リポジトリのowner/repo名は `gh repo view --json nameWithOwner -q .nameWithOwner` で取得する
