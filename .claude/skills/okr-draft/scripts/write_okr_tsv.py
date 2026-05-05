#!/usr/bin/env python3
"""OKRドラフト(JSON)をExcel貼付用TSV(BOM付きUTF-8 + CRLF)に書き出す。

入力JSON形式:
    {
        "krs": [
            {"kr": "...", "due": "YYYY-MM-DD", "weight": 0.10,
             "remark": "...", "premise": "...", "memo": ""},
            ...
        ]
    }

KR1個 = TSV1行。列順は E(KR), F(期日), G(ウェイト), H(備考), I(前提), J(メモ)。
ウェイト合計は1.00を期待（許容誤差<1e-9）。

使い方:
    python write_okr_tsv.py --json drafts.json --output out.tsv
    cat drafts.json | python write_okr_tsv.py --json - --output out.tsv
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--json", required=True, help="入力JSONファイルパス（'-' で stdin）")
    p.add_argument("--output", required=True, help="出力TSVファイルパス")
    p.add_argument("--allow-weight-mismatch", action="store_true",
                   help="ウェイト合計が1.00から外れていてもエラーにしない")
    args = p.parse_args()

    if args.json == "-":
        raw = sys.stdin.read()
    else:
        raw = Path(args.json).read_text(encoding="utf-8")

    data = json.loads(raw)
    krs = data.get("krs", [])
    if not krs:
        sys.stderr.write("krs が空です\n")
        return 1

    total = sum(float(k.get("weight", 0)) for k in krs)
    if abs(total - 1.0) >= 1e-9:
        msg = f"ウェイト合計が1.00ではありません: {total}\n"
        if args.allow_weight_mismatch:
            sys.stderr.write("[警告] " + msg)
        else:
            sys.stderr.write("[エラー] " + msg)
            sys.stderr.write("--allow-weight-mismatch で抑制可能\n")
            return 2

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
        for k in krs:
            row = [
                k.get("kr", ""),
                k.get("due", ""),
                k.get("weight", ""),
                k.get("remark", ""),
                k.get("premise", ""),
                k.get("memo", ""),
            ]
            row = [_clean(v) for v in row]
            w.writerow(row)

    sys.stderr.write(f"[OK] {len(krs)}行を書き出し、合計ウェイト={total}\n")
    sys.stderr.write(f"[OK] 出力: {out_path}\n")
    return 0


def _clean(v) -> str:
    """セル値の正規化。改行や前後空白をTSV互換にする。"""
    if v is None:
        return ""
    s = str(v)
    # セル内改行は崩れの原因なのでスペースに置換
    s = s.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    return s.strip()


if __name__ == "__main__":
    sys.exit(main())
