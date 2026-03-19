/**
 * Search Optimizer 中台 - 主应用逻辑
 * 2026-03-19
 */

// ═══════════════════════════════════════
// DATA PREPARATION
// ═══════════════════════════════════════
const SEARCH_CAMPS = CAMPAIGN_SUMMARY.filter(c => c.type === 'Search');
const ALL_CAMPS = CAMPAIGN_SUMMARY;

const KW_MAP = {};
const ST_MAP = {};
const DEV_MAP = {};

function regKW(campName, arr) { if (arr && arr.length) KW_MAP[campName] = arr; }
function regST(campName, arr) { if (arr && arr.length) ST_MAP[campName] = arr; }
function regDEV(campName, arr) { if (arr && arr.length) DEV_MAP[campName] = arr; }

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

const ASSET_MAP = {};
function regAsset(campName, arr) { if (arr && arr.length) ASSET_MAP[campName] = arr; }
regAsset('pu-web-IN-2.5-竞品词-6.14重开', typeof ADW_PU_IN_COMP_ASSETS !== 'undefined' ? ADW_PU_IN_COMP_ASSETS : []);
regAsset('Ft-web-US-2.5-Display-12.26-homepage', typeof ADW_FT_US_ASSETS !== 'undefined' ? ADW_FT_US_ASSETS : []);
regAsset('Ppt-web-2.5-AR+UAE+IL+QA-2.3', typeof ADW_PPT_ME_PMAX_ASSETS !== 'undefined' ? ADW_PPT_ME_PMAX_ASSETS : []);
regAsset('Ppt-web-US-2.5-Pmax-1.20-homepage', typeof ADW_PPT_US_PMAX_ASSETS !== 'undefined' ? ADW_PPT_US_PMAX_ASSETS : []);

const FLAT_KW = [];
Object.entries(KW_MAP).forEach(([camp, kws]) => {
  kws.forEach(kw => FLAT_KW.push({ ...kw, _camp: camp }));
});

const FLAT_ST = [];
Object.entries(ST_MAP).forEach(([camp, sts]) => {
  sts.forEach(st => FLAT_ST.push({ ...st, _camp: camp }));
});

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    item.classList.add('active');
    const viewId = 'view-' + item.dataset.view;
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');
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
      <td class="num bold">${U.fmtK(Math.round(c.spend))}</td>
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

        // ─── Ad Copy Diagnostic Card ───
        {
          let adStrength = '良好', adCls = 'clr-good', diagMsg = '✅ 文案与核心词匹配度较高';
          if (agQs !== null && agQs < 5) {
            adStrength = '差'; adCls = 'clr-bad';
            diagMsg = '⚠️ 核心关键词未出现在标题中，导致 Ad Relevance 极低';
          } else if (agQs !== null && agQs < 7) {
            adStrength = '一般'; adCls = 'clr-warn';
            diagMsg = '💡 建议在标题 1 中固定高转化关键词';
          }

          const assets = ASSET_MAP[c.name] || [];
          let topHL = 'Random Video Calls with Girls';
          let topDesc = 'Fast, high-quality 1v1 video chats. Meet new friends!';
          if (assets.length > 0) {
            const hls = assets.filter(a => a.type === '标题').sort((a,b) => (b.purchaseConv||0) - (a.purchaseConv||0));
            const descs = assets.filter(a => a.type === '广告内容描述').sort((a,b) => (b.purchaseConv||0) - (a.purchaseConv||0));
            if (hls.length > 0) topHL = hls[0].asset;
            if (descs.length > 0) topDesc = descs[0].asset;
          }

          html += `<tr class="row-L3 child-${agid}">
            <td colspan="14" style="padding:12px 16px 12px 48px;white-space:normal;background:#fafaff;">
              <div class="ad-copy-diag">
                <div class="diag-strength">
                  <div class="diag-strength-label">📝 RSA 广告效力 (Ad Strength)</div>
                  <div class="diag-strength-val ${adCls}">${adStrength}</div>
                  <div class="diag-msg">${diagMsg}</div>
                </div>
                <div class="diag-copy">
                  <div class="diag-copy-label">🔥 Top 曝光文案组合 (Campaign 级)</div>
                  <div class="diag-copy-headline">${topHL} | 1v1 Live Chat</div>
                  <div class="diag-copy-desc">${topDesc}</div>
                </div>
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
              <span class="bold ${qsCls}">QS ${kw.qualityScore || '-'}</span>
              <span class="${eCtr.cls}" data-tip="Expected CTR: ${kw.expectedCTR || '-'}">CTR${eCtr.text}</span>
              <span class="${aRel.cls}" data-tip="Ad Relevance: ${kw.adRelevance || '-'}">Rel${aRel.text}</span>
              <span class="${lpExp.cls}" data-tip="LP Exp: ${kw.landingPageExp || '-'}">LP${lpExp.text}</span>
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

function renderAnomalyList(filter) {
  const filtered = filter === 'all' ? ALL_ANOMALIES : ALL_ANOMALIES.filter(a => a.severity === filter);
  const sevIcon = { critical: '🔴', warning: '🟡', info: '💡', positive: '🟢' };

  let html = '';
  filtered.forEach((a, i) => {
    const rcaSteps = Engine.buildRootCause(a, KW_MAP, ST_MAP, DEV_MAP);
    let rcaHtml = '';
    rcaSteps.forEach(step => {
      rcaHtml += `<div class="rca-step step-${step.status}">
        <div class="rca-step-num">${step.step}</div>
        <div class="rca-step-content">
          <div class="rca-step-title">${step.title}</div>
          <div class="rca-step-detail">${step.detail}</div>
        </div>
      </div>`;
    });

    html += `<div class="anomaly-card sev-${a.severity}" data-idx="${i}" onclick="toggleAnomaly(this)">
      <div class="anomaly-header">
        <div class="anomaly-sev">${sevIcon[a.severity] || '⚪'}</div>
        <div class="anomaly-info">
          <div class="anomaly-title">${a.title}</div>
          <div class="anomaly-desc">${a.desc}</div>
          <div class="anomaly-meta">
            ${U.badge(a.level, 'neutral')}
            ${U.badge(a.type.replace(/_/g, ' '), a.severity === 'critical' ? 'bad' : a.severity === 'positive' ? 'good' : 'warn')}
          </div>
        </div>
        <div class="anomaly-expand-icon">▼</div>
      </div>
      <div class="anomaly-body">
        <div class="rca-steps">${rcaHtml}</div>
      </div>
    </div>`;
  });

  if (!html) html = '<div class="trust-card trust-ok"><div class="trust-title">无异常</div><div class="trust-detail">该分类下暂无检测到的异常。</div></div>';
  U.html('anomaly-list', html);
}

function toggleAnomaly(card) {
  card.classList.toggle('expanded');
}

// ═══════════════════════════════════════
// 搜索词 & 关键词分析（增强版）
// ═══════════════════════════════════════
const ST_CAMP_MAP = {
  'pu-in-comp': { label: 'Pu-IN-竞品词-6.14', kw: 'pu-web-IN-2.5-竞品词-6.14重开', st: 'pu-web-IN-2.5-竞品词-6.14重开' },
  'pu-in-brand': { label: 'Pu-IN-品牌词-6.16', kw: 'pu-web-IN-2.5-品牌词-6.16', st: 'pu-web-IN-2.5-品牌词-6.16' },
  'pu-in-emerald': { label: 'Pu-IN-emeraldchat-9.2', kw: 'Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA', st: 'Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA' },
  'ft-in-func': { label: 'Ft-IN-功能词-TCPA', kw: 'ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA', st: 'ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA' },
  'ppt-uk': { label: 'Ppt-UK-1.18-homepage', kw: 'Ppt-web-UK-2.5-1.18-homepage', st: 'Ppt-web-UK-2.5-1.18-homepage' },
  'ppt-us': { label: 'Ppt-US-1.17-homepage', kw: 'Ppt-web-US-2.5-1.17-homepage', st: 'Ppt-web-US-2.5-1.17-homepage' },
};

function initSearchTermsModule() {
  const sel = U.el('st-campaign-select');
  sel.innerHTML = Object.entries(ST_CAMP_MAP).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  sel.addEventListener('change', renderSearchTermsEnhanced);
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

function buildTermInsights(terms) {
  const insights = [];
  const totalPurchase = terms.reduce((s, d) => s + d.purchaseNew, 0);
  const withPurchase = terms.filter(d => d.purchaseNew > 0);
  if (withPurchase.length) {
    const top5 = withPurchase.slice(0, 5);
    const top5Conv = top5.reduce((s, d) => s + d.purchaseNew, 0);
    const pct = totalPurchase > 0 ? (top5Conv / totalPurchase * 100).toFixed(0) : 0;
    insights.push({ level: 'positive', icon: '🟢', text: `<strong>核心词集中</strong>：TOP 5 搜索词（${top5.map(d => '「' + d.term + '」').join('、')}）贡献 <span class="metric">${pct}%</span> 付费转化。` });
  }
  const burnTerms = terms.filter(d => (d.cost || 0) > 200 && d.purchaseNew === 0);
  if (burnTerms.length) {
    const totalBurn = burnTerms.reduce((s, d) => s + d.cost, 0);
    insights.push({ level: 'critical', icon: '🔴', text: `<strong>烧钱预警</strong>：${burnTerms.length} 个搜索词花费 > 200 HKD 但 0 转化，合计浪费 <span class="metric">${U.fmt(totalBurn)} HKD</span>。<span class="action">建议立即否定</span>。` });
  }
  const convRate = terms.length > 0 ? (withPurchase.length / terms.length * 100).toFixed(1) : 0;
  insights.push({ level: convRate > 10 ? 'positive' : 'warning', icon: '📊', text: `<strong>转化率概览</strong>：${terms.length} 个搜索词中 <span class="metric">${withPurchase.length} 个 (${convRate}%)</span> 产生付费转化。${convRate < 5 ? '转化率偏低，建议收紧匹配。' : ''}` });
  return insights;
}

function buildKwInsights(keywords) {
  const insights = [];
  const withQS = keywords.filter(k => k.qualityScore);
  const lowQS = withQS.filter(k => Number(k.qualityScore) < 6);
  const highQS = withQS.filter(k => Number(k.qualityScore) >= 8);
  const hasCost = keywords.some(k => k.cost > 0);
  if (lowQS.length) {
    const details = [];
    lowQS.forEach(k => { if (k.landingPageExp && k.landingPageExp.includes('低于')) details.push('着陆页'); if (k.adRelevance && k.adRelevance.includes('低于')) details.push('相关性'); });
    insights.push({ level: 'warning', icon: '🟡', text: `<strong>质量得分待优化</strong>：${lowQS.length} 个关键词 QS < 6（${lowQS.slice(0, 3).map(k => '「' + k.keyword + '」').join('、')}）。<span class="action">低 QS 推高 CPC，建议优化</span>。` });
  }
  if (highQS.length) {
    insights.push({ level: 'positive', icon: '🟢', text: `<strong>高质量关键词</strong>：${highQS.length} 个 QS ≥ 8（${highQS.slice(0, 3).map(k => '「' + k.keyword + '」QS:' + k.qualityScore).join('、')}），优质流量来源。` });
  }
  if (hasCost) {
    const highROAS = keywords.filter(k => k.cost > 0 && k.purchaseNew > 0 && k.purchaseNewValue / k.cost >= 1.5);
    if (highROAS.length) insights.push({ level: 'info', icon: '💡', text: `<strong>提价机会</strong>：${highROAS.length} 个关键词 ROAS > 1.5（${highROAS.slice(0, 3).map(k => '「' + k.keyword + '」').join('、')}），<span class="action">建议提价抢量</span>。` });
    const burn = keywords.filter(k => k.cost > 500 && k.purchaseNew === 0);
    if (burn.length) insights.push({ level: 'critical', icon: '🔴', text: `<strong>烧钱关键词</strong>：${burn.length} 个花费 > 500 HKD 但 0 转化（${burn.slice(0, 3).map(k => '「' + k.keyword + '」花费' + U.fmt(k.cost)).join('、')}），<span class="action">建议暂停或降价</span>。` });
  }
  return insights;
}

function buildAIPanel(id, insights) {
  if (!insights || !insights.length) return '';
  return `<div class="ai-panel" id="${id}">
    <div class="ai-panel-header" onclick="this.parentElement.classList.toggle('collapsed')">
      <span>📊 AI 分析 & 优化建议</span><span>▲</span>
    </div>
    <div class="ai-panel-body">${insights.map(i => `<div class="ai-insight ${i.level}"><span class="ai-insight-icon">${i.icon}</span><span class="ai-insight-text">${i.text}</span></div>`).join('')}</div>
  </div>`;
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

  U.html('st-ai-panel', buildAIPanel('ai-st', buildTermInsights(terms)));

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
    `);
    U.html('kw-ai-panel', buildAIPanel('ai-kw', buildKwInsights(keywords)));

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
          <td class="num bold ${qsColor}">${k.qualityScore || '--'}</td>
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
          <td class="num bold ${qsColor}">${k.qualityScore || '--'}</td>
          <td>${k.expectedCTR || '--'}</td><td>${k.landingPageExp || '--'}</td><td>${k.adRelevance || '--'}</td>
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

  // KPI metrics
  body += `<div class="drawer-section"><div class="drawer-section-title">📈 核心指标</div><div class="drawer-metrics">
    <div class="drawer-metric"><div class="label">点击</div><div class="value">${U.fmtK(kw.clicks || 0)}</div></div>
    <div class="drawer-metric"><div class="label">花费</div><div class="value">${U.fmtK(Math.round(kw.cost || 0))}</div></div>
    <div class="drawer-metric"><div class="label">新付费</div><div class="value" style="color:var(--green)">${kw.purchaseNew || 0}</div></div>
    <div class="drawer-metric"><div class="label">QS</div><div class="value" style="color:${Number(kw.qualityScore) >= 8 ? 'var(--green)' : Number(kw.qualityScore) >= 6 ? 'var(--orange)' : kw.qualityScore ? 'var(--red)' : 'var(--text3)'}">${kw.qualityScore || '--'}</div></div>
    <div class="drawer-metric"><div class="label">CPA</div><div class="value">${kw.cpa > 0 ? U.fmt(kw.cpa) : '--'}</div></div>
    <div class="drawer-metric"><div class="label">IS</div><div class="value" style="color:${kw.impressionShare === '< 10%' ? 'var(--red)' : 'var(--text)'}">${kw.impressionShare || '--'}</div></div>
  </div></div>`;

  // QS breakdown
  if (kw.qualityScore) {
    const qsColor = (val) => val && val.includes('高于') ? 'var(--green)' : val && val.includes('低于') ? 'var(--red)' : 'var(--orange)';
    body += `<div class="drawer-section"><div class="drawer-section-title">⭐ QS 三维拆解</div><div class="drawer-metrics">
      <div class="drawer-metric"><div class="label">Expected CTR</div><div class="value" style="color:${qsColor(kw.expectedCTR)};font-size:12px">${kw.expectedCTR || '--'}</div></div>
      <div class="drawer-metric"><div class="label">Ad Relevance</div><div class="value" style="color:${qsColor(kw.adRelevance)};font-size:12px">${kw.adRelevance || '--'}</div></div>
      <div class="drawer-metric"><div class="label">LP Experience</div><div class="value" style="color:${qsColor(kw.landingPageExp)};font-size:12px">${kw.landingPageExp || '--'}</div></div>
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
    if (kw.matchType && kw.matchType.includes('广泛')) actions.push({ icon: '🎯', title: '添加精确匹配版本', detail: `当前为广泛匹配，流量质量不稳定。建议复制为 [${kw.keyword}] 精确匹配单独投放，锁住优质流量。` });
    if (qsBad.length > 0) {
      actions.push({ icon: '🏗️', title: `拆分独立广告组，针对性优化 QS（${qsBad.join('、')}偏低）`, detail: `高效词 QS 有提升空间。建议将 "${kw.keyword}" 从「${adGroupName}」拆出到独立广告组，配置专属文案和落地页，提升 QS 可进一步压低 CPC、扩大利润。` });
    }

  } else if (hasCost && (kw.cost || 0) > 200 && (!kw.purchaseNew || kw.purchaseNew === 0)) {
    verdictTitle = '🔴 烧钱词 — 建议暂停或否定';
    verdictDetail = `花费 ${U.fmt(kw.cost)}，点击 ${kw.clicks || 0} 次，0 转化。已消耗足够预算验证效果，继续投放大概率持续浪费。`;
    actions.push({ icon: '🚫', title: '暂停关键词或大幅降价', detail: '累计花费已超过正常 CPA 数倍仍无转化，建议直接暂停止损。' });
    actions.push({ icon: '🔍', title: '检查搜索词报告', detail: '确认是否被大量无关搜索词触发。如有，添加否定关键词后可考虑重新开启。' });
    if (kw.matchType && kw.matchType.includes('广泛')) actions.push({ icon: '🎯', title: '收窄匹配类型', detail: '广泛匹配可能是导致0转化的主因——匹配了偏离意图的搜索词。改为词组或精确匹配。' });

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

    verdictDetail = `QS 综合分 = ${kw.qualityScore || '--'}，但存在维度短板：${dimDetail}。\n\n根本原因分析：「${adGroupName}」广告组内可能包含多个主题不同的关键词，共享同一组广告文案和落地页。"${kw.keyword}" 的搜索意图与组内其他关键词存在差异，导致文案/LP 匹配度被 Google 判定偏低${kw.cpc ? '，CPC 被推高到 ' + U.fmt(kw.cpc) : ''}。`;

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
    verdictDetail = `QS = ${kw.qualityScore || '--'}，三个维度均为"平均水平"。虽然没有明显短板，但也意味着没有竞争优势。${kw.cpc ? 'CPC ' + U.fmt(kw.cpc) + ' 可能仍有下降空间。' : ''}如果该词的搜索量和转化潜力值得投入，拆组专项优化可将各维度推到"高于平均"。`;
    actions.push({ icon: '🏗️', title: `考虑拆分到独立广告组`, detail: `如果 "${kw.keyword}" 的搜索量和业务价值足够高，值得拆组做精细化运营：配专属文案 + 专属落地页 + 独立出价。目标是将 QS 各维度提升到"高于平均"。` });

  } else if (hasCost && (!kw.purchaseNew || kw.purchaseNew === 0) && (kw.clicks || 0) > 10) {
    verdictTitle = '🟡 待观察 — 有流量但无转化';
    verdictDetail = `花费 ${U.fmt(kw.cost)}，点击 ${kw.clicks} 次，暂无转化。数据量尚未达到统计显著性（通常需 200+ 花费或 30+ 点击），建议再观察 1-2 天。`;
    actions.push({ icon: '⏱️', title: '继续观察，设置花费预警线', detail: `如累计花费超过 ${U.fmt(200)} 仍无转化，则触发暂停/优化。` });

  } else {
    verdictTitle = '🟡 观察中';
    verdictDetail = '数据量尚不充分（花费低/点击少），无法做出可靠判断。建议继续积累 2-3 天数据后再决策。';
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
          <td class="num bold ${Number(k.qualityScore) >= 8 ? 'clr-good' : Number(k.qualityScore) >= 6 ? 'clr-warn' : k.qualityScore ? 'clr-bad' : 'clr-muted'}">${k.qualityScore || '--'}</td>
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
      <td><span class="${eCtr.cls}">${eCtr.text} ${k.expectedCTR || '--'}</span></td>
      <td><span class="${aRel.cls}">${aRel.text} ${k.adRelevance || '--'}</span></td>
      <td><span class="${lpExp.cls}">${lpExp.text} ${k.landingPageExp || '--'}</span></td>
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
  const lower = campName.toLowerCase();
  let product = '未知';
  if (lower.startsWith('pu-') || lower.startsWith('pu ')) product = 'PU';
  else if (lower.startsWith('ppt-') || lower.startsWith('ppt ')) product = 'PPT';
  else if (lower.startsWith('ft-') || lower.startsWith('ft ')) product = 'FT';
  const geoMatch = campName.match(/[-\s](IN|US|UK|AR|UAE|IL|QA|BR|MX|PH|ID|TH|VN|MY|SG|TW|HK|JP|KR|DE|FR|ES|IT|AU|CA|RU|SA)[-\s]/i);
  const geo = geoMatch ? geoMatch[1].toUpperCase() : '未知';
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

function renderClusterView() {
  ALL_CLUSTERS = buildKeywordClusters(FLAT_KW, 2);

  const campFilter = U.el('cluster-camp-filter');
  const campNames = [...new Set(FLAT_KW.map(k => k._camp))];
  campFilter.innerHTML = '<option value="all">全部 Campaign</option>' + campNames.map(c => `<option value="${c}">${U.campShortName(c)}</option>`).join('');

  renderClusterList();

  campFilter.addEventListener('change', renderClusterList);
  U.el('cluster-search').addEventListener('input', renderClusterList);
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
              <td class="num bold ${qsCls}">${k.qualityScore || '--'}</td>
              <td class="${arCls}">${k.adRelevance || '--'}</td>
              <td class="${lpCls}">${k.landingPageExp || '--'}</td>
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
// INIT
// ═══════════════════════════════════════
renderTrustGate();
renderCampaignOverview();
renderDrillDown();
renderRootCause();
initSearchTermsModule();
renderClusterView();
renderQualityScore();
renderDevices();
