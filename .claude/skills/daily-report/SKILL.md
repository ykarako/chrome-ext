---
name: daily-report
description: Use this skill when the user wants to generate a daily work report, view day-by-day activity, or summarize recent daily progress.
---

指定期間の日次作業レポートを生成します。

## 1. 期間の確認

- 引数なし: 先月の初日〜最終日
- 引数1つ `YYYY-MM`: 指定月の初日〜最終日
- 引数2つ `YYYY-MM-DD YYYY-MM-DD`: 開始日〜終了日

例:
- `/daily-report` → 先月（2026-02-01〜2026-02-28）
- `/daily-report 2026-01` → 2026-01-01〜2026-01-31
- `/daily-report 2026-02-10 2026-02-14` → 指定期間

## 2. 情報収集

リポジトリのowner/repo名を取得:
```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

以下のコマンドを**並列実行**して情報を収集:

```bash
# PR一覧（期間中にマージされたもの）
gh pr list --state merged --search "merged:<開始日>..<終了日+1>" --json number,title,mergedAt --limit 100

# Issue一覧（期間中にクローズされたもの）
gh issue list --state closed --search "closed:<開始日>..<終了日+1>" --json number,title,closedAt --limit 100
```

## 3. データの日別整理

収集したデータを日付ごとにグルーピングする:
- PR: `mergedAt` の日付でグルーピング（UTCをJSTに変換: +9時間）
- Issue: `closedAt` の日付でグルーピング（UTCをJSTに変換: +9時間）

**活動がない日はスキップ**する（表示しない）。

## 4. レポート生成

以下の形式でMarkdownレポートを出力:

```markdown
# 日次作業レポート（YYYY/MM/DD 〜 YYYY/MM/DD）

全体: 稼働X日 / マージPR X件 / クローズIssue X件

## MM/DD (曜日)
- [PR #XXX](<URL>): タイトル
- [Issue #XXX](<URL>): タイトル

## MM/DD (曜日)
- [PR #XXX](<URL>): タイトル
```

### 書式ルール

- 日付ヘッダーは `## MM/DD (曜日)` 形式（曜日は日本語: 月火水木金土日）
- 各日内では PR を先、Issue を後に並べ、それぞれ番号順
- 「マージ」「クローズ」の表記は付けない（リンクから自明なので冗長）
- PRとIssueは必ずリンク付き: `[PR #XXX](https://github.com/<owner>/<repo>/pull/XXX)` / `[Issue #XXX](https://github.com/<owner>/<repo>/issues/XXX)`
- 稼働日数 = 活動（PR or Issue）があった日の数
- 日付は古い順（昇順）で表示
- **コミット履歴はレポートに含めない**（PR/Issueで作業の単位は十分把握できるため）

## 5. 出力

レポートを画面に直接出力し、同時に `tmp/YYYY-MM-DD_daily_report.md` にファイル保存する。
ファイル名の日付は**レポート生成日（今日）**を使用する。
