/**
 * App 投放 - 变更日志独立页面逻辑
 * 2026-03-19
 */

const $ = id => document.getElementById(id);

function campShortName(name) {
  if (!name) return '--';
  return name.replace(/[-_]\s*(aro|ARO)[-_]\s*/gi, ' ')
    .replace(/[-_]?(T1|ww|IN|HK|ES|BR|DE|EU)[-_]?/g, ' $1 ')
    .replace(/\d{4,}$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 45);
}

const FIELD_LABELS = {
  'target_roas': '目标 ROAS',
  'target_cpa_micros': '目标 CPA',
  'amount_micros': '预算金额',
  'status': '状态',
  'name': '名称',
  'youtube_video_id': 'YouTube 视频 ID',
  'type': '类型',
  'headlines': '标题',
  'descriptions': '描述',
  'ad': '广告',
  'campaign_budget': '预算',
  'ad_group': '广告组',
  'id': 'ID',
  'conversion_actions': '转化操作',
  'use_audience_grouped': '受众分组',
  'advertising_channel_type': '渠道类型',
  'advertising_channel_sub_type': '渠道子类型',
  'ad_serving_optimization_status': '投放优化状态',
  'app_id': 'App ID',
  'cpc_bid_micros': 'CPC 出价',
  'bidding_strategy_type': '出价策略',
};

const RAW_DATA = (typeof ADW_APP_CHANGE_HISTORY !== 'undefined' && Array.isArray(ADW_APP_CHANGE_HISTORY))
  ? ADW_APP_CHANGE_HISTORY : [];

// Normalize: merge "AD" into "广告"
const CHANGE_LOG = RAW_DATA.map(e => {
  if (e.resourceType === 'AD') return { ...e, resourceType: '广告' };
  return e;
});

function formatDateTime(dt) {
  if (!dt) return '--';
  return dt.replace(/\.\d+$/, '');
}

function opBadge(op) {
  if (op === '新建') return '<span class="badge badge-good">新建</span>';
  if (op === '修改') return '<span class="badge badge-warn">修改</span>';
  if (op === '移除') return '<span class="badge badge-bad">移除</span>';
  return `<span class="badge badge-neutral">${op}</span>`;
}

function typeBadge(t) {
  const cls = {
    'Campaign': 'accent', '广告组': 'info', '关键词': 'func', '广告': 'display',
    '预算': 'warn', 'Campaign否定词': 'bad', '出价调整': 'warn',
    '素材': 'pmax', '广告组素材': 'pmax', 'Campaign素材': 'pmax'
  };
  const labels = { 'Campaign否定词': '排除项' };
  const label = labels[t] || t;
  return `<span class="badge badge-${cls[t] || 'neutral'}">${label}</span>`;
}

function clientLabel(ct) {
  const map = { 'INTERNAL_TOOL': '内部工具' };
  return map[ct] || ct || '--';
}

function friendlyField(field) {
  return FIELD_LABELS[field] || field;
}

function formatChangeDetail(entry) {
  if (!entry.details || entry.details.length === 0) {
    const fields = entry.changedFields || [];
    if (fields.length === 0) return '<span class="muted">--</span>';
    const skip = new Set(['resource_name', 'campaign', 'criterion_id', 'negative', 'ad_group', 'id']);
    const visible = fields.map(f => f.split('.').pop()).filter(f => !skip.has(f));
    if (visible.length === 0) return '<span class="muted">--</span>';
    return visible.map(f => `<span class="cl-field">${friendlyField(f)}</span>`).join(', ');
  }

  const skip = new Set(['campaign', 'criterion_id', 'resource_name', 'negative', 'ad_group', 'id']);
  const meaningful = entry.details.filter(d => !skip.has(d.field) && (d.old || d.new));
  const list = meaningful.length > 0 ? meaningful : entry.details.filter(d => !skip.has(d.field));

  if (list.length === 0) return '<span class="muted">--</span>';

  return list.map(d => {
    const field = friendlyField(d.field || '?');
    if (d.old && d.new) return `<span class="cl-field">${field}</span>: <span class="cl-old">${d.old}</span> → <span class="cl-new">${d.new}</span>`;
    if (d.new) return `<span class="cl-field">${field}</span>: <span class="cl-new">${d.new}</span>`;
    if (d.old) return `<span class="cl-field">${field}</span>: <del class="cl-old">${d.old}</del>`;
    return `<span class="cl-field">${field}</span>`;
  }).join('<br>');
}

function renderChangeLog() {
  if (CHANGE_LOG.length === 0) {
    $('changelog-kpis').innerHTML = `
      <div class="kpi-card"><div class="kpi-label">变更记录</div><div class="kpi-value clr-muted">0</div>
      <div class="kpi-sub">暂无数据，请运行 fetch_app_change_history.py</div></div>`;
    $('changelog-tbody').innerHTML = `<tr><td colspan="9" style="text-align:center;padding:60px;">
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">暂无变更历史数据</div>
        <div class="empty-state-desc">请先运行 <code>python fetch_app_change_history.py</code> 获取 App 账户的变更记录</div>
      </div></td></tr>`;
    $('data-tag').className = 'data-tag data-tag-mock';
    $('data-tag').textContent = 'NO DATA';
    $('result-count').textContent = '';
    return;
  }

  // Account filter
  const accountFilter = $('cl-filter-account');
  const accounts = [...new Set(CHANGE_LOG.map(e => e.accountId).filter(Boolean))].sort();
  if (accountFilter) {
    accountFilter.innerHTML = '<option value="all">全部账户 (' + accounts.length + ')</option>' +
      accounts.map(a => {
        const cnt = CHANGE_LOG.filter(e => e.accountId === a).length;
        return `<option value="${a}">${a} (${cnt})</option>`;
      }).join('');
  }

  const campFilter = $('cl-filter-camp');
  const camps = [...new Set(CHANGE_LOG.map(e => e.campaign).filter(Boolean))].sort();
  campFilter.innerHTML = '<option value="all">全部 Campaign (' + camps.length + ')</option>' +
    camps.map(c => `<option value="${c}">${campShortName(c)}</option>`).join('');

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

  // Count bidding-related changes (virtual category)
  const BID_FIELDS = ['target_roas', 'target_cpa_micros', 'bidding_strategy_type', 'cpc_bid_micros', 'target_spend_micros'];
  const bidCount = CHANGE_LOG.filter(e =>
    (e.changedFields || []).some(f => BID_FIELDS.some(bf => f.includes(bf)))
  ).length;

  // Build dynamic entity type filter from actual data
  const typeFilter = $('cl-filter-type');
  const typeOrder = ['Campaign否定词', '素材', 'Campaign', '预算', '广告组', '广告', '关键词',
    '出价调整', '广告组素材', 'Campaign素材'];
  const typeLabels = { 'Campaign否定词': '排除项' };
  let typeOpts = '<option value="all">全部实体</option>';
  if (bidCount > 0) typeOpts += `<option value="__bid__">出价调整 (${bidCount})</option>`;
  typeOrder.forEach(t => {
    if (typeCount[t]) typeOpts += `<option value="${t}">${typeLabels[t] || t} (${typeCount[t]})</option>`;
  });
  Object.keys(typeCount).forEach(t => {
    if (!typeOrder.includes(t)) typeOpts += `<option value="${t}">${t} (${typeCount[t]})</option>`;
  });
  typeFilter.innerHTML = typeOpts;

  $('changelog-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">总变更数</div><div class="kpi-value">${CHANGE_LOG.length}</div><div class="kpi-sub">近 30 天 · ${Object.keys(typeCount).length} 种实体</div></div>
    <div class="kpi-card"><div class="kpi-label">今日变更</div><div class="kpi-value ${todayCount > 0 ? 'clr-warn' : ''}">${todayCount}</div><div class="kpi-sub">${today}</div></div>
    <div class="kpi-card"><div class="kpi-label">新建</div><div class="kpi-value clr-good">${opCount['新建'] || 0}</div></div>
    <div class="kpi-card"><div class="kpi-label">修改</div><div class="kpi-value clr-warn">${opCount['修改'] || 0}</div></div>
    <div class="kpi-card"><div class="kpi-label">移除</div><div class="kpi-value clr-bad">${opCount['移除'] || 0}</div></div>
  `;

  const allDates = CHANGE_LOG.map(e => (e.dateTime || '').slice(0, 10)).filter(Boolean).sort();
  if (allDates.length > 0) {
    $('cl-filter-date-start').value = allDates[0];
    $('cl-filter-date-end').value = allDates[allDates.length - 1];
    $('date-range-label').textContent = `数据周期: ${allDates[0]} ~ ${allDates[allDates.length - 1]}`;
  }

  filterChangeLog();

  campFilter.addEventListener('change', filterChangeLog);
  typeFilter.addEventListener('change', filterChangeLog);
  if (accountFilter) accountFilter.addEventListener('change', filterChangeLog);
  $('cl-filter-op').addEventListener('change', filterChangeLog);
  $('cl-search').addEventListener('input', filterChangeLog);
  $('cl-filter-date-start').addEventListener('change', filterChangeLog);
  $('cl-filter-date-end').addEventListener('change', filterChangeLog);
}

function filterChangeLog() {
  const accountVal = $('cl-filter-account') ? $('cl-filter-account').value : 'all';
  const campVal = $('cl-filter-camp').value;
  const typeVal = $('cl-filter-type').value;
  const opVal = $('cl-filter-op').value;
  const searchVal = $('cl-search').value.trim().toLowerCase();
  const dateStart = $('cl-filter-date-start').value;
  const dateEnd = $('cl-filter-date-end').value;

  let filtered = CHANGE_LOG;
  if (accountVal !== 'all') filtered = filtered.filter(e => e.accountId === accountVal);
  if (campVal !== 'all') filtered = filtered.filter(e => e.campaign === campVal);
  if (typeVal !== 'all') {
    if (typeVal === '__bid__') {
      const bidF = ['target_roas', 'target_cpa_micros', 'bidding_strategy_type', 'cpc_bid_micros', 'target_spend_micros'];
      filtered = filtered.filter(e =>
        (e.changedFields || []).some(f => bidF.some(bf => f.includes(bf)))
      );
    } else if (typeVal === '广告') {
      filtered = filtered.filter(e => e.resourceType === '广告' || e.resourceType === 'AD');
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

  const MAX_ROWS = 500;
  let html = '';
  filtered.slice(0, MAX_ROWS).forEach(e => {
    html += `<tr>
      <td style="white-space:nowrap;font-size:11px;">${formatDateTime(e.dateTime)}</td>
      <td style="font-size:11px;font-variant-numeric:tabular-nums;color:var(--accent);">${e.accountId || '--'}</td>
      <td class="muted" style="font-size:11px;">${e.userEmail ? e.userEmail.split('@')[0] : '--'}</td>
      <td style="font-size:10px;">${clientLabel(e.clientType)}</td>
      <td class="bold" title="${e.campaign}">${campShortName(e.campaign)}</td>
      <td class="muted">${e.adGroup || '--'}</td>
      <td>${typeBadge(e.resourceType)}</td>
      <td>${opBadge(e.operation)}</td>
      <td style="font-size:12px;white-space:normal;max-width:350px;">${formatChangeDetail(e)}</td>
    </tr>`;
  });

  if (!html) html = '<tr><td colspan="9" class="muted" style="text-align:center;padding:30px;">无匹配的变更记录</td></tr>';

  $('changelog-tbody').innerHTML = html;

  const countText = filtered.length > MAX_ROWS
    ? `显示前 ${MAX_ROWS} 条，共 ${filtered.length} 条记录`
    : `共 ${filtered.length} 条记录`;
  $('result-count').textContent = countText;
}

renderChangeLog();
