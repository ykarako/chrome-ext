---
name: create-issue
description: Use this skill when the user wants to create a GitHub Issue, report a bug, request a feature, or add a task to the project.
---

GitHub Issueを作成します。以下の手順で対話的に進めてください。

## 1. 基本情報の確認

ユーザーから以下の情報を取得してください:
- **タイトル**: Issueのタイトル（必須）
- **本文**: Issue本文（任意、後で追記可能）

## 2. デフォルト値

以下のデフォルト値を使用します（ユーザーが変更しない限り）:

| 項目 | デフォルト値 | 備考 |
|------|-------------|------|
| マイルストーン | **openかつdue dateが最も古いもの** | 下記コマンドで自動取得 |
| アサイン | `@me` | 自分にアサイン |

**マイルストーン自動取得コマンド**:
```bash
gh api repos/:owner/:repo/milestones --jq '[.[] | select(.state=="open")] | sort_by(.due_on) | .[0].title'
```

## 3. ラベルの選択（オプション）

リポジトリで利用可能なラベル一覧を取得して提示:
```bash
gh label list --json name,description --limit 50
```

**AskUserQuestionツールを使用して**ユーザーに選択させる（複数選択可能、不要ならスキップ）。

## 4. マイルストーンの選択（オプション）

デフォルト: **openかつdue dateが最も古いマイルストーン**

変更する場合、以下のコマンドで一覧を確認:
```bash
gh api repos/:owner/:repo/milestones --jq '.[] | select(.state=="open") | "\(.title) (due: \(.due_on // "未設定" | split("T")[0]))"'
```

## 5. アサイン先の選択（オプション）

デフォルト: **`@me`**（自分にアサイン）

担当者を変更する場合は、GitHubユーザー名を入力してもらいます。

## 6. Issue作成の実行

### Step 1: デフォルトマイルストーンの取得（あれば）
```bash
DEFAULT_MILESTONE=$(gh api repos/:owner/:repo/milestones --jq '[.[] | select(.state=="open")] | sort_by(.due_on) | .[0].title' 2>/dev/null)
```

### Step 2: Issue作成
```bash
gh issue create \
  --title "<タイトル>" \
  --body "<本文>" \
  --assignee "@me" \
  ${DEFAULT_MILESTONE:+--milestone "$DEFAULT_MILESTONE"} \
  ${LABELS:+--label "$LABELS"}
```

## 7. Issue Type の設定（オプション、リポジトリが対応している場合のみ）

GitHub Issue Types (Projects v2 関連機能) はリポジトリで有効化されている必要があります。

利用可能なIssue Typeを確認:
```bash
OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=${OWNER_REPO%/*}
REPO=${OWNER_REPO#*/}

gh api graphql -f query='
{
  repository(owner: "'$OWNER'", name: "'$REPO'") {
    issueTypes(first: 10) { nodes { id name } }
  }
}' --jq '.data.repository.issueTypes.nodes[] | "\(.name): \(.id)"' 2>/dev/null
```

該当機能が無効な場合（クエリ結果が空）はこのステップをスキップする。

利用可能な場合、`AskUserQuestion`で選択させ、以下で設定:
```bash
ISSUE_ID=$(gh api graphql -f query='
{
  repository(owner: "'$OWNER'", name: "'$REPO'") {
    issue(number: '$ISSUE_NUMBER') { id }
  }
}' --jq '.data.repository.issue.id')

gh api graphql -f query='
mutation {
  updateIssue(input: { id: "'$ISSUE_ID'", issueTypeId: "<TypeID>" }) {
    issue { title }
  }
}'
```

## 8. 作成後の確認

Issue作成後:
1. 作成されたIssue URLを表示
2. 設定された内容を確認表示（タイトル、ラベル、マイルストーン、Issue Type）
3. `/start-issue <issue番号>` で実装を開始できることを案内

## クイック作成モード

引数でタイトルが指定された場合、すべてデフォルト値で作成:
- 例: `/create-issue "エラーログの出力形式を改善"`

## テンプレート提案

本文未指定時、Issue内容に応じて以下のテンプレートを提案:

**バグ報告**:
```markdown
## 現象
<問題の説明>

## 再現手順
1.
2.

## 期待する動作

## 環境
```

**機能追加**:
```markdown
## 概要

## 背景・目的

## 要件
- [ ]
- [ ]
```

**タスク**:
```markdown
## 概要

## 完了条件
- [ ]
- [ ]
```
