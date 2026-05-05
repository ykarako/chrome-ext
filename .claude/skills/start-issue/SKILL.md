---
name: start-issue
description: Use this skill when the user wants to start implementing a new feature, fix a bug, begin work on an Issue, or create a new branch for development.
---

新規実装（機能追加、バグ修正、リファクタリング等）を開始します。以下の手順を実行してください:

1. **Issue情報の取得**
   - `gh issue view {issue番号} --json number,title,labels,body` でIssue情報を取得
   - タイトル、説明、ラベルを確認

2. **現在の状態確認**
   - `git status` で現在のブランチと状態を確認
   - `git worktree list` で既存のworktreeを確認

3. **実装タイプの判断とブランチ名提案**
   - Issueのタイトルと説明から実装タイプを判断:
     - 新機能追加 → `feat/<説明>`
     - バグ修正 → `fix/<説明>`
     - リファクタリング → `refactor/<説明>`
     - ドキュメント更新 → `docs/<説明>`
   - Issueタイトルから適切なブランチ名（英語、kebab-case）を提案
   - 例:
     - Issue「エラー解除が失敗する」 → `fix/error-clear-failure`
     - Issue「経過時間表示を追加」 → `feat/elapsed-timer`

4. **ユーザーへの確認**
   - **AskUserQuestionツールを使用して**以下の選択肢をユーザーに提示:
     1. 新規worktreeを作成（推奨：並行作業可能）
     2. 現在のディレクトリで新規ブランチ作成
   - worktree作成の場合、ディレクトリ名を提案（例: `../<リポジトリ名>_issue<番号>`）
   - ブランチ名を確認・修正してもらう

5. **Worktree/ブランチの作成**
   ```bash
   # worktree作成の場合
   git fetch --all
   git worktree add <ディレクトリパス> -b <ブランチ名> <分岐元ブランチ>

   # 既存ディレクトリの場合
   git fetch --all
   git checkout -b <ブランチ名>
   ```

   プロジェクト固有の初期化（`.env` のコピー、サブモジュール初期化、シンボリックリンク等）が必要な場合は、`CLAUDE.md` を確認するか、ユーザーに手順を確認してから追加実行する。

6. **Issueに実装計画コメントを投稿**
   Issue情報を元に以下の形式でIssueコメントを投稿する:
   ```markdown
   ## 実装計画

   **ブランチ:** `<ブランチ名>`

   ### 現状分析
   （Issue本文の内容を踏まえた分析）

   ### タスクリスト
   - [ ] タスク1
   - [ ] タスク2

   ### 実装方針
   （設計方針、変更箇所の概要）

   ### 変更箇所（予定）
   | ファイル | 変更内容 |
   |----------|----------|
   | `path/to/file` | 変更内容の説明 |

   ---
   *このコメントは `/start-issue` スキルにより自動生成されました*
   ```

   - タスクリスト、実装方針は、Issueの内容から判断できる範囲で記入。不明な場合はプレースホルダーで残す
   - コメントは必ず日本語で作成

   ```bash
   gh issue comment <issue番号> --body "<コメント内容>"
   ```

7. **セッション名の設定**
   - 以下のコマンドでセッションのJSONLファイルに `custom-title` エントリを追記し、セッション名を設定する
   - **`TITLE` 変数には実際のIssue番号とタイトルを設定すること**
   ```bash
   TITLE="Issue #<実際の番号>: <実際のIssueタイトル>"
   SESSION_ID=$(ls -td ~/.claude/session-env/*/ 2>/dev/null | head -1 | xargs basename)
   SESSION_FILE=$(find ~/.claude/projects/ -maxdepth 2 -name "${SESSION_ID}.jsonl" 2>/dev/null | head -1)
   if [ -n "$SESSION_FILE" ]; then
     python3 -c "import json,sys; print(json.dumps({'type':'custom-title','sessionId':sys.argv[1],'customTitle':sys.argv[2]}))" "$SESSION_ID" "$TITLE" >> "$SESSION_FILE"
   fi
   ```

8. **完了報告**
   - 作成したworktree/ブランチのパスを表示
   - Issueコメントへのリンクを表示
   - **worktree作成の場合**: ターミナルで以下を実行するよう案内
     ```
     cd <worktreeパス> && claude '/resume-issue <issue番号>'
     ```
   - 次のステップ（調査開始、実装開始など）を提案

**注意事項**:
- Issue番号が指定されていない場合は、ユーザーに番号を尋ねる
- 実装タイプの自動判断が難しい場合は、ユーザーに選択肢を提示
- worktree作成に失敗した場合は、エラー内容を表示し代替案を提示
