---
name: create-discussion
description: Use this skill when the user wants to create a GitHub Discussion, post technical findings, record test results, or document design decisions.
---

GitHub Discussionを作成します。技術調査の結果、設計判断の経緯など、Issueには収まらない中間的な知見を残すために使います。

## 1. 基本情報の確認

ユーザーから以下の情報を取得:
- **タイトル**: Discussionのタイトル（必須）
- **本文**: Discussion本文（必須）
- **カテゴリ**: 下記から選択（必須）

## 2. カテゴリの選択

**AskUserQuestionツールを使用して**カテゴリを選択してもらいます。

代表的なカテゴリ例（リポジトリのSettings > Discussions > Categoriesで事前作成済みである必要あり）:

| カテゴリ | 説明 | 使用場面 |
|---------|------|----------|
| `技術調査` | 技術的な調査・検証の結果 | ライブラリ比較、性能計測、原因調査 |
| `設計判断` | 設計上の意思決定とその根拠 | アーキテクチャ変更、技術選定、方針決定 |

実際に存在するカテゴリは Step 1 で取得して提示する。カテゴリが見つからない場合はユーザーに手動作成を依頼する。

## 3. Discussion作成の実行

### Step 1: リポジトリIDとカテゴリ一覧の取得

```bash
OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=${OWNER_REPO%/*}
REPO=${OWNER_REPO#*/}

gh api graphql -f query='
{
  repository(owner: "'$OWNER'", name: "'$REPO'") {
    id
    discussionCategories(first: 20) { nodes { id name } }
  }
}'
```

出力からリポジトリIDと、使用するカテゴリのIDを取得する。

### Step 2: Discussionを作成

```bash
gh api graphql \
  -f query='
mutation($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
  createDiscussion(input: {
    repositoryId: $repoId,
    categoryId: $catId,
    title: $title,
    body: $body
  }) {
    discussion { number url }
  }
}' \
  -f repoId="<リポジトリID>" \
  -f catId="<カテゴリID>" \
  -f title="<タイトル>" \
  -f body="$(cat <<'EOF'
<本文>
EOF
)"
```

### Step 3: 関連Issueへのリンク（オプション）

関連するIssue番号が指定された場合:
```bash
gh issue comment <issue番号> --body "関連Discussion: #<Discussion番号>"
```

## 4. 作成後の確認

Discussion作成後:
1. 作成されたDiscussion URLを表示
2. 設定された内容を確認表示（タイトル、カテゴリ）
3. 関連Issueがある場合はリンク済みであることを報告

## クイック作成モード

引数でタイトルが指定された場合、対話的にカテゴリと本文を確認して作成:
- 例: `/create-discussion "ライブラリXとYの比較"`

カテゴリも指定する場合:
- `/create-discussion "ライブラリXとYの比較" --category 技術調査`

## テンプレート提案

カテゴリに応じて本文のテンプレートを提案:

**技術調査**:
```markdown
## 背景
<調査の動機・きっかけ>

## 調査内容
<何を調べたか>

## 結果
<調査結果の詳細>

## 結論・所見
<結論と今後のアクション>

## 関連
- Issue #xxx
```

**設計判断**:
```markdown
## 背景
<判断が必要になった経緯>

## 選択肢
| 案 | メリット | デメリット |
|----|---------|-----------|
| A: | | |
| B: | | |

## 決定
<採用した案とその理由>

## 影響範囲
<この判断が影響するコンポーネント・今後の作業>

## 関連
- Issue #xxx
```
