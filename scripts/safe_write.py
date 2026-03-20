"""
safe_write — 数据落盘工具

每次拉取的数据做四件事:
1. 存一份带日期的 JSON 归档   → data/archive/YYYY-MM-DD/<name>.json
2. 与上次归档比对，空数据保护（新数据为 0 或骤降 >50% 则拒绝覆盖）
3. 通过后才写入 dashboard/js/<name>.js
4. (可选) 推送快照到 Supabase cloud  → adw_snapshots 表

用法:
    from scripts.safe_write import safe_write_js

    safe_write_js(
        js_path="dashboard/js/adw_data_changelog.js",
        js_content=js_string,
        archive_name="changelog",
        archive_data=all_changes,     # 原始 list/dict，存 JSON
        record_count=len(all_changes) # 用于空数据保护的记录数
    )

Supabase 推送:
    设置环境变量 SUPABASE_URL 和 SUPABASE_KEY 即可自动推送。
    如果未设置，则静默跳过。
"""
import json, os, time, glob

ARCHIVE_DIR = "data/archive"
KEEP_DAYS = 30


def _today():
    return time.strftime("%Y-%m-%d")


def _archive_path(name):
    day_dir = os.path.join(ARCHIVE_DIR, _today())
    os.makedirs(day_dir, exist_ok=True)
    return os.path.join(day_dir, f"{name}.json")


def _get_previous_record_count(archive_name):
    """从最近一次归档 JSON 中读取真实记录数"""
    if not os.path.exists(ARCHIVE_DIR):
        return 0
    dirs = sorted(glob.glob(os.path.join(ARCHIVE_DIR, "????-??-??")), reverse=True)
    for d in dirs:
        if os.path.basename(d) == _today():
            continue
        json_path = os.path.join(d, f"{archive_name}.json")
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                count = len(data) if isinstance(data, list) else sum(len(v) for v in data.values() if isinstance(v, list))
                return count
            except Exception:
                return 0
    return 0


def _cleanup_old_archives():
    """删除超过 KEEP_DAYS 天的归档目录"""
    if not os.path.exists(ARCHIVE_DIR):
        return
    cutoff = time.time() - KEEP_DAYS * 86400
    for d in sorted(glob.glob(os.path.join(ARCHIVE_DIR, "????-??-??"))):
        dirname = os.path.basename(d)
        try:
            dir_ts = time.mktime(time.strptime(dirname, "%Y-%m-%d"))
            if dir_ts < cutoff:
                import shutil
                shutil.rmtree(d, ignore_errors=True)
                print(f"  [archive] Cleaned up old archive: {dirname}")
        except ValueError:
            pass


def safe_write_js(js_path, js_content, archive_name, archive_data, record_count):
    """
    安全写入 JS 文件 + JSON 归档。

    Returns: True 写入成功, False 被空数据保护拦截
    """
    # 1. 存 JSON 归档
    archive_file = _archive_path(archive_name)
    with open(archive_file, "w", encoding="utf-8") as f:
        json.dump(archive_data, f, ensure_ascii=False)
    print(f"  [archive] Saved {record_count:,} records → {archive_file}")

    # 2. 空数据保护
    if record_count == 0:
        print(f"  [PROTECT] ⚠️  新数据为 0 条，拒绝覆盖 {js_path}")
        print(f"  [PROTECT] JSON 归档已保存，可人工检查后手动覆盖")
        return False

    old_count = _get_previous_record_count(archive_name)
    if old_count > 20 and record_count < old_count * 0.5:
        pct = round((1 - record_count / old_count) * 100)
        print(f"  [PROTECT] ⚠️  新数据 {record_count} 条，上次归档 {old_count} 条，减少 {pct}%，拒绝覆盖")
        print(f"  [PROTECT] JSON 归档已保存，可人工检查后手动覆盖")
        return False

    # 3. 写入 JS
    os.makedirs(os.path.dirname(js_path), exist_ok=True)
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"  [write] Wrote {len(js_content):,} chars → {js_path}")

    # 4. 推送到 Supabase（可选）
    _push_to_supabase(archive_name, archive_data, record_count)

    # 5. 清理过期归档
    _cleanup_old_archives()

    return True


# ── Supabase Cloud Sync ──

_SB_URL = os.environ.get("SUPABASE_URL", "")
_SB_KEY = os.environ.get("SUPABASE_KEY", "")

MAX_PUSH_BYTES = 5 * 1024 * 1024  # 5MB


def _push_to_supabase(archive_name, archive_data, record_count):
    if not _SB_URL or not _SB_KEY:
        return

    import urllib.request, urllib.error

    payload = json.dumps({
        "snapshot_date": _today(),
        "data_type": archive_name,
        "data": archive_data,
        "record_count": record_count,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }, ensure_ascii=False).encode("utf-8")

    if len(payload) > MAX_PUSH_BYTES:
        mb = round(len(payload) / 1024 / 1024, 1)
        print(f"  [supabase] Skipping push for {archive_name} ({mb}MB > 5MB limit)")
        return

    url = f"{_SB_URL}/rest/v1/adw_snapshots"
    headers = {
        "apikey": _SB_KEY,
        "Authorization": f"Bearer {_SB_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        resp = urllib.request.urlopen(req, timeout=60)
        print(f"  [supabase] ☁️  Pushed {record_count:,} records ({archive_name}) → HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:200]
        print(f"  [supabase] ⚠️  Push failed: HTTP {e.code} — {body}")
    except Exception as e:
        print(f"  [supabase] ⚠️  Push skipped: {e}")
