/**
 * App 投放 - 变更日志独立页面逻辑
 * 2026-03-19
 */

const $ = id => document.getElementById(id);

function campShortName(name) {
  return (name || '').replace(/app-|web-|2\.5-/g, '').substring(0, 40);
}

const CHANGE_LOG = (typeof ADW_APP_CHANGE_HISTORY !== 'undefined' && Array.isArray(ADW_APP_CHANGE_HISTORY))
  ? ADW_APP_CHANGE_HISTORY : [];

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
    'Campaign': 'search', '广告组': 'info', '关键词': 'func', '广告': 'neutral',
    '预算': 'warn', 'Campaign否定词': 'bad', '出价调整': 'warn', '素材': 'neutral'
  };
  return `<span class="badge badge-${cls[t] || 'neutral'}">${t}</span>`;
}

function formatChangeDetail(entry) {
  if (!entry.details || entry.details.length === 0) {
    const fields = entry.changedFields || [];
    if (fields.length === 0) return '<span class="muted">--</span>';
    return fields.map(f => `<span class="cl-field">${f.split('.').pop()}</span>`).join(', ');
  }

  const dMap = {};
  entry.details.forEach(d => { dMap[d.field] = d; });

  if (entry.resourceType === 'Campaign否定词') {
    const sub = entry.negSubType || '';
    if (sub === '否定关键词') {
      const kw = dMap.text;
      const mt = dMap.match_type;
      let out = '<span class="badge badge-neutral" style="font-size:10px;">否定关键词</span> ';
      if (kw && kw.new) out += `<span class="cl-new">${kw.new}</span> `;
      if (mt && mt.new) out += `<span class="muted">(${mt.new})</span>`;
      if (!kw?.new && !mt?.new) {
        const statusD = dMap.status;
        if (statusD && statusD.old && !statusD.new) out += '<span class="muted">已移除</span>';
      }
      return out;
    }
    const label = (dMap.type_ && dMap.type_.new) || '';
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

function renderChangeLog() {
  if (CHANGE_LOG.length === 0) {
    $('changelog-kpis').innerHTML = `
      <div class="kpi-card"><div class="kpi-label">变更记录</div><div class="kpi-value clr-muted">0</div>
      <div class="kpi-sub">暂无数据，请运行 fetch_app_change_history.py</div></div>`;
    $('changelog-tbody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:60px;">
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">暂无变更历史数据</div>
        <div class="empty-state-desc">请先运行 <code>python fetch_app_change_history.py</code> 获取 App 账户的变更记录<br>
        或等待 API 授权后自动拉取数据</div>
      </div></td></tr>`;
    $('data-tag').className = 'data-tag data-tag-mock';
    $('data-tag').textContent = 'NO DATA';
    $('result-count').textContent = '';
    return;
  }

  const campFilter = $('cl-filter-camp');
  const camps = [...new Set(CHANGE_LOG.map(e => e.campaign).filter(Boolean))].sort();
  campFilter.innerHTML = '<option value="all">全部 Campaign</option>' +
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

  $('changelog-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">总变更数</div><div class="kpi-value">${CHANGE_LOG.length}</div><div class="kpi-sub">近 30 天</div></div>
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
  $('cl-filter-type').addEventListener('change', filterChangeLog);
  $('cl-filter-op').addEventListener('change', filterChangeLog);
  $('cl-search').addEventListener('input', filterChangeLog);
  $('cl-filter-date-start').addEventListener('change', filterChangeLog);
  $('cl-filter-date-end').addEventListener('change', filterChangeLog);
}

function filterChangeLog() {
  const campVal = $('cl-filter-camp').value;
  const typeVal = $('cl-filter-type').value;
  const opVal = $('cl-filter-op').value;
  const searchVal = $('cl-search').value.trim().toLowerCase();
  const dateStart = $('cl-filter-date-start').value;
  const dateEnd = $('cl-filter-date-end').value;

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

  const MAX_ROWS = 500;
  let html = '';
  filtered.slice(0, MAX_ROWS).forEach(e => {
    html += `<tr>
      <td style="white-space:nowrap;font-size:11px;">${formatDateTime(e.dateTime)}</td>
      <td class="muted" style="font-size:11px;">${e.userEmail ? e.userEmail.split('@')[0] : '--'}</td>
      <td style="font-size:10px;">${e.clientType || '--'}</td>
      <td class="bold" title="${e.campaign}">${campShortName(e.campaign || '--')}</td>
      <td class="muted">${e.adGroup || '--'}</td>
      <td>${typeBadge(e.resourceType)}${e.negSubType ? '<br><span class="muted" style="font-size:10px;">'+e.negSubType+'</span>' : ''}</td>
      <td>${opBadge(e.operation)}</td>
      <td style="font-size:12px;white-space:normal;max-width:350px;">${formatChangeDetail(e)}</td>
    </tr>`;
  });

  if (!html) html = '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px;">无匹配的变更记录</td></tr>';

  $('changelog-tbody').innerHTML = html;

  const countText = filtered.length > MAX_ROWS
    ? `显示前 ${MAX_ROWS} 条，共 ${filtered.length} 条记录`
    : `共 ${filtered.length} 条记录`;
  $('result-count').textContent = countText;
}

renderChangeLog();
