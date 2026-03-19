/**
 * Search Optimizer 中台 - 公共工具函数
 * 2026-03-19
 */
const U = {
  fmt(n, d = 2) {
    if (n == null || isNaN(n)) return '--';
    return Number(n).toFixed(d);
  },
  fmtK(n) {
    if (n == null || isNaN(n)) return '--';
    if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
    if (n >= 1000) return Math.round(n).toLocaleString();
    return Math.round(n);
  },
  fmtPct(n, d = 1) {
    if (n == null || isNaN(n)) return '--';
    return Number(n).toFixed(d) + '%';
  },
  pct(a, b) {
    return b ? (a / b * 100) : 0;
  },
  safeDiv(a, b) {
    return b ? a / b : null;
  },
  clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  },
  colorClass(value, goodThreshold, warnThreshold) {
    if (value >= goodThreshold) return 'clr-good';
    if (value >= warnThreshold) return 'clr-warn';
    return 'clr-bad';
  },
  colorClassInverse(value, badThreshold, warnThreshold) {
    if (value <= badThreshold) return 'clr-good';
    if (value <= warnThreshold) return 'clr-warn';
    return 'clr-bad';
  },
  badge(text, type) {
    return `<span class="badge badge-${type}">${text}</span>`;
  },
  shortQS(label) {
    if (!label) return { text: '-', cls: '' };
    if (label.includes('高于')) return { text: '↑', cls: 'clr-good' };
    if (label.includes('低于')) return { text: '↓', cls: 'clr-bad' };
    return { text: '→', cls: 'clr-muted' };
  },
  parseMatchType(mt) {
    if (!mt) return '未知';
    if (mt.includes('完全')) return 'Exact';
    if (mt.includes('词组')) return 'Phrase';
    if (mt.includes('广泛')) return 'Broad';
    return mt;
  },
  truncate(str, len = 35) {
    if (!str) return '--';
    return str.length > len ? str.substring(0, len) + '…' : str;
  },
  campShortName(name) {
    return (name || '').replace(/web-|2\.5-/g, '').substring(0, 40);
  },
  getKeywordType(name) {
    if (!name) return '功能词';
    if (name.includes('品牌词')) return '品牌词';
    if (name.includes('竞品词') || name.includes('emerald')) return '竞品词';
    if (name.includes('功能词') || name.includes('广泛')) return '功能词';
    return '通用词';
  },
  el(id) {
    return document.getElementById(id);
  },
  qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  },
  qsa(sel, ctx) {
    return (ctx || document).querySelectorAll(sel);
  },
  html(el, content) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.innerHTML = content;
  }
};
