/**
 * AB Embed — 在「现有官网」上只加 AB，不重做整页
 *
 * 用法（放在 bloop.vip 等测试站模板里，建议 </body> 前）：
 *   <script src="https://你的Vercel域名/landing/embed/ab-embed.js"
 *     data-product="bloop"
 *     data-page-key="home"
 *     data-ga4="G-XXXX"   （可选）
 *     defer></script>
 *
 * 依赖：页面需先加载 Supabase UMD（或本脚本会尝试动态加载）
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *
 * Supabase ab_tests：
 *   product = 'bloop'（测试站独立短码，勿与 pu 混用）
 *   page_key = 'home'
 *   status = 'running'
 *   variants = [{ id, name, weight, patches: [{ selector, text?, html?, attr?, value? }] }]
 *
 * 调试：URL 加 ?ab_debug=1 或 ?variant=control
 */
(function () {
  'use strict';

  var SB_URL = 'https://lthetksmtttdsdygnicj.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0aGV0a3NtdHR0ZHNkeWduaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzY4MzIsImV4cCI6MjA4OTU1MjgzMn0.4kUg_mWph5-EUAQo6HslhtD_u4qJc66toso2TsLMk2o';
  var LS_PREFIX = 'ab_embed_';

  var script = document.currentScript;
  if (!script) return;

  var product = (script.getAttribute('data-product') || '').trim();
  var pageKey = (script.getAttribute('data-page-key') || '').trim();
  var ga4Id = (script.getAttribute('data-ga4') || '').trim() || null;
  var waitMs = parseInt(script.getAttribute('data-wait-ms') || '12000', 10);

  if (!product || !pageKey) {
    console.warn('[AB-Embed] Missing data-product or data-page-key');
    return;
  }

  function params() {
    var p = new URLSearchParams(window.location.search);
    return {
      gclid: p.get('gclid') || '',
      variant: p.get('variant') || '',
      debug: p.get('ab_debug') === '1',
    };
  }

  function hashString(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
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

  function visitorId(gclid) {
    if (gclid) return hashString('g_' + gclid);
    var k = LS_PREFIX + 'vid';
    var s = localStorage.getItem(k);
    if (s) return s;
    var v = hashString('fp_' + navigator.userAgent + screen.width + Math.random());
    localStorage.setItem(k, v);
    return v;
  }

  function assignVariant(testId, variants, vid, forceId) {
    if (forceId) {
      var f = variants.find(function (v) { return v.id === forceId; });
      if (f) return f;
    }
    var lsKey = LS_PREFIX + testId;
    var cached = localStorage.getItem(lsKey);
    if (cached) {
      var c = variants.find(function (v) { return v.id === cached; });
      if (c) return c;
    }
    var bucket = hashToBucket(vid + '_' + testId);
    var cum = 0;
    var chosen = variants[0];
    for (var i = 0; i < variants.length; i++) {
      cum += variants[i].weight;
      if (bucket < cum) {
        chosen = variants[i];
        break;
      }
    }
    localStorage.setItem(lsKey, chosen.id);
    return chosen;
  }

  function waitForSelector(sel, timeoutMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      function tick() {
        var el = document.querySelector(sel);
        if (el) {
          resolve(el);
          return;
        }
        if (Date.now() - t0 > timeoutMs) {
          resolve(null);
          return;
        }
        setTimeout(tick, 150);
      }
      tick();
    });
  }

  async function applyPatches(patches, dbg) {
    if (!patches || !patches.length) return;
    for (var i = 0; i < patches.length; i++) {
      var p = patches[i];
      var sel = p.selector;
      if (!sel) continue;
      var el = await waitForSelector(sel, p.wait_ms != null ? p.wait_ms : waitMs);
      if (!el) {
        if (dbg) console.warn('[AB-Embed] Selector not found:', sel);
        continue;
      }
      if (p.html != null) el.innerHTML = p.html;
      else if (p.text != null) el.textContent = p.text;
      if (p.attr && p.value != null) el.setAttribute(p.attr, p.value);
      if (p.addClass) el.classList.add.apply(el.classList, String(p.addClass).split(/\s+/).filter(Boolean));
      if (p.removeClass) el.classList.remove.apply(el.classList, String(p.removeClass).split(/\s+/).filter(Boolean));
    }
  }

  async function ensureSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      return supabase.createClient(SB_URL, SB_KEY);
    }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = function () {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
          resolve(supabase.createClient(SB_URL, SB_KEY));
        } else reject(new Error('supabase load failed'));
      };
      s.onerror = function () { reject(new Error('supabase script error')); };
      document.head.appendChild(s);
    });
  }

  function loadGA4(id) {
    if (!id || typeof gtag !== 'undefined') return;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', id, { send_page_view: false });
  }

  var trackerState = { sb: null, testId: null, variantId: null, visitorId: null, gclid: null, ga4Id: null };
  var sent = {};

  async function track(eventType, metadata) {
    if (!trackerState.sb || !trackerState.testId) return;
    var dedup = ['page_view', 'scroll_50', 'scroll_100', 'time_30s', 'time_60s'];
    if (dedup.indexOf(eventType) >= 0) {
      if (sent[eventType]) return;
      sent[eventType] = true;
    }
    try {
      await trackerState.sb.from('ab_events').insert({
        test_id: trackerState.testId,
        variant_id: trackerState.variantId,
        event_type: eventType,
        gclid: trackerState.gclid || null,
        visitor_id: trackerState.visitorId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        metadata: metadata || null,
      });
    } catch (e) {
      if (trackerState.debug) console.warn('[AB-Embed] track err', e);
    }
    if (trackerState.ga4Id && typeof gtag !== 'undefined') {
      gtag('event', 'ab_' + eventType, {
        ab_test_id: trackerState.testId,
        ab_variant_id: trackerState.variantId,
        ab_gclid: trackerState.gclid || '',
      });
    }
  }

  function bindScrollAndTime() {
    var st = { 50: false, 100: false };
    window.addEventListener('scroll', function () {
      var top = window.pageYOffset || document.documentElement.scrollTop;
      var dh = document.documentElement.scrollHeight - window.innerHeight;
      if (dh <= 0) return;
      var pct = (top / dh) * 100;
      if (pct >= 50 && !st[50]) { st[50] = true; track('scroll_50'); }
      if (pct >= 95 && !st[100]) { st[100] = true; track('scroll_100'); }
    }, { passive: true });
    [30, 60].forEach(function (sec) {
      setTimeout(function () { track('time_' + sec + 's'); }, sec * 1000);
    });
  }

  /** 仅追踪带 data-ab-cta 的主 CTA，避免全站每个按钮都打点 */
  function bindCtaDelegation() {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-ab-cta]');
      if (!t) return;
      track('cta_click', { selector: '[data-ab-cta]', text: (t.textContent || '').slice(0, 80) });
    }, true);
  }

  async function main() {
    var pr = params();
    var vid = visitorId(pr.gclid);
    loadGA4(ga4Id);

    var client;
    try {
      client = await ensureSupabase();
    } catch (e) {
      console.warn('[AB-Embed] Supabase init failed', e);
      return;
    }

    var q = client
      .from('ab_tests')
      .select('*')
      .eq('product', product)
      .eq('status', 'running')
      .order('started_at', { ascending: false });

    // page_key 列执行 migration_ab_page_key.sql 后才有；若未迁移，可暂时只用 product（不推荐多页）
    q = q.eq('page_key', pageKey);

    var res = await q.limit(1);
    if (res.error) {
      console.warn('[AB-Embed] Query error (did you run migration_ab_page_key.sql?)', res.error);
      return;
    }
    var rows = res.data || [];
    if (!rows.length) {
      if (pr.debug) console.log('[AB-Embed] No running test for', product, pageKey);
      return;
    }

    var test = rows[0];
    var variants = test.variants;
    if (!variants || !variants.length) return;

    var variant = assignVariant(test.id, variants, vid, pr.variant);
    var patches = variant.patches || [];

    if (pr.debug) {
      console.log('[AB-Embed] test', test.name, 'variant', variant.id, patches);
    }

    await applyPatches(patches, pr.debug);

    trackerState.sb = client;
    trackerState.testId = test.id;
    trackerState.variantId = variant.id;
    trackerState.visitorId = vid;
    trackerState.gclid = pr.gclid;
    trackerState.ga4Id = ga4Id;
    trackerState.debug = pr.debug;

    await track('page_view', { embed: true, page_key: pageKey });
    bindScrollAndTime();
    bindCtaDelegation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { main(); });
  } else {
    main();
  }
})();
