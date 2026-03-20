/**
 * Search Optimizer 中台 - 主应用逻辑
 * 2026-03-19
 */

// ═══════════════════════════════════════
// DATA PREPARATION
// ═══════════════════════════════════════
const ALL_CAMPS = CAMPAIGN_SUMMARY;
let SEARCH_CAMPS = CAMPAIGN_SUMMARY.filter(c => c.type === 'Search');

const KW_MAP = {};
const ST_MAP = {};
const DEV_MAP = {};
/** ADW 拉取的按日原始行（仅含 API 日维度数据） */
const RAW_KW_BY_CAMP = {};
const RAW_ST_BY_CAMP = {};
const RAW_DEV_BY_CAMP = {};
const RAW_GENDER_BY_CAMP = {};
const RAW_AGE_BY_CAMP = {};
const GENDER_MAP = {};
const AGE_MAP = {};
/** 手工 reg 的静态快照（无 date 字段），仅在「全量日期」或该行无 date 时参与筛选 */
const INITIAL_MANUAL = { kw: {}, st: {}, dev: {} };

function regKW(campName, arr) { if (arr && arr.length) KW_MAP[campName] = arr; }
function regST(campName, arr) { if (arr && arr.length) ST_MAP[campName] = arr; }
function regDEV(campName, arr) { if (arr && arr.length) DEV_MAP[campName] = arr; }

// Normalize all numeric fields to avoid floating-point tails
// (e.g. 212.32999999999998 -> 212.33). This runs once at load time.
function round2(n) {
  return Number(Number(n).toFixed(2));
}
function normalizeRecords(records) {
  if (!Array.isArray(records)) return;
  records.forEach(rec => {
    if (!rec || typeof rec !== 'object') return;
    Object.keys(rec).forEach(k => {
      if (typeof rec[k] === 'number' && Number.isFinite(rec[k])) {
        rec[k] = round2(rec[k]);
      }
    });
  });
}
function normalizeMapData(mapObj) {
  Object.values(mapObj).forEach(normalizeRecords);
}
normalizeRecords(CAMPAIGN_SUMMARY);
const ADW_MISSING_TEXT = '';
function qsFieldText(v) {
  return (v === '' || v == null) ? '' : v;
}

regKW('pu-web-IN-2.5-竞品词-6.14重开', typeof ADW_PU_IN_COMP_KEYWORDS !== 'undefined' ? ADW_PU_IN_COMP_KEYWORDS : []);
regKW('pu-web-IN-2.5-品牌词-6.16', typeof ADW_PU_IN_BRAND_KEYWORDS !== 'undefined' ? ADW_PU_IN_BRAND_KEYWORDS : []);
regKW('Ppt-web-UK-2.5-1.18-homepage', typeof ADW_PPT_UK_KEYWORDS !== 'undefined' ? ADW_PPT_UK_KEYWORDS : []);
regKW('Ppt-web-US-2.5-1.17-homepage', typeof ADW_PPT_US_KEYWORDS !== 'undefined' ? ADW_PPT_US_KEYWORDS : []);
regKW('ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA', typeof ADW_FT_IN_FUNC_KEYWORDS !== 'undefined' ? ADW_FT_IN_FUNC_KEYWORDS : []);
regKW('Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA', typeof ADW_PU_IN_EMERALD_KEYWORDS !== 'undefined' ? ADW_PU_IN_EMERALD_KEYWORDS : []);

regST('pu-web-IN-2.5-竞品词-6.14重开', typeof ADW_PU_IN_COMP_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_COMP_SEARCH_TERMS : []);
regST('pu-web-IN-2.5-品牌词-6.16', typeof ADW_PU_IN_BRAND_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_BRAND_SEARCH_TERMS : []);
regST('Ppt-web-UK-2.5-1.18-homepage', typeof ADW_PPT_UK_SEARCH_TERMS !== 'undefined' ? ADW_PPT_UK_SEARCH_TERMS : []);
regST('Ppt-web-US-2.5-1.17-homepage', typeof ADW_PPT_US_SEARCH_TERMS !== 'undefined' ? ADW_PPT_US_SEARCH_TERMS : []);
regST('ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA', typeof ADW_FT_IN_FUNC_SEARCH_TERMS !== 'undefined' ? ADW_FT_IN_FUNC_SEARCH_TERMS : []);
regST('Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA', typeof ADW_PU_IN_EMERALD_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_EMERALD_SEARCH_TERMS : []);

regDEV('pu-web-IN-2.5-竞品词-6.14重开', typeof ADW_PU_IN_COMP_DEVICES !== 'undefined' ? ADW_PU_IN_COMP_DEVICES : []);
regDEV('Pu-web-2.5-IN-Display-12.23', typeof ADW_PU_IN_DEVICES !== 'undefined' ? ADW_PU_IN_DEVICES : []);
regDEV('Ft-web-US-2.5-Display-12.26-homepage', typeof ADW_FT_US_DEVICES !== 'undefined' ? ADW_FT_US_DEVICES : []);
regDEV('Ppt-web-UK-2.5-1.18-homepage', typeof ADW_PPT_UK_DEVICES !== 'undefined' ? ADW_PPT_UK_DEVICES : []);
regDEV('Ppt-web-US-2.5-1.17-homepage', typeof ADW_PPT_US_DEVICES !== 'undefined' ? ADW_PPT_US_DEVICES : []);

(function snapshotManualMaps() {
  Object.keys(KW_MAP).forEach(k => { INITIAL_MANUAL.kw[k] = (KW_MAP[k] || []).map(r => ({ ...r })); });
  Object.keys(ST_MAP).forEach(k => { INITIAL_MANUAL.st[k] = (ST_MAP[k] || []).map(r => ({ ...r })); });
  Object.keys(DEV_MAP).forEach(k => { INITIAL_MANUAL.dev[k] = (DEV_MAP[k] || []).map(r => ({ ...r })); });
})();

normalizeMapData(KW_MAP);
normalizeMapData(ST_MAP);
normalizeMapData(DEV_MAP);

const ASSET_MAP = {};
function regAsset(campName, arr) { if (arr && arr.length) ASSET_MAP[campName] = arr; }
regAsset('pu-web-IN-2.5-竞品词-6.14重开', typeof ADW_PU_IN_COMP_ASSETS !== 'undefined' ? ADW_PU_IN_COMP_ASSETS : []);
regAsset('Ft-web-US-2.5-Display-12.26-homepage', typeof ADW_FT_US_ASSETS !== 'undefined' ? ADW_FT_US_ASSETS : []);
regAsset('Ppt-web-2.5-AR+UAE+IL+QA-2.3', typeof ADW_PPT_ME_PMAX_ASSETS !== 'undefined' ? ADW_PPT_ME_PMAX_ASSETS : []);
regAsset('Ppt-web-US-2.5-Pmax-1.20-homepage', typeof ADW_PPT_US_PMAX_ASSETS !== 'undefined' ? ADW_PPT_US_PMAX_ASSETS : []);

// ─── Auto-discover Asset globals and register into ASSET_MAP ───
(function autoRegisterAssets() {
  const globals = Object.keys(window);
  const assetVars = globals.filter(k => k.includes('ASSETS') && k.startsWith('ADW_') && Array.isArray(window[k]) && window[k].length > 0);
  const registered = new Set(Object.keys(ASSET_MAP));
  const campNames = CAMPAIGN_SUMMARY.map(c => c.name);

  assetVars.forEach(varName => {
    const alreadyMapped = Object.values(ASSET_MAP).some(arr => arr === window[varName]);
    if (alreadyMapped) return;

    const slug = varName.replace(/^ADW_/, '').replace(/_ASSETS$/, '').toLowerCase().replace(/_/g, '-');
    const matched = campNames.find(cn => {
      const cnLower = cn.toLowerCase().replace(/[^a-z0-9]/g, '');
      const slugClean = slug.replace(/[^a-z0-9]/g, '');
      return cnLower.includes(slugClean) || slugClean.includes(cnLower);
    });
    if (matched && !registered.has(matched)) {
      regAsset(matched, window[varName]);
      registered.add(matched);
    }
  });
})();

// ─── 数据包日期元信息 + 全局筛选区间 ───
const _hasRealMeta = (typeof ADW_DATA_META !== 'undefined');
const ADW_META = _hasRealMeta ? ADW_DATA_META : { startDate: '2026-02-01', endDate: '2099-12-31', generatedAt: '' };

/** 用于「全包」判断与日筛选：有 ADW_DATA_META 时用 meta；否则从已加载行里推断最大 date */
let ADW_BUNDLE_END_EFFECTIVE = ADW_META.endDate;
function recomputeBundleEndEffective() {
  if (_hasRealMeta) {
    ADW_BUNDLE_END_EFFECTIVE = ADW_META.endDate;
    return;
  }
  let maxD = '';
  const bump = (rows) => {
    if (!Array.isArray(rows)) return;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r && r.date && typeof r.date === 'string' && r.date > maxD) maxD = r.date;
    }
  };
  Object.values(CAMP_DAILY_MAP).forEach(bump);
  Object.values(RAW_KW_BY_CAMP).forEach(bump);
  Object.values(RAW_ST_BY_CAMP).forEach(bump);
  Object.values(RAW_DEV_BY_CAMP).forEach(bump);
  Object.values(RAW_GENDER_BY_CAMP).forEach(bump);
  Object.values(RAW_AGE_BY_CAMP).forEach(bump);
  ADW_BUNDLE_END_EFFECTIVE = maxD || ADW_META.endDate;
}

/** 与文案一致：无 date 的静态行仅在此区间计入 */
function isFullBundleDateRange(start, end) {
  return start <= ADW_META.startDate && end >= ADW_BUNDLE_END_EFFECTIVE;
}

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDaysYmd(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return ymdLocal(dt);
}
function clampYmd(ymd, minY, maxY) {
  if (ymd < minY) return minY;
  if (ymd > maxY) return maxY;
  return ymd;
}
function rowInDateRange(row, start, end) {
  if (!row) return false;
  if (!row.date) return isFullBundleDateRange(start, end);
  return row.date >= start && row.date <= end;
}

/** 默认：今天（单日），夹在数据包 [startDate,endDate] 内；无 meta 时 end 先为占位，加载后会用 ADW_BUNDLE_END_EFFECTIVE 再夹一次 */
function computeDefaultDateRange() {
  const ds = ADW_META.startDate;
  const de = ADW_META.endDate;
  const today = ymdLocal(new Date());
  let pick = today;
  if (pick > de) pick = de;
  if (pick < ds) pick = ds;
  return { start: pick, end: pick };
}

const DATE_RANGE_KEY = 'adw_date_range_v1';
function loadSavedDateRange() {
  try {
    const j = JSON.parse(localStorage.getItem(DATE_RANGE_KEY) || 'null');
    if (j && j.start && j.end) return { start: j.start, end: j.end };
  } catch (_) {}
  return null;
}
function saveDateRange(s, e) {
  localStorage.setItem(DATE_RANGE_KEY, JSON.stringify({ start: s, end: e }));
}

let DATE_RANGE = loadSavedDateRange();
if (DATE_RANGE && DATE_RANGE.end >= '2090-01-01') {
  localStorage.removeItem(DATE_RANGE_KEY);
  DATE_RANGE = null;
}
DATE_RANGE = DATE_RANGE || computeDefaultDateRange();
DATE_RANGE.start = clampYmd(DATE_RANGE.start, ADW_META.startDate, ADW_META.endDate);
DATE_RANGE.end = clampYmd(DATE_RANGE.end, ADW_META.startDate, ADW_META.endDate);
if (DATE_RANGE.start > DATE_RANGE.end) {
  const t = DATE_RANGE.start; DATE_RANGE.start = DATE_RANGE.end; DATE_RANGE.end = t;
}

function aggregateKwRows(rows) {
  const agg = {};
  rows.forEach(r => {
    const key = r.adGroup + '|||' + r.keyword + '|||' + r.matchType;
    if (!agg[key]) {
      agg[key] = {
        campaign: r.campaign, adGroup: r.adGroup, keyword: r.keyword,
        matchType: r.matchType, status: '有效',
        clicks: 0, impressions: 0, cost: 0,
        purchaseNew: 0, purchaseNewValue: 0,
        cpc: 0, cpa: 0, impressionShare: '< 10%',
        qualityScore: '', expectedCTR: '', landingPageExp: '', adRelevance: '',
        _latestQS: null
      };
    }
    const a = agg[key];
    a.clicks += r.clicks || 0;
    a.impressions += r.impressions || 0;
    a.cost += r.cost || 0;
    a.purchaseNew += r.conversions || 0;
    a.purchaseNewValue += r.revenue || 0;
    if (r.qualityScore && r.qualityScore > 0) a._latestQS = r.qualityScore;
    if (r.expectedCTR) a.expectedCTR = r.expectedCTR;
    if (r.landingPageExp) a.landingPageExp = r.landingPageExp;
  });
  return Object.values(agg).map(a => {
    a.cpc = a.clicks > 0 ? +(a.cost / a.clicks).toFixed(2) : 0;
    a.cpa = a.purchaseNew > 0 ? +(a.cost / a.purchaseNew).toFixed(2) : 0;
    a.qualityScore = a._latestQS || '';
    delete a._latestQS;
    return a;
  });
}

function aggregateStRows(rows) {
  const agg = {};
  rows.forEach(r => {
    const key = (r.adGroup || '') + '|||' + (r.term || '');
    if (!agg[key]) {
      agg[key] = {
        campaign: r.campaign, adGroup: r.adGroup, term: r.term,
        addedExcluded: r.addedExcluded || '',
        clicks: 0, impressions: 0, cost: 0,
        purchaseNew: 0, purchaseNewValue: 0, matchType: r.matchType || ''
      };
    }
    const a = agg[key];
    a.clicks += r.clicks || 0;
    a.impressions += r.impressions || 0;
    a.cost += r.cost || 0;
    a.purchaseNew += r.conversions || r.purchaseNew || 0;
    a.purchaseNewValue += r.revenue || r.purchaseNewValue || 0;
  });
  return Object.values(agg).map(a => {
    a.cpc = a.clicks > 0 ? +(a.cost / a.clicks).toFixed(2) : 0;
    return a;
  });
}

function aggregateDevRows(rows) {
  const agg = {};
  rows.forEach(r => {
    const d = r.device;
    if (!agg[d]) agg[d] = { device: d, impressions: 0, clicks: 0, cost: 0, conversions: 0 };
    agg[d].impressions += r.impressions || 0;
    agg[d].clicks += r.clicks || 0;
    agg[d].cost += r.cost || 0;
    agg[d].conversions += r.conversions || 0;
  });
  return Object.values(agg).map(a => {
    a.cpc = a.clicks > 0 ? +(a.cost / a.clicks).toFixed(2) : 0;
    a.ctr = a.impressions > 0 ? (a.clicks / a.impressions * 100).toFixed(2) + '%' : '0%';
    a.cpa = a.conversions > 0 ? +(a.cost / a.conversions).toFixed(2) : 0;
    a.convRate = a.clicks > 0 ? (a.conversions / a.clicks * 100).toFixed(2) + '%' : '0%';
    return a;
  });
}

function aggregateGenderRows(rows) {
  const agg = {};
  rows.forEach(r => {
    const k = r.gender;
    if (!agg[k]) {
      agg[k] = { campaign: r.campaign, gender: r.gender, impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 };
    }
    agg[k].impressions += r.impressions || 0;
    agg[k].clicks += r.clicks || 0;
    agg[k].cost += r.cost || 0;
    agg[k].conversions += r.conversions || 0;
    agg[k].revenue += r.revenue || 0;
  });
  return Object.values(agg);
}

function aggregateAgeRows(rows) {
  const agg = {};
  rows.forEach(r => {
    const k = r.ageRange;
    if (!agg[k]) {
      agg[k] = { campaign: r.campaign, ageRange: r.ageRange, impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 };
    }
    agg[k].impressions += r.impressions || 0;
    agg[k].clicks += r.clicks || 0;
    agg[k].cost += r.cost || 0;
    agg[k].conversions += r.conversions || 0;
    agg[k].revenue += r.revenue || 0;
  });
  return Object.values(agg);
}

function rebuildSearchCampsFromDaily(start, end) {
  SEARCH_CAMPS = CAMPAIGN_SUMMARY.filter(c => c.type === 'Search').map(base => {
    const rawDaily = CAMP_DAILY_MAP[base.name];
    if (!rawDaily || !rawDaily.length) return { ...base };
    const daily = rawDaily.filter(r => rowInDateRange(r, start, end));
    if (!daily.length) return { ...base, spend: 0, totalRevenue: 0, newPayUsers: 0, roas: 0, newCPA: 0, newIOS: 0, newAndroid: 0 };
    const spend = daily.reduce((s, r) => s + (r.cost || 0), 0);
    const totalRevenue = daily.reduce((s, r) => s + (r.revenue || 0), 0);
    const newPayUsers = Math.round(daily.reduce((s, r) => s + (r.conversions || 0), 0));
    const roas = spend > 0 ? totalRevenue / spend : 0;
    const newCPA = newPayUsers > 0 ? spend / newPayUsers : 0;
    const ratio = base.spend > 0 ? spend / base.spend : (spend > 0 ? 1 : 0);
    return {
      ...base,
      spend,
      totalRevenue,
      newPayUsers,
      roas,
      newCPA,
      newIOS: Math.max(0, Math.round((base.newIOS || 0) * ratio)),
      newAndroid: Math.max(0, Math.round((base.newAndroid || 0) * ratio))
    };
  });
}

let ST_CAMP_MAP = {};
function rebuildSTCampMap() {
  ST_CAMP_MAP = {};
  const allCamps = new Set([...Object.keys(KW_MAP), ...Object.keys(ST_MAP)]);
  let idx = 0;
  allCamps.forEach(camp => {
    if (ST_MAP[camp] || KW_MAP[camp]) {
      const key = 'camp-' + idx++;
      const shortName = typeof U !== 'undefined' && U.campShortName ? U.campShortName(camp) : camp;
      ST_CAMP_MAP[key] = { label: shortName, kw: camp, st: camp };
    }
  });
}

function rebuildMapsForDateRange(start, end) {
  Object.keys(KW_MAP).forEach(k => delete KW_MAP[k]);
  Object.keys(ST_MAP).forEach(k => delete ST_MAP[k]);
  Object.keys(DEV_MAP).forEach(k => delete DEV_MAP[k]);

  Object.entries(RAW_KW_BY_CAMP).forEach(([camp, rows]) => {
    const f = rows.filter(r => rowInDateRange(r, start, end));
    const arr = aggregateKwRows(f);
    if (arr.length) regKW(camp, arr);
  });
  Object.entries(RAW_ST_BY_CAMP).forEach(([camp, rows]) => {
    const f = rows.filter(r => rowInDateRange(r, start, end));
    const arr = aggregateStRows(f);
    if (arr.length) regST(camp, arr);
  });
  Object.entries(RAW_DEV_BY_CAMP).forEach(([camp, rows]) => {
    const f = rows.filter(r => rowInDateRange(r, start, end));
    const arr = aggregateDevRows(f);
    if (arr.length) regDEV(camp, arr);
  });

  Object.entries(INITIAL_MANUAL.kw).forEach(([camp, rows]) => {
    if (RAW_KW_BY_CAMP[camp]) return;
    const f = rows.filter(r => rowInDateRange(r, start, end));
    if (f.length) regKW(camp, f);
  });
  Object.entries(INITIAL_MANUAL.st).forEach(([camp, rows]) => {
    if (RAW_ST_BY_CAMP[camp]) return;
    const f = rows.filter(r => rowInDateRange(r, start, end));
    if (f.length) regST(camp, f);
  });
  Object.entries(INITIAL_MANUAL.dev).forEach(([camp, rows]) => {
    if (RAW_DEV_BY_CAMP[camp]) return;
    const f = rows.filter(r => rowInDateRange(r, start, end));
    if (f.length) regDEV(camp, f);
  });

  normalizeMapData(KW_MAP);
  normalizeMapData(ST_MAP);
  normalizeMapData(DEV_MAP);

  Object.keys(GENDER_MAP).forEach(k => delete GENDER_MAP[k]);
  Object.keys(AGE_MAP).forEach(k => delete AGE_MAP[k]);
  Object.entries(RAW_GENDER_BY_CAMP).forEach(([camp, rows]) => {
    const f = rows.filter(r => rowInDateRange(r, start, end));
    const arr = aggregateGenderRows(f);
    if (arr.length) GENDER_MAP[camp] = arr;
  });
  Object.entries(RAW_AGE_BY_CAMP).forEach(([camp, rows]) => {
    const f = rows.filter(r => rowInDateRange(r, start, end));
    const arr = aggregateAgeRows(f);
    if (arr.length) AGE_MAP[camp] = arr;
  });

  rebuildSearchCampsFromDaily(start, end);
  rebuildFlatArrays();
  rebuildSTCampMap();
}

let FLAT_KW = [];
let FLAT_ST = [];
function rebuildFlatArrays() {
  FLAT_KW = [];
  Object.entries(KW_MAP).forEach(([camp, kws]) => {
    kws.forEach(kw => FLAT_KW.push({ ...kw, _camp: camp }));
  });
  FLAT_ST = [];
  Object.entries(ST_MAP).forEach(([camp, sts]) => {
    sts.forEach(st => FLAT_ST.push({ ...st, _camp: camp }));
  });
}

// ─── Auto-register ALL campaigns from adw_data_daily.js ───
const CAMP_DAILY_MAP = {};

(function autoRegisterDaily() {
  try {
  const globals = Object.keys(window);

  globals.filter(k => k.startsWith('ADW_CAMP_') && Array.isArray(window[k]) && window[k].length > 0)
    .forEach(k => {
      const camp = window[k][0].campaign;
      if (camp) CAMP_DAILY_MAP[camp] = window[k];
    });

  globals.filter(k => k.startsWith('ADW_KW_') && Array.isArray(window[k]) && window[k].length > 0)
    .forEach(k => {
      const camp = window[k][0].campaign;
      if (!camp) return;
      RAW_KW_BY_CAMP[camp] = window[k].map(r => ({ ...r }));
    });

  globals.filter(k => k.startsWith('ADW_ST_') && Array.isArray(window[k]) && window[k].length > 0)
    .forEach(k => {
      const camp = window[k][0].campaign;
      if (!camp) return;
      RAW_ST_BY_CAMP[camp] = window[k].map(r => ({ ...r }));
    });

  globals.filter(k => k.startsWith('ADW_DEV_') && Array.isArray(window[k]) && window[k].length > 0)
    .forEach(k => {
      const camp = window[k][0].campaign;
      if (!camp) return;
      RAW_DEV_BY_CAMP[camp] = window[k].map(r => ({ ...r }));
    });

  if (typeof ADW_GENDER_REGISTRY !== 'undefined' && Array.isArray(ADW_GENDER_REGISTRY)) {
    ADW_GENDER_REGISTRY.forEach(arr => {
      if (!Array.isArray(arr) || !arr[0] || !arr[0].campaign) return;
      const camp = arr[0].campaign;
      RAW_GENDER_BY_CAMP[camp] = arr.map(r => ({ ...r }));
    });
  }
  if (typeof ADW_AGE_REGISTRY !== 'undefined' && Array.isArray(ADW_AGE_REGISTRY)) {
    ADW_AGE_REGISTRY.forEach(arr => {
      if (!Array.isArray(arr) || !arr[0] || !arr[0].campaign) return;
      const camp = arr[0].campaign;
      RAW_AGE_BY_CAMP[camp] = arr.map(r => ({ ...r }));
    });
  }

  recomputeBundleEndEffective();
  DATE_RANGE.start = clampYmd(DATE_RANGE.start, ADW_META.startDate, ADW_BUNDLE_END_EFFECTIVE);
  DATE_RANGE.end = clampYmd(DATE_RANGE.end, ADW_META.startDate, ADW_BUNDLE_END_EFFECTIVE);
  if (DATE_RANGE.start > DATE_RANGE.end) {
    const t = DATE_RANGE.start; DATE_RANGE.start = DATE_RANGE.end; DATE_RANGE.end = t;
  }
  saveDateRange(DATE_RANGE.start, DATE_RANGE.end);

  rebuildMapsForDateRange(DATE_RANGE.start, DATE_RANGE.end);

  console.log('[AutoReg] CAMP_DAILY:', Object.keys(CAMP_DAILY_MAP).length,
    'KW:', Object.keys(KW_MAP).length,
    'ST:', Object.keys(ST_MAP).length,
    'DEV:', Object.keys(DEV_MAP).length,
    'DATE:', DATE_RANGE.start, '~', DATE_RANGE.end);
  } catch (e) {
    console.error('[AutoReg] FATAL:', e);
    document.title = 'ERR: ' + e.message;
  }
})();

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
/** 知识库、回传记录等页不展示全局日期条与侧栏数据包说明（避免干扰非报表场景） */
function syncChromeForView(viewKey) {
  const minimal = viewKey === 'knowledge' || viewKey === 'postback-log';
  document.body.classList.toggle('chrome-no-data-context', minimal);
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    item.classList.add('active');
    const viewId = 'view-' + item.dataset.view;
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');
    syncChromeForView(item.dataset.view || '');
  });
});

// ═══════════════════════════════════════
// MODULE 0: 数据可信度门控
// ═══════════════════════════════════════
function renderTrustGate() {
  const trustResults = Engine.checkDataTrust(SEARCH_CAMPS);
  const totalWarnings = trustResults.reduce((s, t) => s + t.warnings.length, 0);
  const learningCount = trustResults.filter(t => t.bidStatus === 'Learning').length;
  const budgetLimited = trustResults.filter(t => t.bidStatus === 'Limited by budget').length;
  const iosGapCount = trustResults.filter(t => t.iosGap && t.iosGap.androidRatio > 40).length;

  U.html('trust-gate-kpis', `
    <div class="kpi-card">
      <div class="kpi-label">Search 计划数</div>
      <div class="kpi-value">${SEARCH_CAMPS.length}</div>
      <div class="kpi-sub">纳入分析</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">风险提示总数</div>
      <div class="kpi-value clr-${totalWarnings > 3 ? 'bad' : totalWarnings > 0 ? 'warn' : 'good'}">${totalWarnings}</div>
      <div class="kpi-sub">${totalWarnings === 0 ? '数据健康' : '需关注'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">学习期计划</div>
      <div class="kpi-value clr-${learningCount > 0 ? 'warn' : 'good'}">${learningCount}</div>
      <div class="kpi-sub">${learningCount > 0 ? '数据不稳定，慎操作' : '全部已脱离学习期'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">iOS 归因折损</div>
      <div class="kpi-value clr-${iosGapCount > 2 ? 'bad' : iosGapCount > 0 ? 'warn' : 'good'}">${iosGapCount}</div>
      <div class="kpi-sub">Android 占比 > 40% 的计划</div>
    </div>
  `);

  let cardsHtml = '';
  trustResults.forEach(t => {
    if (t.warnings.length === 0) return;
    const worst = t.warnings.some(w => w.type === 'ios_gap') ? 'bad' : t.warnings.some(w => w.type === 'budget_limited') ? 'warn' : 'learning';
    cardsHtml += `<div class="trust-card trust-${worst}">
      <div class="trust-title">${U.campShortName(t.name)}</div>
      <div class="trust-detail">${t.warnings.map(w => w.msg).join('<br>')}</div>
    </div>`;
  });
  if (!cardsHtml) cardsHtml = '<div class="trust-card trust-ok"><div class="trust-title">全部健康</div><div class="trust-detail">所有 Search Campaign 数据可信度良好，无需额外关注。</div></div>';
  U.html('trust-gate-cards', cardsHtml);

  let detailHtml = '';
  trustResults.forEach(t => {
    const c = SEARCH_CAMPS.find(x => x.name === t.name);
    if (!c) return;
    const iosTotal = c.newIOS + c.newAndroid;
    const iosRatio = iosTotal > 0 ? c.newIOS / iosTotal * 100 : 0;
    const estWaste = t.iosGap ? t.iosGap.estWaste : 0;
    const statusCls = t.bidStatus === 'Learning' ? 'badge-info' : t.bidStatus === 'Limited by budget' ? 'badge-warn' : 'badge-good';
    detailHtml += `<tr>
      <td class="bold">${U.campShortName(c.name)}</td>
      <td>${U.badge(c.type, c.type === 'Search' ? 'search' : 'display')}</td>
      <td>${U.badge(c.bidding, 'neutral')}</td>
      <td class="num">${U.fmtK(Math.round(c.spend))}</td>
      <td>${U.badge(t.bidStatus, statusCls.replace('badge-', ''))}</td>
      <td class="num">${c.newPayUsers}</td>
      <td class="num ${U.colorClass(iosRatio, 80, 50)}">${U.fmtPct(iosRatio, 0)}</td>
      <td class="num clr-bad">${estWaste > 0 ? U.fmtK(Math.round(estWaste)) + ' HKD' : '--'}</td>
      <td>${t.warnings.length > 0 ? t.warnings.map(w => `<span class="badge badge-${w.type === 'ios_gap' ? 'bad' : w.type === 'budget_limited' ? 'warn' : 'info'}">${w.type === 'learning' ? '学习期' : w.type === 'budget_limited' ? '预算受限' : 'iOS折损'}</span>`).join(' ') : '<span class="muted">--</span>'}</td>
    </tr>`;
  });
  U.html('trust-detail-tbody', detailHtml);
}

// ═══════════════════════════════════════
// SOP 1a: 预算监控 — 每日花费 vs 日预算
// ═══════════════════════════════════════
function renderBudgetMonitor() {
  const budgetMap = (typeof ADW_BUDGET_MAP !== 'undefined') ? ADW_BUDGET_MAP : {};
  const rows = [];
  let alertCount = 0;

  SEARCH_CAMPS.forEach(c => {
    const budget = budgetMap[c.name];
    if (!budget || budget <= 0) return;
    const daily = (CAMP_DAILY_MAP[c.name] || []).filter(r => rowInDateRange(r, DATE_RANGE.start, DATE_RANGE.end));
    if (!daily.length) return;

    const totalCost = daily.reduce((s, r) => s + (r.cost || 0), 0);
    const avgDaily = totalCost / daily.length;
    const util = avgDaily / budget * 100;

    const sorted = [...daily].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];
    const latestUtil = latest ? (latest.cost || 0) / budget * 100 : 0;

    const last7 = sorted.slice(0, 7).reverse();
    const sparkData = last7.map(d => Math.round((d.cost || 0) / budget * 100));

    let status = 'normal', advice = '--';
    if (util < 70) {
      status = 'low'; alertCount++;
      advice = '花费偏低，考虑提高出价或拓宽匹配类型以增加流量';
    } else if (util > 120) {
      status = 'high'; alertCount++;
      advice = '超预算，检查是否有异常点击或考虑降低出价';
    } else if (util > 95) {
      status = 'capped';
      advice = '接近预算上限，CPA 数据可能虚高';
    }

    rows.push({ name: c.name, budget, avgDaily, util, latestCost: latest ? latest.cost : 0, latestUtil, sparkData, status, advice });
  });

  const badge = document.getElementById('nav-budget-count');
  if (badge) badge.textContent = alertCount > 0 ? alertCount : '';

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalAvg = rows.reduce((s, r) => s + r.avgDaily, 0);
  const overallUtil = totalBudget > 0 ? totalAvg / totalBudget * 100 : 0;
  const lowCount = rows.filter(r => r.status === 'low').length;
  const highCount = rows.filter(r => r.status === 'high').length;

  U.html('budget-kpis', `
    <div class="kpi-card"><div class="kpi-label">监控 Campaign</div><div class="kpi-value">${rows.length}</div><div class="kpi-sub">有预算数据</div></div>
    <div class="kpi-card"><div class="kpi-label">整体利用率</div><div class="kpi-value ${overallUtil < 70 || overallUtil > 120 ? 'clr-bad' : overallUtil > 95 ? 'clr-warn' : 'clr-good'}">${U.fmtPct(overallUtil, 0)}</div><div class="kpi-sub">日均花费 / 日预算</div></div>
    <div class="kpi-card"><div class="kpi-label">花费偏低 (<70%)</div><div class="kpi-value clr-${lowCount > 0 ? 'warn' : 'good'}">${lowCount}</div><div class="kpi-sub">需考虑提高出价</div></div>
    <div class="kpi-card"><div class="kpi-label">超预算 (>120%)</div><div class="kpi-value clr-${highCount > 0 ? 'bad' : 'good'}">${highCount}</div><div class="kpi-sub">需考虑降低出价</div></div>
    <div class="kpi-card"><div class="kpi-label">告警总数</div><div class="kpi-value clr-${alertCount > 0 ? 'bad' : 'good'}">${alertCount}</div></div>
  `);

  function sparkline(data) {
    if (!data.length) return '--';
    const max = Math.max(...data, 1);
    return '<span style="display:inline-flex;align-items:flex-end;gap:1px;height:20px;">' +
      data.map(v => {
        const h = Math.max(2, Math.round(v / max * 18));
        const clr = v < 70 ? 'var(--orange)' : v > 120 ? 'var(--red)' : 'var(--green)';
        return `<span style="width:4px;height:${h}px;background:${clr};border-radius:1px;" title="${v}%"></span>`;
      }).join('') + '</span>';
  }

  const statusLabel = { low: '花费偏低', high: '超预算', capped: '接近上限', normal: '正常' };
  const statusCls = { low: 'clr-warn', high: 'clr-bad', capped: 'clr-warn', normal: 'clr-good' };

  let html = '';
  rows.sort((a, b) => {
    const order = { high: 0, low: 1, capped: 2, normal: 3 };
    return (order[a.status] || 9) - (order[b.status] || 9) || b.avgDaily - a.avgDaily;
  }).forEach(r => {
    const highlight = r.status === 'low' || r.status === 'high' ? ' style="background:var(--red-bg,rgba(239,68,68,0.06))"' : '';
    html += `<tr${highlight}>
      <td class="bold">${U.campShortName(r.name)}</td>
      <td class="num">${U.fmtK(Math.round(r.budget))}</td>
      <td class="num">${U.fmtK(Math.round(r.avgDaily))}</td>
      <td class="num bold ${statusCls[r.status]}">${U.fmtPct(r.util, 0)}</td>
      <td><span class="${statusCls[r.status]}">${statusLabel[r.status]}</span></td>
      <td class="num">${U.fmtK(Math.round(r.latestCost))}</td>
      <td class="num ${r.latestUtil < 70 || r.latestUtil > 120 ? 'clr-bad' : ''}">${U.fmtPct(r.latestUtil, 0)}</td>
      <td>${sparkline(r.sparkData)}</td>
      <td class="muted" style="font-size:11px;max-width:200px;white-space:normal;">${r.advice}</td>
    </tr>`;
  });
  U.html('budget-tbody', html);
}

// ═══════════════════════════════════════
// SOP 2a: CPA 日环比波动监控
// ═══════════════════════════════════════
function renderCPAMonitor() {
  const alerts = [];
  const allDayRows = [];

  SEARCH_CAMPS.forEach(c => {
    const daily = (CAMP_DAILY_MAP[c.name] || []).filter(r => rowInDateRange(r, DATE_RANGE.start, DATE_RANGE.end));
    if (daily.length < 2) return;

    const byDate = {};
    daily.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { cost: 0, conv: 0, clicks: 0, impressions: 0 };
      byDate[r.date].cost += r.cost || 0;
      byDate[r.date].conv += r.conversions || 0;
      byDate[r.date].clicks += r.clicks || 0;
      byDate[r.date].impressions += r.impressions || 0;
    });

    const dates = Object.keys(byDate).sort();
    for (let i = 1; i < dates.length; i++) {
      const prev = byDate[dates[i - 1]];
      const curr = byDate[dates[i]];
      const prevCPA = prev.conv > 0 ? prev.cost / prev.conv : null;
      const currCPA = curr.conv > 0 ? curr.cost / curr.conv : null;
      if (prevCPA === null || currCPA === null) continue;

      const delta = (currCPA - prevCPA) / prevCPA * 100;
      const prevCTR = prev.impressions > 0 ? prev.clicks / prev.impressions * 100 : 0;
      const currCTR = curr.impressions > 0 ? curr.clicks / curr.impressions * 100 : 0;
      const prevCPC = prev.clicks > 0 ? prev.cost / prev.clicks : 0;
      const currCPC = curr.clicks > 0 ? curr.cost / curr.clicks : 0;
      const prevCVR = prev.clicks > 0 ? prev.conv / prev.clicks * 100 : 0;
      const currCVR = curr.clicks > 0 ? curr.conv / curr.clicks * 100 : 0;

      let attribution = [];
      if (currCTR > 0 && prevCTR > 0) {
        const ctrDelta = (currCTR - prevCTR) / prevCTR * 100;
        if (Math.abs(ctrDelta) > 20) attribution.push(`CTR ${ctrDelta > 0 ? '↑' : '↓'}${Math.abs(ctrDelta).toFixed(0)}%`);
      }
      if (currCPC > 0 && prevCPC > 0) {
        const cpcDelta = (currCPC - prevCPC) / prevCPC * 100;
        if (Math.abs(cpcDelta) > 15) attribution.push(`CPC ${cpcDelta > 0 ? '↑' : '↓'}${Math.abs(cpcDelta).toFixed(0)}%`);
      }
      if (currCVR > 0 && prevCVR > 0) {
        const cvrDelta = (currCVR - prevCVR) / prevCVR * 100;
        if (Math.abs(cvrDelta) > 20) attribution.push(`CVR ${cvrDelta > 0 ? '↑' : '↓'}${Math.abs(cvrDelta).toFixed(0)}%`);
      }

      const isAlert = Math.abs(delta) > 30;
      if (isAlert) {
        alerts.push({
          campaign: c.name, date: dates[i], prevDate: dates[i - 1],
          currCPA, prevCPA, delta, attribution,
          cost: curr.cost, conv: curr.conv
        });
      }

      allDayRows.push({
        campaign: c.name, date: dates[i],
        cost: curr.cost, conv: curr.conv, currCPA, prevCPA, delta,
        currCTR, currCPC, currCVR, attribution, isAlert
      });
    }
  });

  const badge = document.getElementById('nav-cpa-count');
  if (badge) badge.textContent = alerts.length > 0 ? alerts.length : '';

  const critAlerts = alerts.filter(a => a.delta > 30);
  const goodAlerts = alerts.filter(a => a.delta < -30);

  U.html('cpa-kpis', `
    <div class="kpi-card"><div class="kpi-label">分析天数对</div><div class="kpi-value">${allDayRows.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">CPA 飙升告警</div><div class="kpi-value clr-${critAlerts.length > 0 ? 'bad' : 'good'}">${critAlerts.length}</div><div class="kpi-sub">环比 >+30%</div></div>
    <div class="kpi-card"><div class="kpi-label">CPA 骤降</div><div class="kpi-value clr-${goodAlerts.length > 0 ? 'good' : ''}">${goodAlerts.length}</div><div class="kpi-sub">环比 <-30%</div></div>
    <div class="kpi-card"><div class="kpi-label">总告警</div><div class="kpi-value clr-${alerts.length > 0 ? 'bad' : 'good'}">${alerts.length}</div></div>
  `);

  let alertHtml = '';
  alerts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 20).forEach(a => {
    const isUp = a.delta > 0;
    const sev = Math.abs(a.delta) > 50 ? 'critical' : 'warning';
    alertHtml += `<div class="anomaly-card anomaly-${sev}" style="margin-bottom:10px;padding:14px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span class="badge badge-${isUp ? 'bad' : 'good'}">${isUp ? 'CPA飙升' : 'CPA骤降'} ${a.delta > 0 ? '+' : ''}${a.delta.toFixed(0)}%</span>
          <strong style="margin-left:8px;">${U.campShortName(a.campaign)}</strong>
          <span class="muted" style="margin-left:8px;">${a.prevDate} → ${a.date}</span>
        </div>
        <div class="muted">CPA: ${U.fmt(a.prevCPA)} → ${U.fmt(a.currCPA)}</div>
      </div>
      ${a.attribution.length ? `<div style="margin-top:6px;font-size:12px;color:var(--text2);">异常归因: <strong>${a.attribution.join('、')}</strong></div>` : ''}
      ${isUp ? `<div style="margin-top:4px;font-size:12px;color:var(--text3);">建议: 从 Campaign→广告组→关键词维度排查${a.attribution.map(x => x.split(' ')[0]).join('/')}异常源</div>` : ''}
    </div>`;
  });
  U.html('cpa-alert-list', alertHtml);

  const recentRows = allDayRows.sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 200);
  let html = '';
  recentRows.forEach(r => {
    const highlight = r.isAlert ? ' style="background:var(--red-bg,rgba(239,68,68,0.06))"' : '';
    const deltaStr = r.delta > 0 ? `+${r.delta.toFixed(1)}%` : `${r.delta.toFixed(1)}%`;
    const deltaCls = Math.abs(r.delta) > 30 ? (r.delta > 0 ? 'clr-bad' : 'clr-good') : '';
    html += `<tr${highlight}>
      <td class="bold">${U.campShortName(r.campaign)}</td>
      <td>${r.date}</td>
      <td class="num">${U.fmtK(Math.round(r.cost))}</td>
      <td class="num">${U.fmt(r.conv, 0)}</td>
      <td class="num bold">${U.fmt(r.currCPA)}</td>
      <td class="num">${U.fmt(r.prevCPA)}</td>
      <td class="num bold ${deltaCls}">${deltaStr}</td>
      <td class="num">${U.fmtPct(r.currCTR)}</td>
      <td class="num">${U.fmt(r.currCPC)}</td>
      <td class="num">${U.fmtPct(r.currCVR)}</td>
      <td class="muted" style="font-size:11px;">${r.attribution.join('、') || '--'}</td>
    </tr>`;
  });
  U.html('cpa-tbody', html);
}

// ═══════════════════════════════════════
// SOP 1b: 时段花费分布（热力图）
// ═══════════════════════════════════════
const RAW_HOURLY_BY_CAMP = {};
(function autoRegisterHourly() {
  if (typeof ADW_HOURLY_REGISTRY !== 'undefined' && Array.isArray(ADW_HOURLY_REGISTRY)) {
    ADW_HOURLY_REGISTRY.forEach(arr => {
      if (!Array.isArray(arr) || !arr[0] || !arr[0].campaign) return;
      RAW_HOURLY_BY_CAMP[arr[0].campaign] = arr;
    });
  }
})();

function renderHourlySpend() {
  const campFilter = (U.el('hourly-camp-select') || {}).value || 'all';
  const dateMode = (U.el('hourly-date-select') || {}).value || 'latest';

  const campSelect = U.el('hourly-camp-select');
  if (campSelect && campSelect.options.length <= 1) {
    Object.keys(RAW_HOURLY_BY_CAMP).forEach(cn => {
      const opt = document.createElement('option');
      opt.value = cn; opt.textContent = U.campShortName(cn);
      campSelect.appendChild(opt);
    });
  }

  const allDates = new Set();
  Object.values(RAW_HOURLY_BY_CAMP).forEach(rows => rows.forEach(r => { if (rowInDateRange(r, DATE_RANGE.start, DATE_RANGE.end)) allDates.add(r.date); }));
  const sortedDates = [...allDates].sort();
  if (!sortedDates.length) {
    U.html('hourly-kpis', '<div class="kpi-card"><div class="kpi-label">暂无小时级数据</div><div class="kpi-value">--</div><div class="kpi-sub">需运行 fetch_adw_data.py 拉取</div></div>');
    U.html('hourly-heatmap', '<div class="muted" style="padding:20px;">暂无小时级数据。请运行 <code>fetch_adw_data.py</code> 后刷新。</div>');
    U.html('hourly-tbody', '');
    return;
  }

  let targetDates;
  if (dateMode === 'latest') targetDates = [sortedDates[sortedDates.length - 1]];
  else if (dateMode === '3d') targetDates = sortedDates.slice(-3);
  else targetDates = sortedDates.slice(-7);

  const campResults = [];
  let alertList = [];

  const campNames = campFilter === 'all' ? Object.keys(RAW_HOURLY_BY_CAMP) : [campFilter];
  campNames.forEach(camp => {
    const rows = (RAW_HOURLY_BY_CAMP[camp] || []).filter(r => targetDates.includes(r.date));
    if (!rows.length) return;

    const hourCost = new Array(24).fill(0);
    const hourCount = new Array(24).fill(0);
    rows.forEach(r => {
      hourCost[r.hour] += r.cost || 0;
      hourCount[r.hour]++;
    });
    const divisor = targetDates.length || 1;
    const hourAvg = hourCost.map(c => c / divisor);
    const totalCost = hourAvg.reduce((s, v) => s + v, 0);

    const topHours = hourAvg.map((v, i) => ({ h: i, cost: v })).sort((a, b) => b.cost - a.cost);
    let top3Cost = 0;
    for (let i = 0; i < Math.min(3, topHours.length); i++) top3Cost += topHours[i].cost;
    const concentration = totalCost > 0 ? top3Cost / totalCost * 100 : 0;

    const isConcentrated = concentration > 60;
    if (isConcentrated) {
      const peakHours = topHours.slice(0, 3).map(t => t.h + 'h').join(', ');
      alertList.push({ camp, concentration, peakHours, totalCost });
    }

    campResults.push({ camp, hourAvg, totalCost, concentration, isConcentrated });
  });

  const totalCamps = campResults.length;
  const concentratedCount = campResults.filter(r => r.isConcentrated).length;

  U.html('hourly-kpis', `
    <div class="kpi-card"><div class="kpi-label">分析 Campaign</div><div class="kpi-value">${totalCamps}</div><div class="kpi-sub">${targetDates.length === 1 ? targetDates[0] : targetDates[0] + ' ~ ' + targetDates[targetDates.length - 1]}</div></div>
    <div class="kpi-card"><div class="kpi-label">花费集中异常</div><div class="kpi-value clr-${concentratedCount > 0 ? 'bad' : 'good'}">${concentratedCount}</div><div class="kpi-sub">Top3小时占比 >60%</div></div>
    <div class="kpi-card"><div class="kpi-label">可用日期</div><div class="kpi-value">${sortedDates.length}</div><div class="kpi-sub">${sortedDates[0]} ~ ${sortedDates[sortedDates.length - 1]}</div></div>
    <div class="kpi-card"><div class="kpi-label">展示模式</div><div class="kpi-value" style="font-size:16px;">${dateMode === 'latest' ? '单日' : dateMode === '3d' ? '3天均值' : '7天均值'}</div></div>
  `);

  let alertHtml = '';
  alertList.forEach(a => {
    alertHtml += `<div class="anomaly-card anomaly-warning" style="margin-bottom:8px;padding:12px 16px;">
      <span class="badge badge-bad">花费集中</span>
      <strong style="margin-left:8px;">${U.campShortName(a.camp)}</strong>
      <span class="muted" style="margin-left:8px;">Top3 小时（${a.peakHours}）占总花费 ${a.concentration.toFixed(0)}%</span>
      <span class="muted" style="margin-left:8px;">— 预算可能在几小时内耗尽，导致剩余时段无展示</span>
    </div>`;
  });
  U.html('hourly-alert-list', alertHtml);

  let globalMax = 0;
  campResults.forEach(r => r.hourAvg.forEach(v => { if (v > globalMax) globalMax = v; }));

  let heatHtml = '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr><th style="text-align:left;padding:6px 8px;min-width:180px;">Campaign</th>';
  for (let h = 0; h < 24; h++) heatHtml += `<th style="padding:4px;text-align:center;width:3.5%;">${h}</th>`;
  heatHtml += '<th style="padding:4px;text-align:center;">集中度</th></tr></thead><tbody>';

  campResults.sort((a, b) => b.totalCost - a.totalCost).forEach(r => {
    heatHtml += `<tr><td style="padding:6px 8px;font-weight:600;white-space:nowrap;">${U.campShortName(r.camp)}</td>`;
    r.hourAvg.forEach(v => {
      const intensity = globalMax > 0 ? v / globalMax : 0;
      const bg = intensity > 0.7 ? `rgba(239,68,68,${0.2 + intensity * 0.6})` :
                 intensity > 0.3 ? `rgba(245,158,11,${0.1 + intensity * 0.5})` :
                 intensity > 0.05 ? `rgba(34,197,94,${0.05 + intensity * 0.3})` : 'transparent';
      heatHtml += `<td style="padding:3px;text-align:center;background:${bg};border-radius:2px;" title="${U.fmt(v)} HKD">${v > 1 ? Math.round(v) : ''}</td>`;
    });
    const concCls = r.isConcentrated ? 'clr-bad bold' : '';
    heatHtml += `<td class="num ${concCls}" style="padding:4px;">${r.concentration.toFixed(0)}%</td></tr>`;
  });
  heatHtml += '</tbody></table>';
  U.html('hourly-heatmap', heatHtml);

  let tblHtml = '';
  campResults.sort((a, b) => b.totalCost - a.totalCost).forEach(r => {
    tblHtml += `<tr><td class="bold">${U.campShortName(r.camp)}</td><td>${targetDates.join(', ')}</td>`;
    r.hourAvg.forEach(v => { tblHtml += `<td class="num">${v > 0 ? Math.round(v) : ''}</td>`; });
    tblHtml += `<td class="num ${r.isConcentrated ? 'clr-bad bold' : ''}">${r.concentration.toFixed(0)}%</td></tr>`;
  });
  U.html('hourly-tbody', tblHtml);
}

// ═══════════════════════════════════════
// MODULE 1: Campaign 总览
// ═══════════════════════════════════════
function renderCampaignOverview() {
  const camps = SEARCH_CAMPS.sort((a, b) => b.spend - a.spend);
  const totalSpend = camps.reduce((s, c) => s + c.spend, 0);
  const totalRev = camps.reduce((s, c) => s + c.totalRevenue, 0);
  const totalNewPay = camps.reduce((s, c) => s + c.newPayUsers, 0);
  const totalIOS = camps.reduce((s, c) => s + c.newIOS, 0);
  const totalAndroid = camps.reduce((s, c) => s + c.newAndroid, 0);
  const avgRoas = totalSpend > 0 ? totalRev / totalSpend : 0;
  const avgCPA = totalNewPay > 0 ? totalSpend / totalNewPay : 0;

  U.html('campaign-kpis', `
    <div class="kpi-card"><div class="kpi-label">Search 总花费 (HKD)</div><div class="kpi-value">${U.fmtK(Math.round(totalSpend))}</div><div class="kpi-sub">${camps.length} 个 Search 系列</div></div>
    <div class="kpi-card"><div class="kpi-label">总收入 (HKD)</div><div class="kpi-value">${U.fmtK(Math.round(totalRev))}</div><div class="kpi-sub">含新+老用户</div></div>
    <div class="kpi-card"><div class="kpi-label">综合 ROAS</div><div class="kpi-value ${U.colorClass(avgRoas, 1, 0.5)}">${U.fmt(avgRoas)}</div><div class="kpi-sub">${avgRoas >= 1 ? '已回本' : '整体亏损'}</div></div>
    <div class="kpi-card"><div class="kpi-label">综合 CPA (HKD)</div><div class="kpi-value">${U.fmt(avgCPA)}</div><div class="kpi-sub">新付费用户 ${totalNewPay} 人</div></div>
    <div class="kpi-card"><div class="kpi-label">iOS 用户占比</div><div class="kpi-value ${U.colorClass(U.pct(totalIOS, totalIOS + totalAndroid), 70, 50)}">${U.fmtPct(U.pct(totalIOS, totalIOS + totalAndroid), 0)}</div><div class="kpi-sub">iOS ${U.fmtK(totalIOS)} / Android ${U.fmtK(totalAndroid)}</div></div>
  `);

  let html = '';
  camps.forEach(c => {
    const kws = KW_MAP[c.name] || [];
    const totalImp = kws.reduce((s, k) => s + (k.impressions || 0), 0);
    const totalClicks = kws.reduce((s, k) => s + (k.clicks || 0), 0);
    const ctr = totalImp > 0 ? U.pct(totalClicks, totalImp) : null;
    const cpc = totalClicks > 0 ? c.spend / totalClicks : null;
    const cvr = totalClicks > 0 ? U.pct(c.newPayUsers, totalClicks) : null;
    const iosR = (c.newIOS + c.newAndroid) > 0 ? U.pct(c.newIOS, c.newIOS + c.newAndroid) : 0;
    const kwType = U.getKeywordType(c.name);
    const kwBadge = kwType === '品牌词' ? 'brand' : kwType === '竞品词' ? 'comp' : 'func';

    let tags = '';
    if (c.roas >= 1.5) tags += U.badge('优质', 'good') + ' ';
    else if (c.roas < 0.5) tags += U.badge('严重亏损', 'bad') + ' ';
    else if (c.roas < 1) tags += U.badge('未回本', 'warn') + ' ';
    if (iosR < 50 && c.newAndroid > 0) tags += U.badge('iOS折损', 'bad') + ' ';

    html += `<tr>
      <td class="bold" title="${c.name}">${U.campShortName(c.name)}</td>
      <td>${c.product}</td>
      <td>${c.country}</td>
      <td>${U.badge(kwType, kwBadge)}</td>
      <td class="num bold">${U.fmtK(Math.round(c.spend))}</td>
      <td class="num">${U.fmtK(Math.round(c.totalRevenue))}</td>
      <td class="num bold ${U.colorClass(c.roas, 1, 0.5)}">${U.fmt(c.roas)}</td>
      <td class="num">${U.fmt(c.newCPA)}</td>
      <td class="num">${totalImp > 0 ? U.fmtK(totalImp) : '--'}</td>
      <td class="num">${totalClicks > 0 ? U.fmtK(totalClicks) : '--'}</td>
      <td class="num">${ctr != null ? U.fmtPct(ctr) : '--'}</td>
      <td class="num">${cpc != null ? U.fmt(cpc) : '--'}</td>
      <td class="num">${cvr != null ? U.fmtPct(cvr, 2) : '--'}</td>
      <td class="num ${U.colorClass(iosR, 80, 50)}">${U.fmtPct(iosR, 0)}</td>
      <td class="num">${c.newPayUsers}</td>
      <td>${tags || '<span class="muted">--</span>'}</td>
    </tr>`;
  });
  U.html('campaign-tbody', html);
}

// ═══════════════════════════════════════
// MODULE 2-3: 三层下钻
// ═══════════════════════════════════════
function renderDrillDown() {
  const camps = SEARCH_CAMPS.sort((a, b) => b.spend - a.spend);
  let html = '';

  camps.forEach((c, ci) => {
    const cid = 'c' + ci;
    const kws = KW_MAP[c.name] || [];
    const sts = ST_MAP[c.name] || [];
    const devs = DEV_MAP[c.name] || [];
    const hasChildren = kws.length > 0;

    const totalImp = kws.reduce((s, k) => s + (k.impressions || 0), 0);
    const totalClicks = kws.reduce((s, k) => s + (k.clicks || 0), 0);
    const totalConv = kws.reduce((s, k) => s + (k.purchaseNew || 0), 0);
    const ctr = totalImp > 0 ? U.pct(totalClicks, totalImp) : null;
    const cpc = totalClicks > 0 ? c.spend / totalClicks : null;
    const iosR = (c.newIOS + c.newAndroid) > 0 ? U.pct(c.newIOS, c.newIOS + c.newAndroid) : 0;

    let tags = '';
    if (c.roas >= 1.5) tags += U.badge('优质', 'good') + ' ';
    else if (c.roas < 0.5) tags += U.badge('严重亏损', 'bad') + ' ';
    else if (c.roas < 1) tags += U.badge('未回本', 'warn') + ' ';

    const mobile = devs.find(d => d.device === '手机');
    const desktop = devs.find(d => d.device === '计算机');
    const devTotal = (mobile?.cost || 0) + (desktop?.cost || 0);
    const mobilePct = devTotal > 0 ? (mobile?.cost || 0) / devTotal * 100 : null;

    // ─── L1: Campaign ───
    html += `<tr class="row-L1" data-id="${cid}" onclick="toggleRow('${cid}')">
      <td class="bold">${hasChildren ? '<span class="arrow">▶</span>' : '<span class="arrow" style="opacity:.2">▶</span>'}${U.campShortName(c.name)}</td>
      <td>${U.badge(c.type, c.type === 'Search' ? 'search' : 'display')} ${U.badge(c.bidding, 'neutral')}</td>
      <td><span class="muted">${U.getKeywordType(c.name)}</span></td>
      <td class="num bold" title="${c._noCampDailySlice ? '该系列无日维度花费包（无 ADW_CAMP_*），Spend/Conv 为导入包汇总，不随分析日期变化' : ''}">${U.fmtK(Math.round(c.spend))}${c._noCampDailySlice ? ' <span class="muted" style="font-size:10px;font-weight:400;">汇总</span>' : ''}</td>
      <td class="num">${c.newPayUsers}</td>
      <td class="num">${U.fmt(c.newCPA)}</td>
      <td class="num bold ${U.colorClass(c.roas, 1, 0.5)}">${U.fmt(c.roas)}</td>
      <td class="num">${totalImp > 0 ? U.fmtK(totalImp) : '--'}</td>
      <td class="num">${totalClicks > 0 ? U.fmtK(totalClicks) : '--'}</td>
      <td class="num">${ctr != null ? U.fmtPct(ctr) : '--'}</td>
      <td class="num">${cpc != null ? U.fmt(cpc) : '--'}</td>
      <td style="font-size:11px">
        <span class="muted ${U.colorClass(iosR, 80, 50)}">iOS ${U.fmtPct(iosR, 0)}</span>
        ${mobilePct != null ? '<br><span class="muted">📱' + U.fmtPct(mobilePct, 0) + '</span>' : ''}
      </td>
      <td class="muted">${kws.length > 0 ? kws.length + ' 词' : '--'}</td>
      <td>${tags || '<span class="muted">--</span>'}</td>
    </tr>`;

    // ─── Campaign change summary (child of L1) ───
    {
      const campChanges = getChangesForCampaign(c.name, 5);
      if (campChanges.length > 0) {
        html += `<tr class="row-L2 child-${cid}">
          <td colspan="14" style="padding:8px 16px 8px 32px;background:#fafaff;">
            ${renderChangesSummary(campChanges, '最近变更')}
          </td>
        </tr>`;
      }
    }

    // ─── L2: Ad Groups ───
    if (kws.length) {
      const agMap = {};
      kws.forEach(kw => {
        const ag = kw.adGroup || '默认广告组';
        if (!agMap[ag]) agMap[ag] = { name: ag, spend: 0, clicks: 0, conv: 0, imp: 0, qsW: 0, qsWt: 0, broadSpend: 0, totalSpend: 0, keywords: [] };
        agMap[ag].spend += kw.cost || 0;
        agMap[ag].clicks += kw.clicks || 0;
        agMap[ag].conv += kw.purchaseNew || 0;
        agMap[ag].imp += kw.impressions || 0;
        if (U.parseMatchType(kw.matchType) === 'Broad') agMap[ag].broadSpend += kw.cost || 0;
        agMap[ag].totalSpend += kw.cost || 0;
        if (kw.qualityScore && kw.qualityScore !== '') {
          agMap[ag].qsW += parseInt(kw.qualityScore) * (kw.cost || 1);
          agMap[ag].qsWt += (kw.cost || 1);
        }
        agMap[ag].keywords.push(kw);
      });

      const groups = Object.values(agMap).sort((a, b) => b.spend - a.spend);

      groups.forEach((ag, ai) => {
        const agid = cid + '-ag' + ai;
        const agCtr = ag.imp > 0 ? U.pct(ag.clicks, ag.imp) : null;
        const agCpc = ag.clicks > 0 ? ag.spend / ag.clicks : null;
        const agCPA = ag.conv > 0 ? ag.spend / ag.conv : null;
        const agQs = ag.qsWt > 0 ? ag.qsW / ag.qsWt : null;
        const spPct = U.pct(ag.spend, c.spend);
        const broadPct = ag.totalSpend > 0 ? ag.broadSpend / ag.totalSpend * 100 : 0;

        let agTags = '';
        if (broadPct > 70 && agCPA && c.newCPA && agCPA > c.newCPA * 1.3) agTags += U.badge('Broad失控', 'bad') + ' ';
        if (agQs !== null && agQs < 5) agTags += U.badge('QS偏低', 'warn') + ' ';

        html += `<tr class="row-L2 child-${cid}" data-id="${agid}" onclick="toggleRow('${agid}');event.stopPropagation()">
          <td><span class="arrow">▶</span>${ag.name}</td>
          <td>${U.badge('Ad Group', 'info')}</td>
          <td><span class="muted">占 ${U.fmtPct(spPct, 0)}</span><span class="pbar"><span class="pbar-fill" style="width:${Math.min(spPct, 100)}%;background:var(--accent)"></span></span></td>
          <td class="num">${U.fmtK(Math.round(ag.spend))}</td>
          <td class="num">${ag.conv > 0 ? U.fmt(ag.conv, 0) : '0'}</td>
          <td class="num">${agCPA ? U.fmt(agCPA) : '--'}</td>
          <td class="num muted">--</td>
          <td class="num">${U.fmtK(ag.imp)}</td>
          <td class="num">${U.fmtK(ag.clicks)}</td>
          <td class="num">${agCtr != null ? U.fmtPct(agCtr) : '--'}</td>
          <td class="num">${agCpc != null ? U.fmt(agCpc) : '--'}</td>
          <td style="font-size:11px">
            <span class="bold ${agQs && agQs >= 7 ? 'clr-good' : agQs && agQs < 5 ? 'clr-bad' : ''}" data-tip="加权平均 QS">QS ${agQs ? U.fmt(agQs, 1) : '--'}</span>
            <br><span class="muted">Broad ${U.fmtPct(broadPct, 0)}</span>
          </td>
          <td class="muted">${ag.keywords.length} 词</td>
          <td>${agTags || ''}</td>
        </tr>`;

        // ─── Ad Group change summary ───
        {
          const agChanges = getChangesForAdGroup(c.name, ag.name, 3);
          if (agChanges.length > 0) {
            html += `<tr class="row-L3 child-${agid}">
              <td colspan="14" style="padding:6px 16px 6px 48px;background:#fefff8;">
                ${renderChangesSummary(agChanges, ag.name + ' 最近变更')}
              </td>
            </tr>`;
          }
        }

        // ─── Ad Copy Diagnostic Card (fully data-driven) ───
        {
          const kwsWithDim = ag.keywords.filter(k => k.adRelevance || k.landingPageExp || k.expectedCTR);
          const kwsWithQS = ag.keywords.filter(k => k.qualityScore && k.qualityScore !== '');

          // Real QS dimension counts from ADW
          const dimCount = (field, label) => {
            const above = ag.keywords.filter(k => k[field] && k[field].includes('高于')).length;
            const avg = ag.keywords.filter(k => k[field] && !k[field].includes('高于') && !k[field].includes('低于')).length;
            const below = ag.keywords.filter(k => k[field] && k[field].includes('低于')).length;
            return { label, above, avg, below, total: above + avg + below };
          };
          const relDim = dimCount('adRelevance', 'Ad Relevance');
          const lpDim = dimCount('landingPageExp', 'LP Experience');
          const ctrDim = dimCount('expectedCTR', 'Expected CTR');

          const hasDimData = relDim.total > 0 || lpDim.total > 0 || ctrDim.total > 0;

          // Build left panel: real QS dimensions
          const dimBar = (d) => {
            if (d.total === 0) return `<div style="font-size:11px;color:var(--text3);">${d.label}：${ADW_MISSING_TEXT}</div>`;
            const abovePct = (d.above / d.total * 100).toFixed(0);
            const avgPct = (d.avg / d.total * 100).toFixed(0);
            const belowPct = (d.below / d.total * 100).toFixed(0);
            return `<div style="margin-bottom:8px;">
              <div style="font-size:11px;font-weight:600;margin-bottom:3px;">${d.label}</div>
              <div style="display:flex;height:16px;border-radius:4px;overflow:hidden;font-size:10px;line-height:16px;text-align:center;">
                ${d.above > 0 ? `<div style="flex:${d.above};background:var(--green);color:#fff;">高于 ${d.above}</div>` : ''}
                ${d.avg > 0 ? `<div style="flex:${d.avg};background:var(--orange);color:#fff;">平均 ${d.avg}</div>` : ''}
                ${d.below > 0 ? `<div style="flex:${d.below};background:var(--red);color:#fff;">低于 ${d.below}</div>` : ''}
              </div>
            </div>`;
          };

          let leftPanelContent = '';
          if (hasDimData) {
            leftPanelContent = `
              <div class="diag-strength-label">📊 QS 三维分布（ADW 真实数据）</div>
              <div style="margin-top:4px;">${agQs !== null ? `<div style="font-size:11px;margin-bottom:8px;">加权平均 QS：<span class="bold ${agQs >= 7 ? 'clr-good' : agQs >= 5 ? 'clr-warn' : 'clr-bad'}" style="font-size:16px;">${U.fmt(agQs, 1)}</span> / 10 <span class="muted">(${kwsWithQS.length}/${ag.keywords.length} 词有 QS)</span></div>` : ''}
              ${dimBar(relDim)}
              ${dimBar(ctrDim)}
              ${dimBar(lpDim)}
              </div>
              <div style="margin-top:4px;font-size:10px;color:var(--text3);">数据来源：ADW Keyword Report → Quality Score 拆解</div>`;
          } else if (agQs !== null) {
            leftPanelContent = `
              <div class="diag-strength-label">📊 广告组加权平均 QS（ADW 真实数据）</div>
              <div class="diag-strength-val ${agQs >= 7 ? 'clr-good' : agQs >= 5 ? 'clr-warn' : 'clr-bad'}">${U.fmt(agQs, 1)} / 10</div>
              <div class="diag-msg">${kwsWithQS.length}/${ag.keywords.length} 个关键词有 QS 数据</div>
              <div style="margin-top:4px;font-size:10px;color:var(--text3);">QS 三维拆解（Ad Relevance / Expected CTR / LP Experience）未返回</div>`;
          } else {
            leftPanelContent = `
              <div class="diag-strength-label">📊 QS 数据</div>
              <div class="diag-strength-val clr-muted" style="font-size:14px;">${ADW_MISSING_TEXT}</div>
              <div class="diag-msg">该广告组关键词均无 QS 数据，无法评估文案匹配度</div>`;
          }

          // Right panel: asset performance
          const assets = ASSET_MAP[c.name] || [];
          const headlines = assets.filter(a => a.type === '标题').sort((a,b) => (b.purchaseConv||0) - (a.purchaseConv||0));
          const descs = assets.filter(a => a.type === '广告内容描述').sort((a,b) => (b.purchaseConv||0) - (a.purchaseConv||0));
          const hasAssetData = headlines.length > 0 || descs.length > 0;

          const topKws = [...ag.keywords].sort((x,y) => (y.cost||0) - (x.cost||0)).slice(0, 5);
          let coverageHtml = '';
          if (hasAssetData && topKws.length > 0) {
            const hlTexts = headlines.map(h => h.asset.toLowerCase()).join(' ');
            const covered = topKws.filter(k => hlTexts.includes(k.keyword.toLowerCase().split(' ').slice(0,2).join(' ')));
            const coverPct = topKws.length > 0 ? (covered.length / topKws.length * 100).toFixed(0) : 0;
            const coverCls = coverPct >= 60 ? 'clr-good' : coverPct >= 30 ? 'clr-warn' : 'clr-bad';
            coverageHtml = `<div style="margin-top:8px;font-size:11px;"><span style="font-weight:600;">文案覆盖率：</span><span class="${coverCls}" style="font-weight:700;">${coverPct}%</span> <span class="muted">(Top ${topKws.length} 关键词中 ${covered.length} 个在标题中有覆盖)</span></div>`;
          }

          let adCopyHtml = '';
          if (hasAssetData) {
            const renderAssetRow = (a, rank, type) => {
              const conv = U.fmt(a.purchaseConv || 0, 1);
              const val = U.fmtK(Math.round(a.purchaseValue || 0));
              const label = type === 'HL' ? '标题' : '描述';
              return `<div style="display:flex;align-items:baseline;gap:6px;padding:3px 0;font-size:12px;"><span style="color:var(--text3);min-width:18px;">${rank}.</span><span style="flex:1;word-break:break-all;">${a.asset}</span><span class="muted" style="white-space:nowrap;font-size:10px;">${label} · 转化${conv} · ¥${val}</span></div>`;
            };
            const bestHL = headlines.slice(0, 3);
            const bestDesc = descs.slice(0, 3);
            const worstHL = headlines.length > 3 ? headlines.slice(-3).reverse() : [];
            const worstDesc = descs.length > 3 ? descs.slice(-3).reverse() : [];

            let greenListHtml = '';
            bestHL.forEach((a, i) => greenListHtml += renderAssetRow(a, i+1, 'HL'));
            bestDesc.forEach((a, i) => greenListHtml += renderAssetRow(a, i+1, 'DESC'));

            let redListHtml = '';
            if (worstHL.length > 0 || worstDesc.length > 0) {
              worstHL.forEach((a, i) => redListHtml += renderAssetRow(a, i+1, 'HL'));
              worstDesc.forEach((a, i) => redListHtml += renderAssetRow(a, i+1, 'DESC'));
            }

            adCopyHtml = `<div class="diag-copy">
              <div class="diag-copy-label">🏆 资产表现红黑榜（ADW Asset Report 真实数据）</div>
              <div style="display:flex;gap:14px;">
                <div style="flex:1;background:var(--green-bg);border-radius:6px;padding:8px 10px;border:1px solid rgba(39,174,96,0.15);">
                  <div style="font-size:10px;color:var(--green);font-weight:700;margin-bottom:4px;">🟢 Top 转化资产</div>
                  ${greenListHtml}
                </div>
                ${redListHtml ? `<div style="flex:1;background:var(--red-bg);border-radius:6px;padding:8px 10px;border:1px solid rgba(231,76,60,0.15);">
                  <div style="font-size:10px;color:var(--red);font-weight:700;margin-bottom:4px;">⚫ 低效资产（考虑替换）</div>
                  ${redListHtml}
                </div>` : ''}
              </div>
              ${coverageHtml}
            </div>`;
          } else {
            adCopyHtml = `<div class="diag-copy">
              <div class="diag-copy-label">📝 文案资产数据</div>
              <div style="color:var(--text3);font-size:13px;padding:10px 0;">该 Campaign 暂无 Asset Report 数据</div>
              <div style="font-size:11px;color:var(--text3);">需在 ADW 后台导出该 Campaign 的「资产详情报告」并加入数据源。<br>当前仅左侧 QS 三维拆解可反映文案匹配度。</div>
            </div>`;
          }

          html += `<tr class="row-L3 child-${agid}">
            <td colspan="14" style="padding:12px 16px 12px 48px;white-space:normal;background:#fafaff;">
              <div class="ad-copy-diag">
                <div class="diag-strength">${leftPanelContent}</div>
                ${adCopyHtml}
              </div>
            </td>
          </tr>`;
        }

        // ─── L3: Keywords ───
        ag.keywords.sort((a, b) => (b.cost || 0) - (a.cost || 0)).slice(0, 20).forEach((kw, ki) => {
          const kwid = agid + '-kw' + ki;
          const kwCvr = kw.clicks > 0 ? U.pct(kw.purchaseNew || 0, kw.clicks) : null;
          const kwCpa = kw.purchaseNew > 0 ? (kw.cost || 0) / kw.purchaseNew : null;
          const kwRoas = (kw.purchaseNewValue && kw.cost) ? kw.purchaseNewValue / kw.cost : null;

          const qsVal = kw.qualityScore ? parseInt(kw.qualityScore) : null;
          const qsCls = qsVal >= 8 ? 'clr-good' : qsVal && qsVal <= 5 ? 'clr-bad' : '';
          const eCtr = U.shortQS(kw.expectedCTR);
          const aRel = U.shortQS(kw.adRelevance);
          const lpExp = U.shortQS(kw.landingPageExp);

          let kwTags = '';
          if ((kw.cost || 0) > 50 && (!kw.purchaseNew || kw.purchaseNew === 0)) kwTags += U.badge('建议否定', 'bad') + ' ';
          if (kw.purchaseNew >= 3 && kwCpa && c.newCPA && kwCpa < c.newCPA * 0.8 && kw.impressionShare === '< 10%') kwTags += U.badge('建议提价', 'good') + ' ';
          if (kw.landingPageExp && kw.landingPageExp.includes('低于')) kwTags += U.badge('优化LP', 'warn') + ' ';

          // Find matching search terms for this keyword
          const matchedSTs = sts.filter(st => {
            const kwLower = kw.keyword.toLowerCase();
            const stLower = st.term.toLowerCase();
            return stLower.includes(kwLower) || kwLower.includes(stLower) || (st.adGroup === kw.adGroup);
          }).sort((a, b) => (b.purchaseNew || 0) - (a.purchaseNew || 0)).slice(0, 10);
          const hasSTs = matchedSTs.length > 0;

          html += `<tr class="row-L3 child-${agid}" data-id="${kwid}" ${hasSTs ? `onclick="toggleRow('${kwid}');event.stopPropagation()" style="cursor:pointer"` : ''}>
            <td>
              ${hasSTs ? '<span class="arrow">▶</span>' : '<span style="display:inline-block;width:18px"></span>'}
              <span class="bold">${kw.keyword}</span>
              ${U.badge(U.parseMatchType(kw.matchType), 'neutral')}
            </td>
            <td><span class="muted">Keyword</span></td>
            <td></td>
            <td class="num">${U.fmtK(Math.round(kw.cost || 0))}</td>
            <td class="num">${U.fmt(kw.purchaseNew || 0, 1)}</td>
            <td class="num ${kwCpa && c.newCPA && kwCpa > c.newCPA * 1.3 ? 'clr-bad' : kwCpa ? 'clr-good' : 'clr-bad'}">${kwCpa ? U.fmt(kwCpa) : '<span class="clr-bad">0转化</span>'}</td>
            <td class="num">${kwRoas ? U.fmt(kwRoas) : '--'}</td>
            <td class="num">${U.fmtK(kw.impressions || 0)}</td>
            <td class="num">${U.fmtK(kw.clicks || 0)}</td>
            <td class="num">${kw.impressions ? U.fmtPct(U.pct(kw.clicks, kw.impressions)) : '--'}</td>
            <td class="num">${U.fmt(kw.cpc)}</td>
            <td style="font-size:10px;white-space:normal">
              <span class="bold ${qsCls}">QS ${kw.qualityScore || '—'}</span>
              <span class="${eCtr.cls}" data-tip="Expected CTR: ${qsFieldText(kw.expectedCTR)}">CTR${eCtr.text}</span>
              <span class="${aRel.cls}" data-tip="Ad Relevance: ${qsFieldText(kw.adRelevance)}">Rel${aRel.text}</span>
              <span class="${lpExp.cls}" data-tip="LP Exp: ${qsFieldText(kw.landingPageExp)}">LP${lpExp.text}</span>
            </td>
            <td class="num"><span class="${kw.impressionShare === '< 10%' ? 'clr-bad' : ''}">${kw.impressionShare || '--'}</span></td>
            <td>${kwTags || ''}</td>
          </tr>`;

          // ─── L4: Search Terms (子行) ───
          if (hasSTs) {
            matchedSTs.forEach((st, si) => {
              const stRoas = (st.purchaseNewValue && st.cost && st.cost > 0) ? st.purchaseNewValue / st.cost : null;
              let stTag = '';
              if ((st.cost || 0) > 20 && (!st.purchaseNew || st.purchaseNew === 0) && (st.clicks || 0) > 5) {
                stTag = U.badge('否定', 'bad');
              } else if (st.purchaseNew >= 2 && U.parseMatchType(kw.matchType) !== 'Exact') {
                stTag = U.badge('单提Exact', 'good');
              }

              html += `<tr class="row-L4 child-${kwid}">
                <td><span class="muted">🔍</span> ${st.term} ${U.badge(U.parseMatchType(st.matchType), 'neutral')}</td>
                <td><span class="muted">Search Term</span></td>
                <td></td>
                <td class="num">${st.cost > 0 ? U.fmt(st.cost) : '--'}</td>
                <td class="num">${st.purchaseNew ? U.fmt(st.purchaseNew, 1) : '0'}</td>
                <td class="num">${st.purchaseNew > 0 && st.cost > 0 ? U.fmt(st.cost / st.purchaseNew) : '--'}</td>
                <td class="num">${stRoas ? U.fmt(stRoas) : '--'}</td>
                <td class="num muted">--</td>
                <td class="num">${st.clicks || '--'}</td>
                <td class="num muted">--</td>
                <td class="num">${st.cpc > 0 ? U.fmt(st.cpc) : '--'}</td>
                <td class="muted">${st.firstVisit ? 'FV:' + st.firstVisit : ''}</td>
                <td></td>
                <td>${stTag}</td>
              </tr>`;
            });
          }
        });
      });
    }
  });

  U.html('drill-tbody', html);
}

// ═══════════════════════════════════════
// MODULE 4: 根因分析
// ═══════════════════════════════════════
let ALL_ANOMALIES = [];

// ── RCA Notes Storage (localStorage + Supabase) ──
const RCA_NOTES_KEY = 'rca_diag_notes';
function loadRCANotes() { try { return JSON.parse(localStorage.getItem(RCA_NOTES_KEY) || '{}'); } catch { return {}; } }
function saveRCANotes(notes) { localStorage.setItem(RCA_NOTES_KEY, JSON.stringify(notes)); }
function getRCANotes(aid) { return (loadRCANotes()[aid] || []).sort((a,b) => a.ts - b.ts); }
function addRCANote(aid, text, role) {
  const r = role || 'user', ts = Date.now();
  const all = loadRCANotes();
  if (!all[aid]) all[aid] = [];
  all[aid].push({ text, role: r, ts });
  saveRCANotes(all);
  if (typeof SBSync !== 'undefined') {
    SBSync.addNote('rca', aid, text, r, ts).then(sbId => {
      if (sbId != null) {
        const a2 = loadRCANotes(), arr = a2[aid] || [];
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].ts === ts && arr[i].text === text && !arr[i]._sbId) { arr[i]._sbId = sbId; break; }
        }
        saveRCANotes(a2);
      }
    }).catch(() => {});
  }
}
function deleteRCANote(aid, idx) {
  const all = loadRCANotes();
  if (!all[aid]) return;
  const note = all[aid][idx];
  if (note && note._sbId && typeof SBSync !== 'undefined') SBSync.deleteNote(note._sbId).catch(() => {});
  all[aid].splice(idx, 1);
  saveRCANotes(all);
}

function renderRCANotesThread(aid, listIdx) {
  const notes = getRCANotes(aid);
  const container = document.getElementById('rca-notes-' + listIdx);
  if (!container) return;
  let html = '';
  if (notes.length === 0) {
    html = '<div class="muted" style="text-align:center;padding:10px;font-size:12px;">暂无备注</div>';
  } else {
    notes.forEach((n, i) => {
      const time = new Date(n.ts).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
      html += `<div class="note-bubble note-user">
        <div>${n.text.replace(/\n/g, '<br>')}</div>
        <div class="note-time">我 · ${time}
          <button class="note-delete-btn rca-note-del" data-aid="${aid}" data-note-idx="${i}" data-list-idx="${listIdx}" title="删除">✕</button>
        </div>
      </div>`;
    });
  }
  container.innerHTML = html;

  container.querySelectorAll('.rca-note-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRCANote(btn.dataset.aid, parseInt(btn.dataset.noteIdx));
      renderRCANotesThread(btn.dataset.aid, parseInt(btn.dataset.listIdx));
      updateRCANoteIndicator(btn.dataset.aid);
    });
  });
}

function updateRCANoteIndicator(aid) {
  const card = document.querySelector(`.anomaly-card[data-anomaly-id="${aid}"]`);
  if (!card) return;
  const titleEl = card.querySelector('.anomaly-title');
  if (!titleEl) return;
  const existing = titleEl.querySelector('span');
  if (existing) existing.remove();
  const notes = getRCANotes(aid);
  if (notes.length > 0) {
    const span = document.createElement('span');
    span.style.cssText = 'font-size:11px;margin-left:8px;';
    span.textContent = `💬 ${notes.length}`;
    titleEl.appendChild(span);
  }
}

function renderRootCause() {
  ALL_ANOMALIES = Engine.detectAnomalies(SEARCH_CAMPS, KW_MAP, ST_MAP, DEV_MAP);

  const critCount = ALL_ANOMALIES.filter(a => a.severity === 'critical').length;
  const warnCount = ALL_ANOMALIES.filter(a => a.severity === 'warning').length;
  const infoCount = ALL_ANOMALIES.filter(a => a.severity === 'info').length;
  const posCount = ALL_ANOMALIES.filter(a => a.severity === 'positive').length;

  U.el('nav-anomaly-count').textContent = critCount + warnCount;

  U.html('anomaly-kpis', `
    <div class="kpi-card"><div class="kpi-label">🔴 紧急</div><div class="kpi-value clr-bad">${critCount}</div><div class="kpi-sub">需立即处理</div></div>
    <div class="kpi-card"><div class="kpi-label">🟡 警告</div><div class="kpi-value clr-warn">${warnCount}</div><div class="kpi-sub">需关注优化</div></div>
    <div class="kpi-card"><div class="kpi-label">💡 建议</div><div class="kpi-value clr-muted">${infoCount}</div><div class="kpi-sub">可提升的点</div></div>
    <div class="kpi-card"><div class="kpi-label">🟢 亮点</div><div class="kpi-value clr-good">${posCount}</div><div class="kpi-sub">表现优异</div></div>
  `);

  renderAnomalyList('all');

  document.querySelectorAll('#anomaly-filters .alert-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#anomaly-filters .alert-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAnomalyList(btn.dataset.filter);
    });
  });
}

function openRCADrawer(anomaly, anomalyId, rcaSteps) {
  const overlay = U.el('drawer-overlay');
  const drawer = U.el('kw-drawer');
  const sevLabel = { critical: '🔴 紧急', warning: '🟡 警告', info: '💡 建议', positive: '🟢 亮点' };
  U.el('drawer-title').textContent = anomaly.title;
  U.el('drawer-subtitle').innerHTML = `${sevLabel[anomaly.severity] || ''} · ${anomaly.level} · ${anomaly.type.replace(/_/g, ' ')}`;

  function renderContent() {
    const notes = getRCANotes(anomalyId);
    let html = '';

    html += `<div class="drawer-section"><div class="drawer-section-title">📋 异常描述</div>
      <div class="drawer-verdict"><div class="drawer-verdict-detail">${anomaly.desc}</div></div></div>`;

    html += `<div class="drawer-section"><div class="drawer-section-title">🔍 根因分析路径</div>`;
    rcaSteps.forEach(step => {
      const stepColor = step.status === 'fail' ? 'var(--red)' : step.status === 'warn' ? 'var(--orange)' : step.status === 'pass' ? 'var(--green)' : 'var(--text3)';
      html += `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <div style="width:28px;height:28px;border-radius:50%;background:${stepColor}15;color:${stepColor};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${step.step}</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:13px;">${step.title}</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-top:2px;">${step.detail}</div>
        </div>
      </div>`;
    });
    html += '</div>';

    html += `<div class="drawer-section"><div class="drawer-section-title">💬 备注与反馈 (${notes.length})</div>`;
    html += '<div class="note-thread" id="rca-drawer-notes" style="max-height:320px;overflow-y:auto;">';
    if (notes.length === 0) {
      html += `<div class="muted" style="text-align:center;padding:16px;font-size:12px;">输入备注...</div>`;
    } else {
      notes.forEach((n, i) => {
        const time = new Date(n.ts).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
        const isAI = n.role === 'system' && n.text.startsWith('🤖');
        const saveKbBtn = n.role === 'user' ? `<button class="note-save-kb-btn rca-kb-btn" data-idx="${i}" title="存入知识库">📌</button>` : '';
        html += `<div class="note-bubble note-${n.role}" ${isAI ? 'style="background:#f0f4ff;border:1px solid #bfdbfe;"' : ''}>
          <div>${n.text.replace(/\n/g, '<br>')}</div>
          <div class="note-time">${n.role === 'user' ? '我' : isAI ? 'AI' : '系统'} · ${time}
            ${saveKbBtn}
            <button class="note-delete-btn rca-drawer-del" data-idx="${i}" title="删除">✕</button>
          </div>
        </div>`;
      });
    }
    html += '</div>';
    html += `<div class="note-input-wrap">
      <textarea class="note-input" id="rca-drawer-input" placeholder="输入备注..." rows="2"></textarea>
      <button class="note-send-btn" id="rca-drawer-send">发送</button>
    </div></div>`;

    U.html('drawer-body', html);

    U.el('rca-drawer-send').addEventListener('click', () => {
      const input = U.el('rca-drawer-input');
      const text = input.value.trim();
      if (!text) return;
      addRCANote(anomalyId, text, 'user');
      input.value = '';
      renderContent();
      updateRCANoteIndicator(anomalyId);
      setTimeout(() => {
        const thread = document.getElementById('rca-drawer-notes');
        if (thread) thread.scrollTop = thread.scrollHeight;
      }, 50);
    });

    U.el('rca-drawer-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); U.el('rca-drawer-send').click(); }
    });

    document.querySelectorAll('.rca-kb-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        const note = notes[idx];
        if (!note) return;
        if (typeof SBSync !== 'undefined' && SBSync.addKnowledge) {
          SBSync.addKnowledge('user_correction', note.text, 'user_correction', ['rca', 'correction']).then(id => {
            if (id) {
              btn.textContent = '✅';
              btn.title = '已存入知识库';
              btn.disabled = true;
              addRCANote(anomalyId, '📌 已存入知识库。', 'system');
              renderContent();
              updateRCANoteIndicator(anomalyId);
            }
          });
        }
      });
    });

    document.querySelectorAll('.rca-drawer-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteRCANote(anomalyId, parseInt(btn.dataset.idx));
        renderContent();
        updateRCANoteIndicator(anomalyId);
      });
    });
  }

  renderContent();
  overlay.classList.add('open');
  drawer.classList.add('open');
}

function renderAnomalyList(filter) {
  const filtered = filter === 'all' ? ALL_ANOMALIES : ALL_ANOMALIES.filter(a => a.severity === filter);
  const sevIcon = { critical: '🔴', warning: '🟡', info: '💡', positive: '🟢' };

  let html = '';
  filtered.forEach((a, i) => {
    const anomalyId = `rca__${(a.title||'').substring(0,40).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g,'_')}__${i}`;
    const existingNotes = getRCANotes(anomalyId);
    const noteIndicator = existingNotes.length > 0 ? `<span style="font-size:11px;margin-left:8px;">💬 ${existingNotes.length}</span>` : '';

    html += `<div class="anomaly-card sev-${a.severity} diag-item" data-idx="${i}" data-anomaly-id="${anomalyId}" style="cursor:pointer;">
      <div class="anomaly-header">
        <div class="anomaly-sev">${sevIcon[a.severity] || '⚪'}</div>
        <div class="anomaly-info">
          <div class="anomaly-title">${a.title}${noteIndicator}</div>
          <div class="anomaly-desc">${a.desc}</div>
          <div class="anomaly-meta">
            ${U.badge(a.level, 'neutral')}
            ${U.badge(a.type.replace(/_/g, ' '), a.severity === 'critical' ? 'bad' : a.severity === 'positive' ? 'good' : 'warn')}
          </div>
        </div>
        <div style="color:var(--text3);font-size:18px;">→</div>
      </div>
    </div>`;
  });

  if (!html) html = '<div class="trust-card trust-ok"><div class="trust-title">无异常</div><div class="trust-detail">该分类下暂无检测到的异常。</div></div>';
  U.html('anomaly-list', html);

  // Bind click to open drawer
  document.querySelectorAll('#anomaly-list .anomaly-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx);
      const a = filtered[idx];
      if (!a) return;
      const anomalyId = card.dataset.anomalyId;
      const rcaSteps = Engine.buildRootCause(a, KW_MAP, ST_MAP, DEV_MAP);
      openRCADrawer(a, anomalyId, rcaSteps);
    });
  });
}

function toggleAnomaly(card) {
  // Legacy — now handled by drawer click
}

// ═══════════════════════════════════════
// 搜索词 & 关键词分析（增强版）
// ═══════════════════════════════════════
// ST_CAMP_MAP / rebuildSTCampMap 定义在 rebuildMapsForDateRange 之上（避免 TDZ）

let _stModuleListenersBound = false;
function initSearchTermsModule() {
  const sel = U.el('st-campaign-select');
  if (!sel) return;
  sel.innerHTML = Object.entries(ST_CAMP_MAP).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  if (!_stModuleListenersBound) {
    _stModuleListenersBound = true;
    sel.addEventListener('change', renderSearchTermsEnhanced);
  }
  renderSearchTermsEnhanced();
}

function refreshSearchTermsSelectOnly() {
  const sel = U.el('st-campaign-select');
  if (!sel) return;
  sel.innerHTML = Object.entries(ST_CAMP_MAP).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  renderSearchTermsEnhanced();
}

function termTag(d) {
  const hasCost = (d.cost || 0) > 0;
  if (d.purchaseNew >= 5) {
    if (d.matchType && d.matchType.includes('广泛'))
      return `<span class="action-tag tag-exact">💎 核心词-建议精确<br><span class="tag-reason">转化${d.purchaseNew}次 广泛匹配不稳定</span></span>`;
    return `<span class="action-tag tag-keep">✅ 核心词-保持<br><span class="tag-reason">转化${d.purchaseNew}次 效果稳定</span></span>`;
  }
  if (d.purchaseNew >= 1) {
    if (hasCost && d.cost > 500 && d.purchaseNewValue / d.cost < 0.3)
      return `<span class="action-tag tag-watch">🟡 ROI低-观察<br><span class="tag-reason">花${U.fmtK(Math.round(d.cost))} ROAS仅${U.fmt(d.purchaseNewValue/d.cost)}</span></span>`;
    return `<span class="action-tag tag-watch">🟡 有转化-观察<br><span class="tag-reason">转化${d.purchaseNew}次 待积累</span></span>`;
  }
  if (hasCost && d.cost > 200)
    return `<span class="action-tag tag-negate">🔴 建议否定<br><span class="tag-reason">花${U.fmtK(Math.round(d.cost))} 0转化</span></span>`;
  if ((d.pageView || 0) > 500 && d.purchaseNew === 0)
    return `<span class="action-tag tag-watch">🟡 高流量无转化<br><span class="tag-reason">PV ${d.pageView} 0付费</span></span>`;
  if ((d.firstVisit || 0) > 100 && d.purchaseNew === 0)
    return `<span class="action-tag tag-watch">🟡 流量词-观察<br><span class="tag-reason">FV ${d.firstVisit} 待验证</span></span>`;
  return '<span class="action-tag tag-traffic">— <span class="tag-reason">暂无数据</span></span>';
}

function kwTag(k) {
  const hasCost = (k.cost || 0) > 0;
  const roas = hasCost ? (k.purchaseNewValue || 0) / k.cost : 0;
  if (hasCost && k.purchaseNew >= 5 && roas >= 1)
    return `<span class="action-tag tag-keep">✅ 高效-保持<br><span class="tag-reason">转化${k.purchaseNew} ROAS ${U.fmt(roas)}</span></span>`;
  if (hasCost && k.purchaseNew >= 3 && k.impressionShare === '< 10%')
    return `<span class="action-tag tag-exact">📈 建议提价<br><span class="tag-reason">转化${k.purchaseNew}次 IS仅${k.impressionShare}</span></span>`;
  if (hasCost && k.cost > 500 && k.purchaseNew === 0)
    return `<span class="action-tag tag-negate">🔴 烧钱-暂停<br><span class="tag-reason">花${U.fmtK(Math.round(k.cost))} 0转化</span></span>`;
  if (hasCost && k.cost > 200 && k.purchaseNew === 0)
    return `<span class="action-tag tag-negate">🟡 高花费0转化<br><span class="tag-reason">花${U.fmtK(Math.round(k.cost))} 点击${k.clicks||0}</span></span>`;
  if (k.landingPageExp && k.landingPageExp.includes('低于'))
    return `<span class="action-tag tag-watch">🛠️ 建议拆组+专属LP<br><span class="tag-reason">LP Experience低于平均→当前LP与搜索意图不匹配</span></span>`;
  if (k.adRelevance && k.adRelevance.includes('低于'))
    return `<span class="action-tag tag-watch">✏️ 建议拆组+专属文案<br><span class="tag-reason">Ad Relevance低于平均→组内文案未覆盖该词意图</span></span>`;
  if (k.expectedCTR && k.expectedCTR.includes('低于'))
    return `<span class="action-tag tag-watch">🖱️ 提升CTR<br><span class="tag-reason">Expected CTR低于平均→广告吸引力不足</span></span>`;
  if (k.purchaseNew > 0)
    return `<span class="action-tag tag-watch">🟡 观察<br><span class="tag-reason">转化${k.purchaseNew}次 待积累数据</span></span>`;
  return '<span class="action-tag tag-traffic">— <span class="tag-reason">暂无数据</span></span>';
}

function renderSearchTermsEnhanced() {
  const sel = U.el('st-campaign-select').value;
  const campCfg = ST_CAMP_MAP[sel];
  if (!campCfg) return;

  const keywords = KW_MAP[campCfg.kw] || [];
  const terms = ST_MAP[campCfg.st] || [];

  const totalPurchase = terms.reduce((s, d) => s + d.purchaseNew, 0);
  const totalValue = terms.reduce((s, d) => s + (d.purchaseNewValue || 0), 0);
  const withPurchase = terms.filter(d => d.purchaseNew > 0).length;
  const totalKwConv = keywords.reduce((s, k) => s + (k.purchaseNew || 0), 0);

  U.html('st-kpis', `
    <div class="kpi-card"><div class="kpi-label">关键词数</div><div class="kpi-value">${keywords.length}</div><div class="kpi-sub">总转化 ${U.fmt(totalKwConv, 0)}</div></div>
    <div class="kpi-card"><div class="kpi-label">搜索词数</div><div class="kpi-value">${terms.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">有转化搜索词</div><div class="kpi-value clr-good">${withPurchase}</div><div class="kpi-sub">精准度 ${U.fmtPct(U.pct(withPurchase, terms.length), 0)}</div></div>
    <div class="kpi-card"><div class="kpi-label">总付费金额</div><div class="kpi-value">${U.fmtK(Math.round(totalValue))}</div><div class="kpi-sub">HKD</div></div>
    <div class="kpi-card"><div class="kpi-label">总新付费转化</div><div class="kpi-value clr-good">${U.fmt(totalPurchase, 0)}</div></div>
  `);

  // ─── Keywords table with QS↔CPC ───
  if (keywords.length) {
    const hasCostData = keywords.some(k => k.cost > 0);
    const kwsWithCost = keywords.filter(k => k.cost > 0 && k.clicks > 0);
    const avgCPC = kwsWithCost.length ? kwsWithCost.reduce((s, k) => s + k.cost / k.clicks, 0) / kwsWithCost.length : 0;
    const kwWithQS = keywords.filter(k => k.qualityScore);

    U.html('kw-summary', `
      <div><strong>关键词总数：</strong>${keywords.length}</div>
      <div><strong>有 QS 的词：</strong>${kwWithQS.length}</div>
      <div><strong>均 CPC：</strong>${U.fmt(avgCPC)}</div>
      <div><strong>总转化：</strong>${U.fmt(totalKwConv, 0)}</div>
      <div style="margin-left:auto;color:#94a3b8;font-size:11px;">QS 为空代表：数据缺失（ADW未返回）</div>
    `);
    if (hasCostData) {
      U.el('kw-thead').querySelector('tr').innerHTML = '<th>关键词</th><th>匹配</th><th class="num">点击</th><th class="num">展示</th><th class="num">CTR</th><th class="num">CPC</th><th class="num">花费</th><th class="num">转化</th><th class="num">转化价值</th><th class="num">CPA</th><th class="num">ROAS</th><th class="num">QS</th><th>QS↔CPC</th><th class="num">IS</th><th>操作建议</th>';

      let kwHtml = '';
      keywords.forEach((k, i) => {
        const qs = Number(k.qualityScore) || 0;
        const qsColor = qs >= 8 ? 'clr-good' : qs >= 6 ? 'clr-warn' : qs > 0 ? 'clr-bad' : 'clr-muted';
        const cpc = k.clicks > 0 ? k.cost / k.clicks : (k.cpc || 0);
        const cpcCls = cpc > 0 ? (cpc <= avgCPC * 0.8 ? 'clr-good' : cpc >= avgCPC * 1.3 ? 'clr-bad' : '') : 'clr-muted';
        const roasCls = k.roas >= 1 ? 'clr-good' : k.roas > 0 ? 'clr-bad' : 'clr-muted';

        let qsCpcTag = '';
        if (qs > 0 && cpc > 0) {
          if (qs >= 8 && cpc <= avgCPC) qsCpcTag = '<span class="action-tag tag-good">高QS低CPC ✓</span>';
          else if (qs >= 8 && cpc > avgCPC) qsCpcTag = '<span class="action-tag tag-watch">高QS但CPC偏高</span>';
          else if (qs < 6 && cpc >= avgCPC) qsCpcTag = '<span class="action-tag tag-negate">低QS推高CPC</span>';
          else if (qs < 6 && cpc < avgCPC) qsCpcTag = '<span class="action-tag tag-watch">低QS CPC尚可</span>';
          else qsCpcTag = '<span class="muted">—</span>';
        }

        kwHtml += `<tr>
          <td><span class="clickable-kw" data-kw-idx="${i}">${k.keyword}</span></td>
          <td>${k.matchType || '--'}</td>
          <td class="num">${U.fmtK(k.clicks || 0)}</td>
          <td class="num">${U.fmtK(k.impressions || 0)}</td>
          <td class="num">${k.ctr || '--'}</td>
          <td class="num bold ${cpcCls}">${cpc > 0 ? cpc.toFixed(2) : '--'}</td>
          <td class="num">${U.fmtK(Math.round(k.cost || 0))}</td>
          <td class="num bold clr-good">${k.purchaseNew || 0}</td>
          <td class="num">${U.fmt(k.purchaseNewValue || 0)}</td>
          <td class="num">${k.cpa > 0 ? U.fmt(k.cpa) : '--'}</td>
          <td class="num bold ${roasCls}">${k.roas > 0 ? U.fmt(k.roas) : '--'}</td>
          <td class="num bold ${qsColor}">${k.qualityScore || ADW_MISSING_TEXT}</td>
          <td>${qsCpcTag}</td>
          <td class="num ${k.impressionShare === '< 10%' ? 'clr-bad' : ''}">${k.impressionShare || '--'}</td>
          <td>${kwTag(k)}</td>
        </tr>`;
      });
      U.html('kw-tbody', kwHtml);
    } else {
      U.el('kw-thead').querySelector('tr').innerHTML = '<th>关键词</th><th>匹配</th><th>广告组</th><th>状态</th><th class="num">新付费</th><th class="num">金额</th><th class="num">QS</th><th>预期CTR</th><th>着陆页</th><th>相关性</th><th class="num">IS</th><th>操作建议</th>';
      let kwHtml = '';
      keywords.forEach((k, i) => {
        const qsColor = Number(k.qualityScore) >= 8 ? 'clr-good' : Number(k.qualityScore) >= 6 ? 'clr-warn' : k.qualityScore ? 'clr-bad' : 'clr-muted';
        kwHtml += `<tr>
          <td><span class="clickable-kw" data-kw-idx="${i}">${k.keyword}</span></td>
          <td>${k.matchType || '--'}</td><td>${k.adGroup || '--'}</td><td>${k.status || '--'}</td>
          <td class="num bold clr-good">${k.purchaseNew || 0}</td>
          <td class="num">${U.fmt(k.purchaseNewValue || 0)}</td>
          <td class="num bold ${qsColor}">${k.qualityScore || ADW_MISSING_TEXT}</td>
          <td>${qsFieldText(k.expectedCTR)}</td><td>${qsFieldText(k.landingPageExp)}</td><td>${qsFieldText(k.adRelevance)}</td>
          <td class="num">${k.impressionShare || '--'}</td>
          <td>${kwTag(k)}</td>
        </tr>`;
      });
      U.html('kw-tbody', kwHtml);
    }

    // Bind click events for keyword drawer
    const kwTbody = U.el('kw-tbody');
    kwTbody._kwData = keywords;
    kwTbody._stData = terms;
    kwTbody._campLabel = campCfg.label;
    kwTbody.addEventListener('click', function (e) {
      const el = e.target.closest('.clickable-kw');
      if (!el) return;
      const idx = Number(el.dataset.kwIdx);
      if (this._kwData[idx]) openKeywordDrawer(this._kwData[idx], this._stData, this._campLabel);
    });
  } else {
    U.html('kw-summary', '<div class="muted">该 Campaign 无关键词数据</div>');
    U.html('kw-tbody', '');
  }

  // ─── Search terms table (排雷与淘金) ───
  terms.forEach((t, i) => t._origIdx = i); // Keep track of original index for drawer
  const badTerms = terms.filter(d => (d.cost || 0) > 100 && (!d.purchaseNew || d.purchaseNew === 0)).sort((a, b) => (b.cost || 0) - (a.cost || 0));
  const goodTerms = terms.filter(d => d.purchaseNew >= 2 && d.matchType && d.matchType.includes('广泛')).sort((a, b) => b.purchaseNew - a.purchaseNew);
  const otherTerms = terms.filter(d => !badTerms.includes(d) && !goodTerms.includes(d)).sort((a, b) => b.purchaseNew - a.purchaseNew || (b.cost || 0) - (a.cost || 0));

  U.html('st-summary', `
    <div style="display:flex;gap:15px;width:100%;">
      <div style="flex:1;background:var(--red-bg);padding:10px;border-radius:6px;border:1px solid rgba(231,76,60,0.2);">
        <div style="color:var(--red);font-weight:bold;margin-bottom:4px;">🔴 急需否定 (排雷)</div>
        <div class="muted">花费 > 100 且 0 转化的词：${badTerms.length} 个，共浪费 ${U.fmtK(Math.round(badTerms.reduce((s, d) => s + (d.cost || 0), 0)))}</div>
      </div>
      <div style="flex:1;background:var(--green-bg);padding:10px;border-radius:6px;border:1px solid rgba(39,174,96,0.2);">
        <div style="color:var(--green);font-weight:bold;margin-bottom:4px;">🟢 建议添加 (淘金)</div>
        <div class="muted">转化 ≥ 2 且由广泛匹配触发的词：${goodTerms.length} 个，建议添加为精确匹配</div>
      </div>
    </div>
  `);

  let stHtml = '';

  const renderStRow = (d, type) => {
    let rowCls = '';
    if (type === 'bad') rowCls = 'style="background:var(--red-bg);"';
    if (type === 'good') rowCls = 'style="background:var(--green-bg);"';
    
    return `<tr ${rowCls}>
      <td class="bold"><span class="clickable-st" data-st-idx="${d._origIdx}">${d.term}</span></td>
      <td>${d.matchType || '--'}</td><td class="muted">${d.adGroup || '--'}</td>
      <td class="num bold ${d.purchaseNew > 0 ? 'clr-good' : ''}">${d.purchaseNew || 0}</td>
      <td class="num">${U.fmt(d.purchaseNewValue || 0)}</td>
      <td class="num bold ${d.cost > 0 ? 'clr-bad' : ''}">${U.fmt(d.cost || 0)}</td>
      <td class="num">${d.clicks || '--'}</td>
      <td class="num">${d.pageView || '--'}</td>
      <td>${termTag(d)}</td>
    </tr>`;
  };

  if (badTerms.length > 0) {
    stHtml += `<tr><td colspan="9" style="background:#f8f9fa;font-weight:bold;color:var(--red);padding:8px 12px;">🔴 排雷区：高花费 0 转化</td></tr>`;
    badTerms.slice(0, 20).forEach(d => stHtml += renderStRow(d, 'bad'));
  }
  if (goodTerms.length > 0) {
    stHtml += `<tr><td colspan="9" style="background:#f8f9fa;font-weight:bold;color:var(--green);padding:8px 12px;">🟢 淘金区：高转化 广泛匹配</td></tr>`;
    goodTerms.slice(0, 20).forEach(d => stHtml += renderStRow(d, 'good'));
  }
  if (otherTerms.length > 0) {
    stHtml += `<tr><td colspan="9" style="background:#f8f9fa;font-weight:bold;color:var(--text2);padding:8px 12px;">⚪ 其他搜索词</td></tr>`;
    otherTerms.slice(0, 40).forEach(d => stHtml += renderStRow(d, ''));
  }

  U.html('st-tbody', stHtml);

  // Bind click events for search term drawer
  const stTbody = U.el('st-tbody');
  stTbody._stData = terms;
  stTbody._campLabel = campCfg.label;
  stTbody.addEventListener('click', function (e) {
    const el = e.target.closest('.clickable-st');
    if (!el) return;
    const idx = Number(el.dataset.stIdx);
    if (this._stData[idx]) openSearchTermDrawer(this._stData[idx], this._campLabel);
  });
}

// ─── Search Term Drawer ───
function openSearchTermDrawer(st, campLabel) {
  const drawer = U.el('kw-drawer'); // reuse the same drawer container
  const overlay = U.el('drawer-overlay');
  U.html('drawer-title', `🔎 ${st.term}`);
  U.html('drawer-subtitle', `${campLabel} → ${st.adGroup || '未知'} | 触发匹配类型: ${st.matchType || '未知'}`);

  let body = '';
  const roas = st.cost > 0 ? (st.purchaseNewValue || 0) / st.cost : 0;
  const cpa = st.purchaseNew > 0 ? (st.cost || 0) / st.purchaseNew : 0;

  // KPI metrics
  body += `<div class="drawer-section"><div class="drawer-section-title">📈 搜索词核心指标</div><div class="drawer-metrics">
    <div class="drawer-metric"><div class="label">点击</div><div class="value">${U.fmtK(st.clicks || 0)}</div></div>
    <div class="drawer-metric"><div class="label">花费</div><div class="value">${U.fmtK(Math.round(st.cost || 0))}</div></div>
    <div class="drawer-metric"><div class="label">新付费</div><div class="value" style="color:var(--green)">${st.purchaseNew || 0}</div></div>
    <div class="drawer-metric"><div class="label">CPA</div><div class="value">${cpa > 0 ? U.fmt(cpa) : '--'}</div></div>
    <div class="drawer-metric"><div class="label">ROAS</div><div class="value" style="color:${roas >= 1 ? 'var(--green)' : 'var(--text)'}">${roas > 0 ? U.fmt(roas) : '--'}</div></div>
  </div></div>`;

  // Verdict & actions
  const actions = [];
  let verdictTitle = '', verdictDetail = '';

  if ((st.cost || 0) > 100 && (!st.purchaseNew || st.purchaseNew === 0)) {
    verdictTitle = '🔴 烧钱搜索词 — 建议立即否定';
    verdictDetail = `该搜索词已消耗 ${U.fmt(st.cost)} 且 0 转化，正在跨关键词浪费预算。`;
    actions.push({ icon: '🚫', title: '添加为精确否定词 (Exact Negative)', detail: `将 [${st.term}] 添加到 Campaign 或 Ad Group 的否定关键词列表中，阻止其继续触发。` });
    actions.push({ icon: '🔍', title: '分析词根', detail: '如果该词包含与业务完全无关的词根（如 free, hack, crack, adult），建议将词根作为词组否定 (Phrase Negative)。' });
  } else if (st.purchaseNew >= 2 && st.matchType && st.matchType.includes('广泛')) {
    verdictTitle = '🟢 优质搜索词 — 建议添加为精确匹配';
    verdictDetail = `该词由广泛匹配触发，已带来 ${st.purchaseNew} 次转化，ROAS ${U.fmt(roas)}。表现优异，值得独立运营。`;
    actions.push({ icon: '🎯', title: '添加为精确匹配关键词', detail: `将 [${st.term}] 作为 Exact Match 添加到账户中。这能让你对该词单独出价，并防止被其他广泛词抢量。` });
    actions.push({ icon: '📈', title: '给予独立出价', detail: '添加后，可根据其当前的 CPA 表现，给予更有竞争力的出价，获取更多展示份额。' });
  } else if (st.purchaseNew >= 1) {
    verdictTitle = '✅ 有效搜索词 — 保持观察';
    verdictDetail = `已产生 ${st.purchaseNew} 次转化，当前触发类型为 ${st.matchType || '未知'}。`;
    actions.push({ icon: '👀', title: '继续积累数据', detail: '数据量尚不足以决定是否需要单独提取为关键词，建议继续观察其后续 ROAS 表现。' });
  } else {
    verdictTitle = '🟡 观察中';
    verdictDetail = `花费 ${U.fmt(st.cost)}，点击 ${st.clicks || 0} 次，暂无转化。`;
    actions.push({ icon: '⏱️', title: '设置止损线', detail: `建议在花费达到 ${U.fmt(100)} 时再次审查。若仍无转化，则予以否定。` });
  }

  body += `<div class="drawer-section">
    <div class="drawer-section-title">🎯 诊断 & 操作建议</div>
    <div class="drawer-verdict"><div class="drawer-verdict-title">${verdictTitle}</div><div class="drawer-verdict-detail">${verdictDetail}</div></div>
    ${actions.map(a => `<div class="drawer-action"><div class="drawer-action-icon">${a.icon}</div><div><div class="drawer-action-title">${a.title}</div><div class="drawer-action-detail">${a.detail}</div></div></div>`).join('')}
  </div>`;

  // Context: Which keywords might have triggered this?
  const agKws = FLAT_KW.filter(k => k._camp === campLabel && k.adGroup === st.adGroup);
  if (agKws.length > 0) {
    body += `<div class="drawer-section">
      <div class="drawer-section-title">🔗 溯源：同广告组「${st.adGroup}」下的在投关键词</div>
      <div class="muted" style="font-size:12px;margin-bottom:8px;">该搜索词是由以下关键词之一（通常是广泛/词组匹配）触发的：</div>
      <div class="table-wrap" style="max-height:200px;overflow-y:auto;"><table><thead><tr>
        <th>关键词</th><th>匹配</th><th class="num">花费</th><th class="num">转化</th>
      </tr></thead><tbody>
        ${agKws.sort((a, b) => (b.cost || 0) - (a.cost || 0)).map(k => `<tr>
          <td class="bold">${k.keyword}</td>
          <td>${U.badge(U.parseMatchType(k.matchType), 'neutral')}</td>
          <td class="num">${U.fmtK(Math.round(k.cost || 0))}</td>
          <td class="num clr-good">${k.purchaseNew || 0}</td>
        </tr>`).join('')}
      </tbody></table></div>
    </div>`;
  }

  U.html('drawer-body', body);
  drawer.classList.add('open');
  overlay.classList.add('open');
}

// ─── Keyword Drawer ───
function openKeywordDrawer(kw, allTerms, campLabel) {
  const drawer = U.el('kw-drawer');
  const overlay = U.el('drawer-overlay');
  U.html('drawer-title', kw.keyword);
  U.html('drawer-subtitle', `${campLabel} → ${kw.adGroup || '默认'} | ${kw.matchType || '未知'}`);

  let body = '';
  const hasQS = kw.qualityScore !== '' && kw.qualityScore != null;
  const qsDisplay = hasQS ? kw.qualityScore : '—';

  // KPI metrics
  body += `<div class="drawer-section"><div class="drawer-section-title">📈 核心指标</div><div class="drawer-metrics">
    <div class="drawer-metric"><div class="label">点击</div><div class="value">${U.fmtK(kw.clicks || 0)}</div></div>
    <div class="drawer-metric"><div class="label">花费</div><div class="value">${U.fmtK(Math.round(kw.cost || 0))}</div></div>
    <div class="drawer-metric"><div class="label">新付费</div><div class="value" style="color:var(--green)">${kw.purchaseNew || 0}</div></div>
    <div class="drawer-metric"><div class="label">QS</div><div class="value" style="color:${Number(kw.qualityScore) >= 8 ? 'var(--green)' : Number(kw.qualityScore) >= 6 ? 'var(--orange)' : hasQS ? 'var(--red)' : 'var(--text3)'}">${qsDisplay}</div></div>
    <div class="drawer-metric"><div class="label">CPA</div><div class="value">${kw.cpa > 0 ? U.fmt(kw.cpa) : '--'}</div></div>
    <div class="drawer-metric"><div class="label">IS</div><div class="value" style="color:${kw.impressionShare === '< 10%' ? 'var(--red)' : 'var(--text)'}">${kw.impressionShare || '--'}</div></div>
  </div></div>`;

  // QS breakdown
  if (hasQS) {
    const qsColor = (val) => val && val.includes('高于') ? 'var(--green)' : val && val.includes('低于') ? 'var(--red)' : val ? 'var(--orange)' : 'var(--text3)';
    const qsDimText = (val) => qsFieldText(val);
    body += `<div class="drawer-section"><div class="drawer-section-title">⭐ QS 三维拆解</div><div class="drawer-metrics">
      <div class="drawer-metric"><div class="label">Expected CTR</div><div class="value" style="color:${qsColor(kw.expectedCTR)};font-size:12px">${qsDimText(kw.expectedCTR)}</div></div>
      <div class="drawer-metric"><div class="label">Ad Relevance</div><div class="value" style="color:${qsColor(kw.adRelevance)};font-size:12px">${qsDimText(kw.adRelevance)}</div></div>
      <div class="drawer-metric"><div class="label">LP Experience</div><div class="value" style="color:${qsColor(kw.landingPageExp)};font-size:12px">${qsDimText(kw.landingPageExp)}</div></div>
    </div></div>`;
  }

  // Verdict & actions — aligned with kwTag logic + structural optimization (SKAG) recommendations
  const actions = [];
  let verdictTitle = '', verdictDetail = '';
  const kwRoas = kw.cost > 0 ? (kw.purchaseNewValue || 0) / kw.cost : 0;
  const hasCost = (kw.cost || 0) > 0;

  // QS dimension analysis (upfront)
  const qsBad = []; // 低于平均
  const qsAvg = []; // 平均水平 (not above average = still has room)
  if (kw.adRelevance) {
    if (kw.adRelevance.includes('低于')) qsBad.push('广告相关性');
    else if (!kw.adRelevance.includes('高于')) qsAvg.push('广告相关性');
  }
  if (kw.landingPageExp) {
    if (kw.landingPageExp.includes('低于')) qsBad.push('着陆页体验');
    else if (!kw.landingPageExp.includes('高于')) qsAvg.push('着陆页体验');
  }
  if (kw.expectedCTR) {
    if (kw.expectedCTR.includes('低于')) qsBad.push('预期点击率');
    else if (!kw.expectedCTR.includes('高于')) qsAvg.push('预期点击率');
  }
  const qsAllImprovable = [...qsBad, ...qsAvg]; // all dimensions not "高于"
  const adGroupName = kw.adGroup || '当前广告组';

  if (kw.purchaseNew >= 5 && kw.cost > 0 && kwRoas >= 0.5) {
    verdictTitle = '✅ 高效词 — 建议保持并扩量';
    verdictDetail = `转化 ${kw.purchaseNew} 次，ROAS ${U.fmt(kwRoas)}，是核心流量来源。`;
    if (kw.impressionShare === '< 10%') actions.push({ icon: '📈', title: '建议提价抢量', detail: `展示份额仅 ${kw.impressionShare}，说明还有大量搜索流量未展示。建议提价 15-30% 测试，观察边际 CPA 变化。` });
    if (kw.matchType && kw.matchType.includes('广泛')) {
      const kwCPA = kw.cpa || (kw.purchaseNew > 0 && kw.cost > 0 ? kw.cost / kw.purchaseNew : 0);
      const campObj = SEARCH_CAMPS.find(cc => cc.name === (kw._camp || campLabel));
      const campCPA = campObj ? campObj.newCPA : 0;
      if (kwCPA > 0 && campCPA > 0 && kwCPA > campCPA * 1.2) {
        actions.push({ icon: '🎯', title: '渐进收紧：广泛→词组匹配', detail: `当前广泛匹配 CPA ${U.fmt(kwCPA)} 高于 Campaign 均值 ${U.fmt(campCPA)} 超 20%。建议先收紧到词组匹配控制成本，若 CPA 仍高则进一步收为精确匹配。同时可提高出价 10-15% 弥补流量损失。` });
      } else {
        actions.push({ icon: '🎯', title: '添加精确匹配版本', detail: `当前为广泛匹配，流量质量不稳定。建议复制为 [${kw.keyword}] 精确匹配单独投放，锁住优质流量。` });
      }
    } else if (kw.matchType && kw.matchType.includes('词组')) {
      const kwCPA = kw.cpa || (kw.purchaseNew > 0 && kw.cost > 0 ? kw.cost / kw.purchaseNew : 0);
      const campObj = SEARCH_CAMPS.find(cc => cc.name === (kw._camp || campLabel));
      const campCPA = campObj ? campObj.newCPA : 0;
      if (kwCPA > 0 && campCPA > 0 && kwCPA > campCPA * 1.2) {
        actions.push({ icon: '🎯', title: '渐进收紧：词组→精确匹配', detail: `当前词组匹配 CPA ${U.fmt(kwCPA)} 高于 Campaign 均值 ${U.fmt(campCPA)} 超 20%。建议收紧为精确匹配锁定流量。精确匹配后展示量会下降，可适当提高出价弥补。` });
      }
    }
    if (qsBad.length > 0) {
      actions.push({ icon: '🏗️', title: `拆分独立广告组，针对性优化 QS（${qsBad.join('、')}偏低）`, detail: `高效词 QS 有提升空间。建议将 "${kw.keyword}" 从「${adGroupName}」拆出到独立广告组，配置专属文案和落地页，提升 QS 可进一步压低 CPC、扩大利润。` });
    }

  } else if (hasCost && (kw.cost || 0) > 200 && (!kw.purchaseNew || kw.purchaseNew === 0)) {
    verdictTitle = '🔴 烧钱词 — 建议暂停或否定';
    verdictDetail = `花费 ${U.fmt(kw.cost)}，点击 ${kw.clicks || 0} 次，0 转化。已消耗足够预算验证效果，继续投放大概率持续浪费。`;
    actions.push({ icon: '🚫', title: '暂停关键词或大幅降价', detail: '累计花费已超过正常 CPA 数倍仍无转化，建议直接暂停止损。' });
    actions.push({ icon: '🔍', title: '检查搜索词报告', detail: '确认是否被大量无关搜索词触发。如有，添加否定关键词后可考虑重新开启。' });
    if (kw.matchType && kw.matchType.includes('广泛')) actions.push({ icon: '🎯', title: '收紧匹配：广泛→词组→精确', detail: '广泛匹配可能是导致0转化的主因——匹配了偏离意图的搜索词。建议阶梯式收紧：先改为词组匹配观察 3-5 天，若仍无转化再收紧为精确匹配或直接暂停。' });
    if (kw.matchType && kw.matchType.includes('词组')) actions.push({ icon: '🎯', title: '收紧为精确匹配或暂停', detail: '词组匹配仍无转化，建议收为精确匹配做最后测试，若仍不行则暂停止损。' });

  } else if (kw.qualityScore && Number(kw.qualityScore) < 6) {
    verdictTitle = `🔴 QS 偏低 (${kw.qualityScore}/10) — 建议拆组专项优化`;
    verdictDetail = `QS = ${kw.qualityScore}（低于6分），直接推高 CPC${kw.cpc ? '（当前 ' + U.fmt(kw.cpc) + '）' : ''}，严重降低广告竞争力。问题维度：${qsBad.join('、') || '未知'}。根本原因很可能是该关键词与「${adGroupName}」内的广告文案和落地页不匹配。`;
    actions.push({ icon: '🏗️', title: `将 "${kw.keyword}" 拆分到独立广告组`, detail: `从「${adGroupName}」中提取该关键词，创建专属广告组。在新组中可以精确控制：1) 广告文案直接围绕该关键词撰写，2) 指定与搜索意图匹配的落地页。这是提升 QS 最直接有效的结构性调整。` });
    if (qsBad.includes('广告相关性')) actions.push({ icon: '✏️', title: '新组中撰写专属广告文案', detail: `在新广告组的 RSA 标题中直接包含 "${kw.keyword}" 及其语义变体（如同义词、用户常见表述），让 Google 判定广告与搜索词高度相关。` });
    if (qsBad.includes('着陆页体验')) actions.push({ icon: '📄', title: '新组中指定专属落地页', detail: `创建或选择一个内容与 "${kw.keyword}" 搜索意图高度匹配的落地页。页面标题、首屏内容应直接回应用户搜索时的需求。` });
    if (qsBad.includes('预期点击率')) actions.push({ icon: '🖱️', title: '优化标题吸引力', detail: '使用强 CTA、数字、特殊符号优化标题；添加站内链接/促销等附加信息增加广告面积。' });
    if (qsAvg.length > 0) actions.push({ icon: '📊', title: `${qsAvg.join('、')} 目前为"平均水平"，仍有提升空间`, detail: '"平均"不等于"好"。拆组后针对性优化，有机会将这些维度提升到"高于平均"，进一步压低 CPC。' });

  } else if (qsBad.length > 0) {
    // QS >= 6 but has dimension-level issues below average
    verdictTitle = qsBad.includes('广告相关性')
      ? `✏️ 广告相关性偏低 — 建议拆组 + 专属文案`
      : qsBad.includes('着陆页体验')
        ? `🛠️ 落地页体验偏低 — 建议拆组 + 专属LP`
        : `🖱️ 预期点击率偏低 — 需提升广告吸引力`;

    const dimDetail = qsBad.map(d => {
      if (d === '广告相关性') return 'Ad Relevance 低于平均 → Google 认为广告文案与该搜索意图不匹配';
      if (d === '着陆页体验') return 'LP Experience 低于平均 → 着陆页内容/速度与搜索意图不一致';
      return 'Expected CTR 低于平均 → 广告标题对用户吸引力不足';
    }).join('；');

    verdictDetail = `QS 综合分 = ${qsFieldText(kw.qualityScore)}，但存在维度短板：${dimDetail}。\n\n根本原因分析：「${adGroupName}」广告组内可能包含多个主题不同的关键词，共享同一组广告文案和落地页。"${kw.keyword}" 的搜索意图与组内其他关键词存在差异，导致文案/LP 匹配度被 Google 判定偏低${kw.cpc ? '，CPC 被推高到 ' + U.fmt(kw.cpc) : ''}。`;

    actions.push({ icon: '🏗️', title: `核心操作：将 "${kw.keyword}" 拆分到独立广告组`, detail: `从「${adGroupName}」中提取该关键词，新建一个专属广告组（SKAG 策略）。拆组后可以精确控制：\n① 广告文案 → 围绕 "${kw.keyword}" 的搜索意图定制标题和描述\n② 落地页 → 指定与该词最匹配的页面\n③ 出价 → 独立设定 CPA/CPC 目标\n这是解决 QS 维度短板最有效的结构性方法。` });

    if (qsBad.includes('广告相关性')) {
      actions.push({ icon: '✏️', title: '新组：撰写专属 RSA 广告文案', detail: `至少 1 个标题直接包含 "${kw.keyword}" 完整词或核心语义。例如：搜 "talk to strangers" 的用户期望看到 "Chat with Strangers" / "Meet New People Online" 等直接回应搜索意图的标题。当前组内的通用文案可能根本没覆盖这个场景。` });
    }
    if (qsBad.includes('着陆页体验')) {
      actions.push({ icon: '📄', title: '新组：指定专属落地页', detail: `选择或创建一个着陆页，首屏内容直接回应 "${kw.keyword}" 的用户意图。页面标题要包含关键词语义，首屏要展示核心功能/价值，减少跳出。` });
    }
    if (!qsBad.includes('着陆页体验') && qsAvg.includes('着陆页体验')) {
      actions.push({ icon: '📄', title: '新组：落地页体验尚可但仍有空间', detail: `当前 LP Experience 为"平均水平"，不是"高于平均"。拆组后可以指定一个更精准匹配 "${kw.keyword}" 意图的落地页。"平均"意味着还有提升到"高于平均"的机会，这会额外降低 CPC。` });
    }
    if (!qsBad.includes('广告相关性') && qsAvg.includes('广告相关性')) {
      actions.push({ icon: '✏️', title: '文案匹配度尚可但仍有空间', detail: `当前 Ad Relevance 为"平均水平"。拆组后撰写专属文案，有机会将其提升到"高于平均"。` });
    }
    if (qsBad.includes('预期点击率')) {
      actions.push({ icon: '🖱️', title: '新组：提升广告点击吸引力', detail: `使用数字（"Top 5"）、强CTA（"Free Now"）、差异化卖点。添加附加信息（站内链接、促销信息）可增加广告面积 15-20%，提升 CTR。` });
    }
    if (kw.matchType && kw.matchType.includes('广泛')) {
      actions.push({ icon: '🎯', title: '新组建议使用词组/精确匹配', detail: `广泛匹配在新组内可能触发偏离 "${kw.keyword}" 意图的搜索词，影响整体相关性评分。建议新组用词组匹配或精确匹配，控制流量质量。` });
    }

  } else if (qsAvg.length > 0 && hasCost && (kw.clicks || 0) > 20) {
    // All QS dimensions are "average" (none below, none above) — still room for optimization
    verdictTitle = '📊 QS 各维度"平均" — 有结构性提升空间';
    verdictDetail = `QS = ${qsFieldText(kw.qualityScore)}，三个维度均为"平均水平"。虽然没有明显短板，但也意味着没有竞争优势。${kw.cpc ? 'CPC ' + U.fmt(kw.cpc) + ' 可能仍有下降空间。' : ''}如果该词的搜索量和转化潜力值得投入，拆组专项优化可将各维度推到"高于平均"。`;
    actions.push({ icon: '🏗️', title: `考虑拆分到独立广告组`, detail: `如果 "${kw.keyword}" 的搜索量和业务价值足够高，值得拆组做精细化运营：配专属文案 + 专属落地页 + 独立出价。目标是将 QS 各维度提升到"高于平均"。` });

  } else if (hasCost && (!kw.purchaseNew || kw.purchaseNew === 0) && (kw.clicks || 0) > 10) {
    verdictTitle = '🟡 待观察 — 有流量但无转化';
    verdictDetail = `花费 ${U.fmt(kw.cost)}，点击 ${kw.clicks} 次，暂无转化。数据量尚未达到统计显著性（通常需 200+ 花费或 30+ 点击），建议再观察 1-2 天。`;
    actions.push({ icon: '⏱️', title: '继续观察，设置花费预警线', detail: `如累计花费超过 ${U.fmt(200)} 仍无转化，则触发暂停/优化。` });

  } else {
    verdictTitle = '🟡 观察中';
    verdictDetail = '数据量尚不充分（花费低/点击少），无法做出可靠判断。建议继续积累 2-3 天数据后再决策。';
  }
  if (!hasQS) {
    actions.unshift({
      icon: 'ℹ️',
      title: 'QS 数据缺失（ADW未返回）',
      detail: '当前仅可基于花费/转化做诊断，无法进行 QS 三维（Expected CTR / Ad Relevance / LP Experience）分析。'
    });
  }

  body += `<div class="drawer-section">
    <div class="drawer-section-title">🎯 诊断 & 操作建议</div>
    <div class="drawer-verdict"><div class="drawer-verdict-title">${verdictTitle}</div><div class="drawer-verdict-detail">${verdictDetail}</div></div>
    ${actions.map(a => `<div class="drawer-action"><div class="drawer-action-icon">${a.icon}</div><div><div class="drawer-action-title">${a.title}</div><div class="drawer-action-detail">${a.detail}</div></div></div>`).join('')}
  </div>`;

  // ─── Same-theme keyword cluster (product/geo-aware) ───
  const sameTheme = findSameThemeKeywords(kw.keyword, FLAT_KW).filter(k => k.keyword !== kw.keyword);
  if (sameTheme.length > 0) {
    const stSpend = sameTheme.reduce((s, k) => s + (k.cost || 0), 0);
    const stConv = sameTheme.reduce((s, k) => s + (k.purchaseNew || 0), 0);
    const stProducts = [...new Set(sameTheme.map(k => parseCampMeta(k._camp).product))];
    const stCamps = [...new Set(sameTheme.map(k => k._camp))];
    const drawerInsight = buildClusterInsight(sameTheme, kw.keyword);

    body += `<div class="drawer-section">
      <div class="drawer-section-title">🧩 同主题关键词（含 "${kw.keyword}" 的全部词）</div>
      <div class="drawer-metrics">
        <div class="drawer-metric"><div class="label">相关词数</div><div class="value">${sameTheme.length}</div></div>
        <div class="drawer-metric"><div class="label">产品线</div><div class="value">${stProducts.join('/')}</div></div>
        <div class="drawer-metric"><div class="label">Campaign</div><div class="value">${stCamps.length}</div></div>
        <div class="drawer-metric"><div class="label">总花费</div><div class="value">${U.fmtK(Math.round(stSpend))}</div></div>
        <div class="drawer-metric"><div class="label">总转化</div><div class="value" style="color:var(--green)">${stConv}</div></div>
      </div>
      ${drawerInsight.insights.map(i => {
        const cls = i.type === 'action' ? 'tip-warn' : i.type === 'ok' ? 'tip-ok' : 'tip-info';
        return `<div class="drawer-cluster-tip ${cls}">${i.text}</div>`;
      }).join('')}
      <div class="table-wrap" style="max-height:250px;overflow-y:auto;"><table><thead><tr>
        <th>关键词</th><th>产品</th><th>Campaign</th><th>广告组</th><th class="num">花费</th><th class="num">转化</th><th class="num">QS</th><th>建议</th>
      </tr></thead><tbody>
        ${sameTheme.sort((a, b) => (b.cost || 0) - (a.cost || 0)).map(k => {
          const km = parseCampMeta(k._camp);
          return `<tr>
          <td class="bold">${k.keyword}</td>
          <td><span class="cluster-badge cluster-badge-${km.product === parseCampMeta(campLabel || '').product ? 'ok' : 'info'}">${km.product}-${km.geo}</span></td>
          <td class="muted">${U.campShortName(k._camp)}</td>
          <td class="muted">${k.adGroup || '--'}</td>
          <td class="num">${U.fmtK(Math.round(k.cost || 0))}</td>
          <td class="num bold clr-good">${k.purchaseNew || 0}</td>
          <td class="num bold ${Number(k.qualityScore) >= 8 ? 'clr-good' : Number(k.qualityScore) >= 6 ? 'clr-warn' : k.qualityScore ? 'clr-bad' : 'clr-muted'}">${k.qualityScore || ADW_MISSING_TEXT}</td>
          <td>${kwTag(k)}</td>
        </tr>`;
        }).join('')}
      </tbody></table></div>
    </div>`;
  }

  // Matched search terms
  const kwLower = kw.keyword.toLowerCase();
  const kwAdGroup = kw.adGroup || '';
  const matched = allTerms.filter(t => {
    const tl = t.term.toLowerCase();
    return tl === kwLower || tl.includes(kwLower) || kwLower.includes(tl) || (t.adGroup === kwAdGroup);
  }).sort((a, b) => (b.purchaseNew || 0) - (a.purchaseNew || 0)).slice(0, 20);

  if (matched.length) {
    const withConv = matched.filter(t => t.purchaseNew > 0);
    body += `<div class="drawer-section">
      <div class="drawer-section-title">🔍 触发的真实搜索词（${matched.length} 个匹配）</div>
      <div class="drawer-metrics">
        <div class="drawer-metric"><div class="label">匹配词数</div><div class="value">${matched.length}</div></div>
        <div class="drawer-metric"><div class="label">有转化</div><div class="value" style="color:var(--green)">${withConv.length}</div></div>
        <div class="drawer-metric"><div class="label">无转化</div><div class="value" style="color:${matched.length - withConv.length > withConv.length ? 'var(--red)' : 'var(--orange)'}">${matched.length - withConv.length}</div></div>
      </div>
      <div class="table-wrap" style="max-height:300px;overflow-y:auto;"><table><thead><tr>
        <th style="text-align:left">搜索词</th><th>匹配</th><th class="num">新付费</th><th class="num">金额</th><th>建议</th>
      </tr></thead><tbody>
        ${matched.map(t => `<tr>
          <td>${t.term}</td>
          <td class="muted">${t.matchType || '--'}</td>
          <td class="num ${t.purchaseNew > 0 ? 'clr-good bold' : ''}">${t.purchaseNew || 0}</td>
          <td class="num">${U.fmt(t.purchaseNewValue || 0)}</td>
          <td>${termTag(t)}</td>
        </tr>`).join('')}
      </tbody></table></div>
    </div>`;
  }

  U.html('drawer-body', body);
  drawer.classList.add('open');
  overlay.classList.add('open');
}

function closeDrawer() {
  U.el('kw-drawer').classList.remove('open');
  U.el('drawer-overlay').classList.remove('open');
}
U.el('drawer-close').addEventListener('click', closeDrawer);
U.el('drawer-overlay').addEventListener('click', closeDrawer);

// ═══════════════════════════════════════
// 质量得分分析
// ═══════════════════════════════════════
function renderQualityScore() {
  const withQS = FLAT_KW.filter(k => k.qualityScore && k.qualityScore !== '');
  const qsDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let totalWeightedQS = 0, totalWeight = 0;
  withQS.forEach(k => {
    const qs = parseInt(k.qualityScore);
    if (qs >= 1 && qs <= 10) qsDistribution[qs]++;
    totalWeightedQS += qs * (k.cost || 1);
    totalWeight += (k.cost || 1);
  });
  const avgQS = totalWeight > 0 ? totalWeightedQS / totalWeight : 0;
  const lowQS = withQS.filter(k => parseInt(k.qualityScore) <= 5).length;
  const highQS = withQS.filter(k => parseInt(k.qualityScore) >= 8).length;

  U.html('qs-kpis', `
    <div class="kpi-card"><div class="kpi-label">有 QS 关键词</div><div class="kpi-value">${withQS.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">加权平均 QS</div><div class="kpi-value ${avgQS >= 7 ? 'clr-good' : avgQS >= 5 ? 'clr-warn' : 'clr-bad'}">${U.fmt(avgQS, 1)}</div></div>
    <div class="kpi-card"><div class="kpi-label">QS ≥ 8（优质）</div><div class="kpi-value clr-good">${highQS}</div><div class="kpi-sub">${U.fmtPct(U.pct(highQS, withQS.length), 0)}</div></div>
    <div class="kpi-card"><div class="kpi-label">QS ≤ 5（差）</div><div class="kpi-value clr-bad">${lowQS}</div><div class="kpi-sub">${U.fmtPct(U.pct(lowQS, withQS.length), 0)}</div></div>
  `);

  let qsHtml = '';
  withQS.sort((a, b) => (b.cost || 0) - (a.cost || 0)).slice(0, 60).forEach(k => {
    const qs = parseInt(k.qualityScore);
    const qsCls = qs >= 8 ? 'clr-good' : qs <= 5 ? 'clr-bad' : 'clr-warn';
    const eCtr = U.shortQS(k.expectedCTR);
    const aRel = U.shortQS(k.adRelevance);
    const lpExp = U.shortQS(k.landingPageExp);

    let diagnosis = [];
    if (k.expectedCTR && k.expectedCTR.includes('低于')) diagnosis.push('CTR↓');
    if (k.adRelevance && k.adRelevance.includes('低于')) diagnosis.push('Rel↓');
    if (k.landingPageExp && k.landingPageExp.includes('低于')) diagnosis.push('LP↓');
    const diagText = diagnosis.length > 0 ? diagnosis.map(d => U.badge(d, 'bad')).join(' ') : '<span class="muted">正常</span>';

    qsHtml += `<tr>
      <td class="bold">${k.keyword}</td>
      <td class="muted">${U.campShortName(k._camp)}</td>
      <td class="muted">${k.adGroup || '--'}</td>
      <td class="num bold ${qsCls}">${k.qualityScore}</td>
      <td><span class="${eCtr.cls}">${eCtr.text} ${qsFieldText(k.expectedCTR)}</span></td>
      <td><span class="${aRel.cls}">${aRel.text} ${qsFieldText(k.adRelevance)}</span></td>
      <td><span class="${lpExp.cls}">${lpExp.text} ${qsFieldText(k.landingPageExp)}</span></td>
      <td class="num">${U.fmt(k.cpc)}</td>
      <td class="num">${U.fmtK(Math.round(k.cost || 0))}</td>
      <td class="num ${k.impressionShare === '< 10%' ? 'clr-bad' : ''}">${k.impressionShare || '--'}</td>
      <td>${diagText}</td>
    </tr>`;
  });
  U.html('qs-tbody', qsHtml);
}

// ═══════════════════════════════════════
// 设备分析
// ═══════════════════════════════════════
function renderDevices() {
  let html = '';
  Object.entries(DEV_MAP).forEach(([camp, devs]) => {
    devs.sort((a, b) => (b.cost || 0) - (a.cost || 0)).forEach(d => {
      if (d.cost === 0 && d.clicks === 0) return;
      html += `<tr>
        <td class="bold">${U.campShortName(camp)}</td>
        <td>${d.device}</td>
        <td>${d.bidAdj || '--'}</td>
        <td class="num">${U.fmtK(Math.round(d.cost))}</td>
        <td class="num">${U.fmtK(d.clicks)}</td>
        <td class="num">${U.fmtK(d.impressions)}</td>
        <td class="num">${d.ctr || '--'}</td>
        <td class="num">${U.fmt(d.cpc)}</td>
        <td class="num">${U.fmt(d.conversions, 0)}</td>
        <td class="num">${d.convRate || '--'}</td>
        <td class="num">${d.cpa > 0 ? U.fmt(d.cpa) : '--'}</td>
      </tr>`;
    });
  });
  U.html('device-tbody', html);
}

// ═══════════════════════════════════════
// INTERACTION: Row Toggle
// ═══════════════════════════════════════
function toggleRow(parentId) {
  const row = document.querySelector(`[data-id="${parentId}"]`);
  if (!row) return;
  const isExpanded = row.classList.contains('expanded');

  if (isExpanded) {
    row.classList.remove('expanded');
    hideAllChildren(parentId);
  } else {
    row.classList.add('expanded');
    document.querySelectorAll(`.child-${parentId}`).forEach(r => r.classList.add('visible'));
  }
}

function hideAllChildren(pid) {
  document.querySelectorAll(`.child-${pid}`).forEach(r => {
    r.classList.remove('visible', 'expanded');
    const id = r.getAttribute('data-id');
    if (id) hideAllChildren(id);
  });
}

// ═══════════════════════════════════════
// 关键词聚类 / 拆组助手
// ═══════════════════════════════════════

function extractNgrams(text, minN, maxN) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const grams = [];
  for (let n = minN; n <= maxN && n <= words.length; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      grams.push(words.slice(i, i + n).join(' '));
    }
  }
  return grams;
}

const STOP_WORDS = new Set(['to','the','a','an','in','on','for','of','and','or','is','it','my','with','by','at','from','as','how','app','free','online','best','top','new','download']);

function parseCampMeta(campName) {
  const product = (typeof getCampaignProduct === 'function') ? getCampaignProduct(campName) : '未知';
  const geoMatch = (campName || '').match(/[-\s](IN|US|UK|AR|UAE|IL|QA|BR|MX|PH|ID|TH|VN|MY|SG|TW|HK|JP|KR|DE|FR|ES|IT|AU|CA|RU|SA|印度|美国|巴西)[-\s]?/i);
  let geo = geoMatch ? geoMatch[1].toUpperCase() : '未知';
  if (geo === '印度') geo = 'IN';
  if (geo === '美国') geo = 'US';
  if (geo === '巴西') geo = 'BR';
  return { product, geo };
}

function buildClusterInsight(kws, phrase) {
  const byProductCamp = {};
  kws.forEach(k => {
    const meta = parseCampMeta(k._camp);
    const key = `${meta.product}|||${k._camp}`;
    if (!byProductCamp[key]) byProductCamp[key] = { product: meta.product, geo: meta.geo, camp: k._camp, adGroups: new Set(), kws: [] };
    byProductCamp[key].adGroups.add(k.adGroup || '默认');
    byProductCamp[key].kws.push(k);
  });
  const groups = Object.values(byProductCamp);
  const products = [...new Set(groups.map(g => g.product))];
  const insights = [];

  if (products.length > 1) {
    insights.push({ type: 'info', text: `📦 ${products.length} 个产品线（${products.join('、')}）均投放含 "${phrase}" 的关键词，属正常竞争覆盖，各产品独立优化。` });
  }

  products.forEach(prod => {
    const prodGroups = groups.filter(g => g.product === prod);
    if (prodGroups.length > 1) {
      const geos = prodGroups.map(g => g.geo).join('、');
      insights.push({ type: 'info', text: `🌍 ${prod} 在 ${prodGroups.length} 个地区（${geos}）各有 Campaign，不同地区不可合并，各 Campaign 内单独优化。` });
    }
    prodGroups.forEach(pg => {
      const campShort = U.campShortName(pg.camp);
      const agList = [...pg.adGroups];
      if (agList.length > 1) {
        insights.push({ type: 'action', text: `🏗️ [${prod}-${pg.geo}]「${campShort}」内该词分散在 ${agList.length} 个广告组（${agList.join('、')}），建议合并到一个专属广告组，统一文案和落地页。` });
      } else if (pg.kws.length > 1) {
        insights.push({ type: 'ok', text: `✅ [${prod}-${pg.geo}]「${campShort}」内 ${pg.kws.length} 个相关词已在同一广告组「${agList[0]}」中。` });
      }
      const badRel = pg.kws.filter(k => k.adRelevance && k.adRelevance.includes('低于'));
      if (badRel.length > 0) {
        insights.push({ type: 'action', text: `✏️ [${prod}-${pg.geo}] ${badRel.length} 个词 Ad Relevance 低于平均 — 该 Campaign 内文案需围绕 "${phrase}" 优化。` });
      }
      const badLP = pg.kws.filter(k => k.landingPageExp && k.landingPageExp.includes('低于'));
      if (badLP.length > 0) {
        insights.push({ type: 'action', text: `📄 [${prod}-${pg.geo}] ${badLP.length} 个词 LP Experience 低于平均 — 需在该 Campaign 内指定专属落地页。` });
      }
    });
  });

  const hasAction = insights.some(i => i.type === 'action');
  return { insights, hasAction, products, groupCount: groups.length };
}

function buildKeywordClusters(keywords, minClusterSize) {
  minClusterSize = minClusterSize || 2;
  const ngramIndex = {};

  keywords.forEach((kw, idx) => {
    const grams = extractNgrams(kw.keyword, 2, 5);
    grams.forEach(g => {
      if (!ngramIndex[g]) ngramIndex[g] = new Set();
      ngramIndex[g].add(idx);
    });
  });

  const candidates = Object.entries(ngramIndex)
    .filter(([, idxSet]) => idxSet.size >= minClusterSize)
    .map(([phrase, idxSet]) => ({ phrase, indices: [...idxSet], count: idxSet.size, wordCount: phrase.split(' ').length }))
    .sort((a, b) => b.wordCount - a.wordCount || b.count - a.count);

  const assigned = new Set();
  const clusters = [];

  candidates.forEach(c => {
    const unassigned = c.indices.filter(i => !assigned.has(i));
    if (unassigned.length < minClusterSize) return;

    const all = c.indices;
    const kws = all.map(i => keywords[i]);
    const totalSpend = kws.reduce((s, k) => s + (k.cost || 0), 0);
    const totalConv = kws.reduce((s, k) => s + (k.purchaseNew || 0), 0);
    const camps = [...new Set(kws.map(k => k._camp))];
    const adGroups = [...new Set(kws.map(k => k.adGroup).filter(Boolean))];

    clusters.push({
      phrase: c.phrase,
      keywords: kws,
      totalSpend,
      totalConv,
      camps,
      adGroups,
      needsSplit: adGroups.length > 1 || camps.length > 1
    });

    all.forEach(i => assigned.add(i));
  });

  return clusters;
}

function findSameThemeKeywords(corePhrase, keywords) {
  const lower = corePhrase.toLowerCase().trim();
  const coreWords = lower.split(/\s+/);
  return keywords.filter(k => {
    const kl = k.keyword.toLowerCase();
    return kl.includes(lower) || lower.includes(kl) ||
      (coreWords.length >= 2 && coreWords.every(w => STOP_WORDS.has(w) || kl.includes(w)));
  });
}

let ALL_CLUSTERS = [];
let _clusterViewListenersBound = false;

function renderClusterView() {
  ALL_CLUSTERS = buildKeywordClusters(FLAT_KW, 2);

  const campFilter = U.el('cluster-camp-filter');
  const campNames = [...new Set(FLAT_KW.map(k => k._camp))];
  campFilter.innerHTML = '<option value="all">全部 Campaign</option>' + campNames.map(c => `<option value="${c}">${U.campShortName(c)}</option>`).join('');

  renderClusterList();

  if (!_clusterViewListenersBound) {
    _clusterViewListenersBound = true;
    campFilter.addEventListener('change', renderClusterList);
    U.el('cluster-search').addEventListener('input', renderClusterList);
  }
}

function renderClusterList() {
  const campVal = U.el('cluster-camp-filter').value;
  const searchVal = U.el('cluster-search').value.trim().toLowerCase();

  let filtered = ALL_CLUSTERS;
  if (campVal !== 'all') {
    filtered = filtered.filter(c => c.camps.includes(campVal));
  }

  let searchCluster = null;
  if (searchVal.length >= 2) {
    const matchedKws = findSameThemeKeywords(searchVal, FLAT_KW);
    if (matchedKws.length > 0) {
      const camps = [...new Set(matchedKws.map(k => k._camp))];
      const adGroups = [...new Set(matchedKws.map(k => k.adGroup).filter(Boolean))];
      searchCluster = {
        phrase: searchVal,
        keywords: matchedKws,
        totalSpend: matchedKws.reduce((s, k) => s + (k.cost || 0), 0),
        totalConv: matchedKws.reduce((s, k) => s + (k.purchaseNew || 0), 0),
        camps, adGroups,
        needsSplit: adGroups.length > 1 || camps.length > 1,
        isSearch: true
      };
    }
    filtered = filtered.filter(c => c.phrase.includes(searchVal));
  }

  const totalClusters = (searchCluster ? 1 : 0) + filtered.length;
  const totalKwsClustered = filtered.reduce((s, c) => s + c.keywords.length, 0) + (searchCluster ? searchCluster.keywords.length : 0);
  const actionableClusters = filtered.filter(c => buildClusterInsight(c.keywords, c.phrase).hasAction).length
    + (searchCluster && buildClusterInsight(searchCluster.keywords, searchCluster.phrase).hasAction ? 1 : 0);

  U.html('cluster-kpis', `
    <div class="kpi-card"><div class="kpi-label">发现聚类</div><div class="kpi-value">${totalClusters}</div><div class="kpi-sub">共 ${totalKwsClustered} 个关键词</div></div>
    <div class="kpi-card"><div class="kpi-label">有优化机会</div><div class="kpi-value clr-warn">${actionableClusters}</div><div class="kpi-sub">同Campaign内可拆组/优化</div></div>
    <div class="kpi-card"><div class="kpi-label">全部关键词</div><div class="kpi-value">${FLAT_KW.length}</div><div class="kpi-sub">含长尾词</div></div>
    <div class="kpi-card"><div class="kpi-label">全部 Campaign</div><div class="kpi-value">${[...new Set(FLAT_KW.map(k => k._camp))].length}</div></div>
  `);

  const all = searchCluster ? [searchCluster, ...filtered.filter(c => c.phrase !== searchVal)] : filtered;

  if (all.length === 0) {
    U.html('cluster-list', '<div class="card" style="padding:40px;text-align:center;color:var(--text3);">未找到匹配的聚类。尝试输入其他核心词，如 "video chat"、"stranger"、"omegle" 等。</div>');
    return;
  }

  let html = '';
  all.slice(0, 30).forEach((cluster, ci) => {
    const kwsSorted = [...cluster.keywords].sort((a, b) => (b.cost || 0) - (a.cost || 0));
    const avgQS = cluster.keywords.filter(k => k.qualityScore).length > 0
      ? (cluster.keywords.filter(k => k.qualityScore).reduce((s, k) => s + Number(k.qualityScore), 0) / cluster.keywords.filter(k => k.qualityScore).length).toFixed(1)
      : '--';
    const ci_insight = buildClusterInsight(cluster.keywords, cluster.phrase);

    let insightHtml = ci_insight.insights.map(i => {
      const cls = i.type === 'action' ? 'cluster-insight-warn' : i.type === 'ok' ? 'cluster-insight-ok' : 'cluster-insight-info';
      return `<div class="cluster-insight ${cls}">${i.text}</div>`;
    }).join('');

    const badgeHtml = ci_insight.hasAction
      ? '<span class="cluster-badge cluster-badge-warn">有优化机会</span>'
      : ci_insight.products.length > 1
        ? '<span class="cluster-badge cluster-badge-info">多产品覆盖</span>'
        : '<span class="cluster-badge cluster-badge-ok">结构良好</span>';

    html += `<div class="card cluster-card${cluster.isSearch ? ' cluster-card-highlight' : ''}">
      <div class="cluster-header" onclick="toggleCluster(${ci})">
        <div class="cluster-header-left">
          <span class="cluster-phrase">"${cluster.phrase}"</span>
          <span class="cluster-count">${cluster.keywords.length} 个关键词 · ${ci_insight.products.join('/')} · ${cluster.camps.length} Campaign</span>
          ${badgeHtml}
        </div>
        <div class="cluster-header-right">
          <span>花费 <strong>${U.fmtK(Math.round(cluster.totalSpend))}</strong></span>
          <span>转化 <strong class="clr-good">${cluster.totalConv}</strong></span>
          <span>均QS <strong>${avgQS}</strong></span>
          <span class="cluster-toggle" id="cluster-toggle-${ci}">▼</span>
        </div>
      </div>
      ${insightHtml}
      <div class="cluster-body" id="cluster-body-${ci}" style="display:none;">
        <div class="table-wrap"><table class="cluster-table"><thead><tr>
          <th>关键词</th><th>产品/地区</th><th>Campaign</th><th>广告组</th><th>匹配</th>
          <th class="num">花费</th><th class="num">点击</th><th class="num">转化</th>
          <th class="num">QS</th><th>Ad Rel</th><th>LP Exp</th><th class="num">IS</th><th>建议</th>
        </tr></thead><tbody>
          ${kwsSorted.map(k => {
            const qs = Number(k.qualityScore) || 0;
            const qsCls = qs >= 8 ? 'clr-good' : qs >= 6 ? 'clr-warn' : qs > 0 ? 'clr-bad' : 'clr-muted';
            const arCls = k.adRelevance && k.adRelevance.includes('高于') ? 'clr-good' : k.adRelevance && k.adRelevance.includes('低于') ? 'clr-bad' : 'clr-warn';
            const lpCls = k.landingPageExp && k.landingPageExp.includes('高于') ? 'clr-good' : k.landingPageExp && k.landingPageExp.includes('低于') ? 'clr-bad' : 'clr-warn';
            const km = parseCampMeta(k._camp);
            return `<tr>
              <td class="bold">${k.keyword}</td>
              <td><span class="cluster-badge cluster-badge-info">${km.product}-${km.geo}</span></td>
              <td class="muted">${U.campShortName(k._camp)}</td>
              <td class="muted">${k.adGroup || '--'}</td>
              <td>${k.matchType ? U.badge(U.parseMatchType(k.matchType), 'neutral') : '--'}</td>
              <td class="num">${U.fmtK(Math.round(k.cost || 0))}</td>
              <td class="num">${U.fmtK(k.clicks || 0)}</td>
              <td class="num bold clr-good">${k.purchaseNew || 0}</td>
              <td class="num bold ${qsCls}">${k.qualityScore || ADW_MISSING_TEXT}</td>
              <td class="${arCls}">${qsFieldText(k.adRelevance)}</td>
              <td class="${lpCls}">${qsFieldText(k.landingPageExp)}</td>
              <td class="num ${k.impressionShare === '< 10%' ? 'clr-bad' : ''}">${k.impressionShare || '--'}</td>
              <td>${kwTag(k)}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      </div>
    </div>`;
  });

  U.html('cluster-list', html);
}

function toggleCluster(idx) {
  const body = U.el('cluster-body-' + idx);
  const toggle = U.el('cluster-toggle-' + idx);
  if (body.style.display === 'none') {
    body.style.display = 'block';
    toggle.textContent = '▲';
  } else {
    body.style.display = 'none';
    toggle.textContent = '▼';
  }
}

// ═══════════════════════════════════════
// 落地页健康检查（Mock Data — 待接入真实拨测数据）
// ═══════════════════════════════════════

/*
 * ── 数据接入指引 ──
 *
 * 1) Gclid 检测脚本 (Python):
 *    import requests
 *    def check_gclid(url):
 *        test_url = url + ('&' if '?' in url else '?') + 'gclid=test_abc123'
 *        resp = requests.get(test_url, allow_redirects=True, timeout=10)
 *        final_url = resp.url
 *        return {
 *            'gclid_preserved': 'gclid=test_abc123' in final_url,
 *            'redirect_chain': [r.url for r in resp.history] + [final_url],
 *            'final_url': final_url,
 *            'status_code': resp.status_code
 *        }
 *
 * 2) LCP 检测脚本 (Python, Google PageSpeed Insights API):
 *    import requests
 *    PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
 *    def check_lcp(url, api_key='YOUR_KEY'):
 *        resp = requests.get(PSI_API, params={
 *            'url': url, 'strategy': 'mobile', 'key': api_key,
 *            'category': 'PERFORMANCE'
 *        })
 *        data = resp.json()
 *        lcp_ms = data['lighthouseResult']['audits']['largest-contentful-paint']['numericValue']
 *        return { 'lcp_ms': round(lcp_ms), 'score': data['lighthouseResult']['categories']['performance']['score'] }
 *
 * 3) 输出格式:
 *    将结果写入 JS 文件，格式同下方 MOCK_LANDING_PAGES 常量。
 *    替换后将 HTML 中 data-tag-mock 改为 data-tag-real。
 */

const MOCK_LANDING_PAGES = [
  {
    url: 'https://www.fachatapp.com/',
    product: 'Ft',
    campaigns: ['Ft-web-US-2.5-Display-12.26-homepage', 'Ft-web-UK-2.5-Display-1.3-homepage', 'ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA'],
    lcpMs: 2340,
    gclidPreserved: true,
    redirectChain: ['https://www.fachatapp.com/ → (无跳转)'],
    finalUrl: 'https://www.fachatapp.com/',
    lastChecked: '2026-03-19 09:00'
  },
  {
    url: 'https://parau.vip/',
    product: 'Pu',
    campaigns: ['pu-web-IN-2.5-竞品词-6.14重开', 'pu-web-IN-2.5-品牌词-6.16', 'Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA', 'Pu-web-美国-2.5-6.14重开-功能词-TCPA'],
    lcpMs: 4120,
    gclidPreserved: false,
    redirectChain: ['https://parau.vip/ → 302 → https://parau.vip/home → (gclid 丢失)'],
    finalUrl: 'https://parau.vip/home',
    lastChecked: '2026-03-19 09:00'
  },
  {
    url: 'https://www.pinkpinkchat.com/',
    product: 'Ppt',
    campaigns: ['Ppt-web-UK-2.5-1.18-homepage', 'Ppt-web-US-2.5-1.17-homepage', 'Ppt-web-US-2.5-竞品词-1.28-homepage', 'Ppt-web-UK-2.5-竞品词-2.2-homepage'],
    lcpMs: 1890,
    gclidPreserved: true,
    redirectChain: ['https://www.pinkpinkchat.com/ → (无跳转)'],
    finalUrl: 'https://www.pinkpinkchat.com/',
    lastChecked: '2026-03-19 09:00'
  },
  {
    url: 'https://parau.vip/emeraldchat',
    product: 'Pu',
    campaigns: ['Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA'],
    lcpMs: 5230,
    gclidPreserved: false,
    redirectChain: ['https://parau.vip/emeraldchat → 301 → https://parau.vip/chat?ref=emerald → (gclid 截断)'],
    finalUrl: 'https://parau.vip/chat?ref=emerald',
    lastChecked: '2026-03-19 09:00'
  }
];

function renderLandingPageZone() {
  const hasReal = typeof ADW_LP_HEALTH !== 'undefined' && Array.isArray(ADW_LP_HEALTH) && ADW_LP_HEALTH.length > 0;
  const pages = hasReal ? ADW_LP_HEALTH : MOCK_LANDING_PAGES;
  const lpTag = document.querySelector('#view-landing-page .data-tag');
  if (lpTag) {
    lpTag.className = hasReal ? 'data-tag data-tag-real' : 'data-tag data-tag-mock';
    lpTag.textContent = hasReal ? 'REAL DATA' : 'MOCK DATA';
  }
  const lcpBad = pages.filter(p => p.lcpMs > 3000).length;
  const gclidLost = pages.filter(p => !p.gclidPreserved).length;
  const totalCamps = pages.reduce((s, p) => s + p.campaigns.length, 0);

  let riskLevel = 'low';
  if (lcpBad > 0 || gclidLost > 0) riskLevel = 'medium';
  if (lcpBad > 1 && gclidLost > 0) riskLevel = 'high';

  U.html('lp-kpis', `
    <div class="kpi-card"><div class="kpi-label">在投落地页</div><div class="kpi-value">${pages.length}</div><div class="kpi-sub">关联 ${totalCamps} 个 Campaign</div></div>
    <div class="kpi-card"><div class="kpi-label">LCP > 3s (不达标)</div><div class="kpi-value clr-${lcpBad > 0 ? 'bad' : 'good'}">${lcpBad}</div><div class="kpi-sub">${lcpBad > 0 ? '流失率飙升风险' : '全部达标'}</div></div>
    <div class="kpi-card"><div class="kpi-label">Gclid 丢失</div><div class="kpi-value clr-${gclidLost > 0 ? 'bad' : 'good'}">${gclidLost}</div><div class="kpi-sub">${gclidLost > 0 ? '归因断裂风险' : '参数完整'}</div></div>
    <div class="kpi-card"><div class="kpi-label">综合风险</div><div class="kpi-value"><span class="risk-${riskLevel}">${riskLevel === 'high' ? '高危' : riskLevel === 'medium' ? '中危' : '健康'}</span></div><div class="kpi-sub">${riskLevel !== 'low' ? '需立即处理' : '无异常'}</div></div>
  `);

  let html = '';
  pages.forEach(p => {
    const lcpCls = p.lcpMs <= 2500 ? 'lcp-good' : p.lcpMs <= 3000 ? 'lcp-warn' : 'lcp-bad';
    const lcpStatus = p.lcpMs <= 2500 ? '优秀' : p.lcpMs <= 3000 ? '及格' : '不达标';
    const gclidCls = p.gclidPreserved ? 'gclid-ok' : 'gclid-lost';
    const gclidText = p.gclidPreserved ? '正常' : '丢失';
    const campList = p.campaigns.map(c => U.campShortName(c)).join(', ');

    let risk = 'low';
    const risks = [];
    if (p.lcpMs > 3000) { risk = 'high'; risks.push('LCP超标'); }
    if (!p.gclidPreserved) { risk = 'high'; risks.push('Gclid丢失'); }
    if (p.lcpMs > 2500 && p.lcpMs <= 3000) { if (risk === 'low') risk = 'medium'; risks.push('LCP临界'); }

    html += `<tr>
      <td class="bold" style="word-break:break-all;white-space:normal;max-width:220px;"><a href="${p.url}" target="_blank" style="color:var(--accent);">${p.url}</a></td>
      <td>${U.badge(p.product, p.product === 'Ft' ? 'info' : p.product === 'Pu' ? 'warn' : 'accent')}</td>
      <td class="muted" style="max-width:200px;white-space:normal;">${campList}</td>
      <td class="num ${lcpCls}">${p.lcpMs.toLocaleString()}</td>
      <td><span class="${lcpCls}">${lcpStatus}</span></td>
      <td><span class="${gclidCls}">${gclidText}</span></td>
      <td class="muted" style="max-width:200px;white-space:normal;font-size:11px;">${p.redirectChain.join('<br>')}</td>
      <td class="muted" style="word-break:break-all;white-space:normal;max-width:180px;">${p.finalUrl}</td>
      <td class="muted">${p.lastChecked}</td>
      <td><span class="risk-${risk}">${risks.length > 0 ? risks.join(' + ') : '健康'}</span></td>
    </tr>`;
  });

  U.html('lp-tbody', html);
}

// ═══════════════════════════════════════
// 受众画像分析 (Gender + Age) — 数据由 rebuildMapsForDateRange 写入 GENDER_MAP / AGE_MAP
// ═══════════════════════════════════════

function renderGender() {
  const allGender = [];
  Object.entries(GENDER_MAP).forEach(([camp, rows]) => {
    const campTotal = rows.reduce((s, r) => s + (r.cost || 0), 0);
    rows.forEach(r => allGender.push({ ...r, campTotal }));
  });

  const femaleCost = allGender.filter(r => r.gender === '女性').reduce((s, r) => s + (r.cost || 0), 0);
  const totalGenderCost = allGender.reduce((s, r) => s + (r.cost || 0), 0);
  const campsWithFemale = [...new Set(allGender.filter(r => r.gender === '女性' && r.cost > 0).map(r => r.campaign))];
  const maleCost = allGender.filter(r => r.gender === '男性').reduce((s, r) => s + (r.cost || 0), 0);

  U.html('gender-kpis', `
    <div class="kpi-card"><div class="kpi-label">有性别数据 Campaign</div><div class="kpi-value">${Object.keys(GENDER_MAP).length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Female 总花费</div><div class="kpi-value clr-${femaleCost > 0 ? 'bad' : 'good'}">${U.fmtK(Math.round(femaleCost))}</div><div class="kpi-sub">${femaleCost > 0 ? campsWithFemale.length + ' 个 Campaign 有泄漏' : '已全部排除'}</div></div>
    <div class="kpi-card"><div class="kpi-label">Female 占比</div><div class="kpi-value clr-${U.pct(femaleCost, totalGenderCost) > 5 ? 'bad' : 'good'}">${U.fmtPct(U.pct(femaleCost, totalGenderCost), 1)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Male 总花费</div><div class="kpi-value">${U.fmtK(Math.round(maleCost))}</div><div class="kpi-sub">${U.fmtPct(U.pct(maleCost, totalGenderCost), 1)} 占比</div></div>
  `);

  let gHtml = '';
  allGender.sort((a, b) => {
    if (a.campaign !== b.campaign) return a.campaign.localeCompare(b.campaign);
    return (b.cost || 0) - (a.cost || 0);
  }).forEach(r => {
    const pct = r.campTotal > 0 ? U.pct(r.cost, r.campTotal) : 0;
    const isFemale = r.gender === '女性';
    const risk = isFemale && r.cost > 0;
    gHtml += `<tr${risk ? ' style="background:var(--red-bg)"' : ''}>
      <td class="bold">${U.campShortName(r.campaign)}</td>
      <td>${r.gender}${isFemale ? ' ⚠️' : ''}</td>
      <td class="num ${risk ? 'clr-bad bold' : ''}">${U.fmtK(Math.round(r.cost))}</td>
      <td class="num">${U.fmtK(r.clicks)}</td>
      <td class="num">${U.fmtK(r.impressions)}</td>
      <td class="num">${U.fmt(r.conversions, 0)}</td>
      <td class="num">${U.fmtK(Math.round(r.revenue))}</td>
      <td class="num">${U.fmtPct(pct, 1)}</td>
      <td>${risk ? '<span class="badge badge-bad">未排除女性</span>' : isFemale && r.cost === 0 ? '<span class="badge badge-good">已排除</span>' : ''}</td>
    </tr>`;
  });
  U.html('gender-tbody', gHtml || '<tr><td colspan="9" class="muted" style="text-align:center;padding:20px;">暂无性别数据。运行 fetch_adw_data.py 拉取 gender_view 后可用。</td></tr>');
}

let _allAgeCache = [];

function renderAge() {
  _allAgeCache = [];
  Object.entries(AGE_MAP).forEach(([camp, rows]) => {
    const campTotal = rows.reduce((s, r) => s + (r.cost || 0), 0);
    rows.forEach(r => {
      const roas = r.cost > 0 ? (r.revenue || 0) / r.cost : 0;
      _allAgeCache.push({ ...r, campTotal, roas });
    });
  });

  const campNames = [...new Set(_allAgeCache.map(r => r.campaign))].sort();
  const campSelect = document.getElementById('age-filter-camp');
  if (campSelect) {
    campSelect.innerHTML = '<option value="all">全部 Campaign</option>' +
      campNames.map(c => `<option value="${c}">${U.campShortName(c)}</option>`).join('');
  }

  renderAgeKpis(_allAgeCache);
  renderAgeTable(_allAgeCache);

  const rangeFilter = document.getElementById('age-filter-range');
  const campFilter = document.getElementById('age-filter-camp');
  if (rangeFilter) rangeFilter.onchange = () => applyAgeFilters();
  if (campFilter) campFilter.onchange = () => applyAgeFilters();
}

function applyAgeFilters() {
  const rangeVal = document.getElementById('age-filter-range')?.value || 'all';
  const campVal = document.getElementById('age-filter-camp')?.value || 'all';
  let filtered = _allAgeCache;
  if (rangeVal !== 'all') filtered = filtered.filter(r => r.ageRange === rangeVal);
  if (campVal !== 'all') filtered = filtered.filter(r => r.campaign === campVal);
  renderAgeKpis(filtered);
  renderAgeTable(filtered);
}

function renderAgeKpis(data) {
  const totalCost = data.reduce((s, r) => s + (r.cost || 0), 0);
  const totalRevenue = data.reduce((s, r) => s + (r.revenue || 0), 0);
  const youngCost = data.filter(r => r.ageRange === '18-24' || r.ageRange === '25-34').reduce((s, r) => s + (r.cost || 0), 0);
  const seniorCost = data.filter(r => r.ageRange === '55-64' || r.ageRange === '65+').reduce((s, r) => s + (r.cost || 0), 0);
  const overallRoas = totalCost > 0 ? totalRevenue / totalCost : 0;
  const campCount = new Set(data.map(r => r.campaign)).size;

  U.html('age-kpis', `
    <div class="kpi-card"><div class="kpi-label">Campaign 数</div><div class="kpi-value">${campCount}</div></div>
    <div class="kpi-card"><div class="kpi-label">18-34 核心人群花费</div><div class="kpi-value">${U.fmtK(Math.round(youngCost))}</div><div class="kpi-sub">${U.fmtPct(U.pct(youngCost, totalCost), 1)} 占比</div></div>
    <div class="kpi-card"><div class="kpi-label">55+ 低意愿花费</div><div class="kpi-value clr-${seniorCost > 500 ? 'warn' : 'good'}">${U.fmtK(Math.round(seniorCost))}</div><div class="kpi-sub">${U.fmtPct(U.pct(seniorCost, totalCost), 1)} 占比</div></div>
    <div class="kpi-card"><div class="kpi-label">整体 ROAS</div><div class="kpi-value clr-${overallRoas >= 1 ? 'good' : 'bad'}">${U.fmt(overallRoas, 2)}</div><div class="kpi-sub">转化价值 ${U.fmtK(Math.round(totalRevenue))}</div></div>
  `);
}

function renderAgeTable(data) {
  let aHtml = '';
  data.sort((a, b) => {
    if (a.campaign !== b.campaign) return a.campaign.localeCompare(b.campaign);
    return (b.cost || 0) - (a.cost || 0);
  }).forEach(r => {
    const pct = r.campTotal > 0 ? U.pct(r.cost, r.campTotal) : 0;
    const isLowValue = (r.ageRange === '65+' || r.ageRange === '未确定') && r.cost > 50;
    const roasClr = r.roas >= 1 ? 'clr-good' : r.roas > 0 ? 'clr-warn' : '';
    aHtml += `<tr${isLowValue ? ' style="background:var(--orange-bg)"' : ''}>
      <td class="bold">${U.campShortName(r.campaign)}</td>
      <td>${r.ageRange}</td>
      <td class="num">${U.fmtK(Math.round(r.cost))}</td>
      <td class="num">${U.fmtK(r.clicks)}</td>
      <td class="num">${U.fmtK(r.impressions)}</td>
      <td class="num">${U.fmt(r.conversions, 0)}</td>
      <td class="num">${U.fmtK(Math.round(r.revenue))}</td>
      <td class="num bold ${roasClr}">${U.fmt(r.roas, 2)}</td>
      <td class="num">${U.fmtPct(pct, 1)}</td>
      <td>${isLowValue ? '<span class="badge badge-warn">低价值年龄段</span>' : ''}</td>
    </tr>`;
  });
  U.html('age-tbody', aHtml || '<tr><td colspan="10" class="muted" style="text-align:center;padding:20px;">暂无匹配数据</td></tr>');
}

// ═══════════════════════════════════════
// 违规提醒 (Ad Policy Status)
// ═══════════════════════════════════════
function renderAdPolicy() {
  const disapproved = (typeof ADW_DISAPPROVED_ADS !== 'undefined') ? ADW_DISAPPROVED_ADS : [];
  const nonNormal = (typeof ADW_POLICY_NON_NORMAL !== 'undefined') ? ADW_POLICY_NON_NORMAL : [];
  const totalScanned = (typeof ADW_POLICY_TOTAL_COUNT !== 'undefined') ? ADW_POLICY_TOTAL_COUNT : 0;
  const allPolicy = nonNormal.length > 0 ? nonNormal : disapproved;

  const disapprovedCount = allPolicy.filter(a => a.approvalStatus === '已拒登').length;
  const limitedCount = allPolicy.filter(a => a.approvalStatus === '受限批准').length;
  const approvedCount = totalScanned - allPolicy.length;
  const affectedCamps = [...new Set(allPolicy.map(a => a.campaign))].length;

  const navBadge = U.el('nav-policy-count');
  if (navBadge) navBadge.textContent = disapprovedCount + limitedCount;

  U.html('policy-kpis', `
    <div class="kpi-card"><div class="kpi-label">已拒登广告</div><div class="kpi-value clr-${disapprovedCount > 0 ? 'bad' : 'good'}">${disapprovedCount}</div><div class="kpi-sub">${disapprovedCount > 0 ? '需立即处理' : '无拒登'}</div></div>
    <div class="kpi-card"><div class="kpi-label">受限批准</div><div class="kpi-value clr-${limitedCount > 0 ? 'warn' : 'good'}">${limitedCount}</div><div class="kpi-sub">${limitedCount > 0 ? '部分受众不展示' : '无受限'}</div></div>
    <div class="kpi-card"><div class="kpi-label">已审核通过</div><div class="kpi-value clr-good">${approvedCount}</div><div class="kpi-sub">共扫描 ${totalScanned} 条广告</div></div>
    <div class="kpi-card"><div class="kpi-label">涉及异常 Campaign</div><div class="kpi-value">${affectedCamps}</div><div class="kpi-sub">${affectedCamps === 0 ? '全部正常' : '需关注'}</div></div>
  `);

  let html = '';
  if (allPolicy.length > 0) {
    allPolicy.forEach(ad => {
      const isDisapproved = ad.approvalStatus === '已拒登';
      const isLimited = ad.approvalStatus === '受限批准';
      const statusCls = isDisapproved ? 'badge-bad' : isLimited ? 'badge-warn' : 'badge-info';
      const topics = (ad.policyTopics || []).map(t => `${t.topic} (${t.type})`).join(', ') || '--';

      let suggestion = '';
      if (isDisapproved) suggestion = '<span class="badge badge-bad">立即修改广告素材并重新提交审核</span>';
      else if (isLimited) suggestion = '<span class="badge badge-warn">检查受限原因，评估对量级的影响</span>';

      html += `<tr${isDisapproved ? ' style="background:var(--red-bg)"' : ''}>
        <td class="bold">${U.campShortName(ad.campaign)}</td>
        <td class="muted">${ad.adGroup || '--'}</td>
        <td class="muted">${ad.adId}</td>
        <td>${ad.adType || '--'}</td>
        <td><span class="badge ${statusCls}">${ad.approvalStatus}</span></td>
        <td class="muted" style="white-space:normal;max-width:250px;">${topics}</td>
        <td>${suggestion}</td>
      </tr>`;
    });
  } else if (totalScanned > 0) {
    html = `<tr><td colspan="7" style="text-align:center;padding:30px;">
      <div style="font-size:24px;margin-bottom:8px;">✅</div>
      <div style="font-weight:600;margin-bottom:4px;">全部广告审核正常</div>
      <div class="muted">共扫描 ${totalScanned} 条广告，无拒登或受限情况。</div>
    </td></tr>`;
  } else {
    html = `<tr><td colspan="7" style="text-align:center;padding:30px;">
      <div class="muted">暂无 Policy 数据。请运行 <code>python3 fetch_adw_data.py</code> 拉取。</div>
    </td></tr>`;
  }

  U.html('policy-tbody', html);
}

// ═══════════════════════════════════════
// 广告文案分析 (Ad Copy)
// ═══════════════════════════════════════
let adcopySortCol = 'conversions';
let adcopySortDesc = true;

function initAdCopyModule() {
  if (typeof ADW_ALL_ASSETS === 'undefined') return;

  U.el('adcopy-camptype-select').addEventListener('change', renderAdCopy);
  U.el('adcopy-geo-select').addEventListener('change', renderAdCopy);
  U.el('adcopy-type-select').addEventListener('change', renderAdCopy);

  // Sorting listeners
  document.querySelectorAll('#view-ad-copy .sortable').forEach(th => {
    th.addEventListener('click', (e) => {
      const col = e.currentTarget.dataset.sort;
      if (adcopySortCol === col) {
        adcopySortDesc = !adcopySortDesc;
      } else {
        adcopySortCol = col;
        adcopySortDesc = true;
      }
      renderAdCopy();
    });
  });

  // Popover listener
  document.addEventListener('click', (e) => {
    const badge = e.target.closest('.adcopy-camp-count');
    if (badge) {
      showCampPopover(badge, JSON.parse(badge.dataset.camps));
      e.stopPropagation();
    } else {
      hideCampPopover();
    }
  });

  renderAdCopy();
}

function showCampPopover(el, camps) {
  let pop = document.getElementById('adcopy-popover');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'adcopy-popover';
    pop.className = 'adcopy-popover';
    document.body.appendChild(pop);
  }
  const rect = el.getBoundingClientRect();
  pop.innerHTML = `<strong>覆盖的 Campaign (${camps.length})</strong><div class="popover-list">${camps.map(c => `<div>${U.campShortName(c)}</div>`).join('')}</div>`;
  pop.style.display = 'block';
  
  // Calculate position
  const popRect = pop.getBoundingClientRect();
  let top = rect.bottom + window.scrollY + 8;
  let left = rect.left + window.scrollX - popRect.width + rect.width;
  
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';
}

function hideCampPopover() {
  const pop = document.getElementById('adcopy-popover');
  if (pop) pop.style.display = 'none';
}

function renderAdCopy() {
  if (typeof ADW_ALL_ASSETS === 'undefined') return;

  const campType = U.el('adcopy-camptype-select').value;
  const geo  = U.el('adcopy-geo-select').value;
  const type = U.el('adcopy-type-select').value;

  let filtered = ADW_ALL_ASSETS.filter(a => {
    const lower = a.campaign.toLowerCase();
    const isDisplay = lower.includes('display') || lower.includes('pmax');
    if (campType === 'search'  && isDisplay) return false;
    if (campType === 'display' && !isDisplay) return false;
    if (geo === 'in'    && !lower.includes('-in-')) return false;
    if (geo === 'us_uk' && !lower.includes('-us-') && !lower.includes('-uk-')) return false;
    if (geo === 'me'    && !lower.includes('ar+uae')) return false;
    if (type !== 'all'  && a.type !== type) return false;
    return true;
  });

  const aggMap = {};
  filtered.forEach(a => {
    const key = a.text + '|||' + a.type;
    if (!aggMap[key]) {
      aggMap[key] = {
        text: a.text, type: a.type,
        impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0,
        camps: new Set(), perfLabels: new Set()
      };
    }
    const g = aggMap[key];
    g.impressions += a.impressions;
    g.clicks      += a.clicks;
    g.cost        += a.cost;
    g.conversions += a.conversions;
    g.revenue     += a.revenue;
    g.camps.add(a.campaign);
    if (a.performance && a.performance !== 'NOT_APPLICABLE' && a.performance !== 'PENDING') {
      g.perfLabels.add(a.performance);
    }
  });

  let results = Object.values(aggMap).map(r => {
    r.ctr = r.impressions > 0 ? (r.clicks / r.impressions * 100) : 0;
    r.cpa = r.conversions > 0 ? r.cost / r.conversions : 0;
    r.roas = r.cost > 0 ? r.revenue / r.cost : 0;
    r.coverage = r.camps.size;
    return r;
  });

  // Apply Sorting
  results.sort((a, b) => {
    let valA = a[adcopySortCol];
    let valB = b[adcopySortCol];
    if (valA < valB) return adcopySortDesc ? 1 : -1;
    if (valA > valB) return adcopySortDesc ? -1 : 1;
    return 0;
  });

  // Update Table Headers
  document.querySelectorAll('#view-ad-copy .sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === adcopySortCol) {
      th.classList.add(adcopySortDesc ? 'sort-desc' : 'sort-asc');
    }
  });

  const maxConv = results.length ? Math.max(...results.map(r => r.conversions)) : 1;

  const totalConv = results.reduce((s, r) => s + r.conversions, 0);
  const totalCost = results.reduce((s, r) => s + r.cost, 0);
  const totalRev  = results.reduce((s, r) => s + r.revenue, 0);
  const avgCpa    = totalConv > 0 ? totalCost / totalConv : 0;
  const avgRoas   = totalCost > 0 ? totalRev / totalCost : 0;
  const headlines = results.filter(r => r.type === '标题').length;
  const descs     = results.filter(r => r.type === '描述').length;

  U.html('adcopy-kpis', `
    <div class="kpi-grid kpi-grid-5">
      <div class="kpi-card">
        <div class="kpi-label">独立文案数</div>
        <div class="kpi-value">${results.length}</div>
        <div class="kpi-sub">标题 ${headlines} / 描述 ${descs}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">总转化</div>
        <div class="kpi-value clr-good">${U.fmtK(Math.round(totalConv))}</div>
        <div class="kpi-sub">筛选范围内</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">总花费</div>
        <div class="kpi-value">${U.fmtK(Math.round(totalCost))}</div>
        <div class="kpi-sub">HKD</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">平均 CPA</div>
        <div class="kpi-value ${avgCpa > 0 ? U.colorClassInverse(avgCpa, 50, 100) : ''}">${avgCpa > 0 ? U.fmt(avgCpa) : '--'}</div>
        <div class="kpi-sub">HKD</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">整体 ROAS</div>
        <div class="kpi-value ${avgRoas > 0 ? U.colorClass(avgRoas, 1.5, 0.8) : ''}">${avgRoas > 0 ? U.fmt(avgRoas) + 'x' : '--'}</div>
        <div class="kpi-sub">Revenue / Cost</div>
      </div>
    </div>
  `);

  let html = '';
  results.forEach((r, idx) => {
    const ctr  = r.ctr;
    const cpa  = r.cpa;
    const roas = r.roas;
    const barW = maxConv > 0 ? Math.max(2, r.conversions / maxConv * 100) : 0;

    let perfHtml;
    if (r.perfLabels.has('BEST'))      perfHtml = '<span class="adcopy-perf-best">BEST</span>';
    else if (r.perfLabels.has('GOOD')) perfHtml = '<span class="adcopy-perf-good">GOOD</span>';
    else if (r.perfLabels.has('LOW'))  perfHtml = '<span class="adcopy-perf-low">LOW</span>';
    else                                perfHtml = '<span class="muted">--</span>';

    const typeBg = r.type === '标题' ? 'background:#f0f4ff;color:#4f46e5' : 'background:#fdf4ff;color:#9333ea';
    const campsJson = JSON.stringify(Array.from(r.camps).sort());

    html += `<tr>
      <td style="max-width:320px;white-space:normal;line-height:1.6">
        <span style="font-weight:600;color:var(--text)">${r.text}</span>
        <div class="asset-bar"><div class="asset-bar-fill" style="width:${barW}%"></div></div>
      </td>
      <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;${typeBg}">${r.type}</span></td>
      <td>${perfHtml}</td>
      <td class="num" style="font-weight:700;${r.conversions > 0 ? 'color:var(--green)' : ''}">${U.fmt(r.conversions, 1)}</td>
      <td class="num">${U.fmtK(Math.round(r.cost))}</td>
      <td class="num ${cpa > 0 ? U.colorClassInverse(cpa, 50, 100) : ''}">${cpa > 0 ? U.fmt(cpa) : '--'}</td>
      <td class="num ${roas > 0 ? U.colorClass(roas, 1.5, 0.8) : ''}">${roas > 0 ? U.fmt(roas) + 'x' : '--'}</td>
      <td class="num">${U.fmtK(r.impressions)}</td>
      <td class="num">${U.fmtK(r.clicks)}</td>
      <td class="num">${U.fmtPct(ctr)}</td>
      <td class="num"><span class="adcopy-camp-count" data-camps='${campsJson}'>${r.coverage}</span></td>
    </tr>`;
  });

  if (!html) html = '<tr><td colspan="11" class="muted" style="text-align:center;padding:30px">暂无符合条件的文案数据</td></tr>';
  U.html('adcopy-tbody', html);
}

// ═══════════════════════════════════════
// 变更日志模块
// ═══════════════════════════════════════
const CHANGE_LOG = (typeof ADW_CHANGE_HISTORY !== 'undefined' && Array.isArray(ADW_CHANGE_HISTORY)) ? ADW_CHANGE_HISTORY : [];
/** true = adw_data_changelog.js 未执行（404、路径错误或脚本被拦截） */
const CHANGE_LOG_SCRIPT_MISSING = typeof ADW_CHANGE_HISTORY === 'undefined';

function formatChangeDetail(entry) {
  if (!entry.details || entry.details.length === 0) {
    if (entry.changedFields && entry.changedFields.length > 0)
      return entry.changedFields.map(f => `<span class="muted">${f.split('.').pop()}</span>`).join(', ');
    return `<span class="muted">${entry.operation}</span>`;
  }

  if (entry.resourceType === 'Campaign否定词') {
    const dMap = {};
    entry.details.forEach(d => { dMap[d.field] = d; });
    const sub = entry.negSubType || '';
    const kw = (dMap.text && dMap.text.new) ? dMap.text.new : '';
    const mt = (dMap.match_type && dMap.match_type.new) ? dMap.match_type.new : '';
    const label = (dMap.type && dMap.type.new) ? dMap.type.new : '';

    if (kw) {
      return `<span class="badge badge-bad" style="font-size:10px;">否定词</span> <span class="cl-new" style="font-weight:600;">${kw}</span>` +
        (mt ? ` <span class="muted" style="font-size:11px;">[${mt}]</span>` : '');
    }
    if (sub === '排除内容标签' && label) {
      return `<span class="badge badge-neutral" style="font-size:10px;">内容标签</span> <span class="cl-new">${label.replace(/_/g, ' ')}</span>`;
    }
    if (sub) {
      const statusD = dMap.status;
      if (statusD && statusD.old && !statusD.new)
        return `<span class="badge badge-neutral" style="font-size:10px;">${sub}</span> <span class="muted">已移除</span>`;
      return `<span class="badge badge-neutral" style="font-size:10px;">${sub}</span>`;
    }
  }

  const skip = new Set(['campaign', 'criterion_id', 'resource_name', 'negative']);
  const meaningful = entry.details.filter(d => !skip.has(d.field) && (d.old || d.new));
  const list = meaningful.length > 0 ? meaningful : entry.details.filter(d => !skip.has(d.field));

  return list.map(d => {
    const field = d.field || '?';
    if (d.old && d.new) return `<span class="cl-field">${field}</span>: <span class="cl-old">${d.old}</span> → <span class="cl-new">${d.new}</span>`;
    if (d.new) return `<span class="cl-field">${field}</span>: <span class="cl-new">${d.new}</span>`;
    if (d.old) return `<span class="cl-field">${field}</span>: <del class="cl-old">${d.old}</del>`;
    return `<span class="cl-field">${field}</span>`;
  }).join('<br>');
}

function formatDateTime(dt) {
  if (!dt) return '--';
  const d = dt.replace(/\.\d+$/, '');
  return d;
}

function opBadge(op) {
  if (op === '新建') return '<span class="badge badge-good">新建</span>';
  if (op === '修改') return '<span class="badge badge-warn">修改</span>';
  if (op === '移除') return '<span class="badge badge-bad">移除</span>';
  return `<span class="badge badge-neutral">${op}</span>`;
}

function typeBadge(t) {
  const cls = { 'Campaign': 'search', '广告组': 'info', '关键词': 'func', '广告': 'neutral',
    '预算': 'warn', 'Campaign否定词': 'bad', '出价调整': 'warn', '素材': 'neutral' };
  return `<span class="badge badge-${cls[t] || 'neutral'}">${t}</span>`;
}

function renderChangeLog() {
  if (CHANGE_LOG.length === 0) {
    const navBadge = U.el('nav-change-count');
    if (navBadge) navBadge.textContent = '0';
    let sub = '暂无数据，请在本机运行 <code style="font-size:11px;">fetch_change_history.py</code> 生成 <code style="font-size:11px;">adw_data_changelog.js</code> 后重新部署。';
    let tbodyMsg = '暂无变更历史数据';
    if (CHANGE_LOG_SCRIPT_MISSING) {
      sub = '<strong style="color:#b45309;">未加载到变更数据文件</strong>：请打开开发者工具 → Network，确认 <code style="font-size:11px;">adw_data_changelog.js</code> 是否为 200（若 404，检查部署目录是否包含该文件、路径是否为 /dashboard/js/…）。强制刷新 Ctrl+Shift+R 或清除缓存后再试。';
      tbodyMsg = '未检测到 ADW_CHANGE_HISTORY（changelog 脚本可能未加载）';
    }
    U.html('changelog-kpis', `<div class="kpi-card"><div class="kpi-label">变更记录</div><div class="kpi-value clr-muted">0</div><div class="kpi-sub" style="line-height:1.5;">${sub}</div></div>`);
    U.html('changelog-tbody', `<tr><td colspan="8" class="muted" style="text-align:center;padding:40px;max-width:720px;margin:0 auto;">${tbodyMsg}</td></tr>`);
    return;
  }

  U.el('nav-change-count').textContent = CHANGE_LOG.length;

  const campFilter = U.el('cl-filter-camp');
  const camps = [...new Set(CHANGE_LOG.map(e => e.campaign).filter(Boolean))].sort();
  campFilter.innerHTML = '<option value="all">全部 Campaign</option>' + camps.map(c => `<option value="${c}">${U.campShortName(c)}</option>`).join('');

  const typeCount = {};
  const opCount = {};
  const dateCount = {};
  CHANGE_LOG.forEach(e => {
    typeCount[e.resourceType] = (typeCount[e.resourceType] || 0) + 1;
    opCount[e.operation] = (opCount[e.operation] || 0) + 1;
    const day = (e.dateTime || '').slice(0, 10);
    if (day) dateCount[day] = (dateCount[day] || 0) + 1;
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = dateCount[today] || 0;
  const topType = Object.entries(typeCount).sort((a,b) => b[1] - a[1])[0] || ['--', 0];

  U.html('changelog-kpis', `
    <div class="kpi-card"><div class="kpi-label">总变更数</div><div class="kpi-value">${CHANGE_LOG.length}</div><div class="kpi-sub">近 30 天</div></div>
    <div class="kpi-card"><div class="kpi-label">今日变更</div><div class="kpi-value ${todayCount > 0 ? 'clr-warn' : ''}">${todayCount}</div><div class="kpi-sub">${today}</div></div>
    <div class="kpi-card"><div class="kpi-label">新建</div><div class="kpi-value clr-good">${opCount['新建'] || 0}</div></div>
    <div class="kpi-card"><div class="kpi-label">修改</div><div class="kpi-value clr-warn">${opCount['修改'] || 0}</div></div>
    <div class="kpi-card"><div class="kpi-label">移除</div><div class="kpi-value clr-bad">${opCount['移除'] || 0}</div></div>
  `);

  // Initialize date range from data
  const allDates = CHANGE_LOG.map(e => (e.dateTime || '').slice(0, 10)).filter(Boolean).sort();
  if (allDates.length > 0) {
    U.el('cl-filter-date-start').value = allDates[0];
    U.el('cl-filter-date-end').value = allDates[allDates.length - 1];
  }

  filterChangeLog();

  campFilter.addEventListener('change', filterChangeLog);
  U.el('cl-filter-type').addEventListener('change', filterChangeLog);
  U.el('cl-filter-op').addEventListener('change', filterChangeLog);
  U.el('cl-search').addEventListener('input', filterChangeLog);
  U.el('cl-filter-date-start').addEventListener('change', filterChangeLog);
  U.el('cl-filter-date-end').addEventListener('change', filterChangeLog);
}

function filterChangeLog() {
  const campVal = U.el('cl-filter-camp').value;
  const typeVal = U.el('cl-filter-type').value;
  const opVal = U.el('cl-filter-op').value;
  const searchVal = U.el('cl-search').value.trim().toLowerCase();
  const dateStart = U.el('cl-filter-date-start').value;
  const dateEnd = U.el('cl-filter-date-end').value;

  let filtered = CHANGE_LOG;
  if (campVal !== 'all') filtered = filtered.filter(e => e.campaign === campVal);
  if (typeVal !== 'all') {
    const negSubMap = {
      'neg-kw': '否定关键词', 'neg-app-cat': '排除App类别',
      'neg-content': '排除内容标签', 'neg-placement': '排除展示位置',
      'neg-other': '_other_'
    };
    if (negSubMap[typeVal]) {
      const sub = negSubMap[typeVal];
      if (sub === '_other_') {
        filtered = filtered.filter(e => e.resourceType === 'Campaign否定词' &&
          !['否定关键词','排除App类别','排除内容标签','排除展示位置'].includes(e.negSubType || ''));
      } else {
        filtered = filtered.filter(e => e.resourceType === 'Campaign否定词' && e.negSubType === sub);
      }
    } else {
      filtered = filtered.filter(e => e.resourceType === typeVal);
    }
  }
  if (opVal !== 'all') filtered = filtered.filter(e => e.operation === opVal);
  if (dateStart) filtered = filtered.filter(e => (e.dateTime || '').slice(0, 10) >= dateStart);
  if (dateEnd) filtered = filtered.filter(e => (e.dateTime || '').slice(0, 10) <= dateEnd);
  if (searchVal.length >= 2) {
    filtered = filtered.filter(e =>
      (e.campaign || '').toLowerCase().includes(searchVal) ||
      (e.adGroup || '').toLowerCase().includes(searchVal) ||
      (e.userEmail || '').toLowerCase().includes(searchVal) ||
      (e.resourceType || '').toLowerCase().includes(searchVal)
    );
  }

  let html = '';
  filtered.slice(0, 500).forEach(e => {
    html += `<tr>
      <td style="white-space:nowrap;font-size:11px;">${formatDateTime(e.dateTime)}</td>
      <td class="muted" style="font-size:11px;">${e.userEmail ? e.userEmail.split('@')[0] : '--'}</td>
      <td style="font-size:10px;">${e.clientType || '--'}</td>
      <td class="bold" title="${e.campaign}">${U.campShortName(e.campaign || '--')}</td>
      <td class="muted">${e.adGroup || '--'}</td>
      <td>${typeBadge(e.resourceType)}${e.negSubType ? '<br><span class="muted" style="font-size:10px;">'+e.negSubType+'</span>' : ''}</td>
      <td>${opBadge(e.operation)}</td>
      <td style="font-size:12px;white-space:normal;max-width:350px;">${formatChangeDetail(e)}</td>
    </tr>`;
  });

  if (!html) html = '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px;">无匹配的变更记录</td></tr>';
  if (filtered.length > 500) html += `<tr><td colspan="8" class="muted" style="text-align:center;padding:10px;">仅显示前 500 条（共 ${filtered.length} 条）</td></tr>`;
  U.html('changelog-tbody', html);
}

function getChangesForCampaign(campName, limit) {
  return CHANGE_LOG.filter(e => e.campaign === campName).slice(0, limit || 5);
}

function getChangesForAdGroup(campName, agName, limit) {
  return CHANGE_LOG.filter(e => e.campaign === campName && e.adGroup === agName).slice(0, limit || 3);
}

function renderChangesSummary(changes, label) {
  if (!changes || changes.length === 0) return '';
  let html = `<div class="changes-summary"><div class="changes-summary-title">📋 ${label}（${changes.length} 条）</div><div class="changes-summary-list">`;
  changes.forEach(e => {
    html += `<div class="changes-summary-row">
      <span class="muted" style="font-size:10px;min-width:90px;">${formatDateTime(e.dateTime).slice(5)}</span>
      ${typeBadge(e.resourceType)} ${opBadge(e.operation)}
      <span style="font-size:11px;flex:1;">${formatChangeDetail(e)}</span>
    </div>`;
  });
  html += '</div></div>';
  return html;
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
function refreshAllDashboardRenders() {
  const modules = [
    renderTrustGate, renderBudgetMonitor, renderCPAMonitor, renderHourlySpend,
    renderCampaignOverview, renderDrillDown, renderRootCause,
    refreshSearchTermsSelectOnly, renderAdCopy, renderClusterView,
    renderQualityScore, renderDevices, renderLandingPageZone,
    renderGender, renderAge, renderAdPolicy, renderChangeLog, renderNegKWCenter
  ];
  modules.forEach(fn => {
    try { fn(); } catch (e) { console.error('[Dashboard]', fn.name, e); }
  });
}

function syncSidebarDataLines() {
  const bundle = document.getElementById('sidebar-bundle-line');
  const filt = document.getElementById('sidebar-filter-line');
  const gen = document.getElementById('sidebar-generated-line');
  if (bundle) {
    bundle.textContent = `数据包: ${ADW_META.startDate} ~ ${ADW_BUNDLE_END_EFFECTIVE}（全包筛选: 起≤${ADW_META.startDate} 且 止≥${ADW_BUNDLE_END_EFFECTIVE}）`;
  }
  if (filt) {
    filt.textContent = DATE_RANGE.start === DATE_RANGE.end
      ? `分析区间: 单日 ${DATE_RANGE.start}`
      : `分析区间: ${DATE_RANGE.start} ~ ${DATE_RANGE.end}`;
  }
  if (gen) {
    const g = ADW_META.generatedAt ? `生成: ${ADW_META.generatedAt}` : '';
    gen.textContent = [g, '仅 Search 为核心'].filter(Boolean).join(' | ');
  }
}

function setGlobalDateRange(start, end, options = {}) {
  const { updateInputs = true } = options;
  const hint = document.getElementById('date-range-hint');
  const applyBtn = document.getElementById('date-range-apply');
  try {
    recomputeBundleEndEffective();
    let s = start;
    let e = end;
    if (s > e) { const t = s; s = e; e = t; }
    s = clampYmd(s, ADW_META.startDate, ADW_BUNDLE_END_EFFECTIVE);
    e = clampYmd(e, ADW_META.startDate, ADW_BUNDLE_END_EFFECTIVE);
    DATE_RANGE = { start: s, end: e };
    saveDateRange(s, e);
    if (updateInputs) {
      const dsi = document.getElementById('date-range-start');
      const dei = document.getElementById('date-range-end');
      if (dsi) dsi.value = s;
      if (dei) dei.value = e;
    }
    rebuildMapsForDateRange(s, e);
    refreshAllDashboardRenders();
    syncSidebarDataLines();
    if (applyBtn) {
      applyBtn.textContent = '已应用 ✓';
      applyBtn.style.background = 'var(--green, #22c55e)';
      setTimeout(() => { applyBtn.textContent = '应用'; applyBtn.style.background = ''; }, 1200);
    }
    const spendSum = Math.round(SEARCH_CAMPS.reduce((t, c) => t + (c.spend || 0), 0));
    const dailyKeys = Object.keys(CAMP_DAILY_MAP).length;
    const kwKeys = Object.keys(KW_MAP).length;
    const rawKwKeys = Object.keys(RAW_KW_BY_CAMP).length;
    const noSlice = SEARCH_CAMPS.filter(c => c._noCampDailySlice).length;
    if (hint) {
      hint.textContent = `✅ ${s} ~ ${e} | Spend合计 ${spendSum} | 系列 ${SEARCH_CAMPS.length}(无日切${noSlice}) | dailyMap ${dailyKeys} | KW ${kwKeys}/${rawKwKeys}`;
    }
    console.log('[DateRange] Applied:', s, '~', e, 'Spend:', spendSum, 'dailyMap:', dailyKeys, 'rawKW:', rawKwKeys, 'KW:', kwKeys, 'noSlice:', noSlice);
  } catch (err) {
    console.error('[DateRange] Error:', err);
    if (hint) hint.textContent = '日期应用出错: ' + err.message;
    if (applyBtn) { applyBtn.textContent = '出错'; applyBtn.style.background = 'var(--red, #ef4444)'; setTimeout(() => { applyBtn.textContent = '应用'; applyBtn.style.background = ''; }, 3000); }
  }
}

function applyQuickDatePreset(kind) {
  recomputeBundleEndEffective();
  const ds0 = ADW_META.startDate;
  const de0 = ADW_BUNDLE_END_EFFECTIVE;
  const todayWall = ymdLocal(new Date());
  let ref = todayWall;
  if (ref > de0) ref = de0;
  if (ref < ds0) ref = ds0;
  let s;
  let e;
  if (kind === 'today') {
    s = e = ref;
  } else if (kind === 'yesterday') {
    const y = addDaysYmd(todayWall, -1);
    const yc = clampYmd(y, ds0, de0);
    s = e = yc;
  } else if (kind === 'last7') {
    e = ref;
    s = addDaysYmd(e, -6);
    if (s < ds0) s = ds0;
    s = clampYmd(s, ds0, de0);
    e = clampYmd(e, ds0, de0);
  } else {
    return;
  }
  setGlobalDateRange(s, e, { updateInputs: true });
}

let _globalDateBarBound = false;
function initGlobalDateRangeBar() {
  const ds = document.getElementById('date-range-start');
  const de = document.getElementById('date-range-end');
  const btn = document.getElementById('date-range-apply');
  if (!ds || !de || !btn) return;
  recomputeBundleEndEffective();
  ds.min = de.min = ADW_META.startDate;
  ds.max = de.max = ADW_BUNDLE_END_EFFECTIVE;
  ds.value = DATE_RANGE.start;
  de.value = DATE_RANGE.end;
  const hint = document.getElementById('date-range-hint');
  if (hint) {
    hint.textContent = '改日期后点「应用」。悬停本行可看数据口径说明。';
    hint.title = `默认「今天」单日（按数据包截断）。快捷：昨天 / 近7天。无 date 的行仅「全包」计入（起≤${ADW_META.startDate} 且 止≥${ADW_BUNDLE_END_EFFECTIVE}）。无 ADW_CAMP_* 的 Spend 为包内汇总。`;
  }
  syncSidebarDataLines();
  if (_globalDateBarBound) return;
  _globalDateBarBound = true;
  btn.addEventListener('click', () => {
    let s = ds.value;
    let e = de.value;
    if (!s || !e) return;
    setGlobalDateRange(s, e, { updateInputs: true });
  });
  document.querySelectorAll('.global-date-bar-quick[data-preset]').forEach(b => {
    b.addEventListener('click', () => applyQuickDatePreset(b.getAttribute('data-preset')));
  });
}

try {
  initSearchTermsModule();
  initAdCopyModule();
  refreshAllDashboardRenders();
  initGlobalDateRangeBar();
  const _navActive = document.querySelector('.nav-item.active');
  syncChromeForView(_navActive && _navActive.dataset.view ? _navActive.dataset.view : '');
  console.log('[INIT OK] SEARCH_CAMPS:', SEARCH_CAMPS.length, 'DATE_RANGE:', JSON.stringify(DATE_RANGE));
} catch (e) {
  console.error('[INIT FATAL]', e);
  const bar = document.getElementById('date-range-hint');
  if (bar) bar.textContent = 'JS 初始化报错: ' + e.message;
  document.title = 'INIT ERR: ' + e.message;
}

(function initHourlySelects() {
  const cs = document.getElementById('hourly-camp-select');
  const ds = document.getElementById('hourly-date-select');
  if (cs) cs.addEventListener('change', renderHourlySpend);
  if (ds) ds.addEventListener('change', renderHourlySpend);
})();

// ═══════════════════════════════════════
// NEGATIVE KEYWORD DIAGNOSTIC CENTER
// ═══════════════════════════════════════
function renderNegKWCenter() {
  const NEG_KW = (typeof ADW_NEGATIVE_KEYWORDS !== 'undefined') ? ADW_NEGATIVE_KEYWORDS : [];
  if (NEG_KW.length === 0) return;

  // ── Intent Classification Engine ──
  const INTENT_RULES = [
    { id: 'free',     label: '🆓 白嫖/免费词',   color: '#ef4444', words: ['free','gratis','no coin','no money','without pay','muft','gratuit','مجان'] },
    { id: 'adult',    label: '🔞 色情/违规词',    color: '#dc2626', words: ['porn','sex','nude','naked','xxx','hot girl','sexy','adult video','18+','nsfw'] },
    { id: 'comp',     label: '🏷️ 竞品品牌词',     color: '#f59e0b', words: ['omegle','chatroulette','monkey app','livu','fachat','chamet','holla','emeraldchat','ome tv','ometv','tinychat','chaturbate','chathub','camsurf','shagle','bazoocam','dirtyroulette','parau','paru','vanachat','zee chat','flirtify','funchat'] },
    { id: 'platform', label: '📱 无关平台/App',    color: '#8b5cf6', words: ['discord','telegram','whatsapp','skype','zoom','instagram','tiktok','snapchat','facebook','messenger','wechat'] },
    { id: 'norel',    label: '🚫 无关功能/意图',   color: '#6b7280', words: ['group chat','voice only','text chat','text only','dating','marriage','download','apk','mod','crack','hack','review','tutorial','login','sign up'] },
    { id: 'geo',      label: '🌍 地区/语言限定',   color: '#0ea5e9', words: [] },
  ];

  function classifyIntent(kw) {
    const lower = kw.toLowerCase();
    for (const rule of INTENT_RULES) {
      if (rule.words.some(w => lower.includes(w))) return rule;
    }
    return { id: 'other', label: '❓ 其他/通用', color: '#94a3b8' };
  }

  // ── Enrich each neg kw with intent + diagnostics ──
  const posKwSet = new Set();
  FLAT_KW.forEach(k => {
    if (k.keyword) posKwSet.add(k.keyword.toLowerCase().trim());
  });

  const negByCamp = {};
  const negByKw = {};

  NEG_KW.forEach(e => {
    e._intent = classifyIntent(e.keyword);
    e._diags = [];
    const kLower = e.keyword.toLowerCase().trim();

    if (!negByCamp[e.campaign]) negByCamp[e.campaign] = [];
    negByCamp[e.campaign].push(e);

    if (!negByKw[kLower]) negByKw[kLower] = [];
    negByKw[kLower].push(e);

    // Diag: 同系列内正负互斥 vs 跨系列仅「同词出现在否+正清单」（Google 否定不跨 Campaign 生效）
    if (posKwSet.has(kLower)) {
      const conflicting = FLAT_KW.filter(k => k.keyword && k.keyword.toLowerCase().trim() === kLower);
      let sameScope = false;
      if (e.level === 'Campaign') {
        sameScope = conflicting.some(k => (k._camp || k.campaign) === e.campaign);
      } else {
        const nAg = String(e.adGroup || '').trim();
        sameScope = conflicting.some(k =>
          (k._camp || k.campaign) === e.campaign &&
          String(k.adGroup || '').trim() === nAg
        );
      }
      if (sameScope) {
        e._diags.push({
          type: 'conflict',
          icon: '⚠️',
          label: '同系列正负冲突',
          detail: `同一${e.level === 'Campaign' ? 'Campaign' : '广告组'}内同时存在正向词与否定词，否定会阻止该范围内匹配。正向词所在: ${conflicting.filter(k => {
            if (e.level === 'Campaign') return (k._camp || k.campaign) === e.campaign;
            return (k._camp || k.campaign) === e.campaign && String(k.adGroup || '').trim() === String(e.adGroup || '').trim();
          }).map(k => U.campShortName(k._camp || k.campaign)).join(', ')}`
        });
      } else {
        e._diags.push({
          type: 'portfolio-dup',
          icon: '💡',
          label: '跨系列同词',
          detail: `其它 Campaign 有同名正向词: ${conflicting.map(k => U.campShortName(k._camp || k.campaign)).join(', ')}。否定词仅作用于本${e.level === 'Campaign' ? 'Campaign' : '广告组'}，不会拦截其它系列里的正向词。`
        });
      }
    }

    // Diag: single-word broad match (overly broad)
    if (e.matchType === '广泛匹配' && !kLower.includes(' ') && kLower.length <= 8) {
      e._diags.push({
        type: 'too-broad',
        icon: '💥',
        label: '匹配过宽',
        detail: `单词"${e.keyword}"使用广泛否定，可能误杀大量有效流量`
      });
    }
  });

  // Diag: cross-campaign duplicates (AG-level same keyword in multiple AGs)
  Object.entries(negByKw).forEach(([kw, entries]) => {
    const agEntries = entries.filter(e => e.level === '广告组');
    if (agEntries.length >= 3) {
      agEntries.forEach(e => {
        if (!e._diags.some(d => d.type === 'duplicate')) {
          e._diags.push({
            type: 'duplicate',
            icon: '🔄',
            label: '跨组重复',
            detail: `"${e.keyword}" 在 ${agEntries.length} 个广告组中重复否定，建议提升至 Campaign 级`
          });
        }
      });
    }
  });

  // Diag: gap detection - neg in one campaign of a product but not in another
  const productCamps = {};
  Object.keys(negByCamp).forEach(camp => {
    const meta = U.parseCampMeta ? U.parseCampMeta(camp) : {};
    const product = meta.product || camp.split('-')[0];
    if (!productCamps[product]) productCamps[product] = [];
    productCamps[product].push(camp);
  });

  const gapAlerts = [];
  const _gapSeen = new Set();
  Object.entries(productCamps).forEach(([product, camps]) => {
    if (camps.length < 2) return;
    const campNegSets = {};
    camps.forEach(c => {
      campNegSets[c] = new Set((negByCamp[c] || []).filter(e => e.level === 'Campaign').map(e => e.keyword.toLowerCase()));
    });
    camps.forEach(c1 => {
      campNegSets[c1].forEach(kw => {
        camps.forEach(c2 => {
          if (c1 !== c2 && !campNegSets[c2].has(kw)) {
            const gapKey = kw + '|||' + c2;
            if (!_gapSeen.has(gapKey)) {
              _gapSeen.add(gapKey);
              const stData = ST_MAP[c2] || [];
              const spending = stData.filter(st => st.term && st.term.toLowerCase().includes(kw));
              const totalSpend = spending.reduce((s, st) => s + (st.cost || 0), 0);
              const negatedCamps = camps.filter(cx => campNegSets[cx] && campNegSets[cx].has(kw));
              if (totalSpend > 5) {
                gapAlerts.push({
                  keyword: kw,
                  negatedIn: negatedCamps.join(', '),
                  missingIn: c2,
                  product,
                  spend: totalSpend,
                  convs: spending.reduce((s, st) => s + (st.conversions || 0), 0)
                });
              }
            }
          }
        });
      });
    });
  });

  // ── Notes/Conversation Storage (localStorage + Supabase) ──
  const NOTES_KEY = 'negkw_diag_notes';
  function loadNotes() { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch { return {}; } }
  function saveNotes(notes) { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
  function getNotes(diagId) { return (loadNotes()[diagId] || []).sort((a,b) => a.ts - b.ts); }
  function addNote(diagId, text, role) {
    const r = role || 'user', ts = Date.now();
    const all = loadNotes();
    if (!all[diagId]) all[diagId] = [];
    all[diagId].push({ text, role: r, ts });
    saveNotes(all);
    if (typeof SBSync !== 'undefined') {
      SBSync.addNote('negkw', diagId, text, r, ts).then(sbId => {
        if (sbId != null) {
          const a2 = loadNotes(), arr = a2[diagId] || [];
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].ts === ts && arr[i].text === text && !arr[i]._sbId) { arr[i]._sbId = sbId; break; }
          }
          saveNotes(a2);
        }
      }).catch(() => {});
    }
  }
  function deleteNote(diagId, idx) {
    const all = loadNotes();
    if (!all[diagId]) return;
    const note = all[diagId][idx];
    if (note && note._sbId && typeof SBSync !== 'undefined') SBSync.deleteNote(note._sbId).catch(() => {});
    all[diagId].splice(idx, 1);
    saveNotes(all);
  }
  function diagHasNotes(diagId) { return getNotes(diagId).length > 0; }

  function makeDiagId(type, keyword, campaign) {
    return `${type}__${(keyword||'').toLowerCase()}__${(campaign||'').substring(0,30)}`;
  }

  function buildAffectedSTHtml(keyword, campaign, matchType) {
    const kw = keyword.toLowerCase().trim();
    const stArr = ST_MAP[campaign] || [];
    let affected;
    if (matchType === '精确匹配') {
      affected = stArr.filter(st => st.term && st.term.toLowerCase().trim() === kw);
    } else if (matchType === '词组匹配') {
      const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      affected = stArr.filter(st => st.term && re.test(st.term));
    } else {
      affected = stArr.filter(st => st.term && st.term.toLowerCase().includes(kw));
    }
    if (affected.length === 0) {
      return `<div class="drawer-section-title">🔍 受影响搜索词（该Campaign）</div>
        <div class="muted" style="padding:10px 0;font-size:12px;">该 Campaign 的搜索词中未找到包含 "${keyword}" 的记录。可能该词已被成功拦截或数据周期内无触发。</div>`;
    }
    affected.sort((a, b) => (b.cost || 0) - (a.cost || 0));
    const totalCost = affected.reduce((s, st) => s + (st.cost || 0), 0);
    const totalConv = affected.reduce((s, st) => s + (st.purchaseNew || 0), 0);
    const totalRev = affected.reduce((s, st) => s + (st.purchaseNewValue || 0), 0);
    const overallRoas = totalCost > 0 ? totalRev / totalCost : 0;
    const hasValue = totalConv > 0;

    let html = `<div class="drawer-section-title">🔍 受影响搜索词 — ${affected.length} 个匹配</div>`;
    html += `<div style="display:flex;gap:12px;margin:8px 0 12px;flex-wrap:wrap;">
      <div style="background:var(--bg-sub);padding:8px 14px;border-radius:8px;font-size:12px;">
        <div class="muted">总花费</div><div style="font-size:16px;font-weight:700;">${U.fmtK(Math.round(totalCost))}</div>
      </div>
      <div style="background:var(--bg-sub);padding:8px 14px;border-radius:8px;font-size:12px;">
        <div class="muted">总转化</div><div style="font-size:16px;font-weight:700;color:${totalConv > 0 ? 'var(--green)' : 'inherit'}">${totalConv}</div>
      </div>
      <div style="background:var(--bg-sub);padding:8px 14px;border-radius:8px;font-size:12px;">
        <div class="muted">ROAS</div><div style="font-size:16px;font-weight:700;color:${overallRoas >= 1 ? 'var(--green)' : overallRoas > 0 ? 'var(--orange)' : 'inherit'}">${U.fmt(overallRoas, 2)}</div>
      </div>
    </div>`;

    if (hasValue) {
      html += `<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--red);font-weight:600;">
        ⚠️ 这些搜索词有 ${totalConv} 次转化（ROAS ${U.fmt(overallRoas, 2)}），广泛否定会误杀有效流量！建议改为词组或精确匹配。</div>`;
    } else {
      html += `<div style="background:var(--green-bg, #f0fdf4);border:1px solid var(--green);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--green);font-weight:600;">
        ✅ 这些搜索词均无转化，广泛否定可安全保留。</div>`;
    }

    html += `<div style="max-height:260px;overflow-y:auto;"><table style="width:100%;font-size:11px;border-collapse:collapse;">
      <thead><tr style="background:var(--bg-sub);position:sticky;top:0;">
        <th style="text-align:left;padding:6px;">搜索词</th>
        <th style="text-align:right;padding:6px;">花费</th>
        <th style="text-align:right;padding:6px;">点击</th>
        <th style="text-align:right;padding:6px;">转化</th>
        <th style="text-align:right;padding:6px;">收入</th>
        <th style="text-align:right;padding:6px;">ROAS</th>
      </tr></thead><tbody>`;
    affected.forEach(st => {
      const roas = st.cost > 0 ? (st.purchaseNewValue || 0) / st.cost : 0;
      const hasConv = (st.purchaseNew || 0) > 0;
      html += `<tr style="border-bottom:1px solid #f1f5f9;${hasConv ? 'background:var(--red-bg);' : ''}">
        <td style="padding:5px 6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${st.term}">${st.term}</td>
        <td style="text-align:right;padding:5px 6px;">${U.fmtK(Math.round(st.cost))}</td>
        <td style="text-align:right;padding:5px 6px;">${st.clicks || 0}</td>
        <td style="text-align:right;padding:5px 6px;${hasConv ? 'color:var(--green);font-weight:600;' : ''}">${st.purchaseNew || 0}</td>
        <td style="text-align:right;padding:5px 6px;">${U.fmtK(Math.round(st.purchaseNewValue || 0))}</td>
        <td style="text-align:right;padding:5px 6px;font-weight:600;color:${roas >= 1 ? 'var(--green)' : roas > 0 ? 'var(--orange)' : 'inherit'}">${U.fmt(roas, 2)}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    return html;
  }

  function openDiagDrawer(title, detail, diagId, extraHtml) {
    const overlay = U.el('drawer-overlay');
    const drawer = U.el('kw-drawer');
    U.el('drawer-title').textContent = title;
    U.el('drawer-subtitle').textContent = '';

    function renderDrawerContent() {
      const notes = getNotes(diagId);
      let html = '';
      html += `<div class="drawer-section"><div class="drawer-section-title">🔍 诊断详情</div>`;
      html += `<div class="drawer-verdict"><div class="drawer-verdict-detail">${detail}</div></div></div>`;
      if (extraHtml) {
        html += `<div class="drawer-section">${extraHtml}</div>`;
      }
      html += `<div class="drawer-section"><div class="drawer-section-title">💬 备注与反馈 (${notes.length})</div>`;
      html += `<div class="note-thread" id="diag-note-thread" style="max-height:320px;overflow-y:auto;">`;
      notes.forEach((n, i) => {
        const time = new Date(n.ts).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
        const isAI = n.role === 'system' && n.text.startsWith('🤖');
        const saveKbBtn = n.role === 'user' ? `<button class="note-save-kb-btn" data-idx="${i}" title="存入知识库">📌</button>` : '';
        html += `<div class="note-bubble note-${n.role}" ${isAI ? 'style="background:#f0f4ff;border:1px solid #bfdbfe;"' : ''}>
          <div>${n.text.replace(/\n/g, '<br>')}</div>
          <div class="note-time">${n.role === 'user' ? '我' : isAI ? 'AI' : '系统'} · ${time}
            ${saveKbBtn}
            <button class="note-delete-btn" data-idx="${i}" title="删除">✕</button>
          </div>
        </div>`;
      });
      if (notes.length === 0) {
        html += '<div class="muted" style="text-align:center;padding:16px;font-size:12px;">输入备注...</div>';
      }
      html += '</div>';
      html += `<div class="note-input-wrap">
        <textarea class="note-input" id="diag-note-input" placeholder="输入备注..." rows="2"></textarea>
        <button class="note-send-btn" id="diag-note-send">发送</button>
      </div></div>`;
      U.html('drawer-body', html);

      U.el('diag-note-send').addEventListener('click', () => {
        const input = U.el('diag-note-input');
        const text = input.value.trim();
        if (!text) return;
        addNote(diagId, text, 'user');
        input.value = '';
        renderDrawerContent();
        setTimeout(() => {
          const thread = U.el('diag-note-thread');
          if (thread) thread.scrollTop = thread.scrollHeight;
        }, 50);
      });

      U.el('diag-note-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); U.el('diag-note-send').click(); }
      });

      document.querySelectorAll('.note-save-kb-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          const note = notes[idx];
          if (!note) return;
          if (typeof SBSync !== 'undefined' && SBSync.addKnowledge) {
            SBSync.addKnowledge('user_correction', note.text, 'user_correction', ['negkw', 'correction']).then(id => {
              if (id) {
                btn.textContent = '✅';
                btn.title = '已存入知识库';
                btn.disabled = true;
                addNote(diagId, '📌 已存入知识库。', 'system');
                renderDrawerContent();
              }
            });
          }
        });
      });

      document.querySelectorAll('.note-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteNote(diagId, parseInt(btn.dataset.idx));
          renderDrawerContent();
        });
      });
    }

    renderDrawerContent();
    overlay.classList.add('open');
    drawer.classList.add('open');
  }

  // ── KPI Cards ──
  const campLevel = NEG_KW.filter(e => e.level === 'Campaign').length;
  const agLevel = NEG_KW.filter(e => e.level === '广告组').length;
  const conflictCount = NEG_KW.filter(e => e._diags.some(d => d.type === 'conflict')).length;
  const portfolioDupCount = NEG_KW.filter(e => e._diags.some(d => d.type === 'portfolio-dup')).length;
  const broadCount = NEG_KW.filter(e => e._diags.some(d => d.type === 'too-broad')).length;
  const dupCount = NEG_KW.filter(e => e._diags.some(d => d.type === 'duplicate')).length;
  const issueCount = conflictCount + broadCount + gapAlerts.length;

  U.el('nav-negkw-count').textContent = issueCount > 0 ? issueCount : NEG_KW.length;

  U.html('negkw-kpis', `
    <div class="kpi-card"><div class="kpi-label">否定词总数</div><div class="kpi-value">${NEG_KW.length}</div><div class="kpi-sub">Campaign ${campLevel} + 广告组 ${agLevel}</div></div>
    <div class="kpi-card"><div class="kpi-label">⚠️ 同系列冲突</div><div class="kpi-value ${conflictCount ? 'clr-bad' : 'clr-good'}">${conflictCount}</div><div class="kpi-sub">同 Campaign/组内否+正</div></div>
    <div class="kpi-card"><div class="kpi-label">💡 跨系列同词</div><div class="kpi-value ${portfolioDupCount ? 'clr-warn' : 'clr-good'}">${portfolioDupCount}</div><div class="kpi-sub">资产层提醒，非竞价互斥</div></div>
    <div class="kpi-card"><div class="kpi-label">🕳️ 漏网之鱼</div><div class="kpi-value ${gapAlerts.length ? 'clr-warn' : 'clr-good'}">${gapAlerts.length}</div><div class="kpi-sub">否定了A但B还在花钱</div></div>
    <div class="kpi-card"><div class="kpi-label">💥 匹配过宽</div><div class="kpi-value ${broadCount ? 'clr-warn' : 'clr-good'}">${broadCount}</div><div class="kpi-sub">单词广泛否定</div></div>
    <div class="kpi-card"><div class="kpi-label">🔄 跨组重复</div><div class="kpi-value ${dupCount ? 'clr-warn' : 'clr-good'}">${dupCount}</div><div class="kpi-sub">建议提升至Campaign级</div></div>
  `);

  // ── Diagnostic Cards ──
  let diagHtml = '';

  // 同系列正负冲突
  const conflicts = NEG_KW.filter(e => e._diags.some(d => d.type === 'conflict'));
  diagHtml += `<div class="card"><div class="card-header"><h3>⚠️ 同系列正负冲突 (${conflicts.length})</h3></div><div class="card-body" style="max-height:280px;overflow-y:auto;font-size:13px;">`;
  if (conflicts.length === 0) {
    diagHtml += '<div class="muted" style="padding:20px;text-align:center;">✅ 未发现同 Campaign/广告组内否+正互斥</div>';
  } else {
    conflicts.forEach((e, i) => {
      const d = e._diags.find(x => x.type === 'conflict');
      const did = makeDiagId('conflict', e.keyword, e.campaign);
      const hasN = diagHasNotes(did);
      diagHtml += `<div class="diag-item ${hasN ? 'has-notes' : ''}" style="padding:6px 0;border-bottom:1px solid #f1f5f9;" data-diag-type="conflict" data-diag-idx="${i}">
        <span class="badge badge-bad" style="font-size:10px;">${e.matchType}</span>
        <strong>${e.keyword}</strong>
        <span class="muted" style="font-size:11px;"> — 否定于 ${U.campShortName(e.campaign)}</span>
        <div class="muted" style="font-size:11px;margin-top:2px;">${d.detail}</div>
      </div>`;
    });
  }
  diagHtml += '</div></div>';

  // 跨系列同词（资产层提醒）
  const portfolioDups = NEG_KW.filter(e => e._diags.some(d => d.type === 'portfolio-dup'));
  diagHtml += `<div class="card"><div class="card-header"><h3>💡 跨系列同词 (${portfolioDups.length})</h3><span class="muted" style="font-size:12px;">否定不跨 Campaign 生效，非竞价互斥</span></div><div class="card-body" style="max-height:280px;overflow-y:auto;font-size:13px;">`;
  if (portfolioDups.length === 0) {
    diagHtml += '<div class="muted" style="padding:20px;text-align:center;">✅ 无此项</div>';
  } else {
    portfolioDups.forEach((e, i) => {
      const d = e._diags.find(x => x.type === 'portfolio-dup');
      const did = makeDiagId('portfolio', e.keyword, e.campaign);
      const hasN = diagHasNotes(did);
      diagHtml += `<div class="diag-item ${hasN ? 'has-notes' : ''}" style="padding:6px 0;border-bottom:1px solid #f1f5f9;" data-diag-type="portfolio" data-diag-idx="${i}">
        <span class="badge badge-info" style="font-size:10px;">${e.matchType}</span>
        <strong>${e.keyword}</strong>
        <span class="muted" style="font-size:11px;"> — 否定于 ${U.campShortName(e.campaign)}</span>
        <div class="muted" style="font-size:11px;margin-top:2px;">${d.detail}</div>
      </div>`;
    });
  }
  diagHtml += '</div></div>';

  // Gap card
  gapAlerts.sort((a, b) => b.spend - a.spend);
  diagHtml += `<div class="card"><div class="card-header"><h3>🕳️ 漏网之鱼检测 (${gapAlerts.length})</h3></div><div class="card-body" style="max-height:280px;overflow-y:auto;font-size:13px;">`;
  if (gapAlerts.length === 0) {
    diagHtml += '<div class="muted" style="padding:20px;text-align:center;">✅ 未发现跨Campaign遗漏</div>';
  } else {
    gapAlerts.slice(0, 30).forEach((g, i) => {
      const did = makeDiagId('gap', g.keyword, g.missingIn);
      const hasN = diagHasNotes(did);
      const negCamps = g.negatedIn.split(', ').map(c => U.campShortName(c));
      diagHtml += `<div class="diag-item ${hasN ? 'has-notes' : ''}" style="padding:6px 0;border-bottom:1px solid #f1f5f9;" data-diag-type="gap" data-diag-idx="${i}">
        <strong>"${g.keyword}"</strong> 已在 ${negCamps.length} 个Campaign否定
        <br><span class="clr-bad">但 <strong>${U.campShortName(g.missingIn)}</strong> 仍花费 $${U.fmt(g.spend)}</span>
        ${g.convs > 0 ? `<span class="clr-warn"> (${g.convs} 转化，需确认)</span>` : '<span class="muted"> (0 转化，建议也否定)</span>'}
      </div>`;
    });
  }
  diagHtml += '</div></div>';

  // Match type warnings card
  const broadAlerts = NEG_KW.filter(e => e._diags.some(d => d.type === 'too-broad'));
  diagHtml += `<div class="card"><div class="card-header"><h3>💥 匹配类型风险 (${broadAlerts.length})</h3></div><div class="card-body" style="max-height:280px;overflow-y:auto;font-size:13px;">`;
  if (broadAlerts.length === 0) {
    diagHtml += '<div class="muted" style="padding:20px;text-align:center;">✅ 未发现匹配类型风险</div>';
  } else {
    broadAlerts.forEach((e, i) => {
      const d = e._diags.find(d => d.type === 'too-broad');
      const did = makeDiagId('broad', e.keyword, e.campaign);
      const hasN = diagHasNotes(did);
      diagHtml += `<div class="diag-item ${hasN ? 'has-notes' : ''}" style="padding:6px 0;border-bottom:1px solid #f1f5f9;" data-diag-type="broad" data-diag-idx="${i}">
        <span class="badge badge-warn" style="font-size:10px;">广泛</span>
        <strong>${e.keyword}</strong>
        <span class="muted" style="font-size:11px;"> — ${U.campShortName(e.campaign)}</span>
        <div class="muted" style="font-size:11px;margin-top:2px;">${d.detail}</div>
      </div>`;
    });
  }
  diagHtml += '</div></div>';

  // Duplicate/level optimization card
  const dupAlerts = NEG_KW.filter(e => e._diags.some(d => d.type === 'duplicate'));
  const dupKws = {};
  dupAlerts.forEach(e => {
    const k = e.keyword.toLowerCase();
    if (!dupKws[k]) dupKws[k] = { keyword: e.keyword, camps: new Set(), count: 0 };
    dupKws[k].camps.add(U.campShortName(e.campaign));
    dupKws[k].count++;
  });
  const dupList = Object.values(dupKws).sort((a, b) => b.count - a.count);

  diagHtml += `<div class="card"><div class="card-header"><h3>🔄 层级优化建议 (${dupList.length} 词)</h3></div><div class="card-body" style="max-height:280px;overflow-y:auto;font-size:13px;">`;
  if (dupList.length === 0) {
    diagHtml += '<div class="muted" style="padding:20px;text-align:center;">✅ 层级使用合理</div>';
  } else {
    dupList.slice(0, 20).forEach((d, i) => {
      const did = makeDiagId('dup', d.keyword, '');
      const hasN = diagHasNotes(did);
      diagHtml += `<div class="diag-item ${hasN ? 'has-notes' : ''}" style="padding:6px 0;border-bottom:1px solid #f1f5f9;" data-diag-type="dup" data-diag-idx="${i}">
        <strong>"${d.keyword}"</strong> 在 <span class="clr-warn">${d.count} 个广告组</span> 重复否定
        <div class="muted" style="font-size:11px;margin-top:2px;">涉及: ${[...d.camps].join(', ')} — 建议提升为 Campaign 级否定</div>
      </div>`;
    });
  }
  diagHtml += '</div></div>';

  U.html('negkw-diagnostics', diagHtml);

  // ── Wire up clickable diagnostic items ──
  document.querySelectorAll('#negkw-diagnostics .diag-item').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.diagType;
      const idx = parseInt(el.dataset.diagIdx);
      let title = '', detail = '', diagId = '', extraHtml = '';

      if (type === 'conflict') {
        const e = conflicts[idx]; if (!e) return;
        const d = e._diags.find(x => x.type === 'conflict');
        diagId = makeDiagId('conflict', e.keyword, e.campaign);
        title = `⚠️ 同系列正负冲突: ${e.keyword}`;
        const posMatches = FLAT_KW.filter(k => k.keyword && k.keyword.toLowerCase().trim() === e.keyword.toLowerCase().trim());
        detail = `<p><strong>否定词:</strong> "${e.keyword}" [${e.matchType}]</p>
          <p><strong>否定所在:</strong> ${e.campaign}${e.adGroup ? ' / ' + e.adGroup : ''} (${e.level}级)</p>
          <p><strong>说明:</strong> ${d.detail}</p>
          <p style="color:var(--red);font-weight:600;">在同一 Campaign/广告组范围内，否定会覆盖正向匹配，需删掉一侧或调整范围。</p>`;
        if (posMatches.length > 0) {
          extraHtml = '<div class="drawer-section-title">📊 正向关键词详情</div>';
          posMatches.forEach(k => {
            extraHtml += `<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:12px;">
              <strong>${k.keyword}</strong> [${k.matchType || ''}]<br>
              <span class="muted">Campaign: ${U.campShortName(k._camp || k.campaign)}</span>
              ${k.cost ? ` | 花费: $${U.fmt(k.cost)}` : ''}
              ${k.conversions ? ` | 转化: ${k.conversions}` : ''}
            </div>`;
          });
        }
        extraHtml += buildAffectedSTHtml(e.keyword, e.campaign, e.matchType);
      } else if (type === 'portfolio') {
        const e = portfolioDups[idx]; if (!e) return;
        const d = e._diags.find(x => x.type === 'portfolio-dup');
        diagId = makeDiagId('portfolio', e.keyword, e.campaign);
        title = `💡 跨系列同词: ${e.keyword}`;
        const posMatches = FLAT_KW.filter(k => k.keyword && k.keyword.toLowerCase().trim() === e.keyword.toLowerCase().trim());
        detail = `<p><strong>否定词:</strong> "${e.keyword}" [${e.matchType}]</p>
          <p><strong>否定所在:</strong> ${e.campaign}${e.adGroup ? ' / ' + e.adGroup : ''} (${e.level}级)</p>
          <p><strong>说明:</strong> ${d.detail}</p>
          <p style="color:var(--blue);font-weight:600;">Google 否定词仅作用于其所在的 Campaign/广告组，不会拦截其它 Campaign 里的正向词。本条为资产清单提醒，不是「跨系列抢量」或竞价内互斥。</p>`;
        if (posMatches.length > 0) {
          extraHtml = '<div class="drawer-section-title">📊 其它系列正向词（供对照）</div>';
          posMatches.forEach(k => {
            extraHtml += `<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:12px;">
              <strong>${k.keyword}</strong> [${k.matchType || ''}]<br>
              <span class="muted">Campaign: ${U.campShortName(k._camp || k.campaign)}</span>
              ${k.cost ? ` | 花费: $${U.fmt(k.cost)}` : ''}
            </div>`;
          });
        }
        extraHtml += buildAffectedSTHtml(e.keyword, e.campaign, e.matchType);
      } else if (type === 'gap') {
        const g = gapAlerts[idx]; if (!g) return;
        diagId = makeDiagId('gap', g.keyword, g.missingIn);
        title = `🕳️ 漏网之鱼: ${g.keyword}`;
        const negList = g.negatedIn.split(', ').map(c => `<li>${c}</li>`).join('');
        detail = `<p><strong>否定词:</strong> "${g.keyword}"</p>
          <p><strong>已否定于（${g.negatedIn.split(', ').length} 个Campaign）:</strong></p>
          <ul style="margin:4px 0 8px;padding-left:18px;font-size:12px;line-height:1.7;">${negList}</ul>
          <p><strong>遗漏于:</strong> <span style="color:var(--red);font-weight:600;">${g.missingIn}</span></p>
          <p><strong>遗漏Campaign花费:</strong> <span style="color:var(--red);font-size:18px;font-weight:700;">$${U.fmt(g.spend)}</span></p>
          <p><strong>遗漏Campaign转化:</strong> ${g.convs || 0}</p>
          <p>${g.convs > 0 ? '<span style="color:var(--orange);font-weight:600;">⚠️ 有转化! 请确认是否真的应该否定，可能在此Campaign中是有效流量。</span>' : '<span style="color:var(--green);">0 转化 + 有花费 → 建议在此Campaign中也添加否定。</span>'}</p>`;
      } else if (type === 'broad') {
        const e = broadAlerts[idx]; if (!e) return;
        const d = e._diags.find(d => d.type === 'too-broad');
        diagId = makeDiagId('broad', e.keyword, e.campaign);
        title = `💥 匹配过宽: ${e.keyword}`;
        detail = `<p><strong>否定词:</strong> "${e.keyword}" [${e.matchType}]</p>
          <p><strong>所在:</strong> ${e.campaign} (${e.level}级)</p>
          <p><strong>风险:</strong> ${d.detail}</p>
          <p style="color:var(--orange);font-weight:600;">建议操作:</p>
          <ul style="margin:6px 0;padding-left:18px;line-height:1.8;">
            <li>改为"词组匹配"否定 → <code>"${e.keyword}"</code></li>
            <li>或改为"完全匹配"否定 → <code>[${e.keyword}]</code></li>
            <li>确认在搜索词报告中该词确实无转化价值</li>
          </ul>`;
        extraHtml = buildAffectedSTHtml(e.keyword, e.campaign, e.matchType);
      } else if (type === 'dup') {
        const d = dupList[idx]; if (!d) return;
        diagId = makeDiagId('dup', d.keyword, '');
        title = `🔄 跨组重复: ${d.keyword}`;
        detail = `<p><strong>否定词:</strong> "${d.keyword}"</p>
          <p><strong>重复次数:</strong> <span style="color:var(--orange);">${d.count} 个广告组</span></p>
          <p><strong>涉及Campaign:</strong> ${[...d.camps].join(', ')}</p>
          <p style="color:var(--blue);font-weight:600;">建议操作: 将此否定词从各广告组中移除，统一添加到 Campaign 级否定词，减少管理复杂度。</p>`;
      }

      if (diagId) openDiagDrawer(title, detail, diagId, extraHtml);
    });
  });

  // ── Intent Category Chart ──
  const intentCounts = {};
  INTENT_RULES.forEach(r => { intentCounts[r.id] = { ...r, count: 0 }; });
  intentCounts['other'] = { id: 'other', label: '❓ 其他/通用', color: '#94a3b8', count: 0 };

  NEG_KW.forEach(e => {
    const cat = e._intent.id;
    if (intentCounts[cat]) intentCounts[cat].count++;
  });

  let intentHtml = '';
  Object.values(intentCounts).filter(c => c.count > 0).sort((a, b) => b.count - a.count).forEach(cat => {
    const pct = ((cat.count / NEG_KW.length) * 100).toFixed(1);
    intentHtml += `<div style="flex:1;min-width:180px;padding:14px;border-radius:8px;border:2px solid ${cat.color}20;background:${cat.color}08;cursor:pointer;" class="intent-chip" data-intent="${cat.id}">
      <div style="font-size:14px;font-weight:600;">${cat.label}</div>
      <div style="font-size:24px;font-weight:700;color:${cat.color};">${cat.count}</div>
      <div class="muted" style="font-size:11px;">${pct}%</div>
    </div>`;
  });
  U.html('negkw-intent-chart', intentHtml);

  // intent chip click → filter table
  document.querySelectorAll('.intent-chip').forEach(el => {
    el.addEventListener('click', () => {
      U.el('negkw-c-filter-intent').value = el.dataset.intent;
      filterTable();
    });
  });

  // ── Populate filters ──
  const campFilter = U.el('negkw-c-filter-camp');
  const camps = [...new Set(NEG_KW.map(e => e.campaign).filter(Boolean))].sort();
  campFilter.innerHTML = '<option value="all">全部 Campaign</option>' +
    camps.map(c => `<option value="${c}">${U.campShortName(c)}</option>`).join('');

  const intentFilter = U.el('negkw-c-filter-intent');
  intentFilter.innerHTML = '<option value="all">全部意图分类</option>' +
    Object.values(intentCounts).filter(c => c.count > 0).sort((a, b) => b.count - a.count)
      .map(c => `<option value="${c.id}">${c.label} (${c.count})</option>`).join('');

  // ── Table Rendering ──
  const mtBadge = mt => {
    if (mt === '完全匹配') return '<span class="badge badge-func">[完全]</span>';
    if (mt === '词组匹配') return '<span class="badge badge-info">[词组]</span>';
    if (mt === '广泛匹配') return '<span class="badge badge-warn">[广泛]</span>';
    return `<span class="badge badge-neutral">${mt}</span>`;
  };

  const diagBadge = e => {
    if (e._diags.length === 0) return '<span class="badge badge-good" style="font-size:10px;">✅</span>';
    return e._diags.map(d => {
      const cls = d.type === 'conflict' ? 'badge-bad' : d.type === 'portfolio-dup' ? 'badge-info' : d.type === 'too-broad' ? 'badge-warn' : 'badge-neutral';
      return `<span class="badge ${cls}" style="font-size:10px;" title="${d.detail}">${d.icon}</span>`;
    }).join(' ');
  };

  function filterTable() {
    const levelVal = U.el('negkw-c-filter-level').value;
    const campVal = U.el('negkw-c-filter-camp').value;
    const intentVal = U.el('negkw-c-filter-intent').value;
    const diagVal = U.el('negkw-c-filter-diag').value;
    const searchVal = U.el('negkw-c-search').value.trim().toLowerCase();

    let filtered = NEG_KW;
    if (levelVal !== 'all') filtered = filtered.filter(e => e.level === levelVal);
    if (campVal !== 'all') filtered = filtered.filter(e => e.campaign === campVal);
    if (intentVal !== 'all') filtered = filtered.filter(e => e._intent.id === intentVal);
    if (diagVal === 'ok') filtered = filtered.filter(e => e._diags.length === 0);
    else if (diagVal !== 'all') filtered = filtered.filter(e => e._diags.some(d => d.type === diagVal));
    if (searchVal.length >= 2) {
      filtered = filtered.filter(e =>
        (e.keyword || '').toLowerCase().includes(searchVal) ||
        (e.campaign || '').toLowerCase().includes(searchVal) ||
        (e.adGroup || '').toLowerCase().includes(searchVal)
      );
    }

    U.el('negkw-table-count').textContent = filtered.length + ' 个';

    let html = '';
    filtered.forEach((e, i) => {
      html += `<tr class="negkw-row" data-negkw-idx="${i}" style="cursor:pointer;">
        <td>${diagBadge(e)}</td>
        <td><span class="badge ${e.level === 'Campaign' ? 'badge-search' : 'badge-info'}" style="font-size:10px;">${e.level}</span></td>
        <td class="bold" title="${e.campaign}" style="font-size:12px;">${U.campShortName(e.campaign || '--')}</td>
        <td class="muted" style="font-size:12px;">${e.adGroup || '--'}</td>
        <td style="font-weight:600;">${e.keyword}</td>
        <td>${mtBadge(e.matchType)}</td>
        <td><span style="font-size:11px;color:${e._intent.color};">${e._intent.label}</span></td>
      </tr>`;
    });
    if (!html) html = '<tr><td colspan="7" class="muted" style="text-align:center;padding:30px;">无匹配的否定关键词</td></tr>';
    U.html('negkw-c-tbody', html);

    document.querySelectorAll('#negkw-c-tbody .negkw-row').forEach(row => {
      row.addEventListener('click', () => {
        const i = parseInt(row.dataset.negkwIdx);
        const e = filtered[i]; if (!e) return;
        const diagId = makeDiagId('row', e.keyword, e.campaign);
        const titleText = `🔎 ${e.keyword} [${e.matchType}]`;
        let detailHtml = `<p><strong>否定词:</strong> "${e.keyword}" [${e.matchType}]</p>
          <p><strong>所在:</strong> ${e.campaign}${e.adGroup ? ' / ' + e.adGroup : ''} (${e.level}级)</p>
          <p><strong>意图分类:</strong> <span style="color:${e._intent.color}">${e._intent.label}</span></p>`;
        if (e._diags.length > 0) {
          detailHtml += '<p><strong>诊断问题:</strong></p><ul style="margin:4px 0;padding-left:18px;font-size:12px;line-height:1.8;">';
          e._diags.forEach(d => { detailHtml += `<li>${d.icon} ${d.label}: ${d.detail}</li>`; });
          detailHtml += '</ul>';
        } else {
          detailHtml += '<p style="color:var(--green);">✅ 无异常</p>';
        }
        const stHtml = buildAffectedSTHtml(e.keyword, e.campaign, e.matchType);
        openDiagDrawer(titleText, detailHtml, diagId, stHtml);
      });
    });
  }

  filterTable();
  U.el('negkw-c-filter-level').addEventListener('change', filterTable);
  campFilter.addEventListener('change', filterTable);
  intentFilter.addEventListener('change', filterTable);
  U.el('negkw-c-filter-diag').addEventListener('change', filterTable);
  U.el('negkw-c-search').addEventListener('input', filterTable);
}

// ═══════════════════════════════════════
// 回传调整记录（纯文本，localStorage）
// ═══════════════════════════════════════
(function initPostbackLog() {
  const POSTBACK_LOG_KEY = 'POSTBACK_LOG_TEXT';
  const ta = document.getElementById('postback-log-textarea');
  const statusEl = document.getElementById('postback-log-save-status');
  if (!ta || !statusEl) return;

  try {
    const saved = localStorage.getItem(POSTBACK_LOG_KEY);
    if (saved != null) ta.value = saved;
  } catch (e) {
    console.warn('[PostbackLog] load failed', e);
  }

  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    statusEl.textContent = '编辑中…';
    statusEl.style.color = '#64748b';
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        localStorage.setItem(POSTBACK_LOG_KEY, ta.value);
        statusEl.textContent = '已自动保存 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        statusEl.style.color = '#10b981';
        if (typeof SBSync !== 'undefined') {
          SBSync.savePostback(ta.value).then(() => {
            statusEl.textContent = '☁️ 已同步至云端 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('[PostbackLog] save failed', e);
        statusEl.textContent = '保存失败（存储已满或权限）';
        statusEl.style.color = '#ef4444';
      }
    }, 500);
  }

  ta.addEventListener('input', scheduleSave);
})();

// ═══════════════════════════════════════
// 知识库（4 Tab：优化组 / 分产品 / 我的 / 待评审）
// ═══════════════════════════════════════
(function initKnowledgeModule() {

  const ADMIN_USER = 'gaoruowei';
  const PRODUCT_LABELS = { ft: 'Ft (Fachat)', pu: 'Pu (Parau)', ppt: 'Ppt (PinkPinkChat)' };
  const CAT_LABELS = {
    ai_threshold: '📊 指标判断阈值', ai_qs_rule: '🎯 QS 诊断', ai_search_term: '🔍 搜索词规则',
    ai_negkw_rule: '🚫 否定词规则', ai_structure: '🏗️ Campaign 结构', ai_bid_strategy: '💰 出价策略',
    ai_anomaly: '⚠️ 异常检测', ai_geo_device: '🌍 地区×设备', ai_audience: '👥 受众',
    ai_relevance: '🔗 相关性', ai_keyword_method: '🔑 关键词方法论', ai_budget: '💵 预算分配',
    ai_sop: '📋 SOP', brand_keyword: '🏷️ 品牌词', negkw_rule: '🚫 否定词',
    campaign_rule: '📋 Campaign 规则', user_correction: '✏️ 用户纠正',
  };

  function curUser() { return (typeof SOAuth !== 'undefined' && SOAuth.getUser) ? SOAuth.getUser() : null; }
  function isAdmin() { return curUser() === ADMIN_USER; }
  function fmtTime(ts) { return ts ? new Date(ts).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }) : ''; }

  const KB_NOTES_KEY = 'kb_item_notes';
  function loadKBNotes() { try { return JSON.parse(localStorage.getItem(KB_NOTES_KEY) || '{}'); } catch { return {}; } }
  function saveKBNotes(d) { localStorage.setItem(KB_NOTES_KEY, JSON.stringify(d)); }
  function getKBNotes(kbId) { return (loadKBNotes()['kb_' + kbId] || []).sort((a, b) => a.ts - b.ts); }
  function addKBNote(kbId, text, role) {
    const key = 'kb_' + kbId, ts = Date.now(), all = loadKBNotes();
    if (!all[key]) all[key] = [];
    all[key].push({ text, role: role || 'user', ts });
    saveKBNotes(all);
    if (typeof SBSync !== 'undefined') SBSync.addNote('kb', key, text, role || 'user', ts).catch(() => {});
  }
  function deleteKBNote(kbId, idx) {
    const key = 'kb_' + kbId, all = loadKBNotes(), arr = all[key] || [];
    if (idx >= 0 && idx < arr.length) {
      const removed = arr.splice(idx, 1)[0];
      saveKBNotes(all);
      if (removed._sbId && typeof SBSync !== 'undefined') SBSync.deleteNote(removed._sbId);
    }
  }

  // ── Drawer ──
  function openKBDrawer(item) {
    const overlay = U.el('drawer-overlay'), drawer = U.el('kw-drawer');
    const catLabel = CAT_LABELS[item.category] || item.category || '知识';
    U.el('drawer-title').textContent = catLabel;
    const meta = [`#${item.id}`];
    if (item.owner) meta.push('by ' + item.owner);
    if (item.product) meta.push(PRODUCT_LABELS[item.product] || item.product);
    meta.push(fmtTime(item.created_at));
    U.el('drawer-subtitle').innerHTML = meta.join(' · ');

    function render() {
      const notes = getKBNotes(item.id);
      let html = `<div class="drawer-section"><div class="drawer-section-title">📋 内容</div>
        <div class="drawer-verdict"><div class="drawer-verdict-detail" style="font-size:14px;line-height:1.8;">${item.content}</div></div></div>`;
      if (item.tags && item.tags.length) {
        html += `<div class="drawer-section"><div class="drawer-section-title">🏷️ 标签</div><div style="display:flex;gap:6px;flex-wrap:wrap;">`;
        item.tags.forEach(t => { html += `<span style="background:var(--bg-sub,#f1f5f9);padding:3px 10px;border-radius:6px;font-size:12px;color:var(--text2);">${t}</span>`; });
        html += '</div></div>';
      }
      html += `<div class="drawer-section"><div class="drawer-section-title">💬 备注 (${notes.length})</div>`;
      html += '<div class="note-thread" id="kb-drawer-notes" style="max-height:320px;overflow-y:auto;">';
      if (!notes.length) html += '<div class="muted" style="text-align:center;padding:16px;font-size:13px;">暂无备注</div>';
      else notes.forEach((n, i) => {
        html += `<div class="note-bubble note-${n.role}"><div>${n.text.replace(/\n/g,'<br>')}</div>
          <div class="note-time">${n.role === 'user' ? '我' : '系统'} · ${fmtTime(n.ts)}
            <button class="note-delete-btn kb-drawer-del" data-idx="${i}" title="删除">✕</button></div></div>`;
      });
      html += `</div><div class="note-input-wrap">
        <textarea class="note-input" id="kb-drawer-input" placeholder="备注或纠正…" rows="2"></textarea>
        <button class="note-send-btn" id="kb-drawer-send">发送</button></div></div>`;
      U.html('drawer-body', html);
      U.el('kb-drawer-send').addEventListener('click', () => {
        const t = U.el('kb-drawer-input').value.trim(); if (!t) return;
        addKBNote(item.id, t, 'user'); U.el('kb-drawer-input').value = ''; render();
      });
      U.el('kb-drawer-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); U.el('kb-drawer-send').click(); } });
      document.querySelectorAll('.kb-drawer-del').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); deleteKBNote(item.id, +b.dataset.idx); render(); }));
    }
    render(); overlay.classList.add('open'); drawer.classList.add('open');
  }

  // ── Rendering helpers ──
  function renderItemCard(k, opts) {
    const notes = getKBNotes(k.id);
    const notesBadge = notes.length > 0 ? `<span class="ai-kb-item-note-count">${notes.length} 条备注</span>` : '';
    const ownerTag = k.owner && k.owner !== 'system' ? `<span style="font-size:10px;background:var(--blue-bg,#eff6ff);color:var(--blue,#2563eb);padding:1px 8px;border-radius:4px;">${k.owner}</span>` : '';
    const productTag = k.product ? `<span style="font-size:10px;background:var(--purple-bg,#f5f3ff);color:var(--purple,#7c3aed);padding:1px 8px;border-radius:4px;">${PRODUCT_LABELS[k.product] || k.product}</span>` : '';
    const catTag = CAT_LABELS[k.category] ? `<span style="font-size:10px;color:var(--text3);">${CAT_LABELS[k.category]}</span>` : '';
    const checkbox = opts.showCheckbox ? `<input type="checkbox" class="kb-review-check" data-id="${k.id}" style="flex-shrink:0;width:16px;height:16px;cursor:pointer;accent-color:var(--accent);" />` : '';
    return `<div class="ai-kb-item" data-kbid="${k.id}" style="cursor:pointer;">
      <div class="ai-kb-item-header">
        ${checkbox}
        <div class="ai-kb-item-content" style="font-size:13px;line-height:1.7;flex:1;">
          <div>${k.content}</div>
          <div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            ${ownerTag}${productTag}${catTag}
            <span style="font-size:10px;color:var(--text3);">${fmtTime(k.created_at)}</span>
          </div>
        </div>
        ${notesBadge}
        <span style="color:var(--text3);font-size:14px;flex-shrink:0;">›</span>
      </div>
    </div>`;
  }

  function bindItemClicks(container, items) {
    container.querySelectorAll('.ai-kb-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.kb-review-check')) return;
        const found = items.find(k => k.id === +el.dataset.kbid);
        if (found) openKBDrawer(found);
      });
    });
  }

  function emptyMsg(text) { return `<div class="muted" style="text-align:center;padding:40px;font-size:13px;">${text}</div>`; }

  // ── Tab state ──
  let activeTab = 'team';
  const listEl = document.getElementById('kb-list');

  async function fetchAll() {
    if (typeof SBSync === 'undefined' || !SBSync.getKnowledge) return [];
    SBSync.clearKnowledgeCache();
    return await SBSync.getKnowledge();
  }

  function isTeamItem(k) {
    if (k.scope === 'team') return true;
    if (!k.scope || k.scope === 'personal') {
      if (k.status === 'approved' || !k.status) return true;
    }
    return false;
  }
  function isProductItem(k) {
    return k.scope === 'product' && (k.status === 'approved' || !k.status);
  }

  // ── Tab: 优化组知识库 ──
  async function renderTeam() {
    if (!listEl) return;
    const all = await fetchAll();
    const items = all.filter(k => isTeamItem(k) && !isProductItem(k));
    if (!items.length) { listEl.innerHTML = emptyMsg('暂无优化组知识。'); return; }
    const grouped = {};
    items.forEach(k => { const c = k.category || 'user_correction'; if (!grouped[c]) grouped[c] = []; grouped[c].push(k); });
    let html = '';
    Object.entries(grouped).forEach(([cat, entries]) => {
      html += `<div class="ai-kb-group card"><div class="ai-kb-group-title">${CAT_LABELS[cat] || cat} (${entries.length})</div>`;
      entries.forEach(k => { html += renderItemCard(k, {}); });
      html += '</div>';
    });
    listEl.innerHTML = html;
    bindItemClicks(listEl, items);
  }

  // ── Tab: 分产品知识库（按产品分组全展示，无筛选框） ──
  async function renderProduct() {
    if (!listEl) return;
    const all = await fetchAll();
    const items = all.filter(k => isProductItem(k));
    if (!items.length) { listEl.innerHTML = emptyMsg('暂无分产品知识。评审时选择「分产品」后会出现在这里。'); return; }
    const byProduct = {};
    items.forEach(k => { const p = k.product || 'other'; if (!byProduct[p]) byProduct[p] = []; byProduct[p].push(k); });
    let html = '';
    const order = ['ft', 'pu', 'ppt'];
    order.forEach(p => {
      const entries = byProduct[p];
      if (!entries || !entries.length) return;
      html += `<div class="ai-kb-group card"><div class="ai-kb-group-title">${PRODUCT_LABELS[p] || p} (${entries.length})</div>`;
      entries.forEach(k => { html += renderItemCard(k, {}); });
      html += '</div>';
    });
    Object.entries(byProduct).forEach(([p, entries]) => {
      if (order.includes(p)) return;
      html += `<div class="ai-kb-group card"><div class="ai-kb-group-title">${p} (${entries.length})</div>`;
      entries.forEach(k => { html += renderItemCard(k, {}); });
      html += '</div>';
    });
    listEl.innerHTML = html;
    bindItemClicks(listEl, items);
  }

  // ── Tab: 我的知识库 ──
  async function renderPersonal() {
    if (!listEl) return;
    const me = curUser();
    const all = await fetchAll();
    const items = all.filter(k => k.owner === me);
    if (!items.length) { listEl.innerHTML = emptyMsg('你还没有添加知识。点击右上角「+ 新增知识」开始沉淀。'); return; }
    let html = '';
    items.forEach(k => {
      const statusBadge = k.status === 'approved'
        ? '<span style="font-size:10px;background:var(--green-bg);color:var(--green);padding:1px 8px;border-radius:4px;">已通过</span>'
        : k.status === 'rejected'
          ? '<span style="font-size:10px;background:var(--red-bg);color:var(--red);padding:1px 8px;border-radius:4px;">未通过</span>'
          : '<span style="font-size:10px;background:var(--orange-bg);color:var(--orange);padding:1px 8px;border-radius:4px;">待评审</span>';
      html += `<div class="ai-kb-item" data-kbid="${k.id}" style="cursor:pointer;">
        <div class="ai-kb-item-header">
          <div class="ai-kb-item-content" style="font-size:13px;line-height:1.7;flex:1;">
            <div>${k.content}</div>
            <div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              ${statusBadge}
              ${k.product ? `<span style="font-size:10px;color:var(--text3);">${PRODUCT_LABELS[k.product] || k.product}</span>` : ''}
              <span style="font-size:10px;color:var(--text3);">${fmtTime(k.created_at)}</span>
            </div>
          </div>
          <span style="color:var(--text3);font-size:14px;">›</span>
        </div>
      </div>`;
    });
    listEl.innerHTML = html;
    bindItemClicks(listEl, items);
  }

  // ── Tab: 待评审 ──
  async function renderReview() {
    if (!listEl) return;
    const me = curUser();
    const admin = isAdmin();
    const all = await fetchAll();
    const items = admin ? all.filter(k => k.status === 'pending_review') : all.filter(k => k.status === 'pending_review' && k.owner === me);
    updateReviewBadge(items.length);
    if (!items.length) { listEl.innerHTML = emptyMsg(admin ? '没有待评审的知识条目。' : '你没有待评审的知识。'); return; }
    let html = '';
    if (admin) {
      html += `<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
        <button id="kb-review-approve" style="padding:6px 16px;border-radius:6px;border:1px solid var(--green);background:var(--green-bg);color:var(--green);font-size:12px;font-weight:600;cursor:pointer;">批准选中 →</button>
        <select id="kb-review-scope" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;">
          <option value="team">→ 优化组知识库</option>
          <option value="product">→ 分产品知识库</option>
        </select>
        <select id="kb-review-product" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;display:none;">
          <option value="ft">Ft (Fachat)</option>
          <option value="pu">Pu (Parau)</option>
          <option value="ppt">Ppt (PinkPinkChat)</option>
        </select>
        <button id="kb-review-reject" style="padding:6px 16px;border-radius:6px;border:1px solid var(--red);background:var(--red-bg);color:var(--red);font-size:12px;font-weight:600;cursor:pointer;">驳回选中</button>
      </div>`;
    }
    items.forEach(k => { html += renderItemCard(k, { showCheckbox: admin }); });
    listEl.innerHTML = html;
    bindItemClicks(listEl, items);

    if (admin) {
      const scopeSel = document.getElementById('kb-review-scope');
      const prodSel = document.getElementById('kb-review-product');
      scopeSel.addEventListener('change', () => { prodSel.style.display = scopeSel.value === 'product' ? '' : 'none'; });

      document.getElementById('kb-review-approve').addEventListener('click', async () => {
        const checked = [...listEl.querySelectorAll('.kb-review-check:checked')].map(c => +c.dataset.id);
        if (!checked.length) { alert('请先勾选要批准的条目'); return; }
        const scope = scopeSel.value;
        const product = scope === 'product' ? prodSel.value : null;
        for (const id of checked) await SBSync.approveKnowledge(id, scope, product, me);
        renderReview();
      });

      document.getElementById('kb-review-reject').addEventListener('click', async () => {
        const checked = [...listEl.querySelectorAll('.kb-review-check:checked')].map(c => +c.dataset.id);
        if (!checked.length) { alert('请先勾选要驳回的条目'); return; }
        if (!confirm(`确认驳回 ${checked.length} 条？`)) return;
        for (const id of checked) await SBSync.rejectKnowledge(id, me);
        renderReview();
      });
    }
  }

  function updateReviewBadge(count) {
    const b1 = document.getElementById('kb-review-badge');
    const b2 = document.getElementById('nav-review-count');
    if (b1) { b1.textContent = count; b1.style.display = count > 0 ? '' : 'none'; }
    if (b2) { b2.textContent = count; b2.style.display = count > 0 ? '' : 'none'; }
  }

  // ── Tab switching ──
  function renderCurrentTab() {
    if (activeTab === 'team') renderTeam();
    else if (activeTab === 'product') renderProduct();
    else if (activeTab === 'personal') renderPersonal();
    else if (activeTab === 'review') renderReview();
  }

  document.querySelectorAll('.kb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.kbTab;
      document.querySelectorAll('.kb-tab').forEach(t => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.style.borderBottomColor = isActive ? 'var(--accent)' : 'transparent';
        t.style.color = isActive ? 'var(--accent)' : 'var(--text3)';
      });
      renderCurrentTab();
    });
  });

  // ── Add knowledge ──
  const addBtn = document.getElementById('kb-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const me = curUser();
      if (!me) { alert('请先登录'); return; }
      const content = prompt('输入知识内容：');
      if (!content || !content.trim()) return;
      const catChoice = prompt('选择分类（输入数字）：\n1. 品牌词定义\n2. 否定词规则\n3. Campaign 规则\n4. 用户纠正/经验', '4');
      const catMap = { '1': 'brand_keyword', '2': 'negkw_rule', '3': 'campaign_rule', '4': 'user_correction' };
      const cat = catMap[catChoice] || 'user_correction';
      const prodChoice = prompt('关联产品（可留空）：\n1. Ft  2. Pu  3. Ppt\n输入数字或直接回车跳过', '');
      const prodMap = { '1': 'ft', '2': 'pu', '3': 'ppt' };
      const product = prodMap[prodChoice] || null;

      if (typeof SBSync !== 'undefined' && SBSync.addKnowledge) {
        SBSync.addKnowledge(cat, content.trim(), 'manual', [], me, product).then(id => {
          if (id) {
            activeTab = 'personal';
            document.querySelectorAll('.kb-tab').forEach(t => {
              const isActive = t.dataset.kbTab === 'personal';
              t.classList.toggle('active', isActive);
              t.style.borderBottomColor = isActive ? 'var(--accent)' : 'transparent';
              t.style.color = isActive ? 'var(--accent)' : 'var(--text3)';
            });
            renderCurrentTab();
          }
        });
      }
    });
  }

  // ── Nav trigger ──
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.view === 'knowledge') {
      item.addEventListener('click', () => setTimeout(renderCurrentTab, 100));
    }
  });

  // Initial review badge
  setTimeout(async () => {
    try {
      const all = await fetchAll();
      const pending = isAdmin() ? all.filter(k => k.status === 'pending_review') : all.filter(k => k.status === 'pending_review' && k.owner === curUser());
      updateReviewBadge(pending.length);
    } catch (e) {}
  }, 3000);

})();
