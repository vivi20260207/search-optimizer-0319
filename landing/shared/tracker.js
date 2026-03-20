/**
 * LP Tracker — 落地页事件追踪器
 *
 * 双通道发送：Supabase（主） + GA4（备份）
 *
 * 🔴 内部数据交互：
 *   - 写入 Supabase ab_events 表（公网写入，RLS 限制为 INSERT only）
 *   - GA4 通过 gtag 发送自定义事件（需提供 GA4 Measurement ID）
 *   - gclid 字段用于后续与 fetch_adw_data.py 的转化数据做 JOIN
 */
(function () {
  'use strict';

  var _config = {
    supabase: null,
    testId: null,
    variantId: null,
    visitorId: null,
    gclid: null,
    ga4Id: null,
  };

  var _sent = {};  // 去重：{ event_type: true }
  var _queue = []; // 离线队列

  // ─── Supabase 写入 ───
  async function sendToSupabase(eventType, metadata) {
    if (!_config.supabase || !_config.testId) return;

    try {
      var row = {
        test_id: _config.testId,
        variant_id: _config.variantId,
        event_type: eventType,
        gclid: _config.gclid || null,
        visitor_id: _config.visitorId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        metadata: metadata || null,
      };

      var res = await _config.supabase.from('ab_events').insert(row);
      if (res.error) throw res.error;
    } catch (e) {
      console.warn('[Tracker] Supabase write failed:', e);
      _queue.push({ type: eventType, meta: metadata, ts: Date.now() });
    }
  }

  // ─── GA4 写入 ───
  function sendToGA4(eventType, metadata) {
    if (!_config.ga4Id || typeof gtag === 'undefined') return;

    gtag('event', 'ab_' + eventType, {
      ab_test_id: _config.testId || 'none',
      ab_variant_id: _config.variantId || 'base',
      ab_gclid: _config.gclid || '',
      ab_visitor_id: _config.visitorId || '',
      ...metadata,
    });
  }

  // ─── 自动追踪：滚动深度 ───
  var _scrollTracked = { 50: false, 100: false };

  function onScroll() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    var pct = (scrollTop / docHeight) * 100;

    if (pct >= 50 && !_scrollTracked[50]) {
      _scrollTracked[50] = true;
      LPTracker.track('scroll_50');
    }
    if (pct >= 95 && !_scrollTracked[100]) {
      _scrollTracked[100] = true;
      LPTracker.track('scroll_100');
    }
  }

  // ─── 自动追踪：停留时间 ───
  var _timeTracked = {};

  function startTimeTracking() {
    [30, 60].forEach(function (sec) {
      setTimeout(function () {
        if (!_timeTracked[sec]) {
          _timeTracked[sec] = true;
          LPTracker.track('time_' + sec + 's');
        }
      }, sec * 1000);
    });
  }

  // ─── 重试队列 ───
  async function flushQueue() {
    if (_queue.length === 0 || !_config.supabase) return;

    var batch = _queue.splice(0, 10);
    for (var i = 0; i < batch.length; i++) {
      await sendToSupabase(batch[i].type, batch[i].meta);
    }
  }

  // ─── GA4 脚本加载 ───
  function loadGA4(measurementId) {
    if (!measurementId) return;
    // 🔴 需要你们提供各产品的 GA4 Measurement ID
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', measurementId, { send_page_view: false });
  }

  // ─── 公开 API ───
  var LPTracker = {
    init: function (opts) {
      _config.supabase = opts.supabase || null;
      _config.testId = opts.testId || null;
      _config.variantId = opts.variantId || null;
      _config.visitorId = opts.visitorId || null;
      _config.gclid = opts.gclid || null;
      _config.ga4Id = opts.ga4Id || null;

      loadGA4(_config.ga4Id);

      window.addEventListener('scroll', onScroll, { passive: true });
      startTimeTracking();

      setInterval(flushQueue, 30000);
    },

    track: function (eventType, metadata) {
      var dedupKey = eventType;
      var dedupEvents = ['page_view', 'scroll_50', 'scroll_100', 'time_30s', 'time_60s'];
      if (dedupEvents.indexOf(eventType) >= 0) {
        if (_sent[dedupKey]) return;
        _sent[dedupKey] = true;
      }

      sendToSupabase(eventType, metadata);
      sendToGA4(eventType, metadata);
    },

    trackCTAClick: function (ctaPosition) {
      this.track('cta_click', { cta_position: ctaPosition || 'unknown' });
    },

    trackOfferClick: function (offerType) {
      this.track('offer_click', { offer_type: offerType || 'unknown' });
    },
  };

  window.LPTracker = LPTracker;
})();
