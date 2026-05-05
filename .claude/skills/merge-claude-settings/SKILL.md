---
name: merge-claude-settings
description: Use this skill when the user wants to merge settings.local.json into settings.json, or consolidate Claude Code permission settings.
---

現在のリポジトリ内の`.claude/settings.local.json`にある許可設定を、`.claude/settings.json`にマージします。

## 手順

1. **ファイルの存在確認**
   - `.claude/settings.local.json` が存在するか確認
   - 存在しない場合:
     ```
     ℹ️ .claude/settings.local.json が見つかりません。
     マージする設定がありません。
     ```
     - メッセージを表示して終了

2. **設定ファイルの読み込み**
   - `.claude/settings.local.json` を読み込む
   - `.claude/settings.json` を読み込む（存在しない場合は空の設定として扱う）

3. **差分を抽出**
   - `settings.local.json` の `permissions.allow` にあって
   - `settings.json` の `permissions.allow` にない項目を抽出

4. **差分がない場合**
   ```
   ℹ️ マージする差分がありません。
   settings.local.jsonの内容はすでにsettings.jsonに含まれています。
   ```
   - メッセージを表示して終了

5. **差分がある場合、ユーザーに確認**
   以下の形式で差分を表示:
   ```
   📋 settings.local.jsonに以下の許可項目があります:

   追加候補:
   - Bash(git rebase:*)
   - Bash(ruff check:*)
   - ...

   これらをsettings.jsonにマージしますか？
   ```

   **AskUserQuestionツールを使用して**選択肢を提示:
   1. **すべてマージ** - すべての項目をsettings.jsonに追加
   2. **選択してマージ** - 追加する項目を個別に選択（multiSelect: trueで項目一覧を表示）
   3. **キャンセル** - マージせずに終了

6. **マージ実行**
   - `.claude/settings.json` を読み込み（存在しない場合は新規作成）
   - `permissions.allow` 配列に新しい項目を追加（重複は除外）
   - アルファベット順にソート
   - ファイルに書き戻し

7. **settings.local.jsonの削除**
   - **「すべてマージ」を選択した場合**: 確認なしで自動削除
     ```bash
     rm .claude/settings.local.json
     ```
   - **「選択してマージ」を選択した場合**: **AskUserQuestionツールを使用して**削除するか確認
     ```
     settings.local.jsonを削除しますか？
     （一部のみマージしたため、残りの設定があります）

     1. 削除する
     2. 残す（推奨）
     ```

8. **コミット確認**
   **AskUserQuestionツールを使用して**確認:
   1. コミットする（推奨）
   2. コミットしない
   - 「コミットする」が選択された場合:
     ```bash
     git add .claude/settings.json
     # settings.local.jsonを削除した場合はそれも含める
     git add -u .claude/
     git commit -m "chore: settings.local.jsonからpermissionsをマージ"
     ```

9. **完了報告**
   ```
   ✅ settings.jsonにマージしました

   - 追加した項目数: <N>件
   - settings.local.json: <削除済み/残す>
   - コミット: <完了/スキップ>

   追加した項目:
   - <項目1>
   - <項目2>
   - ...
   ```

## 注意事項

- **settings.local.jsonが存在しない場合**: メッセージを表示して終了
- **差分がない場合**: メッセージを表示して終了
- **settings.jsonが存在しない場合**: 新規作成してマージ

## JSONマージのロジック

```python
# 疑似コード
local_settings = load_json(".claude/settings.local.json")

try:
    main_settings = load_json(".claude/settings.json")
except FileNotFoundError:
    main_settings = {"permissions": {"allow": [], "deny": []}}

# permissions.allowの差分を抽出
main_allow = set(main_settings.get("permissions", {}).get("allow", []))
local_allow = set(local_settings.get("permissions", {}).get("allow", []))

new_items = local_allow - main_allow

if new_items:
    # ユーザーに確認後マージ
    main_settings["permissions"]["allow"] = sorted(main_allow | selected_items)
    save_json(".claude/settings.json", main_settings)
```
