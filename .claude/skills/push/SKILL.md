---
name: push
description: Use this skill when the user wants to push changes, update work history, or sync with remote. Posts summary to GitHub Issue and pushes automatically.
---

作業履歴の記録からpushまでを一括で実行します。以下の手順を**すべて**実行してください:

1. **現在の状態確認**
   ```bash
   # 現在のブランチ名を取得
   git branch --show-current

   # リモートとの差分（pushされていないコミット）を確認
   git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null || git log --oneline -10
   ```
   - pushされていないコミットがない場合は、「pushするコミットがありません」と報告して終了

2. **Issue番号の抽出**
   - ブランチ名からIssue番号を抽出（例: `feat/issue-123-xxx` → #123、`fix/123-xxx` → #123）
   - パターン: `(feat|fix|refactor|docs)/issue-?(\d+)` または `(feat|fix|refactor|docs)/(\d+)-`

3. **作業履歴の生成**
   pushされていないコミットの情報を収集:
   ```bash
   # pushされていないコミットの詳細を取得
   git log origin/$(git branch --show-current)..HEAD --pretty=format:"- %s (%h)" 2>/dev/null
   ```

4. **Issueへのコメント投稿**（Issue番号が特定できている場合のみ）
   リポジトリのowner/repo名は `gh repo view --json nameWithOwner -q .nameWithOwner` で取得し、コミットハッシュは `git rev-parse HEAD` で取得する。

   以下の形式でコメントを作成:
   ```markdown
   ## 作業履歴更新（YYYY-MM-DD）

   **ブランチ:** `<ブランチ名>`

   **コミット一覧:**
   - [コミットメッセージ1](https://github.com/<owner>/<repo>/commit/<ハッシュ>)
   - [コミットメッセージ2](https://github.com/<owner>/<repo>/commit/<ハッシュ>)

   **概要:**
   （コミット内容を要約した説明）

   ---
   *このコメントは `/push` スキルにより自動生成されました*
   ```

   ```bash
   # Issueにコメントを投稿
   gh issue comment <issue番号> --body "<コメント内容>"
   ```

5. **pushの実行**
   上記の準備が完了したら、**必ず**pushを実行する:
   ```bash
   git push -u origin $(git branch --show-current)
   ```
   - pushが成功したら、push完了を報告する
   - エラーが発生した場合は、エラー内容を報告してユーザーに対処を確認する

6. **結果サマリーを表示**
   以下の情報を簡潔に報告:
   - pushしたコミット数
   - Issueコメント投稿の有無（投稿した場合はURLも表示）

**注意事項**:
- 確認なしで自動的にpushまで実行する
- Issue番号が特定できない場合は、Issueコメントの投稿はスキップ
- コミットメッセージの概要生成は、変更内容を理解して適切に要約すること
