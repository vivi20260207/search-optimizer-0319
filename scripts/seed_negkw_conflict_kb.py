#!/usr/bin/env python3
"""Insert the negative-keyword conflict strategy entry into knowledge_base.

Scope=team + status=approved → appears directly in 优化组知识库 tab.

Usage: export SUPABASE_URL=... SUPABASE_KEY=... && python3 scripts/seed_negkw_conflict_kb.py
"""
import json, os, urllib.request

_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
_KEY = os.environ.get("SUPABASE_KEY") or ""

ROW = {
    "category": "ai_negkw_rule",
    "content": (
        "【正负关键词冲突策略】广泛匹配正向词 + 完全匹配否定词的组合不一定是配置错误，"
        "可能是刻意策略：用广泛匹配探索长尾流量，同时用完全匹配否定精准拦截已知低效的核心词。\n\n"
        "判断流程：\n"
        "1. 确认否定词匹配类型 — 若为 [完全匹配]，仅拦截该精确查询及近似变体，"
        "带前缀/后缀的长尾词仍可触发广告\n"
        "2. 查搜索词报表 — 检查该正向词下的变体词（带后缀/前缀的长尾词）回收表现\n"
        "3. 若变体词回收达标 → 保留现有组合，定期复检\n"
        "4. 若变体词回收也差 → 将否定匹配类型从 [完全匹配] 升级为「词组匹配」甚至广泛匹配，"
        "彻底切断无效流量\n\n"
        "注意：现代 Google Ads 的完全匹配否定词也会拦截近似变体"
        "（拼写变体、单复数、语序调整），实际拦截范围略大于字面精确匹配。"
    ),
    "source": "user_correction",
    "tags": ["negkw", "conflict", "broad_match", "exact_negative", "strategy", "search_term_report"],
}

ROW_FULL = {**ROW, "owner": "gaoruowei", "scope": "team", "status": "approved"}


def main():
    if not _URL or not _KEY:
        raise SystemExit("请设置 SUPABASE_URL 与 SUPABASE_KEY 后执行")
    # Try full row first (with multi-user columns); fall back to base row
    payload = ROW_FULL
    try:
        _try_insert(payload)
        return
    except SystemExit as e:
        if "schema cache" in str(e):
            print("⚠️  多用户列尚未迁移，用基础字段插入（迁移后自动标记 team/approved）")
            payload = ROW
        else:
            raise
    _try_insert(payload)


def _try_insert(payload):
    req = urllib.request.Request(
        f"{_URL}/rest/v1/knowledge_base",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "apikey": _KEY,
            "Authorization": f"Bearer {_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        raise SystemExit(f"HTTP {e.code}: {err_body}")
    data = json.loads(body)
    row = data[0] if isinstance(data, list) else data
    print(f"✅ 已插入知识库，id={row.get('id')}, scope=team, status=approved")
    print("   → 刷新中台页面后，在「优化组知识库 → 🚫 否定词规则」分组下可见")


if __name__ == "__main__":
    main()
