#!/usr/bin/env python3
"""Insert B1-B13 SOP answers into Supabase knowledge_base (category ai_sop).

数据文件：同目录 sop_kb_batch.json
用法：export SUPABASE_URL=... SUPABASE_KEY=... && python3 scripts/seed_sop_kb.py
"""
import json
import os
import urllib.request

_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
_KEY = os.environ.get("SUPABASE_KEY") or ""
_ROOT = os.path.dirname(os.path.abspath(__file__))
_JSON = os.path.join(_ROOT, "sop_kb_batch.json")


def main():
    with open(_JSON, encoding="utf-8") as f:
        rows = json.load(f)
    URL, KEY = _URL, _KEY
    if not URL or not KEY:
        raise SystemExit("请设置环境变量 SUPABASE_URL 与 SUPABASE_KEY（anon key）后执行：python3 scripts/seed_sop_kb.py")
    req = urllib.request.Request(
        f"{URL}/rest/v1/knowledge_base",
        data=json.dumps(rows, ensure_ascii=False).encode("utf-8"),
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode()
    data = json.loads(body)
    print("Inserted", len(data), "rows, ids:", [r["id"] for r in data])


if __name__ == "__main__":
    main()
