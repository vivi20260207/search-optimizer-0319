/**
 * AB SDK — 落地页 AB 中台核心引擎
 *
 * 职责：解析 URL 参数 → 分流 → 加载变体配置 → 触发渲染 → 埋点
 *
 * 🔴 内部数据交互：
 *   - 读取 Supabase ab_tests 表获取运行中的测试配置
 *   - 通过 tracker.js 写入 Supabase ab_events 表
 *   - gclid 从 Google Ads 广告链接透传，用于后续与 fetch_adw_data.py 的转化数据关联
 */
(function () {
  'use strict';

  // ─── 配置 ───
  // 🔴 与 dashboard/js/supabase-sync.js 共用同一个 Supabase 实例
  var CONFIG = {
    SUPABASE_URL: 'https://lthetksmtttdsdygnicj.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0aGV0a3NtdHR0ZHNkeWduaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzY4MzIsImV4cCI6MjA4OTU1MjgzMn0.4kUg_mWph5-EUAQo6HslhtD_u4qJc66toso2TsLMk2o',
    CONFIG_BASE_PATH: '/landing/',
    LS_PREFIX: 'ab_',
  };

  // 🔴 产品短码映射（需与 dashboard/js/campaign_product_map.js 保持一致）
  var PRODUCT_MAP = {
    ft: 'fachat',
    pu: 'parau',
    ppt: 'pinkpinkchat',
  };

  // ─── URL 参数解析 ───
  function getURLParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      gclid: params.get('gclid') || '',
      variant: params.get('variant') || '',
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      debug: params.get('ab_debug') === '1',
    };
  }

  // ─── 访客 ID 生成（基于 gclid 或 fingerprint） ───
  function getVisitorId(gclid) {
    if (gclid) return hashString('g_' + gclid);

    var stored = localStorage.getItem(CONFIG.LS_PREFIX + 'visitor_id');
    if (stored) return stored;

    var fp = navigator.userAgent + screen.width + screen.height +
             new Date().getTimezoneOffset() + navigator.language;
    var vid = hashString('fp_' + fp + '_' + Math.random().toString(36).slice(2));
    localStorage.setItem(CONFIG.LS_PREFIX + 'visitor_id', vid);
    return vid;
  }

  // ─── 简单 hash 函数（用于分流） ───
  function hashString(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // 32-bit int
    }
    return Math.abs(hash).toString(36);
  }

  function hashToBucket(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  // ─── 分流逻辑 ───
  function assignVariant(testId, variants, visitorId, forceVariant) {
    // 1. URL 参数强制指定（调试模式）
    if (forceVariant) {
      var forced = variants.find(function (v) { return v.id === forceVariant; });
      if (forced) return forced;
    }

    // 2. localStorage 缓存（同一用户同一测试始终看同一变体）
    var lsKey = CONFIG.LS_PREFIX + 'assign_' + testId;
    var cached = localStorage.getItem(lsKey);
    if (cached) {
      var cachedVariant = variants.find(function (v) { return v.id === cached; });
      if (cachedVariant) return cachedVariant;
    }

    // 3. hash 分流
    var bucket = hashToBucket(visitorId + '_' + testId);
    var cumulative = 0;
    var assigned = variants[0];
    for (var i = 0; i < variants.length; i++) {
      cumulative += variants[i].weight;
      if (bucket < cumulative) {
        assigned = variants[i];
        break;
      }
    }

    localStorage.setItem(lsKey, assigned.id);
    return assigned;
  }

  // ─── 加载变体 JSON 配置 ───
  async function loadVariantConfig(configPath) {
    var url = CONFIG.CONFIG_BASE_PATH + configPath;
    try {
      var resp = await fetch(url);
      if (!resp.ok) throw new Error('Config fetch failed: ' + resp.status);
      return await resp.json();
    } catch (e) {
      console.error('[AB SDK] Failed to load config:', configPath, e);
      return null;
    }
  }

  // ─── 获取当前产品的运行中测试 ───
  // 🔴 从 Supabase ab_tests 表读取，与 Dashboard 同源
  async function fetchActiveTest(product) {
    try {
      var sb = window._abSupabase;
      if (!sb) return null;

      var res = await sb.from('ab_tests')
        .select('*')
        .eq('product', product)
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1);

      if (res.error) throw res.error;
      return (res.data && res.data.length) ? res.data[0] : null;
    } catch (e) {
      console.warn('[AB SDK] Failed to fetch active test:', e);
      return null;
    }
  }

  // ─── 主入口 ───
  // 页面调用: ABSDK.init({ product: 'ft', fallbackConfig: 'ft/config/base.json' })
  var ABSDK = {
    _test: null,
    _variant: null,
    _visitorId: null,
    _params: null,
    _config: null,

    async init(options) {
      var product = options.product;
      var fallbackConfig = options.fallbackConfig;

      this._params = getURLParams();
      this._visitorId = getVisitorId(this._params.gclid);

      if (this._params.debug) {
        console.log('[AB SDK] Debug mode ON');
        console.log('[AB SDK] Params:', this._params);
        console.log('[AB SDK] Visitor ID:', this._visitorId);
      }

      // 初始化 Supabase client
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        window._abSupabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
      }

      // 获取运行中的测试
      this._test = await fetchActiveTest(product);

      if (this._test) {
        var variants = this._test.variants || [];
        this._variant = assignVariant(
          this._test.id, variants, this._visitorId, this._params.variant
        );

        if (this._params.debug) {
          console.log('[AB SDK] Active test:', this._test.name);
          console.log('[AB SDK] Assigned variant:', this._variant.id, this._variant.name);
        }

        // 加载变体配置
        this._config = await loadVariantConfig(this._variant.config_path);
      } else {
        // 无活跃测试，加载 fallback（基准版本）
        this._config = await loadVariantConfig(fallbackConfig);
        this._variant = { id: 'base', name: 'Base (no test)' };
      }

      if (!this._config) {
        console.error('[AB SDK] No config loaded. Page will not render.');
        return;
      }

      // 渲染页面
      if (typeof window.LPRenderer !== 'undefined') {
        window.LPRenderer.render(this._config, {
          gclid: this._params.gclid,
          visitorId: this._visitorId,
        });
      }

      // 发送 page_view 事件
      if (typeof window.LPTracker !== 'undefined') {
        window.LPTracker.init({
          supabase: window._abSupabase,
          testId: this._test ? this._test.id : null,
          variantId: this._variant.id,
          visitorId: this._visitorId,
          gclid: this._params.gclid,
          // 🔴 GA4 Measurement ID — 需要你们提供
          ga4Id: options.ga4Id || null,
        });
        window.LPTracker.track('page_view');
      }
    },

    getConfig: function () { return this._config; },
    getVariant: function () { return this._variant; },
    getTest: function () { return this._test; },
    getVisitorId: function () { return this._visitorId; },
    getParams: function () { return this._params; },
  };

  window.ABSDK = ABSDK;
})();
