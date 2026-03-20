#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# refresh_all.sh — 一键刷新全部 Google Ads 数据 + 推送到 GitHub
#
# 用法:
#   bash scripts/refresh_all.sh          # 默认拉最近 47 天
#   bash scripts/refresh_all.sh --push   # 拉完自动 commit + push
#
# 环境变量 (可选):
#   GOOGLE_ADS_YAML  — google-ads.yaml 的路径 (默认: ./google-ads.yaml)
#   ADW_START_DATE   — 数据起始日期 (默认: 47天前)
#   ADW_END_DATE     — 数据截止日期 (默认: 今天)
#   SUPABASE_URL     — Supabase 项目 URL (设置后自动推送快照到云端)
#   SUPABASE_KEY     — Supabase anon key
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/refresh_$(date +%Y%m%d_%H%M%S).log"

AUTO_PUSH=false
if [[ "${1:-}" == "--push" ]]; then
    AUTO_PUSH=true
fi

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "═══════════════════════════════════════"
log "Search Optimizer 数据刷新"
log "Project: $PROJECT_DIR"
log "Date range: ${ADW_START_DATE:-auto} ~ ${ADW_END_DATE:-today}"
log "Supabase:   ${SUPABASE_URL:-(not configured)}"
log "═══════════════════════════════════════"

FAILED=0

run_script() {
    local label="$1"
    local script="$2"
    log ""
    log "[$label] Starting: python3 $script"
    if python3 "$script" 2>&1 | tee -a "$LOG_FILE"; then
        log "[$label] ✅ Done"
    else
        log "[$label] ❌ FAILED (exit $?)"
        FAILED=$((FAILED + 1))
    fi
}

run_script "1/5 每日数据"       fetch_adw_data.py
run_script "2/5 变更日志"       fetch_change_history.py
run_script "3/5 否定关键词"     fetch_negative_keywords.py
run_script "4/5 App变更日志"    fetch_app_change_history.py
run_script "5/5 落地页健康"     fetch_lp_health.py

log ""
log "═══════════════════════════════════════"
if [ "$FAILED" -gt 0 ]; then
    log "⚠️  完成，但有 $FAILED 个脚本失败。请检查日志: $LOG_FILE"
else
    log "✅ 全部 5 个脚本执行成功"
fi

# 更新 HTML 中的数据日期
TODAY=$(date +%Y-%m-%d)
HTML_FILE="$PROJECT_DIR/dashboard/search-optimizer-0319.html"
if [ -f "$HTML_FILE" ]; then
    # macOS sed 和 Linux sed 语法不同
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s/更新: [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}/更新: $TODAY/g" "$HTML_FILE"
    else
        sed -i "s/更新: [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}/更新: $TODAY/g" "$HTML_FILE"
    fi
    log "Updated HTML date to $TODAY"
fi

if [ "$AUTO_PUSH" = true ] && [ "$FAILED" -eq 0 ]; then
    log ""
    log "Committing and pushing to GitHub..."
    cd "$PROJECT_DIR"
    git add dashboard/js/adw_data_daily.js \
            dashboard/js/adw_data_changelog.js \
            dashboard/js/adw_data_negkw.js \
            dashboard/js/adw_data_app_changelog.js \
            dashboard/js/adw_data_lp.js \
            dashboard/search-optimizer-0319.html \
            2>/dev/null || true

    if git diff --cached --quiet; then
        log "No data changes detected — skipping commit."
    else
        git commit -m "data: 自动刷新数据 $TODAY" 2>&1 | tee -a "$LOG_FILE"
        git push origin main 2>&1 | tee -a "$LOG_FILE"
        log "✅ Pushed to GitHub → Vercel will auto-deploy"
    fi
fi

log ""
log "Log saved to: $LOG_FILE"
