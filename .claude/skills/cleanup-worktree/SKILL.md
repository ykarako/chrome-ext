---
name: cleanup-worktree
description: Use this skill when the user wants to delete a worktree, clean up worktrees, or merge settings.local.json before removing a worktree.
---

メインworktreeから他のworktreeを削除します。settings.local.jsonの変更をメインリポジトリのsettings.jsonに反映するオプションもあります。

## 手順

1. **メインworktreeかどうかを確認**
   ```bash
   pwd
   git worktree list
   ```
   - worktree listの最初の行（メインリポジトリ）と現在のディレクトリを比較
   - **メインworktreeでない場合**: 以下のメッセージを表示して終了
     ```
     ⚠️ このコマンドはメインworktreeで実行してください。

     メインworktree: <メインリポジトリのパス>
     現在のディレクトリ: <現在のパス>

     以下のコマンドで移動してから再実行してください:
       cd <メインリポジトリのパス> && claude
     ```

2. **削除対象のworktreeを選択**
   ```bash
   git worktree list
   ```
   - メインworktree以外のworktree一覧を表示
   - worktreeが1つもない場合は「削除対象のworktreeがありません」と表示して終了
   - ユーザーに削除対象を選択してもらう（AskUserQuestionを使用）
     - 各worktreeのパス、ブランチ名、最終コミットを表示
     - 「キャンセル」オプションも提示

3. **選択されたworktreeの状態を確認**
   ```bash
   # 未コミットの変更を確認
   git -C <対象worktreeパス> status --short
   ```
   - 未コミットの変更がある場合は警告:
     ```
     ⚠️ 未コミットの変更があります:

     <変更ファイル一覧>

     続行しますか？
     1. 続行する（変更は失われます）
     2. キャンセル
     ```

4. **メモリ（MEMORY.md）の差分を確認・マージ**
   - 対象worktreeのメモリディレクトリを特定:
     ```bash
     # worktreeパスからメモリディレクトリを推定
     # 例: /home/inaho/tomato-robo-issue316 → /home/inaho/.claude/projects/-home-inaho-tomato-robo-issue316/memory/
     WORKTREE_PATH="<対象worktreeの絶対パス>"
     MEMORY_DIR="$HOME/.claude/projects/$(echo "$WORKTREE_PATH" | sed 's|^/||; s|/|-|g')/memory"
     ```
   - メモリディレクトリ内のファイル一覧を確認（MEMORY.md等）
   - ファイルが存在し、内容がある場合はユーザーに表示:
     ```
     📝 このworktreeにClaude Codeメモリがあります:

     --- MEMORY.md ---
     <内容>
     ---

     メインworktreeのメモリにマージしますか？
     ```
   - 選択肢を提示:
     1. **マージする（推奨）** - 内容を確認してメインのMEMORY.mdに統合
     2. **スキップ** - マージせずに続行
   - 「マージする」が選択された場合:
     - メインworktreeのメモリディレクトリ: `$HOME/.claude/projects/$(echo "<メインworktreeパス>" | sed 's|^/||; s|/|-|g')/memory/MEMORY.md`
     - 対象worktreeのMEMORY.mdの内容をReadで読み、メインのMEMORY.mdの内容もReadで読む
     - 重複を避けつつ、有用な知見をメインのMEMORY.mdに追記（Editで編集）
     - 他のメモリファイル（debugging.md等）がある場合も同様にマージ
   - メモリが空または存在しない場合はスキップ

5. **settings.local.jsonの差分を確認**
   - 対象worktreeの `.claude/settings.local.json` を読み込む
   - メインリポジトリの `.claude/settings.json` を読み込む
   - `settings.local.json` にあってメインの `settings.json` にない許可項目を抽出

6. **差分がある場合、ユーザーに確認**
   以下の形式で差分を表示:
   ```
   📋 settings.local.jsonに以下の許可項目があります:

   追加候補:
   - Bash(git rebase:*)
   - Bash(ruff check:*)
   - ...

   これらをメインリポジトリのsettings.jsonにマージしますか？
   ```

   選択肢を提示:
   1. **すべてマージ** - すべての項目をsettings.jsonに追加
   2. **選択してマージ** - 追加する項目を選択
   3. **スキップ** - マージせずに続行

7. **マージ実行**（選択された場合）
   - メインリポジトリの `.claude/settings.json` を読み込み
   - `permissions.allow` 配列に新しい項目を追加（重複は除外）
   - アルファベット順にソート
   - ファイルに書き戻し
   - 変更をコミット:
     ```bash
     git add .claude/settings.json
     git commit -m "chore: settings.local.jsonからpermissionsをマージ"
     ```

8. **worktree削除の実行**
   ```bash
   # サブモジュールを含むworktreeは通常のremoveが失敗するため、最初から--forceを使用
   # （未コミット変更はステップ3で事前確認済み）
   git worktree remove --force <対象worktreeパス>
   ```

9. **ブランチ削除の確認**
   ```
   ブランチも削除しますか？

   ブランチ: <ブランチ名>

   1. 削除する（推奨）
   2. 残す
   ```
   - 「削除する」が選択された場合:
     ```bash
     # マージ済みブランチの場合
     git branch -d <ブランチ名>

     # マージされていない場合は警告して確認
     # 「マージされていないブランチです。強制削除しますか？」
     git branch -D <ブランチ名>
     ```

10. **完了報告**
   ```
   ✅ worktreeを削除しました

   - 削除したworktree: <パス>
   - ブランチ: <削除した/残した>
   - メモリのマージ: <完了/スキップ/メモリなし>
   - settings.jsonへのマージ: <完了/スキップ/差分なし>
   ```

## 注意事項

- **メインworktree以外で実行した場合**: エラーメッセージを表示してメインworktreeでの実行を案内
- **未コミットの変更がある場合**: 警告を表示し、続行するか確認
- **差分がない場合**: マージ手順をスキップしてworktree削除に進む
- **settings.local.jsonが存在しない場合**: そのままworktree削除に進む
- **削除対象worktreeがない場合**: メッセージを表示して終了
- **メモリディレクトリが存在しない/空の場合**: メモリマージ手順をスキップしてsettings確認に進む

## JSONマージのロジック

```python
# 疑似コード
main_settings = load_json(main_repo / ".claude/settings.json")
local_settings = load_json(target_worktree / ".claude/settings.local.json")

# permissions.allowの差分を抽出
main_allow = set(main_settings.get("permissions", {}).get("allow", []))
local_allow = set(local_settings.get("permissions", {}).get("allow", []))

new_items = local_allow - main_allow

if new_items:
    # ユーザーに確認後マージ
    main_settings["permissions"]["allow"] = sorted(main_allow | selected_items)
    save_json(main_repo / ".claude/settings.json", main_settings)
```
