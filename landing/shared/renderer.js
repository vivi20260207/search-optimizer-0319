/**
 * LP Renderer — JSON 配置 → DOM 渲染器
 *
 * 读取 JSON 配置文件，生成落地页 HTML 结构。
 * Phase 1：固定区块（hero / social_proof / features / offer / cta_bottom）
 * Phase 2：可扩展为任意组件数组
 */
(function () {
  'use strict';

  // ─── 模板变量替换 ───
  // 支持 {{gclid}}、{{visitorId}} 等占位符
  function interpolate(str, ctx) {
    if (!str || typeof str !== 'string') return str || '';
    return str.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return ctx[key] !== undefined ? ctx[key] : '';
    });
  }

  // ─── 区块渲染函数 ───

  function renderHero(data, ctx) {
    var cta = data.cta_text || 'Get Started';
    var url = interpolate(data.cta_url || '#', ctx);
    return '' +
      '<section class="lp-hero">' +
        '<div class="lp-hero-content">' +
          '<h1 class="lp-h1">' + (data.headline || '') + '</h1>' +
          '<p class="lp-h2">' + (data.subheadline || '') + '</p>' +
          '<a href="' + url + '" class="lp-cta-btn lp-cta-primary" data-cta="hero" onclick="LPTracker.trackCTAClick(\'hero\')">' +
            cta +
          '</a>' +
        '</div>' +
        (data.hero_image ? '<div class="lp-hero-visual"><img src="' + data.hero_image + '" alt="" loading="eager"></div>' : '') +
      '</section>';
  }

  function renderSocialProof(data) {
    if (!data) return '';

    var inner = '';
    if (data.type === 'live_counter') {
      var count = (data.online_count || 0).toLocaleString();
      inner =
        '<div class="lp-social-live">' +
          '<span class="lp-live-dot"></span>' +
          '<span class="lp-live-count">' + count + '</span> ' +
          '<span class="lp-live-label">' + (data.label || 'people online') + '</span>' +
        '</div>';
      if (data.show_avatars) {
        inner += '<div class="lp-avatar-row">' +
          [1, 2, 3, 4, 5].map(function (i) {
            return '<div class="lp-avatar" style="background-image:url(\'assets/avatar-' + i + '.webp\')"></div>';
          }).join('') +
        '</div>';
      }
    } else if (data.type === 'matching_animation') {
      inner =
        '<div class="lp-social-matching">' +
          '<div class="lp-matching-pulse"></div>' +
          '<span>' + (data.label || 'Finding someone for you...') + '</span>' +
        '</div>';
    } else if (data.type === 'avatar_wall') {
      inner = '<div class="lp-avatar-wall">' +
        (data.label || '') +
      '</div>';
    }

    return '<section class="lp-social-proof">' + inner + '</section>';
  }

  function renderFeatures(list) {
    if (!list || !list.length) return '';

    var icons = {
      video: '🎥', globe: '🌍', shield: '🛡️', heart: '❤️',
      chat: '💬', star: '⭐', lock: '🔒', zap: '⚡',
    };

    var items = list.map(function (f) {
      var icon = icons[f.icon] || '✨';
      return '' +
        '<div class="lp-feature-item">' +
          '<div class="lp-feature-icon">' + icon + '</div>' +
          '<h3 class="lp-feature-title">' + (f.title || '') + '</h3>' +
          '<p class="lp-feature-desc">' + (f.desc || '') + '</p>' +
        '</div>';
    }).join('');

    return '<section class="lp-features"><div class="lp-features-grid">' + items + '</div></section>';
  }

  function renderOffer(data) {
    if (!data || !data.enabled) return '';

    var inner = '<div class="lp-offer-badge">';
    inner += '<span class="lp-offer-text">' + (data.text || '') + '</span>';

    if (data.urgency === 'countdown' && data.countdown_minutes) {
      inner += '<div class="lp-countdown" data-minutes="' + data.countdown_minutes + '">' +
        '<span class="lp-countdown-value">--:--</span>' +
      '</div>';
    }

    inner += '</div>';

    return '<section class="lp-offer" onclick="LPTracker.trackOfferClick(\'' + (data.type || 'generic') + '\')">' +
      inner + '</section>';
  }

  function renderCTABottom(config, ctx) {
    if (!config.hero) return '';
    var cta = config.hero.cta_text || 'Get Started';
    var url = interpolate(config.hero.cta_url || '#', ctx);

    return '' +
      '<section class="lp-cta-bottom">' +
        '<a href="' + url + '" class="lp-cta-btn lp-cta-primary lp-cta-lg" data-cta="bottom" onclick="LPTracker.trackCTAClick(\'bottom\')">' +
          cta +
        '</a>' +
      '</section>';
  }

  function renderFooter(config) {
    var product = config.product || '';
    return '' +
      '<footer class="lp-footer">' +
        '<div class="lp-footer-links">' +
          '<a href="#">Privacy Policy</a>' +
          '<a href="#">Terms of Service</a>' +
        '</div>' +
        '<p class="lp-footer-copy">&copy; ' + new Date().getFullYear() + ' ' + product + '</p>' +
      '</footer>';
  }

  // ─── 倒计时启动 ───
  function startCountdowns() {
    var countdowns = document.querySelectorAll('.lp-countdown');
    countdowns.forEach(function (el) {
      var minutes = parseInt(el.dataset.minutes) || 15;
      var endTime = Date.now() + minutes * 60 * 1000;

      var stored = localStorage.getItem('lp_countdown_end');
      if (stored && parseInt(stored) > Date.now()) {
        endTime = parseInt(stored);
      } else {
        localStorage.setItem('lp_countdown_end', endTime.toString());
      }

      var valueEl = el.querySelector('.lp-countdown-value');
      var tick = function () {
        var remaining = Math.max(0, endTime - Date.now());
        var m = Math.floor(remaining / 60000);
        var s = Math.floor((remaining % 60000) / 1000);
        valueEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
        if (remaining > 0) requestAnimationFrame(tick);
      };
      tick();
    });
  }

  // ─── 区块映射（Phase 1 固定区块） ───
  var SECTION_RENDERERS = {
    hero: function (config, ctx) { return renderHero(config.hero || {}, ctx); },
    social_proof: function (config) { return renderSocialProof(config.social_proof); },
    features: function (config) { return renderFeatures(config.features); },
    offer: function (config) { return renderOffer(config.offer); },
    cta_bottom: function (config, ctx) { return renderCTABottom(config, ctx); },
  };

  // ─── 主渲染函数 ───
  var LPRenderer = {
    render: function (config, ctx) {
      ctx = ctx || {};

      var sections = (config.layout && config.layout.sections) || ['hero', 'social_proof', 'features', 'offer', 'cta_bottom'];

      var html = '<div class="lp-page">';

      sections.forEach(function (sectionId) {
        var renderer = SECTION_RENDERERS[sectionId];
        if (renderer) {
          html += renderer(config, ctx);
        }
      });

      html += renderFooter(config);
      html += '</div>';

      var container = document.getElementById('lp-root');
      if (container) {
        container.innerHTML = html;
        container.classList.add('lp-loaded');
      }

      startCountdowns();
    },
  };

  window.LPRenderer = LPRenderer;
})();
