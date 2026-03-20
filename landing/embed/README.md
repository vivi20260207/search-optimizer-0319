# 外链站点嵌入 AB（不重做整页）

适用于：**继续用现有站点**，只加分流 + DOM 补丁 + 埋点。

> **推荐**：先在 **bloop.vip** 等低风险站点跑通流程；**Parau（parau.vip）大流量主站** 等验证稳定后再接入。  
> `ab_tests.product` 用 **`bloop`** 与 **`pu`（Parau）完全隔离**，Dashboard 里按 product 筛选即可分开看。

## 1. Supabase

1. 已执行 `migration_ab.sql` 后，再执行 **`supabase/migration_ab_page_key.sql`**（增加 `page_key` 列）。
2. 在 `ab_tests` 插入一条测试（见下方示例 SQL）。

## 2. bloop.vip 页面插入脚本

把 **`你的 Vercel 部署域名`** 换成真实地址（部署本仓库后）。

**脚本地址二选一**（取决于 Vercel 的 **Root Directory**）：

| Vercel 根目录设置 | 外链里写的 `src` |
|------------------|------------------|
| **仓库根目录**（留空 / `.`） | `https://你的域名/landing/embed/ab-embed.js` |
| **`dashboard` 文件夹**（常见） | `https://你的域名/embed/ab-embed.js` |

> 若 `/landing/embed/...` 出现 **404**，多半是根目录设成了 `dashboard`，请改用 **`/embed/ab-embed.js`**（文件在 `dashboard/embed/ab-embed.js`，与 `landing/embed/` 内容需保持同步）。

```html
<!-- 建议放在 </body> 前；src 按上表二选一 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script
  src="https://YOUR_VERCEL_DOMAIN/embed/ab-embed.js"
  data-product="bloop"
  data-page-key="home"
  defer
></script>
```

- 若测试的是子路径（如 `/landing`），把 `data-page-key` 改成 `landing`，且 Supabase 里 **`page_key` 必须与之一致**。
- 可选：`data-ga4="G-XXXXXXXXXX"`、`data-wait-ms="15000"`（SPA 晚渲染时加长等待）。

## 3. 调试

- `?ab_debug=1` — 控制台打印当前测试与变体
- `?variant=control` — 强制某变体 id（需在 `variants` 里存在）

## 4. `variants` 与 DOM 补丁

每个变体可带 `patches` 数组（**selector 建议用稳定属性**，如 `data-ab="hero-title"`）：

```json
[
  {
    "id": "control",
    "name": "对照组",
    "weight": 50,
    "patches": []
  },
  {
    "id": "b",
    "name": "变体B-标题",
    "weight": 50,
    "patches": [
      { "selector": "h1", "text": "你的新标题" }
    ]
  }
]
```

| 字段 | 说明 |
|------|------|
| `selector` | CSS 选择器（必填） |
| `text` / `html` | 替换文案或 HTML |
| `attr` + `value` | `setAttribute` |
| `addClass` / `removeClass` | 空格分隔 class |
| `wait_ms` | 该条单独最长等待毫秒数 |

## 5. 示例：bloop 首页一条 running 测试

```sql
INSERT INTO ab_tests (
  name, product, market, status, traffic_percent, variants,
  min_sample_size, primary_metric, page_key, started_at
) VALUES (
  'Bloop 首页标题 A/B（沙箱）',
  'bloop',
  'IN',
  'running',
  100,
  '[
    {"id":"control","name":"对照","weight":50,"patches":[]},
    {"id":"b","name":"标题变体","weight":50,"patches":[
      {"selector":"h1","text":"（示例）Bloop 新主标题 — 请改成真实 selector 与文案"}
    ]}
  ]'::jsonb,
  1000,
  'register_rate',
  'home',
  NOW()
);
```

> 把 `selector` / `text` 改成 bloop.vip 真实 DOM；多 `h1` 时勿共用模糊选择器。

## 6. 主 CTA 点击埋点（可选但强烈建议）

仅对带 **`data-ab-cta`** 的元素记录 `cta_click`：

```html
<a href="..." data-ab-cta>主按钮文案</a>
```

## 7. 与 Google Ads

Final URL 指向 **bloop.vip** 对应路径即可，**带 gclid**；脚本会写入 `ab_events`。

## 8. 以后接回 Parau（parau.vip）

- 另建 `ab_tests`：`product = 'pu'`，`page_key` 用 `emeraldchat`、`home` 等区分页面。  
- 页面里 `data-product="pu"` + 对应 `data-page-key`。  
- **不要**与 `bloop` 测试混在同一条记录里。
