# Search Optimizer 数据自动刷新 — 部署指南

## 架构概览

```
Google Ads API
      │
      ▼
4 个 Python 脚本 (fetch_*.py)
      │  生成 dashboard/js/*.js 数据文件
      ▼
git commit + push → GitHub
      │
      ▼
Vercel 自动部署 (静态站点)
```

有两种方式部署定时任务，选一种即可。

---

## 方案 A: GitHub Actions (推荐，零服务器)

**优点**: 不需要额外服务器，GitHub 免费额度 2000 分钟/月，日志自动保留。

### 第 1 步: 在 GitHub 仓库配置 Secrets

进入 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret

需要配置以下 Secrets:

| Secret 名称              | 值                                              | 来源文件              |
|--------------------------|------------------------------------------------|----------------------|
| `GADS_DEV_TOKEN`         | Google Ads developer token                      | google-ads.yaml      |
| `GADS_CLIENT_ID`         | OAuth2 client ID                                | google-ads.yaml      |
| `GADS_CLIENT_SECRET`     | OAuth2 client secret                            | google-ads.yaml      |
| `GADS_REFRESH_TOKEN`     | OAuth2 refresh token                            | google-ads.yaml      |
| `GADS_LOGIN_CID`         | MCC login customer ID (纯数字)                  | google-ads.yaml      |
| `GADS_APP_DEV_TOKEN`     | App 账户 developer token                        | google-ads-app.yaml  |
| `GADS_APP_CLIENT_ID`     | App 账户 OAuth2 client ID                       | google-ads-app.yaml  |
| `GADS_APP_CLIENT_SECRET` | App 账户 OAuth2 client secret                   | google-ads-app.yaml  |
| `GADS_APP_REFRESH_TOKEN` | App 账户 OAuth2 refresh token                   | google-ads-app.yaml  |
| `GADS_APP_LOGIN_CID`     | App 账户 MCC login customer ID                  | google-ads-app.yaml  |
| `GADS_MCC_5100780984`    | 整个 yaml 文件内容                              | google-ads-mcc-5100780984.yaml |
| `GADS_MCC_7534035699`    | 整个 yaml 文件内容                              | google-ads-mcc-7534035699.yaml |
| `GADS_MCC_3094233805`    | 整个 yaml 文件内容                              | google-ads-mcc-3094233805.yaml |
| `GADS_MCC_8009156492`    | 整个 yaml 文件内容                              | google-ads-mcc-8009156492.yaml |

### 第 2 步: Push workflow 文件

workflow 文件已在 `.github/workflows/refresh-data.yml`，push 后即生效。

### 第 3 步: 验证

1. 进入 GitHub 仓库 → Actions 标签
2. 找到 "Refresh Google Ads Data" workflow
3. 点击 "Run workflow" 手动触发一次
4. 查看日志，确认 4 个脚本都成功
5. 确认 Vercel 自动部署了新数据

### 定时调度

默认每天北京时间 10:00 (UTC 02:00) 自动运行。修改 cron 表达式:

```yaml
# .github/workflows/refresh-data.yml
schedule:
  - cron: '0 2 * * *'   # UTC 02:00 = 北京时间 10:00
```

---

## 方案 B: Linux 服务器 Cron

**适用**: 已有 Linux 服务器，或需要更灵活的控制。

### 第 1 步: 准备环境

```bash
# 安装 Python 3.9+
sudo apt update && sudo apt install python3 python3-pip git -y

# 安装依赖
pip3 install google-ads protobuf pyyaml

# 克隆仓库
git clone https://github.com/vivi20260207/search-optimizer-0319.git
cd search-optimizer-0319

# 把所有 google-ads*.yaml 文件放到项目根目录
# (不要提交到 git，已在 .gitignore 中排除)
```

### 第 2 步: 测试手动运行

```bash
# 先手动跑一次
bash scripts/refresh_all.sh --push
```

### 第 3 步: 配置 Git 免密 push

```bash
# 方式 1: SSH key (推荐)
git remote set-url origin git@github.com:vivi20260207/search-optimizer-0319.git

# 方式 2: HTTPS + token
git remote set-url origin https://YOUR_TOKEN@github.com/vivi20260207/search-optimizer-0319.git
```

### 第 4 步: 配置 Cron

```bash
crontab -e
```

添加:

```cron
# 每天北京时间 10:00 刷新数据
0 10 * * * cd /path/to/search-optimizer-0319 && bash scripts/refresh_all.sh --push >> /var/log/adw-refresh.log 2>&1
```

---

## 数据归档与安全保护

每次拉取会自动执行以下逻辑（由 `scripts/safe_write.py` 统一处理）：

1. **JSON 归档** — 原始数据按日期存到 `data/archive/YYYY-MM-DD/<name>.json`，保留最近 30 天
2. **空数据保护** — 如果新拉取的记录数为 0，拒绝覆盖 JS 文件
3. **骤降保护** — 如果新数据比旧数据少 80% 以上，拒绝覆盖
4. 被拦截时 JSON 归档仍会保存，方便人工排查后决定是否手动覆盖

归档目录结构：
```
data/archive/
  2026-03-20/
    daily_bundle.json      (campaigns + keywords + search terms + ...)
    changelog.json         (change history)
    negative_keywords.json
    app_changelog.json
  2026-03-19/
    ...
```

## 文件说明

| 文件                           | 说明                                      | 输出                               |
|-------------------------------|------------------------------------------|-----------------------------------|
| `fetch_adw_data.py`           | 每日 Campaign/关键词/搜索词/设备/受众数据  | `dashboard/js/adw_data_daily.js`   |
| `fetch_change_history.py`     | Web Search 变更日志 (近 30 天)            | `dashboard/js/adw_data_changelog.js` |
| `fetch_negative_keywords.py`  | 否定关键词完整清单                         | `dashboard/js/adw_data_negkw.js`   |
| `fetch_app_change_history.py` | App 投放变更日志 (多 MCC)                  | `dashboard/js/adw_data_app_changelog.js` |
| `scripts/refresh_all.sh`      | 统一入口脚本                               | 日志在 `logs/` 目录                |

## 环境变量

所有脚本支持通过环境变量覆盖日期:

```bash
# 自定义日期范围
ADW_START_DATE=2026-03-01 ADW_END_DATE=2026-03-20 bash scripts/refresh_all.sh

# 自定义 yaml 路径
GOOGLE_ADS_YAML=/etc/gads/google-ads.yaml bash scripts/refresh_all.sh
```

## 监控与告警

### GitHub Actions

- Actions 面板自带运行状态和日志
- 失败时 GitHub 默认发邮件通知到仓库 Owner
- 可在 Settings → Notifications 配置

### Linux Cron

建议加一个简单告警:

```bash
# 在 crontab 任务后面加
|| curl -X POST "https://your-webhook-url" -d '{"text":"ADW 数据刷新失败"}'
```

## 故障排查

| 问题                     | 排查方式                                           |
|--------------------------|--------------------------------------------------|
| 数据为 0 条              | 检查 google-ads.yaml 是否存在、凭证是否过期         |
| refresh_token 过期       | 重新走 OAuth2 流程获取新 token                     |
| GitHub Actions 无法 push | 确认 workflow 有 `permissions: contents: write`    |
| API 报错 Start Date      | change_event 只支持最近 30 天，脚本已自动处理       |
| Vercel 没更新            | 确认 GitHub 仓库关联了 Vercel，检查 Vercel 部署日志 |
