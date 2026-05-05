---
name: resume-issue
description: Use this skill when the user wants to resume work on an existing branch, continue implementation, or get back to a previous task.
---

作業途中の実装を再開します。以下の手順を実行してください:

**事前処理（引数に `<issue番号>` がある場合）**: Issueコメントから `**ブランチ:** \`<名前>\`` を抽出し、目的のブランチを特定する。手順2で該当worktreeがあれば選択肢2、なければ選択肢3を Recommended にする。

```bash
gh issue view <番号> --json comments --jq '.comments[].body' \
  | grep -oE '\*\*ブランチ:\*\* `[^`]+`' | head -1 \
  | sed -E 's/.*`([^`]+)`/\1/'
```

抽出できなければ従来通り手順1〜3で対処（フォールバック）。

1. **現在の作業状態確認**
   ```bash
   pwd
   git branch --show-current
   git status --short

   git worktree list

   git fetch --all
   git branch -r | grep -E 'origin/(feat|fix|refactor|docs)/' | head -20
   ```

2. **再開方法の選択肢を提示**
   **AskUserQuestionツールを使用して**ユーザーに以下の選択肢を提示:
   1. **現在のディレクトリで作業を再開** - 現在のブランチで続行
   2. **既存のworktreeで作業を再開** - worktree一覧から選択
   3. **既存ブランチから新規worktreeを作成** - ローカル/リモートブランチを選択してworktreeを作成

3. **選択肢に応じた処理**

   **選択肢1: 現在のディレクトリで再開**
   - そのまま手順4以降を実行

   **選択肢2: 既存のworktreeで再開**
   - worktree一覧を表示し、選択してもらう
   - 案内メッセージをテキスト出力で表示する:
     ```
     ターミナルで以下を実行してworktreeでClaude Codeを起動してください:
       cd <worktreeパス> && claude '/resume-issue <issue番号>'
     ```

   **選択肢3: 新規worktreeを作成**
   - ローカルブランチ一覧とリモートブランチ一覧を表示
   - ユーザーが再開したいブランチを選択
   - worktreeを作成:
     ```bash
     # ローカルブランチの場合
     git worktree add <ディレクトリパス> <ブランチ名>

     # リモートブランチの場合
     git worktree add <ディレクトリパス> -b <ブランチ名> origin/<ブランチ名>
     ```
   - プロジェクト固有の初期化（`.env` のコピー、サブモジュール初期化、シンボリックリンク等）が必要な場合は、`CLAUDE.md` を確認するか、ユーザーに手順を確認してから追加実行する
   - ディレクトリ名の提案: ブランチ名からIssue番号を抽出して `../<リポジトリ名>_issue<番号>` を提案
   - **Issueへのコメント投稿**: 後続の `/resume-issue` でブランチ特定できるよう、以下のテンプレートで投稿:
     ```markdown
     ## 作業再開

     **ブランチ:** `<ブランチ名>`
     **Worktree:** `<パス>`

     ---
     *このコメントは `/resume-issue` スキルにより自動生成されました*
     ```
   - 作成後、新しいworktreeへの移動コマンドを案内

4. **Issue情報の取得**
   - 引数で `<issue番号>` が指定されていればそれを使用
   - 指定されていない場合のみブランチ名から推測（例: `fix/issue-123-xxx` → Issue #123）。推測不可ならユーザーに尋ねる
   - `gh issue view <issue番号> --json number,title,labels,body --comments` で最新情報を取得
   - Issueのコメント欄から `/start-issue` が投稿した実装計画コメントを探し、タスクリストや実装方針を把握

5. **作業状態サマリーの表示**
   以下の情報を整理して表示:
   - **現在のブランチ**: ブランチ名と分岐元
   - **Issue情報**: 番号、タイトル、ラベル
   - **実装計画**: Issueコメントの実装計画から進捗を表示（タスクリストがあれば）
   - **最近のコミット**: 直近3件程度のコミットメッセージ
   - **未コミットの変更**: `git status` の結果サマリー

6. **再開準備完了の報告**
   - 作業状態のサマリー
   - 次に取り組むべきタスク（実装計画の未完了タスクから）
   - 推奨アクション（実装継続、コードレビュー対応、テスト実行など）

7. **セッション名の設定**
   ```bash
   TITLE="Issue #<実際の番号>: <実際のIssueタイトル>"
   SESSION_ID=$(ls -td ~/.claude/session-env/*/ 2>/dev/null | head -1 | xargs basename)
   SESSION_FILE=$(find ~/.claude/projects/ -maxdepth 2 -name "${SESSION_ID}.jsonl" 2>/dev/null | head -1)
   if [ -n "$SESSION_FILE" ]; then
     python3 -c "import json,sys; print(json.dumps({'type':'custom-title','sessionId':sys.argv[1],'customTitle':sys.argv[2]}))" "$SESSION_ID" "$TITLE" >> "$SESSION_FILE"
   fi
   ```

**Issue番号が特定できない場合**:
- ブランチ名からIssue番号を推測して確認
- Issue番号が不明な場合はユーザーに番号を尋ねる

**注意事項**:
- 長期間放置されたブランチの場合、ベースブランチとの乖離を警告
- `git log origin/<base>..HEAD --oneline | wc -l` でコミット数を確認
- マージコンフリクトの可能性がある場合は事前に警告
