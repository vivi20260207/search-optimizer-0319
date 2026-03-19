/**
 * Web 投放数据后台 - 应用逻辑
 */

// ============================================================
// AI Analysis Engine - 规则引擎 + 标注生成
// ============================================================
const AI = {
  panelHTML(id, insights) {
    if (!insights || !insights.length) return '';
    return `<div class="ai-panel" id="${id}">
      <div class="ai-panel-header" onclick="AI.toggle('${id}')">
        <h4>📊 AI 分析 & 优化建议</h4>
        <span class="ai-panel-toggle">▲</span>
      </div>
      <div class="ai-panel-body">${insights.map(i =>
        `<div class="ai-insight ${i.level}">
          <span class="ai-insight-icon">${i.icon}</span>
          <span class="ai-insight-text">${i.text}</span>
        </div>`).join('')}
      </div>
    </div>`;
  },

  toggle(id) {
    document.getElementById(id)?.classList.toggle('collapsed');
  },

  // --- Search Terms ---
  termTag(d) {
    const hasCost = d.cost > 0;
    if (d.purchaseNew >= 5) {
      if (d.matchType && d.matchType.includes('广泛')) return '<span class="action-tag tag-exact">💎 核心词-建议精确</span>';
      return '<span class="action-tag tag-keep">✅ 核心词-保持</span>';
    }
    if (d.purchaseNew >= 1) {
      if (hasCost && d.cost > 500 && d.purchaseNewValue / d.cost < 0.3) return '<span class="action-tag tag-watch">🟡 ROI低-观察</span>';
      return '<span class="action-tag tag-watch">🟡 有转化-观察</span>';
    }
    if (hasCost && d.cost > 200) return '<span class="action-tag tag-negate">🔴 建议否定</span>';
    if ((d.pageView || 0) > 500 && d.purchaseNew === 0) return '<span class="action-tag tag-watch">🟡 高流量无转化</span>';
    if ((d.firstVisit || 0) > 100 && d.purchaseNew === 0) return '<span class="action-tag tag-watch">🟡 流量词-观察</span>';
    return '<span class="action-tag tag-traffic">— 仅流量</span>';
  },

  termInsights(terms) {
    const insights = [];
    const totalPurchase = terms.reduce((s, d) => s + d.purchaseNew, 0);
    const withPurchase = terms.filter(d => d.purchaseNew > 0);
    const noPurchase = terms.filter(d => d.purchaseNew === 0);
    const top5 = withPurchase.slice(0, 5);
    const top5Conv = top5.reduce((s, d) => s + d.purchaseNew, 0);
    const hasCost = terms.some(d => d.cost > 0);

    if (top5.length) {
      const pct = totalPurchase > 0 ? (top5Conv / totalPurchase * 100).toFixed(0) : 0;
      insights.push({
        level: 'positive', icon: '🟢',
        text: `<strong>核心词集中</strong>：TOP 5 搜索词（${top5.map(d => '「' + d.term + '」').join('、')}）贡献 <span class="metric">${pct}%</span> 付费转化，是核心流量来源。`
      });
    }

    const broadHigh = withPurchase.filter(d => d.purchaseNew >= 3 && d.matchType && d.matchType.includes('广泛'));
    if (broadHigh.length > 0) {
      insights.push({
        level: 'info', icon: '💡',
        text: `<strong>精确匹配机会</strong>：${broadHigh.length} 个高转化词通过广泛匹配触发（${broadHigh.slice(0,3).map(d => '「'+d.term+'」').join('、')}），<span class="action">建议添加为精确匹配关键字</span>，降低泛匹配浪费。`
      });
    }

    if (hasCost) {
      const burnTerms = terms.filter(d => d.cost > 200 && d.purchaseNew === 0);
      if (burnTerms.length > 0) {
        const totalBurn = burnTerms.reduce((s, d) => s + d.cost, 0);
        insights.push({
          level: 'critical', icon: '🔴',
          text: `<strong>烧钱预警</strong>：${burnTerms.length} 个搜索词花费 > 200 HKD 但 0 转化，合计浪费 <span class="metric">${fmt(totalBurn)} HKD</span>。<span class="action">建议立即添加为否定关键字</span>。`
        });
      }
    }

    const highTrafficNoConv = noPurchase.filter(d => (d.pageView || 0) > 1000);
    if (highTrafficNoConv.length > 0) {
      insights.push({
        level: 'warning', icon: '🟡',
        text: `<strong>高流量无转化</strong>：${highTrafficNoConv.length} 个词页面浏览 > 1000 但无付费（${highTrafficNoConv.slice(0,3).map(d => '「'+d.term+'」').join('、')}），可能是泛流量词，<span class="action">建议评估是否否定</span>。`
      });
    }

    const convRate = terms.length > 0 ? (withPurchase.length / terms.length * 100).toFixed(1) : 0;
    insights.push({
      level: convRate > 10 ? 'positive' : 'warning', icon: convRate > 10 ? '📊' : '📊',
      text: `<strong>转化率概览</strong>：${terms.length} 个搜索词中仅 <span class="metric">${withPurchase.length} 个 (${convRate}%)</span> 产生付费转化。${convRate < 5 ? '转化率偏低，建议优化关键词匹配策略和着陆页。' : ''}`
    });

    return insights;
  },

  // --- Keywords ---
  kwTag(k) {
    const qs = Number(k.qualityScore) || 0;
    const hasCost = k.cost > 0;
    const isBroad = k.matchType && (k.matchType.includes('广泛') || k.matchType.toLowerCase().includes('broad'));
    if (hasCost && k.purchaseNew > 0) {
      const roas = k.purchaseNewValue / k.cost;
      if (isBroad && k.purchaseNew >= 3) return '<span class="action-tag tag-exact">💎 高效-建议精确</span>';
      if (roas >= 1.5) return '<span class="action-tag tag-boost">🚀 高效-建议提价</span>';
      if (roas >= 0.5) return '<span class="action-tag tag-keep">✅ 表现良好</span>';
      return '<span class="action-tag tag-watch">🟡 ROI偏低</span>';
    }
    if (!hasCost && k.purchaseNew > 0 && isBroad) return '<span class="action-tag tag-exact">💎 高转化-建议精确</span>';
    if (hasCost && k.cost > 1000 && k.purchaseNew === 0) return '<span class="action-tag tag-pause">🔴 建议暂停</span>';
    if (qs > 0 && qs < 6) {
      const reasons = [];
      if (k.landingPageExp && k.landingPageExp.includes('低于')) reasons.push('着陆页');
      if (k.adRelevance && k.adRelevance.includes('低于')) reasons.push('广告相关性');
      if (k.expectedCTR && k.expectedCTR.includes('低于')) reasons.push('CTR');
      return `<span class="action-tag tag-improve">🟡 提升${reasons.length ? reasons.join('+') : 'QS'}</span>`;
    }
    if (qs >= 8) return '<span class="action-tag tag-good">✅ 质量优秀</span>';
    if (k.purchaseNew >= 5) return '<span class="action-tag tag-keep">✅ 高转化</span>';
    if (k.purchaseNew > 0) return '<span class="action-tag tag-watch">🟡 观察</span>';
    return '';
  },

  kwInsights(keywords) {
    if (!keywords || !keywords.length) return [];
    const insights = [];
    const withQS = keywords.filter(k => k.qualityScore);
    const lowQS = withQS.filter(k => Number(k.qualityScore) < 6);
    const highQS = withQS.filter(k => Number(k.qualityScore) >= 8);
    const hasCost = keywords.some(k => k.cost > 0);

    const kwsWithCPC = keywords.filter(k => k.cost > 0 && k.clicks > 0);
    const avgCPC = kwsWithCPC.length ? kwsWithCPC.reduce((s, k) => s + k.cost / k.clicks, 0) / kwsWithCPC.length : 0;
    const highQSWithCPC = highQS.filter(k => k.cost > 0 && k.clicks > 0);
    const lowQSWithCPC = lowQS.filter(k => k.cost > 0 && k.clicks > 0);
    const highQSAvgCPC = highQSWithCPC.length ? highQSWithCPC.reduce((s, k) => s + k.cost / k.clicks, 0) / highQSWithCPC.length : 0;
    const lowQSAvgCPC = lowQSWithCPC.length ? lowQSWithCPC.reduce((s, k) => s + k.cost / k.clicks, 0) / lowQSWithCPC.length : 0;

    if (lowQS.length > 0) {
      const lpIssue = lowQS.filter(k => k.landingPageExp && k.landingPageExp.includes('低于'));
      const adRelIssue = lowQS.filter(k => k.adRelevance && k.adRelevance.includes('低于'));
      const ctrIssue = lowQS.filter(k => k.expectedCTR && k.expectedCTR.includes('低于'));
      let detail = '';
      if (lpIssue.length) detail += `${lpIssue.length} 个着陆页体验低、`;
      if (adRelIssue.length) detail += `${adRelIssue.length} 个广告相关性低、`;
      if (ctrIssue.length) detail += `${ctrIssue.length} 个预期CTR低、`;
      detail = detail.replace(/、$/, '');
      const cpcNote = lowQSAvgCPC > 0 ? ` 低 QS 词均 CPC <span class="metric">${lowQSAvgCPC.toFixed(2)}</span>${avgCPC > 0 ? '（整体均值 ' + avgCPC.toFixed(2) + '）' : ''}。` : '';
      insights.push({
        level: 'warning', icon: '🟡',
        text: `<strong>质量得分待优化</strong>：${lowQS.length} 个关键词 QS < 6（${lowQS.map(k => '「'+k.keyword+'」').slice(0,3).join('、')}）。${detail ? '其中' + detail + '。' : ''}${cpcNote}<span class="action">低 QS 会推高 CPC，建议针对性优化</span>。`
      });
    }

    if (highQS.length > 0) {
      const cpcNote = highQSAvgCPC > 0 && avgCPC > 0 ? `，均 CPC <span class="metric">${highQSAvgCPC.toFixed(2)}</span>（整体均值 ${avgCPC.toFixed(2)}，${highQSAvgCPC < avgCPC ? '低 ' + ((1 - highQSAvgCPC / avgCPC) * 100).toFixed(0) + '%' : '持平'}）` : '';
      insights.push({
        level: 'positive', icon: '🟢',
        text: `<strong>高质量关键词</strong>：${highQS.length} 个关键词 QS ≥ 8（${highQS.slice(0,4).map(k => '「'+k.keyword+'」QS:'+k.qualityScore).join('、')}）${cpcNote}，是优质流量来源。`
      });
    }

    if (highQSAvgCPC > 0 && lowQSAvgCPC > 0 && lowQSAvgCPC > highQSAvgCPC) {
      const diff = ((lowQSAvgCPC - highQSAvgCPC) / highQSAvgCPC * 100).toFixed(0);
      insights.push({
        level: 'info', icon: '📊',
        text: `<strong>QS↔CPC 实证</strong>：低 QS（<6）词的均 CPC 为 <span class="metric">${lowQSAvgCPC.toFixed(2)}</span>，高 QS（≥8）词为 <span class="metric">${highQSAvgCPC.toFixed(2)}</span>，<strong>低分词 CPC 高出 ${diff}%</strong>。提升 QS 可直接降低点击成本。`
      });
    }

    if (hasCost) {
      const highROAS = keywords.filter(k => k.cost > 0 && k.purchaseNew > 0 && k.purchaseNewValue / k.cost >= 1.5);
      if (highROAS.length) {
        insights.push({
          level: 'info', icon: '💡',
          text: `<strong>提价机会</strong>：${highROAS.length} 个关键词 ROAS > 1.5（${highROAS.slice(0,3).map(k => '「'+k.keyword+'」').join('、')}），<span class="action">建议适当提价抢量</span>。`
        });
      }
      const burnKW = keywords.filter(k => k.cost > 500 && k.purchaseNew === 0);
      if (burnKW.length) {
        insights.push({
          level: 'critical', icon: '🔴',
          text: `<strong>烧钱关键词</strong>：${burnKW.length} 个关键词花费 > 500 HKD 但 0 转化（${burnKW.slice(0,3).map(k => '「'+k.keyword+'」花费'+fmt(k.cost)).join('、')}），<span class="action">建议暂停或大幅降价</span>。`
        });
      }
    }

    const noConvKW = keywords.filter(k => k.purchaseNew === 0 && k.status === '有效');
    if (noConvKW.length > keywords.length * 0.5 && keywords.length > 5) {
      insights.push({
        level: 'warning', icon: '🟡',
        text: `<strong>关键词效率</strong>：${noConvKW.length}/${keywords.length} 个有效关键词无付费转化，<span class="action">建议清理低效词</span>，集中预算到高效词上。`
      });
    }

    return insights;
  },

  // --- Placements ---
  placementTag(d) {
    if (d.purchaseNew >= 10) return '<span class="action-tag tag-keep">✅ 优质位置</span>';
    if (d.purchaseNew >= 3) return '<span class="action-tag tag-watch">🟡 一般</span>';
    if (d.purchaseNew > 0) return '<span class="action-tag tag-watch">🟡 低转化</span>';
    if ((d.firstVisit || 0) > 200) return '<span class="action-tag tag-watch">🟡 仅流量</span>';
    return '<span class="action-tag tag-exclude">🔴 建议排除</span>';
  },

  placementInsights(data) {
    const insights = [];
    const total = data.length;
    const withConv = data.filter(d => d.purchaseNew > 0);
    const noConv = data.filter(d => d.purchaseNew === 0);
    const totalPurchase = data.reduce((s, d) => s + d.purchaseNew, 0);

    if (withConv.length > 0) {
      const top3 = withConv.slice(0, 3);
      const top3Conv = top3.reduce((s, d) => s + d.purchaseNew, 0);
      const pct = (top3Conv / totalPurchase * 100).toFixed(0);
      insights.push({
        level: 'positive', icon: '🟢',
        text: `<strong>头部集中</strong>：TOP 3 展示位置贡献 <span class="metric">${pct}%</span> 新付费转化（${top3.map(d => '「' + (d.placement.length > 20 ? d.placement.slice(0,20)+'…' : d.placement) + '」' + d.purchaseNew + '次').join('、')}）。`
      });
    }

    if (noConv.length > 0) {
      const pct = (noConv.length / total * 100).toFixed(0);
      insights.push({
        level: noConv.length > total * 0.6 ? 'critical' : 'warning',
        icon: noConv.length > total * 0.6 ? '🔴' : '🟡',
        text: `<strong>无转化位置多</strong>：${noConv.length}/${total} 个展示位置（<span class="metric">${pct}%</span>）无付费转化。<span class="action">建议排除低质量位置</span>，将预算集中到有转化的位置。`
      });
    }

    const webData = data.filter(d => d.type === '网站');
    const appData = data.filter(d => d.type === '移动应用');
    if (webData.length && appData.length) {
      const webConv = webData.reduce((s, d) => s + d.purchaseNew, 0);
      const appConv = appData.reduce((s, d) => s + d.purchaseNew, 0);
      const better = webConv > appConv ? '网站' : '移动应用';
      insights.push({
        level: 'info', icon: '💡',
        text: `<strong>位置类型对比</strong>：${better}类型转化更优（网站 ${webConv} vs 应用 ${appConv}），<span class="action">建议向${better}倾斜预算</span>。`
      });
    }

    return insights;
  },

  // --- Devices ---
  deviceTag(d) {
    if (d.cost === 0) return '';
    const convRate = parseFloat(d.convRate);
    if (d.conversions > 0 && d.cpa < 100) return '<span class="action-tag tag-boost">🚀 高效-提价</span>';
    if (d.conversions > 0) return '<span class="action-tag tag-keep">✅ 有转化</span>';
    if (d.cost > 100) return '<span class="action-tag tag-pause">🔴 无转化-降价</span>';
    return '';
  },

  deviceInsights(devices) {
    const insights = [];
    const active = devices.filter(d => d.cost > 0);
    if (!active.length) return insights;

    const byDevice = {};
    active.forEach(d => {
      if (!byDevice[d.device]) byDevice[d.device] = { cost: 0, conv: 0 };
      byDevice[d.device].cost += d.cost;
      byDevice[d.device].conv += d.conversions;
    });

    const entries = Object.entries(byDevice).sort((a, b) => b[1].cost - a[1].cost);
    const topDevice = entries[0];
    if (topDevice) {
      const cpa = topDevice[1].conv > 0 ? (topDevice[1].cost / topDevice[1].conv).toFixed(0) : '∞';
      insights.push({
        level: 'info', icon: '📱',
        text: `<strong>主力设备</strong>：「${topDevice[0]}」花费最高 <span class="metric">${fmt(topDevice[1].cost)} HKD</span>，CPA ${cpa}。`
      });
    }

    const noConvDevices = active.filter(d => d.conversions === 0 && d.cost > 200);
    if (noConvDevices.length) {
      insights.push({
        level: 'warning', icon: '🟡',
        text: `<strong>低效设备</strong>：${noConvDevices.map(d => '「' + d.campaign.split('-').slice(0,3).join('-') + ' ' + d.device + '」').join('、')} 有花费但无转化，<span class="action">建议降低出价调整</span>。`
      });
    }

    return insights;
  },

  // --- Geo ---
  geoTag(d) {
    if (d.conversions === 0) return '<span class="action-tag tag-exclude">🔴 无转化</span>';
    if (d.cpa && d.cpa < 80) return '<span class="action-tag tag-boost">🚀 高效-提价</span>';
    if (d.cpa && d.cpa > 200) return '<span class="action-tag tag-watch">🟡 CPA高</span>';
    return '<span class="action-tag tag-keep">✅ 正常</span>';
  },

  geoInsights(geo) {
    const insights = [];
    const withConv = geo.filter(d => d.conversions > 0);
    const noConv = geo.filter(d => d.conversions === 0 && d.cost > 0);
    const totalCost = geo.reduce((s, d) => s + d.cost, 0);

    if (withConv.length) {
      const best = withConv.sort((a, b) => (a.cpa || 9999) - (b.cpa || 9999))[0];
      const worst = [...withConv].sort((a, b) => b.cpa - a.cpa)[0];
      if (best && worst && best !== worst) {
        insights.push({
          level: 'info', icon: '🌍',
          text: `<strong>地区差异</strong>：最优「${best.region.split(',')[0]}」CPA <span class="metric">${best.cpa}</span>，最差「${worst.region.split(',')[0]}」CPA <span class="metric">${worst.cpa}</span>，差距 ${(worst.cpa / best.cpa).toFixed(1)}x。<span class="action">建议对高效地区提价，低效地区降价</span>。`
        });
      }
    }

    if (noConv.length) {
      const wasteCost = noConv.reduce((s, d) => s + d.cost, 0);
      insights.push({
        level: 'warning', icon: '🟡',
        text: `<strong>无转化地区</strong>：${noConv.length} 个地区有花费但无转化，合计 <span class="metric">${fmt(wasteCost)} HKD</span>（${(wasteCost/totalCost*100).toFixed(1)}%），<span class="action">建议排除或大幅降价</span>。`
      });
    }

    return insights;
  },

  // --- Schedule ---
  scheduleInsights(data) {
    const insights = [];
    if (!data || !data.length) return insights;

    const hourlyConv = new Array(24).fill(0);
    const hourlyCost = new Array(24).fill(0);
    data.forEach(r => { hourlyConv[r.hour] += r.conversions; hourlyCost[r.hour] += r.cost; });

    const peakHours = hourlyConv.map((c, i) => ({hour: i, conv: c, cost: hourlyCost[i]}))
      .filter(h => h.conv > 0).sort((a, b) => b.conv - a.conv);
    const deadHours = hourlyConv.map((c, i) => ({hour: i, conv: c, cost: hourlyCost[i]}))
      .filter(h => h.conv === 0 && h.cost > 0);

    if (peakHours.length >= 3) {
      const top3 = peakHours.slice(0, 3);
      insights.push({
        level: 'positive', icon: '🟢',
        text: `<strong>黄金时段</strong>：${top3.map(h => h.hour + ':00').join('、')} 转化最高，<span class="action">建议在这些时段提高出价</span>。`
      });
    }

    if (deadHours.length > 0) {
      const wasteCost = deadHours.reduce((s, h) => s + h.cost, 0);
      insights.push({
        level: 'warning', icon: '🟡',
        text: `<strong>低效时段</strong>：${deadHours.length} 个时段有花费但无转化，合计 <span class="metric">${fmt(wasteCost)} HKD</span>，<span class="action">建议降低出价或暂停投放</span>。`
      });
    }

    const dayOrder = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
    const dayConv = dayOrder.map(_ => 0);
    data.forEach(r => { const i = dayOrder.indexOf(r.day); if (i >= 0) dayConv[i] += r.conversions; });
    const bestDay = dayOrder[dayConv.indexOf(Math.max(...dayConv))];
    const worstDay = dayOrder[dayConv.indexOf(Math.min(...dayConv))];
    if (bestDay !== worstDay) {
      insights.push({
        level: 'info', icon: '📅',
        text: `<strong>星期分布</strong>：${bestDay.replace('星期','周')} 转化最多，${worstDay.replace('星期','周')} 最少，<span class="action">可针对性调整出价比例</span>。`
      });
    }

    return insights;
  },

  // --- Collect all insights for alerts page ---
  collectAll() {
    const all = [];
    const addGroup = (source, insights) => insights.forEach(i => all.push({...i, source}));

    const termMaps = {
      'Pu-IN-竞品词': typeof ADW_PU_IN_COMP_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_COMP_SEARCH_TERMS : [],
      'Pu-IN-品牌词': typeof ADW_PU_IN_BRAND_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_BRAND_SEARCH_TERMS : [],
      'Ft-IN-功能词': typeof ADW_FT_IN_FUNC_SEARCH_TERMS !== 'undefined' ? ADW_FT_IN_FUNC_SEARCH_TERMS : [],
      'Pu-IN-emeraldchat': typeof ADW_PU_IN_EMERALD_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_EMERALD_SEARCH_TERMS : [],
      'Ppt-UK': typeof ADW_PPT_UK_SEARCH_TERMS !== 'undefined' ? ADW_PPT_UK_SEARCH_TERMS : [],
      'Ppt-US': typeof ADW_PPT_US_SEARCH_TERMS !== 'undefined' ? ADW_PPT_US_SEARCH_TERMS : [],
    };
    for (const [name, data] of Object.entries(termMaps)) {
      if (data.length) addGroup(`搜索词 - ${name}`, AI.termInsights(data));
    }

    const kwMaps = {
      'Pu-IN-竞品词': typeof ADW_PU_IN_COMP_KEYWORDS !== 'undefined' ? ADW_PU_IN_COMP_KEYWORDS : [],
      'Pu-IN-品牌词': typeof ADW_PU_IN_BRAND_KEYWORDS !== 'undefined' ? ADW_PU_IN_BRAND_KEYWORDS : [],
      'Ft-IN-功能词': typeof ADW_FT_IN_FUNC_KEYWORDS !== 'undefined' ? ADW_FT_IN_FUNC_KEYWORDS : [],
      'Pu-IN-emeraldchat': typeof ADW_PU_IN_EMERALD_KEYWORDS !== 'undefined' ? ADW_PU_IN_EMERALD_KEYWORDS : [],
      'Ppt-UK': typeof ADW_PPT_UK_KEYWORDS !== 'undefined' ? ADW_PPT_UK_KEYWORDS : [],
      'Ppt-US': typeof ADW_PPT_US_KEYWORDS !== 'undefined' ? ADW_PPT_US_KEYWORDS : [],
    };
    for (const [name, data] of Object.entries(kwMaps)) {
      if (data.length) addGroup(`关键词 - ${name}`, AI.kwInsights(data));
    }

    if (typeof ADW_PU_IN_GEO !== 'undefined') addGroup('地理位置 - Pu-IN', AI.geoInsights(ADW_PU_IN_GEO));
    if (typeof ADW_PPT_UK_SCHEDULE !== 'undefined') addGroup('投放时段 - Ppt-UK', AI.scheduleInsights(ADW_PPT_UK_SCHEDULE));

    const placMaps = {
      'Pu-IN-Display': typeof ADW_PU_IN_PLACEMENTS !== 'undefined' ? ADW_PU_IN_PLACEMENTS : [],
      'Ft-US-Display': typeof ADW_FT_US_PLACEMENTS !== 'undefined' ? ADW_FT_US_PLACEMENTS : [],
    };
    for (const [name, data] of Object.entries(placMaps)) {
      if (data.length) addGroup(`展示位置 - ${name}`, AI.placementInsights(data));
    }

    const allDevices = [
      ...(typeof ADW_FT_US_DEVICES !== 'undefined' ? ADW_FT_US_DEVICES : []),
      ...(typeof ADW_PU_IN_DEVICES !== 'undefined' ? ADW_PU_IN_DEVICES : []),
      ...(typeof ADW_PU_IN_COMP_DEVICES !== 'undefined' ? ADW_PU_IN_COMP_DEVICES : []),
      ...(typeof ADW_PPT_UK_DEVICES !== 'undefined' ? ADW_PPT_UK_DEVICES : []),
      ...(typeof ADW_PPT_US_DEVICES !== 'undefined' ? ADW_PPT_US_DEVICES : []),
    ];
    if (allDevices.length) addGroup('设备分析', AI.deviceInsights(allDevices));

    if (typeof LP_VERSION_DATA !== 'undefined') {
      const allLPPages = [];
      LP_VERSION_DATA.sites.forEach(site => {
        site.pages.forEach(page => {
          const activeVer = page.versions.find(v => v.isActive);
          allLPPages.push({ ...page, site, activeVer, domain: site.domain, productShort: site.productShort });
        });
      });
      addGroup('落地页管理', getLPGlobalInsights(allLPPages));
      addGroup('词-页匹配', getLPMatrixInsights(LP_VERSION_DATA.keywordPageMap));
    }

    if (typeof AB_TEST_DATA !== 'undefined') {
      addGroup('A/B 测试', getABInsights());
    }

    all.sort((a, b) => {
      const order = {critical: 0, warning: 1, info: 2, positive: 3};
      return (order[a.level] ?? 4) - (order[b.level] ?? 4);
    });
    return all;
  }
};

// ============================================================
// Keyword Detail Drawer
// ============================================================
const Drawer = {
  el: () => document.getElementById('keyword-drawer'),
  overlay: () => document.getElementById('drawer-overlay'),
  body: () => document.getElementById('drawer-body'),

  open(term, context) {
    const drawer = this.el();
    const overlay = this.overlay();
    document.getElementById('drawer-keyword-name').textContent = term.term || term.keyword || '';
    document.getElementById('drawer-subtitle').innerHTML = this.buildSubtitle(term, context);
    const body = this.body();
    body.innerHTML = this.buildBody(term, context);
    body.scrollTop = 0;
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    body.querySelectorAll('.clickable-term[data-related-term]').forEach(el => {
      el.addEventListener('click', () => {
        try {
          const t = JSON.parse(decodeURIComponent(el.dataset.relatedTerm));
          this.open(t, { type: 'searchTerm', campaign: context.campaign });
        } catch(e) {}
      });
    });
  },

  close() {
    this.el().classList.remove('open');
    this.overlay().classList.remove('open');
    document.body.style.overflow = '';
  },

  init() {
    document.getElementById('drawer-close').addEventListener('click', () => this.close());
    document.getElementById('drawer-overlay').addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  },

  buildSubtitle(d, ctx) {
    const parts = [];
    if (d.matchType) parts.push(`<span class="drawer-tag" style="background:var(--bg-dark);color:var(--text-secondary)">${d.matchType}</span>`);
    if (d.adGroup) parts.push(`<span style="color:var(--text-muted)">广告组: ${d.adGroup}</span>`);
    if (ctx.campaign) parts.push(`<span style="color:var(--accent)">${ctx.campaign}</span>`);
    if (d.status) parts.push(`<span style="color:var(--text-muted)">${d.status}</span>`);
    return parts.join('');
  },

  buildBody(d, ctx) {
    const isSearchTerm = !!d.term;
    const analysis = this.analyzeKeyword(d, ctx);
    let html = '';

    html += `<div class="drawer-section">
      <div class="drawer-section-title">📊 数据指标</div>
      <div class="drawer-metrics">${this.buildMetrics(d, isSearchTerm)}</div>
    </div>`;

    html += `<div class="drawer-section">
      <div class="drawer-section-title">🎯 诊断结论</div>
      <div class="drawer-verdict ${analysis.verdictClass}">
        <h4>${analysis.verdictIcon} ${analysis.verdictTitle}</h4>
        <p style="margin-bottom:8px;">${analysis.verdictSummary}</p>
        ${analysis.verdictDetails ? `<ul>${analysis.verdictDetails.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`;

    if (analysis.intentAnalysis) {
      html += `<div class="drawer-section">
        <div class="drawer-section-title">🧠 用户意图分析</div>
        <div class="drawer-action-list">${analysis.intentAnalysis.map(i =>
          `<div class="drawer-action-item"><span class="drawer-action-icon">${i.icon}</span><div>${i.text}</div></div>`
        ).join('')}</div>
      </div>`;
    }

    if (analysis.actions && analysis.actions.length) {
      html += `<div class="drawer-section">
        <div class="drawer-section-title">⚡ 操作建议</div>
        <div class="drawer-action-list">${analysis.actions.map(a =>
          `<div class="drawer-action-item"><span class="drawer-action-icon">${a.icon}</span><div><strong>${a.title}</strong><br><span style="color:var(--text-secondary)">${a.detail}</span></div></div>`
        ).join('')}</div>
      </div>`;
    }

    if (analysis.landingPageNote) {
      html += `<div class="drawer-section">
        <div class="drawer-section-title">📄 落地页评估</div>
        <div class="drawer-verdict verdict-info">
          ${analysis.landingPageNote}
        </div>
      </div>`;
    }

    if (!isSearchTerm && ctx.searchTerms && ctx.searchTerms.length) {
      html += this.buildRelatedTerms(d, ctx.searchTerms);
    }

    return html;
  },

  matchSearchTerms(keyword, allTerms) {
    const kw = (keyword.keyword || '').toLowerCase().trim();
    const kwWords = kw.split(/\s+/);
    const kwAdGroup = keyword.adGroup || '';

    const scored = allTerms.map(t => {
      const term = (t.term || '').toLowerCase().trim();
      let score = 0;
      let matchReason = '';

      if (term === kw) {
        score = 100;
        matchReason = '完全匹配';
      } else if (term.includes(kw)) {
        score = 80;
        matchReason = '包含关键词';
      } else if (kw.includes(term)) {
        score = 70;
        matchReason = '关键词包含该词';
      } else {
        const matchedWords = kwWords.filter(w => w.length > 2 && term.includes(w));
        if (matchedWords.length >= 2) {
          score = 50 + matchedWords.length * 5;
          matchReason = `词根匹配(${matchedWords.join('+')})`;
        } else if (matchedWords.length === 1 && kwWords.length <= 2) {
          score = 30;
          matchReason = `部分匹配(${matchedWords[0]})`;
        }
      }

      if (score > 0 && t.adGroup === kwAdGroup) score += 10;
      if (score === 0 && t.adGroup === kwAdGroup) {
        score = 15;
        matchReason = '同广告组';
      }

      return { ...t, score, matchReason };
    });

    return scored.filter(t => t.score > 0).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.purchaseNew - a.purchaseNew;
    });
  },

  buildRelatedTerms(keyword, allTerms) {
    const matched = this.matchSearchTerms(keyword, allTerms);
    if (!matched.length) return '';

    const totalTermConv = matched.reduce((s, t) => s + t.purchaseNew, 0);
    const withConv = matched.filter(t => t.purchaseNew > 0);
    const noConv = matched.filter(t => t.purchaseNew === 0);
    const showMax = 30;
    const displayed = matched.slice(0, showMax);

    let html = `<div class="drawer-section">
      <div class="drawer-section-title">🔍 触发的真实搜索词（${matched.length} 个匹配）</div>
      <div class="drawer-metrics">
        <div class="drawer-metric"><div class="label">匹配搜索词数</div><div class="value">${matched.length}</div></div>
        <div class="drawer-metric"><div class="label">有付费转化</div><div class="value" style="color:var(--green)">${withConv.length}</div></div>
        <div class="drawer-metric"><div class="label">仅流量无转化</div><div class="value" style="color:${noConv.length > withConv.length ? 'var(--red)' : 'var(--yellow)'}">${noConv.length}</div></div>
        <div class="drawer-metric"><div class="label">搜索词总转化</div><div class="value" style="color:var(--green)">${fmt(totalTermConv, 1)}</div></div>
      </div>
      <div class="drawer-terms-table"><table>
        <thead><tr>
          <th style="text-align:left;padding:8px 10px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);">搜索词</th>
          <th style="padding:8px 10px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);">匹配方式</th>
          <th style="padding:8px 10px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);">关联度</th>
          <th style="padding:8px 10px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);">新付费</th>
          <th style="padding:8px 10px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);">金额</th>
          <th style="padding:8px 10px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);">PV</th>
        </tr></thead>
        <tbody>${displayed.map(t => {
          const convColor = t.purchaseNew > 0 ? 'var(--green)' : 'var(--text-muted)';
          const scoreColor = t.score >= 80 ? 'var(--green)' : t.score >= 50 ? 'var(--yellow)' : 'var(--text-muted)';
          return `<tr style="border-bottom:1px solid rgba(0,0,0,0.06);">
            <td style="padding:7px 10px;font-size:13px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.term}"><strong class="clickable-term" data-related-term="${encodeURIComponent(JSON.stringify(t))}">${t.term}</strong></td>
            <td style="padding:7px 10px;font-size:11px;color:var(--text-secondary);white-space:nowrap;">${t.matchType}</td>
            <td style="padding:7px 10px;font-size:11px;color:${scoreColor};white-space:nowrap;">${t.matchReason}</td>
            <td style="padding:7px 10px;font-weight:700;color:${convColor}">${t.purchaseNew}</td>
            <td style="padding:7px 10px;font-size:12px;">${fmt(t.purchaseNewValue, 1)}</td>
            <td style="padding:7px 10px;font-size:12px;color:var(--text-secondary)">${fmt(t.pageView || 0)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      ${matched.length > showMax ? `<div style="text-align:center;padding:8px;font-size:12px;color:var(--text-muted);">还有 ${matched.length - showMax} 个搜索词未显示</div>` : ''}
    </div>`;

    return html;
  },

  buildMetrics(d, isSearchTerm) {
    const items = [];
    if (isSearchTerm) {
      items.push({ label: '新付费转化', value: d.purchaseNew, color: d.purchaseNew > 0 ? 'var(--green)' : 'var(--red)' });
      items.push({ label: '付费金额(HKD)', value: fmt(d.purchaseNewValue, 2) });
      if (d.cost > 0) items.push({ label: '花费(HKD)', value: fmt(d.cost, 0), color: 'var(--red)' });
      items.push({ label: '页面浏览', value: fmt(d.pageView || 0) });
      items.push({ label: '首次访问', value: fmt(d.firstVisit || 0) });
      items.push({ label: '视频通话', value: fmt(d.videocall || 0) });
      if (d.cost > 0 && d.purchaseNew > 0) items.push({ label: 'ROAS', value: (d.purchaseNewValue / d.cost).toFixed(2), color: d.purchaseNewValue / d.cost >= 1 ? 'var(--green)' : 'var(--red)' });
      if (d.cost > 0) items.push({ label: 'CPA', value: d.purchaseNew > 0 ? (d.cost / d.purchaseNew).toFixed(2) : '∞' });
    } else {
      items.push({ label: '新付费转化', value: d.purchaseNew, color: d.purchaseNew > 0 ? 'var(--green)' : 'var(--red)' });
      items.push({ label: '付费金额(HKD)', value: fmt(d.purchaseNewValue, 2) });
      if (d.qualityScore) items.push({ label: '质量得分', value: d.qualityScore, color: d.qualityScore >= 8 ? 'var(--green)' : d.qualityScore >= 6 ? 'var(--yellow)' : 'var(--red)' });
      if (d.cost > 0) {
        items.push({ label: '花费(HKD)', value: fmt(d.cost, 0) });
        items.push({ label: '点击', value: fmt(d.clicks) });
        items.push({ label: '展示', value: fmt(d.impressions) });
        if (d.purchaseNew > 0) items.push({ label: 'ROAS', value: d.roas > 0 ? d.roas.toFixed(2) : '-', color: d.roas >= 1 ? 'var(--green)' : 'var(--red)' });
        items.push({ label: 'CPA', value: d.cpa > 0 ? d.cpa.toFixed(2) : '-' });
      }
      if (d.expectedCTR) items.push({ label: '预期CTR', value: d.expectedCTR });
      if (d.landingPageExp) items.push({ label: '着陆页体验', value: d.landingPageExp });
      if (d.adRelevance) items.push({ label: '广告相关性', value: d.adRelevance });
    }
    return items.map(i => `<div class="drawer-metric"><div class="label">${i.label}</div><div class="value" style="${i.color ? 'color:'+i.color : ''}">${i.value}</div></div>`).join('');
  },

  classifyIntent(name) {
    const n = (name || '').toLowerCase();
    const competitors = ['omegle', 'chathub', 'chatrandom', 'chatroulette', 'emeraldchat', 'emerald chat', 'coomeet', 'monkey', 'camsurf', 'azar', 'holla', 'bazoocam', 'shagle', 'tinychat', 'chatous'];
    const brands = ['parau', 'fachat', 'pinkpinkchat', 'ppt', 'facechat'];
    const freeIntent = ['free', 'online', 'random', 'anonymous', 'no sign', 'without'];
    const paidIntent = ['premium', 'paid', 'vip', 'subscribe', 'best', 'top rated', '1 on 1', 'one on one', 'private'];
    const genderWords = ['girl', 'girls', 'female', 'women', 'ladies'];
    const funcWords = ['video chat', 'video call', 'live chat', 'stranger', 'strangers', 'chat app', 'talk to'];

    const flags = {
      isCompetitor: competitors.some(c => n.includes(c)),
      isBrand: brands.some(b => n.includes(b)),
      hasFreeIntent: freeIntent.some(f => n.includes(f)),
      hasPaidIntent: paidIntent.some(p => n.includes(p)),
      hasGender: genderWords.some(g => n.includes(g)),
      isFunction: funcWords.some(f => n.includes(f)),
    };
    return flags;
  },

  analyzeKeyword(d, ctx) {
    const name = d.term || d.keyword || '';
    const intent = this.classifyIntent(name);
    const hasCost = (d.cost || 0) > 0;
    const pv = d.pageView || 0;
    const fv = d.firstVisit || 0;
    const vc = d.videocall || 0;
    const purchase = d.purchaseNew || 0;
    const purchaseVal = d.purchaseNewValue || 0;
    const cost = d.cost || 0;

    let verdictClass = 'verdict-info';
    let verdictIcon = '📋';
    let verdictTitle = '';
    let verdictSummary = '';
    let verdictDetails = [];
    let actions = [];
    let intentAnalysis = [];
    let landingPageNote = '';

    if (intent.isCompetitor) {
      intentAnalysis.push({ icon: '🏷️', text: `<strong>竞品导航词</strong>：用户搜索「${name}」的目的是找到竞品平台本身，并非在寻找替代产品。这类词天然付费意图低。` });
    }
    if (intent.isBrand) {
      intentAnalysis.push({ icon: '⭐', text: `<strong>品牌词</strong>：用户已认知品牌，搜索意图明确指向你的产品，转化路径最短。` });
    }
    if (intent.hasGender) {
      intentAnalysis.push({ icon: '👤', text: `<strong>含性别限定词</strong>：用户对聊天对象有明确偏好，属于需求具体化信号，但「girl」类词极度泛化，大量免费用户涌入。` });
    }
    if (intent.hasFreeIntent) {
      intentAnalysis.push({ icon: '🆓', text: `<strong>含免费意图</strong>：词中携带「free / online / random」等免费信号，用户付费意愿极低，获取的是价格敏感型流量。` });
    }
    if (intent.hasPaidIntent) {
      intentAnalysis.push({ icon: '💰', text: `<strong>含付费意图</strong>：用户主动搜索 premium / VIP 等词，付费意愿高于平均水平，是优质流量来源。` });
    }
    if (intent.isFunction && !intent.isCompetitor && !intent.isBrand) {
      intentAnalysis.push({ icon: '🔧', text: `<strong>功能泛词</strong>：用户在寻找视频聊天类功能，但未指向具体产品。竞争激烈，需要高质量落地页承接。` });
    }

    const isBroadMatch = d.matchType && (d.matchType.includes('广泛') || d.matchType.toLowerCase().includes('broad'));

    // === Case 1: High performer ===
    if (purchase >= 5) {
      verdictClass = 'verdict-keep';
      verdictIcon = '✅';
      if (isBroadMatch) {
        verdictTitle = '核心词 - 优先精确匹配';
        verdictSummary = `该词贡献 ${purchase} 次新付费转化（${fmt(purchaseVal, 2)} HKD），但当前通过广泛匹配触发。首要操作是添加精确匹配锁住流量，再考虑提价。`;
      } else {
        verdictTitle = '核心词 - 表现优秀';
        verdictSummary = `该词贡献 ${purchase} 次新付费转化，金额 ${fmt(purchaseVal, 2)} HKD，是核心流量来源。`;
      }
      if (hasCost && cost > 0) {
        const roas = purchaseVal / cost;
        verdictDetails.push(`ROAS ${roas.toFixed(2)}，${roas >= 1 ? '回报正向' : '回报偏低需优化'}`);
      }
      if (isBroadMatch) {
        verdictDetails.push('广泛匹配的流量不稳定，系统随时可能将预算分配到低质量查询');
        verdictDetails.push('精确匹配可锁定该词的展示，同时通常 CPC 更低');
        actions.push({ icon: '🎯', title: '添加精确匹配（最高优先级）', detail: '立即将该词添加为独立的精确匹配关键词。精确匹配 = 锁住流量 + 更低 CPC + 更稳定展示。这比提价更重要，因为提价前要先确保流量可控。' });
        actions.push({ icon: '📈', title: '精确匹配稳定后再提价', detail: '精确匹配跑稳 1-2 周后，若 ROAS 持续 > 1，再适当提价抢量。' });
      } else {
        actions.push({ icon: '📈', title: '保持并适当提价', detail: '当前匹配方式稳定，维持出价并持续追踪。若 ROAS 持续走高可适当提价抢量。' });
      }

    // === Case 2: Some conversions but low ===
    } else if (purchase >= 1) {
      verdictClass = 'verdict-watch';
      verdictIcon = '🟡';
      verdictTitle = '有转化但较少 - 需观察';
      verdictSummary = `该词产生 ${purchase} 次转化（${fmt(purchaseVal, 2)} HKD），有一定潜力但尚未证明高效。`;
      if (hasCost && cost > 0) {
        const roas = purchaseVal / cost;
        if (roas < 0.3) {
          verdictDetails.push(`ROAS 仅 ${roas.toFixed(2)}，投入产出比偏低`);
          actions.push({ icon: '📉', title: '控制花费', detail: '降低出价或收窄匹配，减少在低效流量上的消耗。' });
        }
      }
      actions.push({ icon: '⏳', title: '延长观察期', detail: '再积累 1-2 周数据判断转化是否稳定，避免过早否定。' });
      if (intent.isFunction) {
        actions.push({ icon: '📄', title: '优化落地页', detail: '功能词用户需要快速看到产品价值，确保落地页在 3 秒内传达核心卖点。' });
      }

    // === Case 3: Cost burn - spent money, no conversion ===
    } else if (hasCost && cost > 200 && purchase === 0) {
      verdictClass = 'verdict-negate';
      verdictIcon = '🔴';
      verdictTitle = '烧钱词 - 建议立即否定';
      verdictSummary = `花费 ${fmt(cost, 0)} HKD 但 0 转化，属于无效花费。`;
      verdictDetails.push(`已消耗 ${fmt(cost, 0)} HKD 预算`);
      verdictDetails.push('转化数为零，继续投放将持续浪费预算');
      actions.push({ icon: '🚫', title: '添加为否定关键词', detail: '立即将该词添加为精确否定，阻止后续花费。' });
      actions.push({ icon: '💰', title: '预算回收', detail: `否定后可将 ${fmt(cost, 0)} HKD/周期的预算转移至高转化词上。` });

    // === Case 4: High traffic, no conversion ===
    } else if (pv > 1000 && purchase === 0) {
      verdictClass = 'verdict-negate';
      verdictIcon = '🔴';
      verdictTitle = '高流量无转化 - 大概率泛流量词';
      verdictSummary = `${fmt(pv)} 次页面浏览但 0 付费转化，流量质量存疑。`;

      verdictDetails.push('大概率是泛流量词（用户意图不匹配），而非落地页问题');
      verdictDetails.push(`${fmt(pv)} 次浏览 → 0 转化 = 强信号：如果是落地页问题，通常不会完全 0 转化`);

      if (intent.isCompetitor) {
        verdictDetails.push(`用户搜索「${name}」是在找竞品免费平台，付费意图极低`);
        intentAnalysis.push({ icon: '⚠️', text: `<strong>核心问题</strong>：搜索「${name}」的用户大概率在找竞品的免费服务。即使到达你的页面，付费转化的心理门槛非常高——他们并没有「付费」的预期。` });
      }
      if (intent.hasGender) {
        verdictDetails.push('含「girl」等词的用户多为寻找免费聊天，付费意愿极低');
      }
      if (intent.isFunction) {
        verdictDetails.push('纯功能词竞争激烈，用户大多试探免费选项');
      }

      actions.push({ icon: '🚫', title: '建议否定该词', detail: intent.isCompetitor ?
        '竞品品牌词建议加入精确否定，用户意图指向竞品，非你的目标用户。' :
        '该词带来大量无效流量，建议添加为短语否定或精确否定。'
      });
      actions.push({ icon: '🔍', title: '排查是否有同义词价值', detail: '在否定前检查是否有包含该词的长尾变体产生了转化（如「video chat premium」），避免误伤。' });

      const isLandingPageIssue = vc > 0 && fv > 100;
      if (isLandingPageIssue) {
        landingPageNote = `<h4>⚠️ 落地页可能有辅助问题</h4>
          <p>该词有 <strong>${fmt(fv)}</strong> 次首次访问和 <strong>${fmt(vc)}</strong> 次 15s 视频通话，说明用户确实在使用产品但未付费。这可能是：</p>
          <ul>
            <li>付费引导不够突出，用户找不到升级入口</li>
            <li>免费额度过多，用户没有付费动力</li>
            <li>定价不合适或支付方式缺少当地选项</li>
          </ul>
          <p style="margin-top:8px;color:var(--yellow)">建议：对该词保持观察，同时优化产品内付费引导。</p>`;
      } else {
        landingPageNote = `<h4>📄 落地页因素评估</h4>
          <p><strong>主因是流量质量，非落地页。</strong></p>
          <ul>
            <li>${fmt(pv)} 次浏览 → 0 转化，且首次访问 ${fmt(fv)}，视频通话 ${fmt(vc)}</li>
            <li>${fv < 50 ? '大量浏览但极少首次访问 → 可能是重复曝光或爬虫流量' : '有一定首次访问但无深度使用 → 用户来了就走'}</li>
            <li>如果其他词的落地页转化正常，则进一步证实该词是流量质量问题</li>
          </ul>
          <p style="margin-top:8px;">但落地页优化是持续要做的事：确保 3 秒内传达核心价值、CTA 显眼、有社交证明（在线人数/评价）。</p>`;
      }

    // === Case 5: Moderate traffic, no conversion ===
    } else if (fv > 100 && purchase === 0) {
      verdictClass = 'verdict-watch';
      verdictIcon = '🟡';
      verdictTitle = '流量词 - 建议观察';
      verdictSummary = `${fmt(fv)} 次首次访问但未产生付费，属于泛流量词。`;
      if (vc > 0) {
        verdictDetails.push(`有 ${fmt(vc)} 次视频通话但无付费，说明用户有使用行为但未转化`);
        actions.push({ icon: '📄', title: '优化付费引导', detail: '用户在使用产品但不付费，检查付费节点是否合理，免费额度是否过多。' });
      }
      actions.push({ icon: '⏳', title: '继续观察 1-2 周', detail: '如果持续无转化，考虑否定。' });

    // === Case 6: Keyword with QS issues ===
    } else if (d.qualityScore && Number(d.qualityScore) < 6) {
      verdictClass = 'verdict-watch';
      verdictIcon = '🟡';
      verdictTitle = '质量得分偏低 - 需优化';
      verdictSummary = `质量得分 ${d.qualityScore}/10，低 QS 会推高 CPC、降低展示份额。`;
      const reasons = [];
      if (d.landingPageExp && d.landingPageExp.includes('低于')) reasons.push('着陆页体验');
      if (d.adRelevance && d.adRelevance.includes('低于')) reasons.push('广告相关性');
      if (d.expectedCTR && d.expectedCTR.includes('低于')) reasons.push('预期CTR');
      if (reasons.length) {
        verdictDetails.push(`问题维度：${reasons.join('、')}`);
        if (reasons.includes('着陆页体验')) {
          actions.push({ icon: '📄', title: '优化落地页', detail: '为该关键词建设专属落地页，提升内容匹配度和加载速度。' });
        }
        if (reasons.includes('广告相关性')) {
          actions.push({ icon: '✏️', title: '优化广告文案', detail: '在广告标题/描述中包含该关键词，提升广告-关键词相关性。' });
        }
        if (reasons.includes('预期CTR')) {
          actions.push({ icon: '🖱️', title: '提升点击率', detail: '优化广告标题吸引力，添加附加信息（站内链接、促销等）。' });
        }
      }

    // === Default: just traffic ===
    } else {
      verdictClass = 'verdict-info';
      verdictIcon = '📋';
      verdictTitle = '仅流量 - 数据不足';
      verdictSummary = '该词数据量较少，暂无法给出明确结论。';
      actions.push({ icon: '⏳', title: '继续积累数据', detail: '等待更多曝光和点击数据后再做决策。' });
    }

    return { verdictClass, verdictIcon, verdictTitle, verdictSummary, verdictDetails, intentAnalysis, actions, landingPageNote };
  }
};

// ============================================================
// Chart.js 全局配置
// ============================================================
Chart.defaults.color = '#5a5e72';
Chart.defaults.borderColor = '#dfe1e6';
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif';

const COLORS = {
  accent: '#4f46e5',
  green: '#16a34a',
  red: '#dc2626',
  yellow: '#d97706',
  blue: '#2563eb',
  orange: '#ea580c',
  pink: '#db2777',
  cyan: '#0891b2',
  purple: '#7c3aed',
};

let chartInstances = {};

// ============================================================
// Navigation
// ============================================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    item.classList.add('active');
    const viewId = 'view-' + item.dataset.view;
    document.getElementById(viewId).classList.add('active');

    if (item.dataset.view === 'daily-trend') renderDailyTrend();
    if (item.dataset.view === 'drill-down') renderDrillDown();
    if (item.dataset.view === 'placements') renderPlacements();
    if (item.dataset.view === 'geo-audience') renderGeoAudience();
    if (item.dataset.view === 'search-terms') renderSearchTerms();
    if (item.dataset.view === 'devices') renderDevices();
    if (item.dataset.view === 'schedule') renderSchedule();
    if (item.dataset.view === 'landing-pages') renderLandingPages();
    if (item.dataset.view === 'keyword-expansion') renderKeywordExpansion();
    if (item.dataset.view === 'alerts') renderAlerts();
  });
});

// ============================================================
// Helpers
// ============================================================
function fmt(n, decimals = 0) {
  if (n == null || n === '--') return '--';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtMoney(n) {
  if (n == null) return '--';
  return '$' + fmt(n, 2);
}
function roasClass(roas) {
  if (roas == null || roas === '--') return '';
  if (roas >= 1) return 'roas-good';
  if (roas >= 0.6) return 'roas-warn';
  return 'roas-bad';
}
function efficiencyTag(convRate) {
  const rate = parseFloat(convRate);
  if (isNaN(rate)) return '<span class="efficiency-warn">N/A</span>';
  if (rate >= 3) return '<span class="efficiency-good">高效</span>';
  if (rate >= 1) return '<span class="efficiency-warn">一般</span>';
  return '<span class="efficiency-bad">低效</span>';
}
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

// ============================================================
// VIEW 1: Overview
// ============================================================
function getFilteredCampaigns() {
  const product = document.getElementById('filter-product').value;
  const country = document.getElementById('filter-country').value;
  const type = document.getElementById('filter-type').value;
  return CAMPAIGN_SUMMARY.filter(c => {
    if (product !== 'all' && c.product !== product) return false;
    if (country !== 'all' && c.country !== country) return false;
    if (type !== 'all' && c.type !== type) return false;
    return true;
  });
}

function renderOverview() {
  const campaigns = getFilteredCampaigns();
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.totalRevenue, 0);
  const totalNewUsers = campaigns.reduce((s, c) => s + c.newUsers, 0);
  const totalNewPay = campaigns.reduce((s, c) => s + c.newPayUsers, 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCPA = totalNewPay > 0 ? totalSpend / totalNewPay : 0;

  document.getElementById('kpi-cards').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">总花费</div>
      <div class="kpi-value">${fmtMoney(totalSpend)}</div>
      <div class="kpi-sub kpi-neutral">${campaigns.length} 个活跃 Campaign</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">总收入</div>
      <div class="kpi-value">${fmtMoney(totalRevenue)}</div>
      <div class="kpi-sub ${totalRevenue > totalSpend ? 'kpi-up' : 'kpi-down'}">${totalRevenue > totalSpend ? '盈利' : '亏损'} ${fmtMoney(Math.abs(totalRevenue - totalSpend))}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">整体 ROAS</div>
      <div class="kpi-value ${roasClass(overallRoas)}">${fmt(overallRoas, 2)}</div>
      <div class="kpi-sub ${overallRoas >= 1 ? 'kpi-up' : 'kpi-down'}">${overallRoas >= 1 ? '✓ 盈亏线以上' : '✗ 低于盈亏线'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">新增用户</div>
      <div class="kpi-value">${fmt(totalNewUsers)}</div>
      <div class="kpi-sub kpi-neutral">新付费 ${fmt(totalNewPay)} 人</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">整体新CPA</div>
      <div class="kpi-value">${fmtMoney(avgCPA)}</div>
      <div class="kpi-sub kpi-neutral">花费 / 新付费人数</div>
    </div>
  `;

  renderCampaignTable(campaigns);
  renderProductChart(campaigns);
  renderRoasBar(campaigns);
}

function renderCampaignTable(campaigns) {
  const sorted = [...campaigns].sort((a, b) => b.spend - a.spend);
  const tbody = document.getElementById('campaign-tbody');
  tbody.innerHTML = sorted.map(c => `
    <tr>
      <td class="sticky-col"><span class="campaign-name" title="${c.name}">${c.name}</span></td>
      <td><span class="product-badge ${c.product.toLowerCase()}">${c.product}</span></td>
      <td>${c.country}</td>
      <td>${c.type}</td>
      <td>${fmtMoney(c.spend)}</td>
      <td>${fmtMoney(c.totalRevenue)}</td>
      <td class="${roasClass(c.roas)}">${fmt(c.roas, 2)}</td>
      <td>${fmt(c.newUsers)}</td>
      <td>${fmt(c.newPayUsers)}</td>
      <td>${c.newCPA ? fmtMoney(c.newCPA) : '--'}</td>
      <td>${c.arppu ? fmtMoney(c.arppu) : '--'}</td>
      <td>${c.androidPayRate}</td>
      <td>${c.iosPayRate}</td>
    </tr>
  `).join('');
}

function renderProductChart(campaigns) {
  const products = {};
  campaigns.forEach(c => {
    if (!products[c.product]) products[c.product] = { spend: 0, revenue: 0 };
    products[c.product].spend += c.spend;
    products[c.product].revenue += c.totalRevenue;
  });

  destroyChart('chart-product-spend');
  const ctx = document.getElementById('chart-product-spend').getContext('2d');
  chartInstances['chart-product-spend'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(products),
      datasets: [
        { label: '花费', data: Object.values(products).map(p => p.spend), backgroundColor: 'rgba(220,38,38,0.7)', borderRadius: 6 },
        { label: '收入', data: Object.values(products).map(p => p.revenue), backgroundColor: 'rgba(22,163,74,0.7)', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true, grid: { color: '#dfe1e6' } } }
    }
  });

  destroyChart('chart-roas-bar');
  const sorted = [...campaigns].filter(c => c.roas && c.roas !== '--').sort((a, b) => b.roas - a.roas);
  const ctx2 = document.getElementById('chart-roas-bar').getContext('2d');
  chartInstances['chart-roas-bar'] = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: sorted.map(c => c.name.length > 25 ? c.name.substring(0, 25) + '…' : c.name),
      datasets: [{
        label: 'ROAS',
        data: sorted.map(c => c.roas),
        backgroundColor: sorted.map(c => c.roas >= 1 ? 'rgba(22,163,74,0.7)' : c.roas >= 0.6 ? 'rgba(217,119,6,0.7)' : 'rgba(220,38,38,0.7)'),
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        annotation: {}
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#dfe1e6' },
        },
        y: {
          ticks: { font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderRoasBar() {}

// ============================================================
// VIEW 2-3: 三层下钻 (Campaign -> Ad Group -> Keyword & Ad Copy)
// ============================================================
function renderDrillDown() {
  const tbody = document.getElementById('drill-tbody');
  if (!tbody) return;
  
  // Mapping ADW Keywords to Campaigns
  const KW_MAP = {
    'pu-web-IN-2.5-竞品词-6.14重开': typeof ADW_PU_IN_COMP_KEYWORDS !== 'undefined' ? ADW_PU_IN_COMP_KEYWORDS : [],
    'pu-web-IN-2.5-品牌词-6.16': typeof ADW_PU_IN_BRAND_KEYWORDS !== 'undefined' ? ADW_PU_IN_BRAND_KEYWORDS : [],
    'Ppt-web-UK-2.5-1.18-homepage': typeof ADW_PPT_UK_KEYWORDS !== 'undefined' ? ADW_PPT_UK_KEYWORDS : [],
    'Ppt-web-US-2.5-1.17-homepage': typeof ADW_PPT_US_KEYWORDS !== 'undefined' ? ADW_PPT_US_KEYWORDS : [],
    'ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA': typeof ADW_FT_IN_FUNC_KEYWORDS !== 'undefined' ? ADW_FT_IN_FUNC_KEYWORDS : [],
    'Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA': typeof ADW_PU_IN_EMERALD_KEYWORDS !== 'undefined' ? ADW_PU_IN_EMERALD_KEYWORDS : []
  };

  const ASSET_MAP = {
    'pu-web-IN-2.5-竞品词-6.14重开': typeof ADW_PU_IN_COMP_ASSETS !== 'undefined' ? ADW_PU_IN_COMP_ASSETS : [],
    'Ft-web-US-2.5-Display-12.26-homepage': typeof ADW_FT_US_ASSETS !== 'undefined' ? ADW_FT_US_ASSETS : [],
    'Ppt-web-2.5-AR+UAE+IL+QA-2.3': typeof ADW_PPT_ME_PMAX_ASSETS !== 'undefined' ? ADW_PPT_ME_PMAX_ASSETS : [],
    'Ppt-web-US-2.5-Pmax-1.20-homepage': typeof ADW_PPT_US_PMAX_ASSETS !== 'undefined' ? ADW_PPT_US_PMAX_ASSETS : []
  };

  const DEV_MAP = {
    'pu-web-IN-2.5-竞品词-6.14重开': typeof ADW_PU_IN_COMP_DEVICES !== 'undefined' ? ADW_PU_IN_COMP_DEVICES : [],
    'Pu-web-2.5-IN-Display-12.23': typeof ADW_PU_IN_DEVICES !== 'undefined' ? ADW_PU_IN_DEVICES : [],
    'Ft-web-US-2.5-Display-12.26-homepage': typeof ADW_FT_US_DEVICES !== 'undefined' ? ADW_FT_US_DEVICES : [],
    'Ppt-web-UK-2.5-1.18-homepage': typeof ADW_PPT_UK_DEVICES !== 'undefined' ? ADW_PPT_UK_DEVICES : [],
    'Ppt-web-US-2.5-1.17-homepage': typeof ADW_PPT_US_DEVICES !== 'undefined' ? ADW_PPT_US_DEVICES : []
  };

  const PL_MAP = {
    'Pu-web-2.5-IN-Display-12.23': typeof ADW_PU_IN_PLACEMENTS !== 'undefined' ? ADW_PU_IN_PLACEMENTS : [],
    'Ft-web-US-2.5-Display-12.26-homepage': typeof ADW_FT_US_PLACEMENTS !== 'undefined' ? ADW_FT_US_PLACEMENTS : [],
    'Ppt-web-2.5-AR+UAE+IL+QA-2.3': typeof ADW_PPT_ME_PMAX_PLACEMENTS !== 'undefined' ? ADW_PPT_ME_PMAX_PLACEMENTS : [],
    'Ppt-web-US-2.5-Pmax-1.20-homepage': typeof ADW_PPT_US_PMAX_PLACEMENTS !== 'undefined' ? ADW_PPT_US_PMAX_PLACEMENTS : []
  };

  const LP_MAP = {
    'Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA': typeof ADW_PU_IN_EMERALD_LANDING_PAGES !== 'undefined' ? ADW_PU_IN_EMERALD_LANDING_PAGES : []
  };

  const GEO_DATA = typeof ADW_PU_IN_GEO !== 'undefined' ? ADW_PU_IN_GEO : [];

  function pct(a, b) { return b ? (a/b*100) : 0; }
  const f = (n,d=2) => (n==null||isNaN(n)) ? '--' : Number(n).toFixed(d);
  const fK = n => { if(n==null||isNaN(n)) return '--'; return n>=10000?(n/1000).toFixed(1)+'K':n>=1000?Math.round(n).toLocaleString():Math.round(n); };

  function getDeviceInfo(campName) {
    const devs = DEV_MAP[campName];
    if (!devs || !devs.length) return null;
    const mobile = devs.find(d => d.device === '手机');
    const desktop = devs.find(d => d.device === '计算机');
    const tablet = devs.find(d => d.device === '平板电脑');
    const total = (mobile?.cost||0) + (desktop?.cost||0) + (tablet?.cost||0);
    return { mobilePct: total ? pct(mobile?.cost||0, total) : 100, desktopPct: total ? pct(desktop?.cost||0, total) : 0 };
  }

  function getTopPlacements(campName) {
    const pls = PL_MAP[campName];
    if (!pls || !pls.length) return null;
    return pls.slice(0, 3).map(p => p.placement).join(', ');
  }

  function getTopGeo(campCountry) {
    if (campCountry === 'IN' && GEO_DATA.length) {
      return GEO_DATA.sort((a,b)=>b.cost-a.cost).slice(0,3).map(g => g.region.replace(', 印度','')).join(', ');
    }
    return null;
  }

  function getLandingPage(campName) {
    const lps = LP_MAP[campName];
    if (lps && lps.length) return lps[0].page;
    const camp = CAMPAIGN_SUMMARY.find(c => c.name === campName);
    return camp ? new URL(camp.landingPage).hostname : null;
  }

  const camps = CAMPAIGN_SUMMARY.map(c => {
    const isSearch = c.type === 'Search';
    const isDisplay = c.type === 'Display';
    const isPmax = c.type === 'Pmax';
    const iosR = pct(c.newIOS, c.newAndroid + c.newIOS);
    const androidWaste = c.spend * pct(c.newAndroid, c.newUsers) / 100;
    const iosCPA = c.newIOS > 0 ? c.spend / c.newIOS : null;
    const devInfo = getDeviceInfo(c.name);
    const topPlaces = getTopPlacements(c.name);
    const topGeo = getTopGeo(c.country);
    const lp = getLandingPage(c.name);

    const adGroups = [];
    const kws = KW_MAP[c.name];
    if (kws && kws.length) {
      const agMap = {};
      kws.forEach(kw => {
        const ag = kw.adGroup || '默认广告组';
        if (!agMap[ag]) agMap[ag] = { name:ag, spend:0, clicks:0, conv:0, imp:0, qsW:0, qsWt:0, keywords:[] };
        agMap[ag].spend += kw.cost||0;
        agMap[ag].clicks += kw.clicks||0;
        agMap[ag].conv += kw.purchaseNew||0;
        agMap[ag].imp += kw.impressions||0;
        if (kw.qualityScore && kw.qualityScore !== '') {
          agMap[ag].qsW += parseInt(kw.qualityScore) * (kw.cost||1);
          agMap[ag].qsWt += (kw.cost||1);
        }
        agMap[ag].keywords.push(kw);
      });
      Object.values(agMap).forEach(ag => adGroups.push(ag));
    }

    const placements = PL_MAP[c.name] || [];
    const assets = ASSET_MAP[c.name] || [];

    return {
      ...c, isSearch, isDisplay, isPmax,
      iosR, androidWaste, iosCPA,
      devInfo, topPlaces, topGeo, lp,
      adGroups, placements, assets,
      totalImp: adGroups.reduce((s,ag) => s+ag.imp, 0),
      totalClicks: adGroups.reduce((s,ag) => s+ag.clicks, 0),
      totalConv: adGroups.reduce((s,ag) => s+ag.conv, 0),
    };
  }).sort((a,b) => b.spend - a.spend);

  let html = '';

  camps.forEach((c, ci) => {
    const cid = 'c' + ci;
    const hasChildren = c.adGroups.length > 0 || c.placements.length > 0;
    const ctr = c.totalImp ? pct(c.totalClicks, c.totalImp) : null;
    const cpc = c.totalClicks ? c.spend / c.totalClicks : null;
    const cvr = c.totalClicks ? pct(c.totalConv, c.totalClicks) : null;

    let tags = '';
    if (c.iosR < 50 && c.newAndroid > 0) tags += '<span class="badge badge-danger">高浪费</span> ';
    if (c.roas >= 1.5) tags += '<span class="badge badge-success">优质</span> ';
    else if (c.roas < 0.5) tags += '<span class="badge badge-danger">严重亏损</span> ';
    else if (c.roas < 1) tags += '<span class="badge badge-warning">未回本</span> ';
    if (c.iosCPA && c.iosCPA > 30) tags += '<span class="badge badge-warning">CPA偏高</span> ';

    const typeClass = c.isSearch ? 'badge-info' : c.isDisplay ? 'badge-warning' : 'badge-accent';

    let distInfo = '';
    if (c.topGeo) distInfo += `<span class="muted" title="${c.topGeo}">🌍 Top3地区</span> `;
    if (c.topPlaces) distInfo += `<span class="muted" title="${c.topPlaces}">📍 Top3版位</span> `;
    else if (c.isSearch) distInfo += '<span class="muted">Google Search</span> ';
    if (c.devInfo) distInfo += `<span class="muted">📱${f(c.devInfo.mobilePct,0)}%</span>`;

    html += `<tr class="row-L1" data-id="${cid}" onclick="toggleRow('${cid}')" style="cursor:pointer; background:#fff; border-bottom:1px solid var(--border-light);">
      <td class="bold" style="padding-left:16px;">${hasChildren?'<span class="expand-arrow" style="display:inline-block;width:16px;transition:transform 0.2s;">▶</span>':'<span class="expand-arrow" style="display:inline-block;width:16px;opacity:.2;">▶</span>'} ${c.name.replace(/web-|2\.5-/g,'').substring(0,40)}</td>
      <td><span class="badge ${typeClass}">${c.type}</span></td>
      <td><span class="badge badge-neutral" style="font-size:10px;padding:2px 4px;">${c.bidding}</span>${c.targetCPA?' <span class="muted" style="font-size:10px;">t'+c.targetCPA+'</span>':''}</td>
      <td class="num bold">${fK(c.spend)}</td>
      <td class="num">${c.totalConv || '--'}</td>
      <td class="num">${c.iosCPA?f(c.iosCPA):'--'}<span class="sub-val">整体 ${f(c.newCPA)}</span></td>
      <td class="num bold ${c.roas>=1?'good':c.roas>=0.5?'warn':'bad'}">${f(c.roas)}</td>
      <td class="num">${c.totalImp?fK(c.totalImp):'--'}</td>
      <td class="num">${c.totalClicks?fK(c.totalClicks):'--'}</td>
      <td class="num">${ctr!=null?f(ctr,1)+'%':'--'}</td>
      <td class="num">${cpc!=null?f(cpc):'--'}</td>
      <td style="max-width:160px;white-space:normal;font-size:11px">${distInfo}<br><span class="muted">LP: ${c.lp||'--'}</span></td>
      <td class="muted">${c.isSearch?'搜索':'版位/受众'}</td>
      <td>${tags||'<span class="muted">--</span>'}</td>
    </tr>`;

    if (c.adGroups.length) {
      c.adGroups.forEach((ag, ai) => {
        const agid = cid + '-ag' + ai;
        const hasKws = ag.keywords.length > 0;
        const agCtr = ag.imp ? pct(ag.clicks, ag.imp) : null;
        const agCpc = ag.clicks ? ag.spend / ag.clicks : null;
        const agCvr = ag.clicks ? pct(ag.conv, ag.clicks) : null;
        const agQs = ag.qsWt ? ag.qsW / ag.qsWt : null;
        const spPct = pct(ag.spend, c.spend);

        html += `<tr class="row-L2 child-${cid}" data-id="${agid}" onclick="toggleRow('${agid}');event.stopPropagation()" style="cursor:pointer; background:#fafbfd; display:none; border-bottom:1px solid #eef1f6;">
          <td style="padding-left:40px;">${hasKws?'<span class="expand-arrow" style="display:inline-block;width:16px;transition:transform 0.2s;">▶</span>':''}${ag.name}</td>
          <td><span class="badge badge-info">Ad Group</span></td>
          <td>
            <span class="muted">占比 ${f(spPct,0)}%</span>
            <div style="display:inline-block; width:50px; height:5px; background:#e2e8f0; border-radius:3px; vertical-align:middle; overflow:hidden; margin-left:4px;">
              <div style="height:100%; border-radius:3px; width:${spPct}%; background:var(--accent);"></div>
            </div>
          </td>
          <td class="num">${fK(ag.spend)}</td>
          <td class="num">${f(ag.conv,0)}</td>
          <td class="num">${ag.conv?f(ag.spend/ag.conv):'--'}</td>
          <td class="num muted">--</td>
          <td class="num">${fK(ag.imp)}</td>
          <td class="num">${fK(ag.clicks)}</td>
          <td class="num">${agCtr!=null?f(agCtr,1)+'%':'--'}</td>
          <td class="num">${agCpc!=null?f(agCpc):'--'}</td>
          <td style="font-size:11px">
            <span class="bold ${agQs>=8?'good':agQs&&agQs<6?'bad':''}" title="加权平均 Quality Score">QS ${agQs?f(agQs,1):'--'}</span>
            <br><span class="muted">LP: ${c.lp||'--'}</span>
            ${c.devInfo?'<br><span class="muted">📱'+f(c.devInfo.mobilePct,0)+'% Mobile</span>':''}
          </td>
          <td class="muted">${ag.keywords.length} 个词</td>
          <td></td>
        </tr>`;

        if (hasKws) {
          let adStrength = '良好';
          let adStrengthClass = 'good';
          let diagMsg = '✅ 文案与核心词匹配度较高';
          
          if (agQs && agQs < 6) {
            adStrength = '差';
            adStrengthClass = 'bad';
            diagMsg = '⚠️ 核心关键词未出现在标题中，导致 Ad Relevance 极低';
          } else if (agQs && agQs < 8) {
            adStrength = '一般';
            adStrengthClass = 'warn';
            diagMsg = '💡 建议在标题 1 中固定高转化关键词';
          }

          let topHeadline = 'Random Video Calls with Girls';
          let topDesc = 'Fast, high-quality 1v1 video chats in real time. Meet new friends instantly!';
          
          if (c.assets.length > 0) {
            const headlines = c.assets.filter(a => a.type === '标题').sort((a,b) => b.purchaseConv - a.purchaseConv);
            const descs = c.assets.filter(a => a.type === '广告内容描述').sort((a,b) => b.purchaseConv - a.purchaseConv);
            if (headlines.length > 0) topHeadline = headlines[0].asset;
            if (descs.length > 0) topDesc = descs[0].asset;
          }

          html += `<tr class="row-L3 child-${agid}" style="display:none;">
            <td colspan="14" style="padding: 12px 16px 12px 56px; white-space: normal; background: #fafaff;">
              <div class="ad-copy-diag">
                <div class="diag-strength">
                  <div class="diag-strength-label">📝 RSA 广告效力 (Ad Strength)</div>
                  <div class="diag-strength-val ${adStrengthClass}">${adStrength}</div>
                  <div class="diag-msg">${diagMsg}</div>
                </div>
                <div class="diag-copy">
                  <div class="diag-copy-label">🔥 Top 曝光文案组合 (Campaign 级)</div>
                  <div class="diag-copy-headline">${topHeadline} | 1v1 Live Chat</div>
                  <div class="diag-copy-desc">${topDesc}</div>
                </div>
              </div>
            </td>
          </tr>`;

          ag.keywords.sort((a,b) => (b.cost||0)-(a.cost||0)).slice(0,20).forEach((kw, ki) => {
            const kwCvr = kw.clicks ? pct(kw.purchaseNew||0, kw.clicks) : null;
            const kwCpa = kw.purchaseNew ? (kw.cost||0) / kw.purchaseNew : null;

            let kwTags = '';
            if ((kw.cost||0) > 50 && (!kw.purchaseNew || kw.purchaseNew === 0)) kwTags += '<span class="badge badge-danger">建议否定</span> ';
            if (kw.purchaseNew > 3 && kwCpa && kwCpa < (c.newCPA||999) && kw.impressionShare === '< 10%') kwTags += '<span class="badge badge-success">建议提价</span> ';
            if (kw.landingPageExp === '低于平均水平') kwTags += '<span class="badge badge-warning">优化落地页</span> ';
            if (kw.adRelevance === '低于平均水平') kwTags += '<span class="badge badge-warning">优化文案</span> ';

            const qsVal = kw.qualityScore ? parseInt(kw.qualityScore) : null;
            const qsClass = qsVal >= 8 ? 'good' : qsVal && qsVal <= 5 ? 'bad' : '';

            const short = v => { if (!v) return '-'; if (v.includes('高于')) return '↑'; if (v.includes('低于')) return '↓'; return '→'; };
            const shortClass = v => { if (!v) return ''; if (v.includes('高于')) return 'good'; if (v.includes('低于')) return 'bad'; return ''; };

            html += `<tr class="row-L3 child-${agid}" style="background:#fff; border-bottom:1px solid #f5f7fa; display:none;">
              <td style="padding-left:64px;">
                <span class="bold">${kw.keyword}</span>
              </td>
              <td><span class="muted">Keyword</span></td>
              <td><span class="badge badge-neutral" style="font-size:9px">${(kw.matchType||'').replace('匹配','').replace('（紧密变体）','(近)')}</span></td>
              <td class="num">${fK(kw.cost||0)}</td>
              <td class="num muted">${f(kw.purchaseNew||0,1)}</td>
              <td class="num ${kwCpa&&kwCpa>(c.newCPA||999)?'bad':'good'}">${kwCpa?f(kwCpa):'<span class="bad">0转化</span>'}</td>
              <td class="num muted">${kw.purchaseNewValue&&kw.cost?f(kw.purchaseNewValue/kw.cost):'-'}</td>
              <td class="num">${fK(kw.impressions||0)}</td>
              <td class="num">${fK(kw.clicks||0)}</td>
              <td class="num">${kw.impressions?f(pct(kw.clicks,kw.impressions),1)+'%':'-'}</td>
              <td class="num">${f(kw.cpc)}</td>
              <td style="font-size:10px;white-space:normal">
                <span class="bold ${qsClass}">QS ${kw.qualityScore||'-'}</span>
                <span class="${shortClass(kw.expectedCTR)}" title="Expected CTR: ${kw.expectedCTR||'-'}">CTR${short(kw.expectedCTR)}</span>
                <span class="${shortClass(kw.adRelevance)}" title="Ad Relevance: ${kw.adRelevance||'-'}">Rel${short(kw.adRelevance)}</span>
                <span class="${shortClass(kw.landingPageExp)}" title="LP Experience: ${kw.landingPageExp||'-'}">LP${short(kw.landingPageExp)}</span>
              </td>
              <td class="num"><span class="${kw.impressionShare==='< 10%'?'bad':''}">${kw.impressionShare||'-'}</span></td>
              <td>${kwTags||''}</td>
            </tr>`;
          });
        }
      });
    }
  });

  tbody.innerHTML = html;
}

window.toggleRow = function(parentId) {
  const row = document.querySelector(`[data-id="${parentId}"]`);
  if (!row) return;
  
  const arrow = row.querySelector('.expand-arrow');
  const isExpanded = row.classList.contains('expanded');

  if (isExpanded) {
    row.classList.remove('expanded');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
    hideAllChildren(parentId);
  } else {
    row.classList.add('expanded');
    if (arrow) arrow.style.transform = 'rotate(90deg)';
    document.querySelectorAll(`.child-${parentId}`).forEach(r => {
      r.style.display = 'table-row';
    });
  }
};

function hideAllChildren(pid) {
  document.querySelectorAll(`.child-${pid}`).forEach(r => {
    r.style.display = 'none';
    r.classList.remove('expanded');
    const arrow = r.querySelector('.expand-arrow');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
    const id = r.getAttribute('data-id');
    if (id) hideAllChildren(id);
  });
}

// Table sorting
document.getElementById('campaign-table').addEventListener('click', (e) => {
  const th = e.target.closest('th[data-sort]');
  if (!th) return;
  const field = th.dataset.sort;
  const campaigns = getFilteredCampaigns();
  const dir = th._sortDir === 'asc' ? 'desc' : 'asc';
  th._sortDir = dir;
  campaigns.sort((a, b) => {
    const va = a[field] ?? -Infinity;
    const vb = b[field] ?? -Infinity;
    return dir === 'asc' ? va - vb : vb - va;
  });
  renderCampaignTable(campaigns);
});

// Filter handlers
['filter-product', 'filter-country', 'filter-type'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderOverview);
});

// ============================================================
// VIEW 2: Daily Trend
// ============================================================
function initDailySelect() {
  const select = document.getElementById('daily-campaign-select');
  const options = CAMPAIGN_SUMMARY.filter(c => c.spend > 0).map(c =>
    `<option value="${c.id}" ${c.id === 'ft-us-display' ? 'selected' : ''}>${c.name}</option>`
  );
  select.innerHTML = options.join('');
  select.addEventListener('change', renderDailyTrend);
}

function renderDailyTrend() {
  const select = document.getElementById('daily-campaign-select');
  const campaignId = select.value;
  const campaign = CAMPAIGN_SUMMARY.find(c => c.id === campaignId);

  let dailyData;
  let isReal = false;
  if (campaignId === 'ft-us-display') {
    dailyData = FT_US_DISPLAY_DAILY;
    isReal = true;
  } else {
    dailyData = generateMockDaily(campaign);
  }

  const validDays = dailyData.filter(d => d.spend > 0);
  const avgSpend = validDays.reduce((s, d) => s + d.spend, 0) / validDays.length;
  const avgRoas = validDays.filter(d => d.roas).reduce((s, d) => s + d.roas, 0) / validDays.filter(d => d.roas).length;
  const totalSpend = validDays.reduce((s, d) => s + d.spend, 0);
  const totalRev = validDays.reduce((s, d) => s + d.totalRev, 0);

  document.getElementById('daily-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">日均花费</div>
      <div class="kpi-value">${fmtMoney(avgSpend)}</div>
      <div class="kpi-sub kpi-neutral">${isReal ? '✓ 真实数据' : '⚠ Mock 数据'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">期间总花费</div>
      <div class="kpi-value">${fmtMoney(totalSpend)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">期间总收入</div>
      <div class="kpi-value">${fmtMoney(totalRev)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">平均 ROAS</div>
      <div class="kpi-value ${roasClass(avgRoas)}">${fmt(avgRoas, 2)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">ROAS > 1 天数</div>
      <div class="kpi-value">${validDays.filter(d => d.roas && d.roas >= 1).length} / ${validDays.length}</div>
      <div class="kpi-sub kpi-neutral">${fmt(validDays.filter(d => d.roas && d.roas >= 1).length / validDays.length * 100, 0)}% 盈利天数</div>
    </div>
  `;

  const labels = dailyData.map(d => d.date.substring(5));
  const spendData = dailyData.map(d => d.spend);
  const revData = dailyData.map(d => d.totalRev);
  const roasData = dailyData.map(d => d.roas);
  const userDataArr = dailyData.map(d => d.newUsers);

  destroyChart('chart-daily-spend-rev');
  chartInstances['chart-daily-spend-rev'] = new Chart(
    document.getElementById('chart-daily-spend-rev').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '花费', data: spendData, borderColor: COLORS.red, backgroundColor: 'rgba(220,38,38,0.1)', fill: true, tension: 0.3, pointRadius: 2 },
          { label: '总收入', data: revData, borderColor: COLORS.green, backgroundColor: 'rgba(22,163,74,0.1)', fill: true, tension: 0.3, pointRadius: 2 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, grid: { color: '#dfe1e6' } } }
      }
    }
  );

  destroyChart('chart-daily-roas');
  chartInstances['chart-daily-roas'] = new Chart(
    document.getElementById('chart-daily-roas').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'ROAS', data: roasData, borderColor: COLORS.accent, tension: 0.3, pointRadius: 3,
            pointBackgroundColor: roasData.map(r => r && r >= 1 ? COLORS.green : COLORS.red),
            segment: { borderColor: ctx => {
              const v = ctx.p1.parsed.y;
              return v >= 1 ? COLORS.green : COLORS.red;
            }}
          },
          { label: '盈亏线', data: Array(labels.length).fill(1), borderColor: 'rgba(0,0,0,0.2)', borderDash: [5, 5], pointRadius: 0 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { grid: { color: '#dfe1e6' } } }
      }
    }
  );

  destroyChart('chart-daily-users');
  chartInstances['chart-daily-users'] = new Chart(
    document.getElementById('chart-daily-users').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '安卓', data: dailyData.map(d => d.newAndroid), backgroundColor: 'rgba(22,163,74,0.6)', borderRadius: 3 },
          { label: 'iOS', data: dailyData.map(d => d.newIOS), backgroundColor: 'rgba(37,99,235,0.6)', borderRadius: 3 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, grid: { color: '#dfe1e6' } } }
      }
    }
  );

  destroyChart('chart-daily-pay');
  chartInstances['chart-daily-pay'] = new Chart(
    document.getElementById('chart-daily-pay').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '新付费人数', data: dailyData.map(d => d.newPay), backgroundColor: 'rgba(124,58,237,0.6)', borderRadius: 3, yAxisID: 'y' },
          { label: 'ARPPU', data: dailyData.map(d => d.newPay > 0 ? (d.newRev / d.newPay) : 0), borderColor: COLORS.yellow, type: 'line', tension: 0.3, pointRadius: 2, yAxisID: 'y1' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#dfe1e6' }, title: { display: true, text: '人数' } },
          y1: { position: 'right', beginAtZero: true, grid: { display: false }, title: { display: true, text: 'ARPPU ($)' } }
        }
      }
    }
  );

  destroyChart('chart-daily-rev-split');
  chartInstances['chart-daily-rev-split'] = new Chart(
    document.getElementById('chart-daily-rev-split').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '新用户收入', data: dailyData.map(d => d.newRev), backgroundColor: 'rgba(79,70,229,0.7)', borderRadius: 3 },
          { label: '老用户收入', data: dailyData.map(d => d.oldRev), backgroundColor: 'rgba(8,145,178,0.7)', borderRadius: 3 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, grid: { color: '#dfe1e6' } } }
      }
    }
  );
}

function generateMockDaily(campaign) {
  const days = [];
  const start = new Date('2026-02-01');
  const end = new Date('2026-03-17');
  const avgDailySpend = campaign.spend / 45;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().substring(0, 10);
    const variance = 0.5 + Math.random();
    const spend = avgDailySpend * variance;
    const rev = spend * campaign.roas * (0.4 + Math.random() * 1.2);
    const users = Math.round((campaign.newUsers / 45) * variance);
    const android = Math.round(users * 0.2);
    const ios = users - android;
    const pay = Math.max(0, Math.round((campaign.newPayUsers / 45) * variance));
    const newRev = pay * (campaign.arppu || 2) * (0.5 + Math.random());
    const oldRev = rev - newRev;
    days.push({
      date: dateStr, newUsers: users, newAndroid: android, newIOS: ios,
      newPay: pay, newRev: Math.max(0, newRev), oldPay: Math.round(pay * 0.6),
      oldRev: Math.max(0, oldRev), spend: Math.round(spend * 100) / 100,
      totalRev: Math.max(0, Math.round(rev * 100) / 100),
      roas: spend > 0 ? Math.round((rev / spend) * 100) / 100 : null,
    });
  }
  return days;
}

// ============================================================
// VIEW 3: Placements (REAL ADW DATA)
// ============================================================
document.getElementById('placement-campaign-select').addEventListener('change', renderPlacements);

function renderPlacements() {
  const sel = document.getElementById('placement-campaign-select').value;

  if (sel === 'ppt-me-pmax' || sel === 'ppt-us-pmax') {
    return renderPmaxPlacements(sel);
  }

  const data = sel === 'ft-us' ? ADW_FT_US_PLACEMENTS : ADW_PU_IN_PLACEMENTS;
  const title = sel === 'ft-us' ? 'Ft-web-US-Display' : 'Pu-web-IN-Display';

  document.getElementById('placement-table-title').textContent = `${title} 展示位置 → 新付费用户贡献`;

  const thead = document.querySelector('#placement-table thead tr');
  thead.innerHTML = '<th>展示位置</th><th>类型</th><th>新付费</th><th>总付费</th><th>First Visit</th><th>Page View</th><th>VideoCall 15s</th><th>质量</th><th>操作建议</th>';

  const totalPurchase = data.reduce((s, d) => s + d.purchaseNew, 0);
  const withPurchase = data.filter(d => d.purchaseNew > 0).length;
  const webCount = data.filter(d => d.type === '网站').length;
  const appCount = data.filter(d => d.type === '移动应用').length;
  const zeroPurchase = data.filter(d => d.purchaseNew === 0).length;

  document.getElementById('placement-summary').innerHTML = `
    <div class="summary-item"><div class="label">展示位置总数</div><div class="value">${data.length}</div></div>
    <div class="summary-item"><div class="label">总新付费转化</div><div class="value">${fmt(totalPurchase)}</div></div>
    <div class="summary-item"><div class="label">有付费转化的位置</div><div class="value" style="color:var(--green)">${withPurchase}</div></div>
    <div class="summary-item"><div class="label" style="color:var(--red)">无付费转化的位置</div><div class="value" style="color:var(--red)">${zeroPurchase}</div></div>
    <div class="summary-item"><div class="label">网站 / 应用</div><div class="value">${webCount} / ${appCount}</div></div>
  `;

  const placAIEl = document.getElementById('placement-ai');
  if (placAIEl) placAIEl.innerHTML = AI.panelHTML('ai-placement', AI.placementInsights(data));

  const tbody = document.getElementById('placement-tbody');
  tbody.innerHTML = data.slice(0, 50).map(d => {
    const quality = d.purchaseNew >= 10 ? '<span class="efficiency-good">优质</span>' :
                    d.purchaseNew >= 3 ? '<span class="efficiency-warn">一般</span>' :
                    d.purchaseNew > 0 ? '<span class="efficiency-bad">低</span>' :
                    '<span class="efficiency-bad">无转化</span>';
    return `<tr>
      <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;" title="${d.placement}">${d.placement}</td>
      <td>${d.type}</td>
      <td><strong style="color:var(--green)">${d.purchaseNew}</strong></td>
      <td>${d.purchaseAll}</td>
      <td>${fmt(d.firstVisit)}</td>
      <td>${fmt(d.pageView)}</td>
      <td>${fmt(d.videocall15s)}</td>
      <td>${quality}</td>
      <td>${AI.placementTag(d)}</td>
    </tr>`;
  }).join('');

  const top15 = data.filter(d => d.purchaseNew > 0).slice(0, 15);
  destroyChart('chart-placement-cost');
  chartInstances['chart-placement-cost'] = new Chart(
    document.getElementById('chart-placement-cost').getContext('2d'), {
      type: 'bar',
      data: {
        labels: top15.map(d => d.placement.length > 22 ? d.placement.substring(0, 22) + '…' : d.placement),
        datasets: [{
          label: '新付费转化',
          data: top15.map(d => d.purchaseNew),
          backgroundColor: top15.map(d => d.purchaseNew >= 10 ? 'rgba(22,163,74,0.7)' : 'rgba(217,119,6,0.7)'),
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: '#dfe1e6' } }, y: { ticks: { font: { size: 11 } } } }
      }
    }
  );

  const webPurchase = data.filter(d => d.type === '网站').reduce((s, d) => s + d.purchaseNew, 0);
  const appPurchase = data.filter(d => d.type === '移动应用').reduce((s, d) => s + d.purchaseNew, 0);
  destroyChart('chart-placement-bubble');
  chartInstances['chart-placement-bubble'] = new Chart(
    document.getElementById('chart-placement-bubble').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['网站', '移动应用'],
        datasets: [{ data: [webPurchase, appPurchase], backgroundColor: [COLORS.blue, COLORS.pink], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    }
  );
}

function renderPmaxPlacements(sel) {
  const data = sel === 'ppt-us-pmax' ? ADW_PPT_US_PMAX_PLACEMENTS : ADW_PPT_ME_PMAX_PLACEMENTS;
  const label = sel === 'ppt-us-pmax' ? 'Ppt-US PMax' : 'Ppt-ME PMax';
  document.getElementById('placement-table-title').textContent = `${label} 展示位置（仅展示次数）`;

  const totalImpr = data.reduce((s, d) => s + d.impressions, 0);
  const ytCount = data.filter(d => d.type === 'YouTube 视频').length;
  const webCount = data.filter(d => d.network === 'Google 展示广告网络').length;

  document.getElementById('placement-summary').innerHTML = `
    <div class="summary-item"><div class="label">展示位置总数</div><div class="value">${data.length}</div></div>
    <div class="summary-item"><div class="label">总展示次数</div><div class="value">${fmt(totalImpr)}</div></div>
    <div class="summary-item"><div class="label">YouTube 视频</div><div class="value">${ytCount}</div></div>
    <div class="summary-item"><div class="label">展示广告网络</div><div class="value">${webCount}</div></div>
  `;

  const thead = document.querySelector('#placement-table thead tr');
  thead.innerHTML = '<th>展示位置</th><th>类型</th><th>投放网络</th><th>展示次数</th>';

  const tbody = document.getElementById('placement-tbody');
  tbody.innerHTML = data.slice(0, 60).map(d => `<tr>
    <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;" title="${d.url}">${d.placement.length > 50 ? d.placement.slice(0,50)+'…' : d.placement}</td>
    <td>${d.type}</td><td>${d.network}</td>
    <td>${fmt(d.impressions)}</td>
  </tr>`).join('');

  const top15 = data.slice(0, 15);
  destroyChart('chart-placement-cost');
  chartInstances['chart-placement-cost'] = new Chart(
    document.getElementById('chart-placement-cost').getContext('2d'), {
      type: 'bar',
      data: {
        labels: top15.map(d => d.placement.length > 25 ? d.placement.slice(0, 25) + '…' : d.placement),
        datasets: [{
          label: '展示次数', data: top15.map(d => d.impressions),
          backgroundColor: 'rgba(100,150,255,0.6)', borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: '#dfe1e6' } }, y: { ticks: { font: { size: 10 }, color: '#5a5e72' } } }
      }
    }
  );

  const networkMap = {};
  data.forEach(d => { networkMap[d.network] = (networkMap[d.network] || 0) + d.impressions; });
  destroyChart('chart-placement-bubble');
  chartInstances['chart-placement-bubble'] = new Chart(
    document.getElementById('chart-placement-bubble').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(networkMap),
        datasets: [{ data: Object.values(networkMap), backgroundColor: [COLORS.blue, COLORS.pink, COLORS.yellow], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    }
  );
}

// ============================================================
// VIEW 3.5: Geo / Audience / Assets (REAL ADW DATA)
// ============================================================
function renderGeoAudience() {
  const geo = ADW_PU_IN_GEO;
  const totalCost = geo.reduce((s, d) => s + d.cost, 0);
  const totalConv = geo.reduce((s, d) => s + d.conversions, 0);
  const bestRegion = [...geo].sort((a, b) => (a.cpa || 9999) - (b.cpa || 9999)).find(d => d.conversions > 0);
  const worstRegion = [...geo].filter(d => d.conversions > 0).sort((a, b) => b.cpa - a.cpa)[0];

  document.getElementById('geo-summary').innerHTML = `
    <div class="summary-item"><div class="label">总花费(HKD)</div><div class="value">${fmt(totalCost)}</div></div>
    <div class="summary-item"><div class="label">总转化</div><div class="value">${fmt(totalConv)}</div></div>
    <div class="summary-item"><div class="label">平均 CPA</div><div class="value">${fmt(totalCost / totalConv, 1)}</div></div>
    <div class="summary-item"><div class="label" style="color:var(--green)">最佳邦</div><div class="value" style="color:var(--green);font-size:14px">${bestRegion?.region.split(',')[0]} (CPA ${bestRegion?.cpa})</div></div>
    <div class="summary-item"><div class="label" style="color:var(--red)">最差邦</div><div class="value" style="color:var(--red);font-size:14px">${worstRegion?.region.split(',')[0]} (CPA ${worstRegion?.cpa})</div></div>
  `;

  const geoAIEl = document.getElementById('geo-ai');
  if (geoAIEl) geoAIEl.innerHTML = AI.panelHTML('ai-geo', AI.geoInsights(geo));

  document.getElementById('geo-tbody').innerHTML = geo.map(d => {
    const eff = d.conversions === 0 ? '<span class="efficiency-bad">无转化</span>' :
                d.cpa < 100 ? '<span class="efficiency-good">优</span>' :
                d.cpa < 150 ? '<span class="efficiency-warn">中</span>' :
                '<span class="efficiency-bad">差</span>';
    return `<tr>
      <td>${d.region}</td><td>${fmt(d.clicks)}</td><td>${fmt(d.impressions)}</td>
      <td>${d.ctr}</td><td>${d.cpc}</td><td>${fmt(d.cost, 0)}</td>
      <td>${d.convRate}</td><td>${d.conversions}</td><td>${d.cpa || '--'}</td><td>${eff}</td>
      <td>${AI.geoTag(d)}</td>
    </tr>`;
  }).join('');

  const aud = ADW_FT_US_AUDIENCE;
  destroyChart('chart-audience');
  chartInstances['chart-audience'] = new Chart(
    document.getElementById('chart-audience').getContext('2d'), {
      type: 'bar',
      data: {
        labels: aud.map(a => a.audience),
        datasets: [
          { label: '花费(HKD)', data: aud.map(a => a.cost), backgroundColor: 'rgba(220,38,38,0.6)', borderRadius: 4, yAxisID: 'y' },
          { label: '转化', data: aud.map(a => a.conversions), backgroundColor: 'rgba(22,163,74,0.6)', borderRadius: 4, yAxisID: 'y1' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#dfe1e6' }, title: { display: true, text: '花费 HKD' } },
          y1: { position: 'right', beginAtZero: true, grid: { display: false }, title: { display: true, text: '转化' } }
        }
      }
    }
  );

  const assets = ADW_FT_US_ASSETS.filter(a => a.purchaseConv > 0).slice(0, 15);
  destroyChart('chart-assets');
  chartInstances['chart-assets'] = new Chart(
    document.getElementById('chart-assets').getContext('2d'), {
      type: 'bar',
      data: {
        labels: assets.map(a => a.asset.length > 25 ? a.asset.substring(0, 25) + '…' : a.asset),
        datasets: [{
          label: '付费转化数',
          data: assets.map(a => a.purchaseConv),
          backgroundColor: 'rgba(124,58,237,0.6)',
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: '#dfe1e6' } }, y: { ticks: { font: { size: 10 } } } }
      }
    }
  );

  document.getElementById('asset-tbody').innerHTML = ADW_FT_US_ASSETS.filter(a => a.purchaseConv > 0 || a.allConv > 100).map(a => `
    <tr>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;" title="${a.fullUrl}">${a.asset}</td>
      <td>${a.type}</td><td>${a.status}</td>
      <td><strong style="color:var(--green)">${fmt(a.purchaseConv, 0)}</strong></td>
      <td>${fmt(a.purchaseValue, 2)}</td>
      <td>${fmt(a.allConv, 0)}</td><td>${fmt(a.allConvValue, 0)}</td>
    </tr>
  `).join('');
}

// ============================================================
// VIEW 4: Search Terms & Keywords (REAL ADW DATA)
// ============================================================
document.getElementById('search-campaign-select').addEventListener('change', renderSearchTerms);

function renderSearchTerms() {
  const sel = document.getElementById('search-campaign-select').value;
  const termMap = { 'pu-in-comp': ADW_PU_IN_COMP_SEARCH_TERMS, 'pu-in-brand': ADW_PU_IN_BRAND_SEARCH_TERMS, 'pu-in-emerald': ADW_PU_IN_EMERALD_SEARCH_TERMS, 'ft-in-func': ADW_FT_IN_FUNC_SEARCH_TERMS, 'ppt-uk': ADW_PPT_UK_SEARCH_TERMS, 'ppt-us': ADW_PPT_US_SEARCH_TERMS, 'ppt-us-pmax': ADW_PPT_US_PMAX_SEARCH_TERMS };
  const kwMap = { 'pu-in-comp': ADW_PU_IN_COMP_KEYWORDS, 'pu-in-brand': ADW_PU_IN_BRAND_KEYWORDS, 'pu-in-emerald': ADW_PU_IN_EMERALD_KEYWORDS, 'ft-in-func': ADW_FT_IN_FUNC_KEYWORDS, 'ppt-uk': ADW_PPT_UK_KEYWORDS, 'ppt-us': ADW_PPT_US_KEYWORDS, 'ppt-us-pmax': null };
  const lpMap = { 'pu-in-emerald': typeof ADW_PU_IN_EMERALD_LANDING_PAGES !== 'undefined' ? ADW_PU_IN_EMERALD_LANDING_PAGES : null };
  const terms = termMap[sel] || ADW_PU_IN_COMP_SEARCH_TERMS;
  const keywords = kwMap[sel];

  const totalPurchase = terms.reduce((s, d) => s + d.purchaseNew, 0);
  const totalValue = terms.reduce((s, d) => s + d.purchaseNewValue, 0);
  const withPurchase = terms.filter(d => d.purchaseNew > 0).length;
  const noPurchase = terms.filter(d => d.purchaseNew === 0).length;

  document.getElementById('search-summary').innerHTML = `
    <div class="summary-item"><div class="label">搜索词总数(有数据)</div><div class="value">${fmt(terms.length)}</div></div>
    <div class="summary-item"><div class="label">总新付费转化</div><div class="value" style="color:var(--green)">${fmt(totalPurchase, 0)}</div></div>
    <div class="summary-item"><div class="label">总付费金额(HKD)</div><div class="value">${fmt(totalValue, 0)}</div></div>
    <div class="summary-item"><div class="label">有付费转化的词</div><div class="value" style="color:var(--green)">${withPurchase}</div></div>
    <div class="summary-item"><div class="label">无付费转化(仅流量)</div><div class="value" style="color:var(--yellow)">${noPurchase}</div></div>
  `;

  const termAIEl = document.getElementById('search-term-ai');
  if (termAIEl) termAIEl.innerHTML = AI.panelHTML('ai-terms', AI.termInsights(terms));

  const campaignLabel = document.getElementById('search-campaign-select').selectedOptions[0]?.textContent || '';
  const termsSlice = terms.slice(0, 80);
  document.getElementById('search-tbody').innerHTML = termsSlice.map((d, i) => {
    const quality = d.purchaseNew >= 5 ? '<span class="efficiency-good">优质</span>' :
                    d.purchaseNew >= 1 ? '<span class="efficiency-warn">一般</span>' :
                    '<span class="efficiency-bad">仅流量</span>';
    return `<tr>
      <td><strong class="clickable-term" data-term-idx="${i}">${d.term}</strong></td>
      <td>${d.matchType}</td><td>${d.adGroup}</td>
      <td><strong style="color:var(--green)">${d.purchaseNew}</strong></td>
      <td>${fmt(d.purchaseNewValue, 2)}</td>
      <td>${fmt(d.firstVisit)}</td><td>${fmt(d.pageView)}</td><td>${fmt(d.videocall)}</td>
      <td>${quality}</td>
      <td>${AI.termTag(d)}</td>
    </tr>`;
  }).join('');

  const searchTbody = document.getElementById('search-tbody');
  searchTbody._drawerTerms = termsSlice;
  searchTbody._drawerCampaign = campaignLabel;
  if (!searchTbody._drawerBound) {
    searchTbody._drawerBound = true;
    searchTbody.addEventListener('click', function(e) {
      const el = e.target.closest('.clickable-term');
      if (!el) return;
      const idx = Number(el.dataset.termIdx);
      if (this._drawerTerms[idx]) Drawer.open(this._drawerTerms[idx], { type: 'searchTerm', campaign: this._drawerCampaign });
    });
  }

  if (keywords && keywords.length) {
    const kwWithQS = keywords.filter(k => k.qualityScore);
    const totalKwPurchase = keywords.reduce((s, k) => s + k.purchaseNew, 0);
    document.getElementById('keyword-summary').innerHTML = `
      <div class="summary-item"><div class="label">关键词总数</div><div class="value">${keywords.length}</div></div>
      <div class="summary-item"><div class="label">总新付费转化</div><div class="value" style="color:var(--green)">${fmt(totalKwPurchase, 0)}</div></div>
      <div class="summary-item"><div class="label">有质量得分的词</div><div class="value">${kwWithQS.length}</div></div>
    `;

    const kwAIEl = document.getElementById('keyword-ai');
    if (kwAIEl) kwAIEl.innerHTML = AI.panelHTML('ai-kw', AI.kwInsights(keywords));

    const hasCostData = keywords.some(k => k.cost > 0);
    const hasBrandFields = keywords.some(k => k.arppu || k.impressionShare);
    const kwThead = document.querySelector('#keyword-table thead tr');

    if (hasCostData) {
      const kwsWithCost = keywords.filter(k => k.cost > 0 && k.clicks > 0);
      const avgCPC = kwsWithCost.length ? kwsWithCost.reduce((s, k) => s + k.cost / k.clicks, 0) / kwsWithCost.length : 0;

      kwThead.innerHTML = '<th>关键词</th><th>匹配</th><th>点击</th><th>展示</th><th>CTR</th><th>CPC</th><th>花费(HKD)</th><th>转化</th><th>转化价值</th><th>CPA</th><th>ROAS</th><th>QS</th><th>QS↔CPC</th><th>展示份额</th><th>操作建议</th>';
      document.getElementById('keyword-tbody').innerHTML = keywords.map((k, i) => {
        const qsColor = k.qualityScore >= 8 ? 'var(--green)' : k.qualityScore >= 6 ? 'var(--yellow)' : k.qualityScore ? 'var(--red)' : 'var(--text-muted)';
        const roasColor = k.roas >= 1 ? 'var(--green)' : k.roas > 0 ? 'var(--red)' : 'var(--text-muted)';
        const cpc = k.clicks > 0 ? (k.cost / k.clicks) : (k.cpc || 0);
        const cpcColor = cpc > 0 ? (cpc <= avgCPC * 0.8 ? 'var(--green)' : cpc >= avgCPC * 1.3 ? 'var(--red)' : 'var(--text-primary)') : 'var(--text-muted)';
        const qs = Number(k.qualityScore) || 0;
        let qsCpcTag = '';
        if (qs > 0 && cpc > 0) {
          if (qs >= 8 && cpc <= avgCPC) qsCpcTag = '<span class="action-tag tag-good" style="font-size:10px">高QS低CPC ✓</span>';
          else if (qs >= 8 && cpc > avgCPC) qsCpcTag = '<span class="action-tag tag-watch" style="font-size:10px">高QS但CPC偏高</span>';
          else if (qs < 6 && cpc >= avgCPC) qsCpcTag = '<span class="action-tag tag-negate" style="font-size:10px">低QS推高CPC</span>';
          else if (qs < 6 && cpc < avgCPC) qsCpcTag = '<span class="action-tag tag-watch" style="font-size:10px">低QS CPC尚可</span>';
          else qsCpcTag = '<span style="font-size:10px;color:var(--text-muted)">—</span>';
        }
        return `<tr>
          <td><strong class="clickable-term" data-kw-idx="${i}">${k.keyword}</strong></td>
          <td>${k.matchType}</td>
          <td>${fmt(k.clicks)}</td><td>${fmt(k.impressions)}</td>
          <td>${k.ctr || '-'}</td>
          <td style="color:${cpcColor};font-weight:600">${cpc > 0 ? cpc.toFixed(2) : '-'}</td>
          <td>${fmt(k.cost)}</td>
          <td><strong style="color:var(--green)">${k.purchaseNew}</strong></td>
          <td>${fmt(k.purchaseNewValue)}</td>
          <td>${k.cpa > 0 ? k.cpa.toFixed(2) : '-'}</td>
          <td style="color:${roasColor};font-weight:600">${k.roas > 0 ? k.roas.toFixed(2) : '-'}</td>
          <td style="color:${qsColor};font-weight:700">${k.qualityScore || '--'}</td>
          <td>${qsCpcTag}</td>
          <td>${k.impressionShare || '--'}</td>
          <td>${AI.kwTag(k)}</td>
        </tr>`;
      }).join('');
    } else {
      if (hasBrandFields) {
        kwThead.innerHTML = '<th>关键词</th><th>匹配</th><th>广告组</th><th>状态</th><th>新付费</th><th>金额</th><th>QS</th><th>预期CTR</th><th>着陆页</th><th>相关性</th><th>ARPPU</th><th>展示份额</th><th>操作建议</th>';
      } else {
        kwThead.innerHTML = '<th>关键词</th><th>匹配</th><th>广告组</th><th>状态</th><th>新付费</th><th>金额</th><th>QS</th><th>预期CTR</th><th>着陆页</th><th>相关性</th><th>操作建议</th>';
      }
      document.getElementById('keyword-tbody').innerHTML = keywords.map((k, i) => {
        const qsColor = k.qualityScore >= 8 ? 'var(--green)' : k.qualityScore >= 6 ? 'var(--yellow)' : k.qualityScore ? 'var(--red)' : 'var(--text-muted)';
        const extra = hasBrandFields ? `<td>${k.arppu || '--'}</td><td>${k.impressionShare || '--'}</td>` : '';
        return `<tr>
          <td><strong class="clickable-term" data-kw-idx="${i}">${k.keyword}</strong></td>
          <td>${k.matchType}</td><td>${k.adGroup}</td><td>${k.status}</td>
          <td><strong style="color:var(--green)">${k.purchaseNew}</strong></td>
          <td>${fmt(k.purchaseNewValue, 2)}</td>
          <td style="color:${qsColor};font-weight:700">${k.qualityScore || '--'}</td>
          <td>${k.expectedCTR || '--'}</td>
          <td>${k.landingPageExp || '--'}</td>
          <td>${k.adRelevance || '--'}</td>
          ${extra}
          <td>${AI.kwTag(k)}</td>
        </tr>`;
      }).join('');
    }

    const kwTbody = document.getElementById('keyword-tbody');
    kwTbody._drawerKeywords = keywords;
    kwTbody._drawerCampaign = campaignLabel;
    kwTbody._drawerTerms = terms;
    if (!kwTbody._drawerBound) {
      kwTbody._drawerBound = true;
      kwTbody.addEventListener('click', function(e) {
        const el = e.target.closest('.clickable-term');
        if (!el) return;
        const idx = Number(el.dataset.kwIdx);
        if (this._drawerKeywords[idx]) Drawer.open(this._drawerKeywords[idx], { type: 'keyword', campaign: this._drawerCampaign, searchTerms: this._drawerTerms });
      });
    }
  } else {
    document.getElementById('keyword-summary').innerHTML = '<div class="summary-item"><div class="label">PMax 无关键词报告</div><div class="value">-</div></div>';
    document.getElementById('keyword-tbody').innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);">PMax 广告系列无独立关键词数据</td></tr>';
  }

  const landingPages = lpMap[sel] || null;
  const lpSection = document.getElementById('landing-page-section');
  if (landingPages && landingPages.length) {
    lpSection.style.display = '';
    document.getElementById('landing-page-tbody').innerHTML = landingPages.map(p => {
      const eff = p.conversions === 0 ? '<span class="efficiency-bad">无转化</span>' :
                  p.cpa > 0 && p.cpa < 150 ? '<span class="efficiency-good">高效</span>' :
                  p.cpa > 0 && p.cpa < 300 ? '<span class="efficiency-warn">一般</span>' :
                  '<span class="efficiency-bad">低效</span>';
      return `<tr>
        <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;" title="${p.fullUrl}"><a href="${p.fullUrl}" target="_blank" style="color:var(--accent)">${p.page}</a></td>
        <td>${fmt(p.clicks)}</td><td>${fmt(p.impressions)}</td><td>${p.ctr}</td>
        <td>${p.cpc}</td><td>${fmt(p.cost, 0)}</td>
        <td><strong style="color:var(--green)">${p.conversions}</strong></td>
        <td>${fmt(p.convValue, 0)}</td><td>${p.convRate}</td>
        <td>${p.cpa > 0 ? p.cpa.toFixed(2) : '--'}</td><td>${eff}</td>
      </tr>`;
    }).join('');
  } else {
    lpSection.style.display = 'none';
  }

  const top15 = terms.filter(d => d.purchaseNew > 0).slice(0, 15);
  destroyChart('chart-search-cost');
  chartInstances['chart-search-cost'] = new Chart(
    document.getElementById('chart-search-cost').getContext('2d'), {
      type: 'bar',
      data: {
        labels: top15.map(d => d.term.length > 25 ? d.term.substring(0, 25) + '…' : d.term),
        datasets: [{
          label: '新付费转化',
          data: top15.map(d => d.purchaseNew),
          backgroundColor: top15.map(d => d.purchaseNew >= 5 ? 'rgba(22,163,74,0.7)' : 'rgba(217,119,6,0.7)'),
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: '#dfe1e6' } }, y: { ticks: { font: { size: 10 } } } }
      }
    }
  );

  const kwsForChart = keywords || [];
  const hasCost = kwsForChart.some(k => k.cost > 0);
  destroyChart('chart-search-conv');
  if (hasCost) {
    const costSorted = kwsForChart.filter(k => k.cost > 0).sort((a, b) => b.cost - a.cost).slice(0, 20);
    chartInstances['chart-search-conv'] = new Chart(
      document.getElementById('chart-search-conv').getContext('2d'), {
        type: 'bar',
        data: {
          labels: costSorted.map(k => k.keyword.length > 22 ? k.keyword.substring(0, 22) + '…' : k.keyword),
          datasets: [{
            label: '花费 (HKD)', data: costSorted.map(k => k.cost),
            backgroundColor: costSorted.map(k => k.roas >= 1 ? 'rgba(22,163,74,0.7)' : k.purchaseNew > 0 ? 'rgba(217,119,6,0.7)' : 'rgba(220,38,38,0.7)'),
            borderRadius: 4,
          }, {
            label: '转化价值', data: costSorted.map(k => k.purchaseNewValue),
            backgroundColor: 'rgba(100,150,255,0.5)', borderRadius: 4,
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#5a5e72' } } },
          scales: { x: { grid: { color: '#dfe1e6' }, ticks: { color: '#8b8fa3' } }, y: { ticks: { font: { size: 10 }, color: '#5a5e72' } } }
        }
      }
    );
  } else {
    const qsData = kwsForChart.filter(k => k.qualityScore).sort((a, b) => Number(b.qualityScore) - Number(a.qualityScore));
    chartInstances['chart-search-conv'] = new Chart(
      document.getElementById('chart-search-conv').getContext('2d'), {
        type: 'bar',
        data: {
          labels: qsData.map(k => k.keyword.length > 22 ? k.keyword.substring(0, 22) + '…' : k.keyword),
          datasets: [{
            label: '质量得分', data: qsData.map(k => Number(k.qualityScore)),
            backgroundColor: qsData.map(k => Number(k.qualityScore) >= 8 ? 'rgba(22,163,74,0.7)' : Number(k.qualityScore) >= 6 ? 'rgba(217,119,6,0.7)' : 'rgba(220,38,38,0.7)'),
            borderRadius: 4,
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { max: 10, grid: { color: '#dfe1e6' } }, y: { ticks: { font: { size: 10 } } } }
        }
      }
    );
  }
}

// ============================================================
// VIEW 5: Devices (REAL ADW DATA)
// ============================================================
function renderDevices() {
  const allDevices = [...ADW_FT_US_DEVICES, ...ADW_PU_IN_DEVICES, ...ADW_PU_IN_COMP_DEVICES, ...ADW_PPT_UK_DEVICES, ...ADW_PPT_US_DEVICES];

  const devAIEl = document.getElementById('device-ai');
  if (devAIEl) devAIEl.innerHTML = AI.panelHTML('ai-device', AI.deviceInsights(allDevices));

  document.getElementById('device-tbody').innerHTML = allDevices.map(d => `
    <tr>
      <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;" title="${d.campaign}">${d.campaign}</td>
      <td>${d.device}</td>
      <td>${d.bidAdj}</td>
      <td>${fmt(d.clicks)}</td>
      <td>${fmt(d.impressions)}</td>
      <td>${d.ctr}</td>
      <td>${d.cpc}</td>
      <td>${fmt(d.cost, 0)}</td>
      <td>${d.convRate}</td>
      <td>${fmt(d.conversions, 0)}</td>
      <td>${AI.deviceTag(d)}</td>
    </tr>
  `).join('');

  const ftDevices = ADW_FT_US_DEVICES;
  const puDevices = ADW_PU_IN_DEVICES;

  destroyChart('chart-device-spend');
  chartInstances['chart-device-spend'] = new Chart(
    document.getElementById('chart-device-spend').getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Ft-US-Display', 'Pu-IN-Display'],
        datasets: [
          { label: '手机', data: [ftDevices.find(d => d.device === '手机')?.cost || 0, puDevices.find(d => d.device === '手机')?.cost || 0], backgroundColor: 'rgba(219,39,119,0.7)', borderRadius: 4 },
          { label: '计算机', data: [ftDevices.find(d => d.device === '计算机')?.cost || 0, puDevices.find(d => d.device === '计算机')?.cost || 0], backgroundColor: 'rgba(79,70,229,0.7)', borderRadius: 4 },
          { label: '平板', data: [ftDevices.find(d => d.device === '平板电脑')?.cost || 0, puDevices.find(d => d.device === '平板电脑')?.cost || 0], backgroundColor: 'rgba(8,145,178,0.7)', borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, grid: { color: '#dfe1e6' } } }
      }
    }
  );

  destroyChart('chart-device-roas');
  const activeDevices = allDevices.filter(d => d.cost > 0);
  chartInstances['chart-device-roas'] = new Chart(
    document.getElementById('chart-device-roas').getContext('2d'), {
      type: 'bar',
      data: {
        labels: activeDevices.map(d => `${d.campaign.split('-').slice(0, 3).join('-')} (${d.device})`),
        datasets: [
          { label: '花费(HKD)', data: activeDevices.map(d => d.cost), backgroundColor: 'rgba(220,38,38,0.6)', borderRadius: 4 },
          { label: '转化', data: activeDevices.map(d => d.conversions * 100), backgroundColor: 'rgba(22,163,74,0.6)', borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, grid: { color: '#dfe1e6' } } }
      }
    }
  );
}

// ============================================================
// VIEW 7: Schedule Heatmap (投放时段分析)
// ============================================================
function renderSchedule() {
  const data = ADW_PPT_UK_SCHEDULE;
  if (!data || !data.length) return;

  const schAIEl = document.getElementById('schedule-ai');
  if (schAIEl) schAIEl.innerHTML = AI.panelHTML('ai-schedule', AI.scheduleInsights(data));

  const dayOrder = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
  const dayMap = {};
  dayOrder.forEach(d => { dayMap[d] = {}; });

  let totalCost = 0, totalConv = 0, totalClicks = 0;
  data.forEach(r => {
    if (dayMap[r.day]) dayMap[r.day][r.hour] = r;
    totalCost += r.cost;
    totalConv += r.conversions;
    totalClicks += r.clicks;
  });

  const avgCPA = totalConv > 0 ? (totalCost / totalConv).toFixed(2) : '-';
  const avgCTR = totalClicks > 0 ? ((totalConv / totalClicks) * 100).toFixed(2) + '%' : '-';
  document.getElementById('schedule-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">总花费 (HKD)</div><div class="kpi-value">${fmt(totalCost)}</div></div>
    <div class="kpi-card"><div class="kpi-label">总转化</div><div class="kpi-value">${fmt(totalConv)}</div></div>
    <div class="kpi-card"><div class="kpi-label">均 CPA</div><div class="kpi-value">${avgCPA}</div></div>
    <div class="kpi-card"><div class="kpi-label">转化率</div><div class="kpi-value">${avgCTR}</div></div>
  `;

  // Build heatmap table
  let maxConv = 0;
  data.forEach(r => { if (r.conversions > maxConv) maxConv = r.conversions; });

  let html = '<table class="data-table" style="font-size:12px;"><thead><tr><th>时段</th>';
  dayOrder.forEach(d => { html += `<th>${d.replace('星期','周')}</th>`; });
  html += '</tr></thead><tbody>';

  for (let h = 0; h < 24; h++) {
    html += `<tr><td style="font-weight:600;">${h}:00</td>`;
    dayOrder.forEach(day => {
      const cell = dayMap[day][h];
      if (cell && cell.conversions > 0) {
        const intensity = cell.conversions / maxConv;
        const r = Math.round(50 + 205 * (1 - intensity));
        const g = Math.round(220 * intensity);
        const b = Math.round(80 + 100 * intensity);
        const bg = `rgba(${Math.min(r, 100)}, ${g}, ${b}, ${0.15 + intensity * 0.65})`;
        const cpaStr = cell.cpa > 0 && cell.cpa < 5000 ? `<br><span style="font-size:10px;opacity:0.7;">CPA:${cell.cpa}</span>` : '';
        html += `<td style="background:${bg};text-align:center;min-width:60px;" title="CPA:${cell.cpa} Cost:${cell.cost}">${cell.conversions.toFixed(1)}${cpaStr}</td>`;
      } else {
        html += '<td style="text-align:center;color:#555;">-</td>';
      }
    });
    html += '</tr>';
  }
  html += '</tbody></table>';
  document.getElementById('heatmap-container').innerHTML = html;

  // Hourly aggregation chart
  const hourlyConv = new Array(24).fill(0);
  const hourlyCost = new Array(24).fill(0);
  data.forEach(r => { hourlyConv[r.hour] += r.conversions; hourlyCost[r.hour] += r.cost; });
  const hourlyCPA = hourlyConv.map((c, i) => c > 0 ? +(hourlyCost[i] / c).toFixed(2) : 0);

  const ctxH = document.getElementById('chart-schedule-hour');
  if (ctxH._chart) ctxH._chart.destroy();
  ctxH._chart = new Chart(ctxH, {
    type: 'bar',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: '转化', data: hourlyConv.map(v => +v.toFixed(1)),
        backgroundColor: 'rgba(0, 200, 150, 0.6)', yAxisID: 'y',
      }, {
        label: 'CPA', data: hourlyCPA, type: 'line',
        borderColor: '#ff6b6b', backgroundColor: 'transparent', yAxisID: 'y1',
        pointRadius: 2, tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#5a5e72' } } },
      scales: {
        x: { ticks: { color: '#8b8fa3', maxRotation: 45 }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { position: 'left', ticks: { color: '#8b8fa3' }, grid: { color: 'rgba(0,0,0,0.06)' }, title: { display: true, text: '转化', color: '#8b8fa3' } },
        y1: { position: 'right', ticks: { color: '#ff6b6b' }, grid: { display: false }, title: { display: true, text: 'CPA (HKD)', color: '#ff6b6b' } },
      }
    }
  });

  // Day-of-week chart
  const dayConv = dayOrder.map(_ => 0);
  const dayCost = dayOrder.map(_ => 0);
  data.forEach(r => {
    const idx = dayOrder.indexOf(r.day);
    if (idx >= 0) { dayConv[idx] += r.conversions; dayCost[idx] += r.cost; }
  });
  const dayCPA = dayConv.map((c, i) => c > 0 ? +(dayCost[i] / c).toFixed(2) : 0);

  const ctxD = document.getElementById('chart-schedule-day');
  if (ctxD._chart) ctxD._chart.destroy();
  ctxD._chart = new Chart(ctxD, {
    type: 'bar',
    data: {
      labels: dayOrder.map(d => d.replace('星期', '周')),
      datasets: [{
        label: '转化', data: dayConv.map(v => +v.toFixed(1)),
        backgroundColor: 'rgba(100, 150, 255, 0.6)', yAxisID: 'y',
      }, {
        label: 'CPA', data: dayCPA, type: 'line',
        borderColor: '#ffa500', backgroundColor: 'transparent', yAxisID: 'y1',
        pointRadius: 4, tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#5a5e72' } } },
      scales: {
        x: { ticks: { color: '#8b8fa3' }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { position: 'left', ticks: { color: '#8b8fa3' }, grid: { color: 'rgba(0,0,0,0.06)' }, title: { display: true, text: '转化', color: '#8b8fa3' } },
        y1: { position: 'right', ticks: { color: '#ffa500' }, grid: { display: false }, title: { display: true, text: 'CPA (HKD)', color: '#ffa500' } },
      }
    }
  });
}

// ============================================================
// VIEW 8: Landing Page Management (三视图)
// ============================================================
let lpCurrentDetail = null; // { siteIdx, pageIdx }

// Tab switching
document.querySelectorAll('.lp-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lp-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.lp-subview').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('lp-view-' + tab.dataset.lpView).classList.add('active');
    if (tab.dataset.lpView === 'global') renderLPGlobal();
    if (tab.dataset.lpView === 'matrix') renderLPMatrix();
    if (tab.dataset.lpView === 'detail') renderLPDetail();
    if (tab.dataset.lpView === 'abtest') { document.getElementById('ab-list-view').style.display = ''; document.getElementById('ab-detail-view').style.display = 'none'; renderABTests(); }
  });
});

document.getElementById('lp-global-product').addEventListener('change', renderLPGlobal);
document.getElementById('lp-global-status').addEventListener('change', renderLPGlobal);
document.getElementById('lp-matrix-product').addEventListener('change', renderLPMatrix);
document.getElementById('lp-back-btn').addEventListener('click', () => {
  document.querySelectorAll('.lp-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.lp-subview').forEach(v => v.classList.remove('active'));
  document.querySelector('.lp-tab[data-lp-view="global"]').classList.add('active');
  document.getElementById('lp-view-global').classList.add('active');
  renderLPGlobal();
});

function renderLandingPages() { renderLPGlobal(); }

// ---- View A: Global Status ----
function renderLPGlobal() {
  const data = LP_VERSION_DATA;
  const prodFilter = document.getElementById('lp-global-product').value;
  const statusFilter = document.getElementById('lp-global-status').value;

  const allPages = [];
  data.sites.forEach((site, si) => {
    if (prodFilter !== 'all' && site.productShort !== prodFilter) return;
    site.pages.forEach((page, pi) => {
      if (statusFilter !== 'all' && page.pageStatus !== statusFilter) return;
      const activeVer = page.versions.find(v => v.isActive);
      allPages.push({ ...page, site, siteIdx: si, pageIdx: pi, activeVer, domain: site.domain, productShort: site.productShort });
    });
  });

  const activeCount = allPages.filter(p => p.pageStatus === 'active').length;
  const plannedCount = allPages.filter(p => p.pageStatus === 'planned').length;
  const criticalCount = allPages.filter(p => p.healthStatus === 'critical').length;
  const totalVersions = allPages.reduce((s, p) => s + p.versions.length, 0);

  const pagesWithMetrics = allPages.filter(p => p.activeVer);
  const avgBounce = pagesWithMetrics.length ? (pagesWithMetrics.reduce((s, p) => s + p.activeVer.metrics.bounceRate, 0) / pagesWithMetrics.length).toFixed(1) : '--';
  const avgQS = pagesWithMetrics.length ? (pagesWithMetrics.reduce((s, p) => s + p.activeVer.metrics.qualityScore, 0) / pagesWithMetrics.length).toFixed(1) : '--';

  document.getElementById('lp-global-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">落地页总数</div>
      <div class="kpi-value">${allPages.length}</div>
      <div class="kpi-sub kpi-neutral">${activeCount} 已上线 / ${plannedCount} 待建设</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">版本总数</div>
      <div class="kpi-value">${totalVersions}</div>
      <div class="kpi-sub kpi-neutral">累计迭代版本</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">需立即处理</div>
      <div class="kpi-value" style="color:var(--red)">${criticalCount}</div>
      <div class="kpi-sub" style="color:var(--red)">健康状态为 Critical</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">平均跳出率</div>
      <div class="kpi-value ${Number(avgBounce) > 60 ? 'roas-bad' : Number(avgBounce) > 50 ? 'roas-warn' : ''}">${avgBounce}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">平均 QS</div>
      <div class="kpi-value ${Number(avgQS) < 6 ? 'roas-bad' : Number(avgQS) >= 8 ? 'roas-good' : 'roas-warn'}">${avgQS}</div>
    </div>
  `;

  const globalInsights = getLPGlobalInsights(allPages);
  const aiEl = document.getElementById('lp-global-ai');
  if (aiEl) aiEl.innerHTML = AI.panelHTML('ai-lp-global', globalInsights);

  const grid = document.getElementById('lp-page-grid');
  grid.innerHTML = allPages.map(p => {
    const v = p.activeVer;
    const m = v ? v.metrics : null;
    const isPlanned = p.pageStatus === 'planned';
    const prodClass = p.productShort.toLowerCase();

    const metricsHTML = m ? `
      <div class="lp-card-metrics">
        <div class="lp-card-metric"><div class="label">跳出率</div><div class="value" style="color:${m.bounceRate > 60 ? 'var(--red)' : m.bounceRate > 50 ? 'var(--yellow)' : 'var(--green)'}">${m.bounceRate}%</div></div>
        <div class="lp-card-metric"><div class="label">QS</div><div class="value" style="color:${m.qualityScore >= 8 ? 'var(--green)' : m.qualityScore >= 6 ? 'var(--yellow)' : 'var(--red)'}">${m.qualityScore}</div></div>
        <div class="lp-card-metric"><div class="label">付费率</div><div class="value" style="color:${m.payRate >= 2 ? 'var(--green)' : m.payRate >= 1 ? 'var(--yellow)' : 'var(--red)'}">${m.payRate}%</div></div>
        <div class="lp-card-metric"><div class="label">CPA</div><div class="value">${fmt(m.cpa)}</div></div>
      </div>` : `<div style="padding:16px 0;text-align:center;color:var(--text-muted);font-size:12px;">尚未建设，无数据</div>`;

    const versionHTML = v ? `
      <div class="lp-card-version">
        <span class="lp-version-badge">${v.versionId}</span>
        <span style="color:var(--text-secondary);font-size:12px;">${v.name}</span>
        <span class="lp-card-date">${v.deployDate}</span>
      </div>` : `<div class="lp-card-version"><span class="lp-card-planned-badge">待建设</span></div>`;

    return `
      <div class="lp-page-card ${isPlanned ? 'card-planned' : ''}" onclick="openLPDetail(${p.siteIdx}, ${p.pageIdx})">
        <div class="lp-card-product-tag"><span class="product-badge ${prodClass}">${p.productShort}</span></div>
        <div class="lp-card-top">
          <div>
            <div class="lp-card-url">${p.domain}${p.path}</div>
            <div class="lp-card-name">${p.name}</div>
          </div>
          <div class="lp-health-dot h-${p.healthStatus}" title="${p.healthStatus}"></div>
        </div>
        ${versionHTML}
        ${metricsHTML}
      </div>`;
  }).join('');
}

function getLPGlobalInsights(allPages) {
  const insights = [];
  const planned = allPages.filter(p => p.pageStatus === 'planned');
  const critical = allPages.filter(p => p.healthStatus === 'critical');
  const active = allPages.filter(p => p.pageStatus === 'active' && p.activeVer);

  if (critical.length > 0) {
    insights.push({ level: 'critical', icon: '🔴',
      text: `<strong>${critical.length} 个落地页状态紧急</strong>：${critical.map(p => '「' + p.domain + p.path + '」').join('、')} 需立即关注。${planned.filter(p => p.healthStatus === 'critical').length} 个为待建设页面，关键词正指向不匹配的首页。`
    });
  }

  if (planned.length > 0) {
    insights.push({ level: 'warning', icon: '🟡',
      text: `<strong>${planned.length} 个落地页待建设</strong>：${planned.map(p => '「' + p.path + '」').join('、')} 尚未上线，相关关键词仍指向通用首页，<span class="action">建议优先建设</span>。`
    });
  }

  const improved = active.filter(p => p.versions.length >= 2);
  if (improved.length > 0) {
    improved.forEach(p => {
      const curr = p.versions[0].metrics;
      const prev = p.versions[1].metrics;
      const bounceDelta = curr.bounceRate - prev.bounceRate;
      const qsDelta = curr.qualityScore - prev.qualityScore;
      if (bounceDelta < -5 || qsDelta > 1) {
        insights.push({ level: 'positive', icon: '🟢',
          text: `<strong>${p.domain}${p.path}</strong>：新版本 ${p.versions[0].versionId} 效果提升，跳出率 ${prev.bounceRate}% → ${curr.bounceRate}%（<span class="metric">${bounceDelta > 0 ? '+' : ''}${bounceDelta.toFixed(1)}%</span>），QS ${prev.qualityScore} → ${curr.qualityScore}。`
        });
      }
    });
  }

  if (active.length > 0) {
    const bestPage = active.reduce((best, p) => (!best || p.activeVer.metrics.roas > best.activeVer.metrics.roas) ? p : best, null);
    if (bestPage) {
      insights.push({ level: 'info', icon: '💡',
        text: `<strong>最高ROAS落地页</strong>：「${bestPage.domain}${bestPage.path}」ROAS 达 <span class="metric">${bestPage.activeVer.metrics.roas}</span>，可参考其设计思路优化其他页面。`
      });
    }
  }

  return insights;
}

// ---- View B: Detail + Version History ----
function openLPDetail(siteIdx, pageIdx) {
  lpCurrentDetail = { siteIdx, pageIdx };
  document.querySelectorAll('.lp-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.lp-subview').forEach(v => v.classList.remove('active'));
  document.querySelector('.lp-tab[data-lp-view="detail"]').classList.add('active');
  document.getElementById('lp-view-detail').classList.add('active');
  renderLPDetail();
}

function renderLPDetail() {
  if (!lpCurrentDetail) return;
  const site = LP_VERSION_DATA.sites[lpCurrentDetail.siteIdx];
  const page = site.pages[lpCurrentDetail.pageIdx];
  if (!page) return;

  document.getElementById('lp-detail-empty').style.display = 'none';
  document.getElementById('lp-detail-content').style.display = '';

  const activeVer = page.versions.find(v => v.isActive);
  const m = activeVer ? activeVer.metrics : null;

  document.getElementById('lp-detail-header').innerHTML = `
    <h2 style="color:var(--accent)">${site.domain}${page.path}</h2>
    <div class="lp-detail-header-meta">
      <span class="product-badge ${site.productShort.toLowerCase()}">${site.product}</span>
      <span>${page.name}</span>
      ${activeVer ? `<span class="lp-version-badge">${activeVer.versionId} - ${activeVer.name}</span>` : '<span class="lp-card-planned-badge">待建设</span>'}
      <span class="lp-health-dot h-${page.healthStatus}" style="display:inline-block;" title="${page.healthStatus}"></span>
      <span style="color:var(--text-muted)">${page.healthStatus}</span>
    </div>`;

  if (m) {
    document.getElementById('lp-detail-kpis').innerHTML = `
      <div class="kpi-card"><div class="kpi-label">点击量</div><div class="kpi-value">${fmt(m.clicks)}</div><div class="kpi-sub kpi-neutral">展示 ${fmt(m.impressions)}</div></div>
      <div class="kpi-card"><div class="kpi-label">CTR</div><div class="kpi-value">${m.ctr}%</div></div>
      <div class="kpi-card"><div class="kpi-label">跳出率</div><div class="kpi-value" style="color:${m.bounceRate > 60 ? 'var(--red)' : m.bounceRate > 50 ? 'var(--yellow)' : 'var(--green)'}">${m.bounceRate}%</div></div>
      <div class="kpi-card"><div class="kpi-label">均停留</div><div class="kpi-value">${m.avgDuration}s</div></div>
      <div class="kpi-card"><div class="kpi-label">注册率</div><div class="kpi-value">${m.registerRate}%</div></div>
      <div class="kpi-card"><div class="kpi-label">付费率</div><div class="kpi-value" style="color:${m.payRate >= 2 ? 'var(--green)' : m.payRate >= 1 ? 'var(--yellow)' : 'var(--red)'}">${m.payRate}%</div></div>
      <div class="kpi-card"><div class="kpi-label">CPA</div><div class="kpi-value">${fmt(m.cpa)} <span style="font-size:12px;color:var(--text-muted)">HKD</span></div></div>
      <div class="kpi-card"><div class="kpi-label">ROAS</div><div class="kpi-value ${m.roas >= 2 ? 'roas-good' : m.roas >= 1 ? 'roas-warn' : 'roas-bad'}">${m.roas}</div></div>
      <div class="kpi-card"><div class="kpi-label">QS</div><div class="kpi-value" style="color:${m.qualityScore >= 8 ? 'var(--green)' : m.qualityScore >= 6 ? 'var(--yellow)' : 'var(--red)'}; font-size:32px;">${m.qualityScore}</div><div class="kpi-sub kpi-neutral">${m.landingPageExp}</div></div>
      <div class="kpi-card"><div class="kpi-label">加载速度</div><div class="kpi-value" style="color:${m.pageLoadSpeed <= 2 ? 'var(--green)' : m.pageLoadSpeed <= 3 ? 'var(--yellow)' : 'var(--red)'}">${m.pageLoadSpeed}s</div></div>
    `;
  } else {
    document.getElementById('lp-detail-kpis').innerHTML = '<div class="kpi-card" style="grid-column:1/-1;text-align:center;color:var(--text-muted);">该页面尚未建设，暂无数据</div>';
  }

  // Version Timeline
  const timeline = document.getElementById('lp-version-timeline');
  if (page.versions.length === 0) {
    timeline.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);">该页面尚未建设，无版本记录</div>';
  } else {
    timeline.innerHTML = page.versions.map(v => {
      const vm = v.metrics;
      return `
        <div class="lp-timeline-item ${v.isActive ? 'active-version' : ''}">
          <div class="lp-timeline-dot"></div>
          <div class="lp-timeline-header">
            <h4>
              <span class="lp-version-badge">${v.versionId}</span>
              ${v.name}
              ${v.isActive ? '<span class="lp-status lp-optimal" style="font-size:10px;">当前版本</span>' : ''}
            </h4>
            <div class="lp-timeline-dates">${v.deployDate} ${v.endDate ? '→ ' + v.endDate : '→ 至今'}</div>
          </div>
          <div class="lp-timeline-changelog">${v.changelog}</div>
          <div class="lp-timeline-metrics">
            <div class="lp-timeline-metric"><div class="label">跳出率</div><div class="value" style="color:${vm.bounceRate > 60 ? 'var(--red)' : vm.bounceRate > 50 ? 'var(--yellow)' : 'var(--green)'}">${vm.bounceRate}%</div></div>
            <div class="lp-timeline-metric"><div class="label">停留</div><div class="value">${vm.avgDuration}s</div></div>
            <div class="lp-timeline-metric"><div class="label">注册率</div><div class="value">${vm.registerRate}%</div></div>
            <div class="lp-timeline-metric"><div class="label">付费率</div><div class="value">${vm.payRate}%</div></div>
            <div class="lp-timeline-metric"><div class="label">QS</div><div class="value" style="color:${vm.qualityScore >= 8 ? 'var(--green)' : vm.qualityScore >= 6 ? 'var(--yellow)' : 'var(--red)'}">${vm.qualityScore}</div></div>
            <div class="lp-timeline-metric"><div class="label">CPA</div><div class="value">${fmt(vm.cpa)}</div></div>
            <div class="lp-timeline-metric"><div class="label">ROAS</div><div class="value" style="color:${vm.roas >= 2 ? 'var(--green)' : 'var(--yellow)'}">${vm.roas}</div></div>
            <div class="lp-timeline-metric"><div class="label">花费</div><div class="value">${fmt(vm.cost)}</div></div>
          </div>
        </div>`;
    }).join('');
  }

  // Version Compare (only if 2+ versions)
  const compareCard = document.getElementById('lp-compare-card');
  if (page.versions.length >= 2) {
    compareCard.style.display = '';
    const selA = document.getElementById('lp-compare-a');
    const selB = document.getElementById('lp-compare-b');
    selA.innerHTML = page.versions.map((v, i) => `<option value="${i}" ${i === 0 ? 'selected' : ''}>${v.versionId} - ${v.name}</option>`).join('');
    selB.innerHTML = page.versions.map((v, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${v.versionId} - ${v.name}</option>`).join('');
    const doCompare = () => renderLPCompare(page.versions[+selA.value], page.versions[+selB.value]);
    selA.onchange = doCompare;
    selB.onchange = doCompare;
    doCompare();
  } else {
    compareCard.style.display = 'none';
  }

  // Related Keywords
  const kwMap = LP_VERSION_DATA.keywordPageMap.filter(k =>
    k.domain === site.domain && (k.currentPage === page.path || k.suggestedPage === page.path)
  );
  const kwTbody = document.getElementById('lp-detail-keywords');
  if (kwMap.length === 0) {
    kwTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;">暂无关联关键词数据</td></tr>';
  } else {
    kwTbody.innerHTML = kwMap.map(k => {
      const scoreClass = k.matchScore >= 70 ? 'score-high' : k.matchScore >= 40 ? 'score-mid' : 'score-low';
      const statusHTML = { critical: '<span class="lp-status lp-critical">需优化</span>', warning: '<span class="lp-status lp-warning">建议优化</span>', ok: '<span class="lp-status lp-ok">可优化</span>', optimal: '<span class="lp-status lp-optimal">最优</span>' }[k.status] || '';
      return `<tr class="${k.status === 'critical' ? 'row-critical' : k.status === 'warning' ? 'row-warning' : ''}">
        <td><strong>${k.keyword}</strong></td>
        <td><span class="kw-group-badge">${k.keywordGroup}</span></td>
        <td><span class="lp-match-score ${scoreClass}">${k.matchScore}</span></td>
        <td style="color:${k.bounceRate > 65 ? 'var(--red)' : k.bounceRate > 50 ? 'var(--yellow)' : 'var(--green)'}">${k.bounceRate}%</td>
        <td style="color:${k.qs >= 8 ? 'var(--green)' : k.qs >= 6 ? 'var(--yellow)' : 'var(--red)'};font-weight:700;">${k.qs}</td>
        <td>${k.payRate}%</td>
        <td>${statusHTML}</td>
      </tr>`;
    }).join('');
  }
}

function renderLPCompare(vA, vB) {
  const body = document.getElementById('lp-compare-body');
  const metrics = [
    { key: 'bounceRate', label: '跳出率', unit: '%', lowerBetter: true },
    { key: 'avgDuration', label: '平均停留', unit: 's', lowerBetter: false },
    { key: 'pageLoadSpeed', label: '加载速度', unit: 's', lowerBetter: true },
    { key: 'registerRate', label: '注册率', unit: '%', lowerBetter: false },
    { key: 'payRate', label: '付费率', unit: '%', lowerBetter: false },
    { key: 'qualityScore', label: 'Quality Score', unit: '', lowerBetter: false },
    { key: 'cpa', label: 'CPA (HKD)', unit: '', lowerBetter: true },
    { key: 'roas', label: 'ROAS', unit: '', lowerBetter: false },
    { key: 'ctr', label: 'CTR', unit: '%', lowerBetter: false },
    { key: 'avgCpc', label: '平均CPC', unit: ' HKD', lowerBetter: true },
    { key: 'cost', label: '总花费', unit: ' HKD', lowerBetter: true },
    { key: 'clicks', label: '点击量', unit: '', lowerBetter: false },
  ];

  let html = '<div class="lp-compare-grid">';
  html += `<div class="lp-compare-row">
    <div class="lp-compare-label" style="font-weight:700;">指标</div>
    <div style="font-weight:700;color:var(--accent);padding:10px 14px;border-bottom:1px solid var(--border);">${vA.versionId} ${vA.name}</div>
    <div class="lp-compare-arrow" style="border-bottom:1px solid var(--border);"></div>
    <div style="font-weight:700;color:var(--accent);padding:10px 14px;border-bottom:1px solid var(--border);">${vB.versionId} ${vB.name}</div>
  </div>`;

  metrics.forEach(({ key, label, unit, lowerBetter }) => {
    const a = vA.metrics[key];
    const b = vB.metrics[key];
    const diff = a - b;
    const isBetter = lowerBetter ? diff < 0 : diff > 0;
    const isWorse = lowerBetter ? diff > 0 : diff < 0;
    const arrow = Math.abs(diff) < 0.01 ? '→' : isBetter ? '↑' : '↓';
    const colorClass = Math.abs(diff) < 0.01 ? 'lp-compare-same' : isBetter ? 'lp-compare-better' : 'lp-compare-worse';
    const diffStr = diff > 0 ? '+' + (Number.isInteger(diff) ? diff : diff.toFixed(1)) : (Number.isInteger(diff) ? diff : diff.toFixed(1));

    html += `<div class="lp-compare-row">
      <div class="lp-compare-label">${label}</div>
      <div class="lp-compare-val ${colorClass}">${typeof a === 'number' ? (Number.isInteger(a) ? fmt(a) : a) : a}${unit}</div>
      <div class="lp-compare-arrow ${colorClass}">${arrow}<br><span style="font-size:10px;">${diffStr}</span></div>
      <div class="lp-compare-val">${typeof b === 'number' ? (Number.isInteger(b) ? fmt(b) : b) : b}${unit}</div>
    </div>`;
  });
  html += '</div>';
  body.innerHTML = html;
}

// ---- View C: Keyword-Page Matching Matrix ----
function renderLPMatrix() {
  const data = LP_VERSION_DATA;
  const prodFilter = document.getElementById('lp-matrix-product').value;
  const kwMap = prodFilter === 'all' ? data.keywordPageMap : data.keywordPageMap.filter(k => k.product === prodFilter);

  const criticalKw = kwMap.filter(k => k.status === 'critical');
  const warningKw = kwMap.filter(k => k.status === 'warning');
  const optimalKw = kwMap.filter(k => k.status === 'optimal');
  const avgScore = kwMap.length ? (kwMap.reduce((s, k) => s + k.matchScore, 0) / kwMap.length).toFixed(0) : 0;
  const mismatchCount = kwMap.filter(k => k.currentPage !== k.suggestedPage).length;

  document.getElementById('lp-matrix-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">关键词总数</div><div class="kpi-value">${kwMap.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">需迁移</div><div class="kpi-value" style="color:var(--red)">${mismatchCount}</div><div class="kpi-sub" style="color:var(--red)">当前页 ≠ 建议页</div></div>
    <div class="kpi-card"><div class="kpi-label">Critical</div><div class="kpi-value" style="color:var(--red)">${criticalKw.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">平均匹配度</div><div class="kpi-value ${Number(avgScore) < 40 ? 'roas-bad' : Number(avgScore) >= 70 ? 'roas-good' : 'roas-warn'}">${avgScore}</div></div>
    <div class="kpi-card"><div class="kpi-label">已最优</div><div class="kpi-value" style="color:var(--green)">${optimalKw.length}</div></div>
  `;

  const matrixInsights = getLPMatrixInsights(kwMap);
  const matrixAI = document.getElementById('lp-matrix-ai');
  if (matrixAI) matrixAI.innerHTML = AI.panelHTML('ai-lp-matrix', matrixInsights);

  // Build matrix: rows = keywords grouped, cols = unique pages
  const allPages = new Set();
  kwMap.forEach(k => { allPages.add(k.currentPage); allPages.add(k.suggestedPage); });
  const pageCols = Array.from(allPages).sort((a, b) => a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b));

  const groups = {};
  kwMap.forEach(k => {
    const g = k.product + ' - ' + k.keywordGroup;
    if (!groups[g]) groups[g] = [];
    groups[g].push(k);
  });

  let tableHTML = '<table class="lp-matrix-table"><thead><tr><th>关键词</th>';
  pageCols.forEach(p => { tableHTML += `<th>${p === '/' ? '/ (首页)' : p}</th>`; });
  tableHTML += '<th>匹配度</th></tr></thead><tbody>';

  Object.entries(groups).forEach(([groupName, keywords]) => {
    tableHTML += `<tr><td colspan="${pageCols.length + 2}" style="background:rgba(79,70,229,0.06);color:var(--accent);font-weight:700;font-size:12px;padding:8px 12px;">${groupName}</td></tr>`;
    keywords.forEach(k => {
      tableHTML += '<tr>';
      tableHTML += `<td><strong>${k.keyword}</strong></td>`;
      pageCols.forEach(p => {
        const isCurrent = k.currentPage === p;
        const isSuggested = k.suggestedPage === p;
        if (isCurrent && isSuggested) {
          tableHTML += '<td><span class="lp-matrix-cell current">● 当前✓</span></td>';
        } else if (isCurrent && !isSuggested) {
          tableHTML += '<td><span class="lp-matrix-cell mismatch">● 需迁移</span></td>';
        } else if (isSuggested && !isCurrent) {
          tableHTML += '<td><span class="lp-matrix-cell suggested">★ 建议</span></td>';
        } else {
          tableHTML += '<td><span class="lp-matrix-cell empty">-</span></td>';
        }
      });
      const scoreClass = k.matchScore >= 70 ? 'score-high' : k.matchScore >= 40 ? 'score-mid' : 'score-low';
      tableHTML += `<td><span class="lp-match-score ${scoreClass}">${k.matchScore}</span></td>`;
      tableHTML += '</tr>';
    });
  });
  tableHTML += '</tbody></table>';
  document.getElementById('lp-matrix-table-wrap').innerHTML = tableHTML;

  // Detail table
  document.getElementById('lp-matrix-detail-tbody').innerHTML = kwMap.map(k => {
    const scoreClass = k.matchScore >= 70 ? 'score-high' : k.matchScore >= 40 ? 'score-mid' : 'score-low';
    const statusHTML = { critical: '<span class="lp-status lp-critical">需优化</span>', warning: '<span class="lp-status lp-warning">建议优化</span>', ok: '<span class="lp-status lp-ok">可优化</span>', optimal: '<span class="lp-status lp-optimal">最优</span>' }[k.status] || '';
    const pageDiff = k.currentPage !== k.suggestedPage;
    return `<tr class="${k.status === 'critical' ? 'row-critical' : k.status === 'warning' ? 'row-warning' : ''}">
      <td><strong>${k.keyword}</strong></td>
      <td><span class="kw-group-badge">${k.keywordGroup}</span></td>
      <td><span class="product-badge ${k.product.toLowerCase()}">${k.product}</span></td>
      <td style="font-size:12px;">${k.currentPage === '/' ? '/ (首页)' : k.currentPage}</td>
      <td style="font-size:12px;${pageDiff ? 'color:var(--accent);font-weight:600;' : ''}">${k.suggestedPage === '/' ? '/ (首页)' : k.suggestedPage}</td>
      <td><span class="lp-match-score ${scoreClass}">${k.matchScore}</span></td>
      <td style="color:${k.bounceRate > 65 ? 'var(--red)' : k.bounceRate > 50 ? 'var(--yellow)' : 'var(--green)'}">${k.bounceRate}%</td>
      <td style="color:${k.qs >= 8 ? 'var(--green)' : k.qs >= 6 ? 'var(--yellow)' : 'var(--red)'};font-weight:700;">${k.qs}</td>
      <td>${k.payRate}%</td>
      <td>${statusHTML}</td>
    </tr>`;
  }).join('');

  renderLPMatrixCharts(kwMap);
}

function getLPMatrixInsights(kwMap) {
  const insights = [];
  const critical = kwMap.filter(k => k.status === 'critical');
  const mismatch = kwMap.filter(k => k.currentPage !== k.suggestedPage);
  const homepageOnly = kwMap.filter(k => k.currentPage === '/');

  if (critical.length > 0) {
    insights.push({ level: 'critical', icon: '🔴',
      text: `<strong>${critical.length} 个关键词匹配严重不足</strong>：${critical.slice(0, 4).map(k => '「' + k.keyword + '」匹配度:' + k.matchScore).join('、')}，跳出率高、QS低，<span class="action">需立即创建专属落地页或迁移</span>。`
    });
  }

  if (homepageOnly.length > kwMap.length * 0.7) {
    insights.push({ level: 'warning', icon: '🟡',
      text: `<strong>${homepageOnly.length}/${kwMap.length} 个关键词指向首页</strong>：${(homepageOnly.length / kwMap.length * 100).toFixed(0)}% 的关键词共享同一首页，不同搜索意图无法被区分，<span class="action">严重拉低整体质量得分</span>。`
    });
  }

  if (mismatch.length > 0) {
    insights.push({ level: 'info', icon: '💡',
      text: `<strong>${mismatch.length} 个关键词建议迁移</strong>：当前页面与建议页面不一致，迁移后预计平均 QS 提升 2-3 分，CPC 降低 15-30%。`
    });
  }

  const optimal = kwMap.filter(k => k.status === 'optimal');
  if (optimal.length > 0) {
    insights.push({ level: 'positive', icon: '🟢',
      text: `<strong>${optimal.length} 个关键词匹配良好</strong>：${optimal.map(k => '「' + k.keyword + '」').join('、')}，当前页面匹配度高，维持即可。`
    });
  }

  return insights;
}

function renderLPMatrixCharts(kwMap) {
  destroyChart('chart-lp-scatter');
  chartInstances['chart-lp-scatter'] = new Chart(
    document.getElementById('chart-lp-scatter').getContext('2d'), {
      type: 'scatter',
      data: {
        datasets: [{
          label: '关键词',
          data: kwMap.map(k => ({ x: k.bounceRate, y: k.qs, keyword: k.keyword })),
          backgroundColor: kwMap.map(k =>
            k.status === 'critical' ? 'rgba(220,38,38,0.8)' :
            k.status === 'warning' ? 'rgba(217,119,6,0.8)' :
            k.status === 'optimal' ? 'rgba(22,163,74,0.8)' : 'rgba(37,99,235,0.8)'
          ),
          pointRadius: kwMap.map(k => 5 + (k.payRate || 0) * 3),
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const k = kwMap[ctx.dataIndex];
                return `${k.keyword} | 跳出率:${k.bounceRate}% | QS:${k.qs} | 匹配度:${k.matchScore}`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: '跳出率 (%)', color: '#8b8fa3' }, grid: { color: '#dfe1e6' }, min: 25, max: 85 },
          y: { title: { display: true, text: '质量得分 (QS)', color: '#8b8fa3' }, grid: { color: '#dfe1e6' }, min: 0, max: 11 }
        }
      }
    }
  );

  const groups = {};
  kwMap.forEach(k => {
    if (!groups[k.keywordGroup]) groups[k.keywordGroup] = { bounce: [], qs: [], pay: [], score: [], count: 0 };
    groups[k.keywordGroup].bounce.push(k.bounceRate);
    groups[k.keywordGroup].qs.push(k.qs);
    groups[k.keywordGroup].pay.push(k.payRate);
    groups[k.keywordGroup].score.push(k.matchScore);
    groups[k.keywordGroup].count++;
  });

  const groupLabels = Object.keys(groups);
  const avgBounces = groupLabels.map(g => (groups[g].bounce.reduce((a, b) => a + b, 0) / groups[g].count).toFixed(1));
  const avgQSs = groupLabels.map(g => (groups[g].qs.reduce((a, b) => a + b, 0) / groups[g].count).toFixed(1));
  const avgScores = groupLabels.map(g => (groups[g].score.reduce((a, b) => a + b, 0) / groups[g].count).toFixed(0));

  destroyChart('chart-lp-health');
  chartInstances['chart-lp-health'] = new Chart(
    document.getElementById('chart-lp-health').getContext('2d'), {
      type: 'bar',
      data: {
        labels: groupLabels,
        datasets: [
          { label: '平均跳出率(%)', data: avgBounces, backgroundColor: 'rgba(220,38,38,0.6)', borderRadius: 4, yAxisID: 'y' },
          { label: '平均QS', data: avgQSs, type: 'line', borderColor: COLORS.accent, pointRadius: 6, pointBackgroundColor: COLORS.accent, tension: 0, yAxisID: 'y1' },
          { label: '平均匹配度', data: avgScores, type: 'line', borderColor: COLORS.green, pointRadius: 6, pointBackgroundColor: COLORS.green, tension: 0, yAxisID: 'y1' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { position: 'left', beginAtZero: true, title: { display: true, text: '跳出率 %', color: '#8b8fa3' }, grid: { color: '#dfe1e6' } },
          y1: { position: 'right', beginAtZero: true, max: 100, title: { display: true, text: 'QS / 匹配度', color: '#8b8fa3' }, grid: { display: false } }
        }
      }
    }
  );
}

// ============================================================
// VIEW 8D: A/B Testing System
// ============================================================
const AB_COLORS = ['#4f46e5', '#16a34a', '#d97706', '#db2777', '#2563eb'];
let abCurrentTest = null;

document.getElementById('ab-filter-status').addEventListener('change', renderABTests);
document.getElementById('ab-filter-product').addEventListener('change', renderABTests);
document.getElementById('ab-back-btn').addEventListener('click', () => {
  document.getElementById('ab-list-view').style.display = '';
  document.getElementById('ab-detail-view').style.display = 'none';
});

function renderABTests() {
  const statusFilter = document.getElementById('ab-filter-status').value;
  const prodFilter = document.getElementById('ab-filter-product').value;

  let tests = AB_TEST_DATA.tests;
  if (statusFilter !== 'all') tests = tests.filter(t => t.status === statusFilter);
  if (prodFilter !== 'all') tests = tests.filter(t => t.product === prodFilter);

  const running = AB_TEST_DATA.tests.filter(t => t.status === 'running').length;
  const completed = AB_TEST_DATA.tests.filter(t => t.status === 'completed').length;
  const promotable = AB_TEST_DATA.tests.filter(t => t.result.canPromote).length;
  const avgConf = AB_TEST_DATA.tests.filter(t => t.status !== 'draft').length
    ? (AB_TEST_DATA.tests.filter(t => t.status !== 'draft').reduce((s, t) => s + t.result.confidence, 0) / AB_TEST_DATA.tests.filter(t => t.status !== 'draft').length).toFixed(1) : 0;

  document.getElementById('ab-list-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">测试总数</div><div class="kpi-value">${AB_TEST_DATA.tests.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">运行中</div><div class="kpi-value" style="color:var(--green)">${running}</div><div class="kpi-sub kpi-neutral">实时收集数据</div></div>
    <div class="kpi-card"><div class="kpi-label">已完成</div><div class="kpi-value" style="color:var(--accent)">${completed}</div></div>
    <div class="kpi-card"><div class="kpi-label">可推广</div><div class="kpi-value" style="color:var(--green)">${promotable}</div><div class="kpi-sub" style="color:var(--green)">显著性达标，可推广为新版本</div></div>
    <div class="kpi-card"><div class="kpi-label">平均置信度</div><div class="kpi-value">${avgConf}%</div></div>
  `;

  const abInsights = getABInsights();
  const aiEl = document.getElementById('ab-list-ai');
  if (aiEl) aiEl.innerHTML = AI.panelHTML('ai-ab-list', abInsights);

  const grid = document.getElementById('ab-test-grid');
  grid.innerHTML = tests.map((t, idx) => {
    const realIdx = AB_TEST_DATA.tests.indexOf(t);
    const statusLabel = { running: '运行中', completed: '已完成', draft: '草稿', paused: '已暂停' }[t.status];
    const winner = t.result.currentWinner ? t.variants.find(v => v.id === t.result.currentWinner) : null;
    const conf = t.result.confidence;
    const confColor = conf >= 95 ? 'var(--green)' : conf >= 80 ? 'var(--yellow)' : conf > 0 ? 'var(--red)' : 'var(--text-muted)';

    const splitHTML = t.trafficSplit.map((pct, i) => `<div class="ab-split-segment" style="width:${pct}%;background:${AB_COLORS[i]};"></div>`).join('');

    const variantTags = t.variants.map(v => {
      const isWinning = winner && v.id === winner.id;
      return `<span class="ab-card-variant-tag ${isWinning ? 'is-winning' : ''}">${isWinning ? '★ ' : ''}${v.name.length > 20 ? v.name.slice(0, 20) + '…' : v.name}</span>`;
    }).join('');

    return `
      <div class="ab-test-card st-${t.status}" onclick="openABDetail(${realIdx})">
        <div class="ab-card-top">
          <div>
            <div class="ab-card-title">${t.name}</div>
            <div class="ab-card-page">${t.domain}${t.pagePath}</div>
          </div>
          <span class="ab-status-badge st-${t.status}"><span class="ab-status-dot"></span>${statusLabel}</span>
        </div>
        <div class="ab-card-meta">
          <span class="product-badge ${t.product.toLowerCase()}">${t.product}</span>
          <span>${t.variants.length} 变体</span>
          ${t.startDate ? `<span>${t.startDate}${t.endDate ? ' → ' + t.endDate : ' 起'}${t.daysRunning > 0 ? ' (' + t.daysRunning + '天)' : ''}</span>` : '<span>未启动</span>'}
          <span>目标: ${t.targetMetric}</span>
        </div>
        <div class="ab-split-bar">${splitHTML}</div>
        <div class="ab-card-variants">${variantTags}</div>
        ${t.status !== 'draft' ? `
        <div class="ab-card-confidence">
          <div class="ab-confidence-bar-wrap">
            <div class="ab-confidence-bar-fill" style="width:${conf}%;background:${confColor};"></div>
          </div>
          <span class="ab-confidence-label" style="color:${confColor}">${conf}%</span>
        </div>` : ''}
      </div>`;
  }).join('');
}

function getABInsights() {
  const insights = [];
  const tests = AB_TEST_DATA.tests;
  const promotable = tests.filter(t => t.result.canPromote);
  const running = tests.filter(t => t.status === 'running');

  if (promotable.length > 0) {
    promotable.forEach(t => {
      const winner = t.variants.find(v => v.id === t.result.currentWinner);
      insights.push({ level: 'positive', icon: '🟢',
        text: `<strong>测试 "${t.name}" 可推广</strong>：${winner ? '「' + winner.name + '」' : ''} 胜出，置信度 <span class="metric">${t.result.confidence}%</span>。核心指标提升：${Object.entries(t.result.improvement).map(([k, v]) => k + ' ' + v).join('、')}。<span class="action">建议立即推广为新版本</span>。`
      });
    });
  }

  running.forEach(t => {
    if (t.result.confidence >= 80 && t.result.confidence < 95) {
      insights.push({ level: 'info', icon: '💡',
        text: `<strong>"${t.name}" 接近达标</strong>：当前置信度 ${t.result.confidence}%，距 95% 目标仅差 ${(95 - t.result.confidence).toFixed(1)}%。预计继续运行 3-5 天可达标。`
      });
    }
  });

  const paused = tests.filter(t => t.status === 'paused');
  if (paused.length > 0) {
    insights.push({ level: 'warning', icon: '🟡',
      text: `<strong>${paused.length} 个测试已暂停</strong>：${paused.map(t => '「' + t.name + '」').join('、')}。建议评估是否需要重启或归档。`
    });
  }

  const draft = tests.filter(t => t.status === 'draft');
  if (draft.length > 0) {
    insights.push({ level: 'info', icon: '📋',
      text: `<strong>${draft.length} 个测试待启动</strong>：${draft.map(t => '「' + t.name + '」').join('、')}。确认变体配置后即可开始收集数据。`
    });
  }

  return insights;
}

// A/B Detail View
function openABDetail(testIdx) {
  abCurrentTest = testIdx;
  document.getElementById('ab-list-view').style.display = 'none';
  document.getElementById('ab-detail-view').style.display = '';
  renderABDetail();
}

function renderABDetail() {
  if (abCurrentTest === null) return;
  const t = AB_TEST_DATA.tests[abCurrentTest];
  const winner = t.result.currentWinner ? t.variants.find(v => v.id === t.result.currentWinner) : null;
  const control = t.variants.find(v => v.isControl);
  const statusLabel = { running: '运行中', completed: '已完成', draft: '草稿', paused: '已暂停' }[t.status];

  // Header
  document.getElementById('ab-detail-header').innerHTML = `
    <div class="ab-detail-header-wrap">
      <h2>${t.name}</h2>
      <div class="ab-detail-meta">
        <span class="ab-status-badge st-${t.status}"><span class="ab-status-dot"></span>${statusLabel}</span>
        <span class="product-badge ${t.product.toLowerCase()}">${t.product}</span>
        <span style="color:var(--accent)">${t.domain}${t.pagePath}</span>
        <span>版本 ${t.pageVersionId}</span>
        ${t.startDate ? `<span>${t.startDate}${t.endDate ? ' → ' + t.endDate : ' → 进行中'}</span>` : ''}
        ${t.daysRunning > 0 ? `<span>${t.daysRunning} 天</span>` : ''}
        <span>目标指标: <strong>${t.targetMetric}</strong></span>
      </div>
    </div>`;

  // Traffic Split
  const splitSegments = t.variants.map((v, i) => `<div class="ab-split-segment-lg" style="width:${t.trafficSplit[i]}%;background:${AB_COLORS[i]};">${t.trafficSplit[i]}%</div>`).join('');
  const splitLegend = t.variants.map((v, i) => `<span class="ab-split-legend-item"><span class="ab-split-legend-dot" style="background:${AB_COLORS[i]}"></span>${v.name}</span>`).join('');
  document.getElementById('ab-traffic-split').innerHTML = `
    <div class="ab-traffic-detail">
      <div class="ab-traffic-label">流量分配</div>
      <div class="ab-split-bar-lg">${splitSegments}</div>
      <div class="ab-split-legend">${splitLegend}</div>
    </div>`;

  // KPIs
  if (control && control.metrics) {
    const totalVisitors = t.variants.reduce((s, v) => s + (v.metrics ? v.metrics.visitors : 0), 0);
    const totalConv = t.variants.reduce((s, v) => s + (v.metrics ? v.metrics.conversions : 0), 0);
    const totalCost = t.variants.reduce((s, v) => s + (v.metrics ? v.metrics.cost : 0), 0);
    document.getElementById('ab-detail-kpis').innerHTML = `
      <div class="kpi-card"><div class="kpi-label">总访客</div><div class="kpi-value">${fmt(totalVisitors)}</div><div class="kpi-sub kpi-neutral">最小样本 ${fmt(t.minSampleSize)}</div></div>
      <div class="kpi-card"><div class="kpi-label">总转化</div><div class="kpi-value">${fmt(totalConv)}</div></div>
      <div class="kpi-card"><div class="kpi-label">总花费</div><div class="kpi-value">${fmt(totalCost)} <span style="font-size:12px;">HKD</span></div></div>
      <div class="kpi-card"><div class="kpi-label">测试天数</div><div class="kpi-value">${t.daysRunning}</div></div>
    `;
  } else {
    document.getElementById('ab-detail-kpis').innerHTML = '<div class="kpi-card" style="grid-column:1/-1;text-align:center;color:var(--text-muted);">测试尚未启动，暂无数据</div>';
  }

  // Variant Compare
  const gridClass = t.variants.length === 3 ? 'cols-3' : 'cols-2';
  const metricKeys = [
    { key: 'visitors', label: '访客', unit: '' },
    { key: 'bounceRate', label: '跳出率', unit: '%', lowerBetter: true },
    { key: 'avgDuration', label: '停留(s)', unit: '' },
    { key: 'registerRate', label: '注册率', unit: '%' },
    { key: 'payRate', label: '付费率', unit: '%' },
    { key: 'conversions', label: '转化', unit: '' },
    { key: 'cpa', label: 'CPA', unit: '', lowerBetter: true },
    { key: 'roas', label: 'ROAS', unit: '' },
  ];

  const variantCards = t.variants.map((v, i) => {
    const isWinner = winner && v.id === winner.id;
    const cardClass = v.isControl ? 'is-control' : isWinner ? 'is-winner' : '';
    const badge = v.isControl ? '<span class="ab-variant-badge control-badge">对照组</span>'
      : isWinner ? (t.status === 'completed' ? '<span class="ab-variant-badge winner-badge">★ 胜出</span>' : '<span class="ab-variant-badge leading-badge">领先中</span>')
      : '';

    const elementsHTML = Object.entries(v.elements).map(([k, val]) => {
      const el = AB_TEST_DATA.testableElements.find(e => e.id === k);
      const label = el ? el.name : k;
      const isColor = k.includes('COLOR');
      return `<div class="ab-element-row"><span class="ab-element-key">${label}</span><span class="ab-element-val">${val}${isColor ? ` <span class="ab-element-color" style="background:${val}"></span>` : ''}</span></div>`;
    }).join('');

    let metricsHTML = '';
    if (v.metrics) {
      metricsHTML = metricKeys.map(mk => {
        const val = v.metrics[mk.key];
        let delta = '';
        if (!v.isControl && control && control.metrics) {
          const cv = control.metrics[mk.key];
          if (cv && val) {
            const diff = ((val - cv) / cv * 100);
            const isBetter = mk.lowerBetter ? diff < 0 : diff > 0;
            if (Math.abs(diff) > 0.1) {
              delta = `<div class="delta ${isBetter ? 'positive' : 'negative'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</div>`;
            }
          }
        }
        return `<div class="ab-metric-cell">
          <div class="label">${mk.label}</div>
          <div class="value">${val != null ? (Number.isInteger(val) ? fmt(val) : val) : '--'}${mk.unit}</div>
          ${delta}
        </div>`;
      }).join('');
    } else {
      metricsHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px;font-size:12px;">等待数据</div>';
    }

    return `
      <div class="ab-variant-card ${cardClass}" style="border-top:3px solid ${AB_COLORS[i]};">
        <div class="ab-variant-header">
          <span class="ab-variant-name" style="color:${AB_COLORS[i]}">${v.name}</span>
          ${badge}
        </div>
        <div class="ab-variant-elements">${elementsHTML}</div>
        <div class="ab-variant-metrics">${metricsHTML}</div>
      </div>`;
  }).join('');

  document.getElementById('ab-variants-compare').innerHTML = `<div class="ab-variants-grid ${gridClass}">${variantCards}</div>`;

  // Significance
  const conf = t.result.confidence;
  const confColor = conf >= 95 ? 'var(--green)' : conf >= 80 ? 'var(--yellow)' : conf > 0 ? 'var(--orange)' : 'var(--text-muted)';
  const targetPct = t.confidenceTarget;
  const sigHTML = t.status === 'draft'
    ? '<div style="padding:16px;text-align:center;color:var(--text-muted);">测试尚未启动</div>'
    : `<div class="ab-sig-wrap">
      <div class="ab-sig-bar-outer">
        <div class="ab-sig-bar-fill" style="width:${Math.min(conf, 100)}%;background:${confColor};">${conf}%</div>
        <div class="ab-sig-target-line" style="left:${targetPct}%;"><span class="ab-sig-target-label">${targetPct}% 目标</span></div>
      </div>
      <div class="ab-sig-info">
        <span>当前置信度: <strong style="color:${confColor}">${conf}%</strong></span>
        <span>${conf >= targetPct ? '<span style="color:var(--green);font-weight:700;">✓ 已达标</span>' : `距目标还差 ${(targetPct - conf).toFixed(1)}%`}</span>
        ${t.result.improvement && Object.keys(t.result.improvement).length ? `<span>核心指标提升: ${Object.entries(t.result.improvement).map(([k, v]) => `<strong>${k}</strong> ${v}`).join(' | ')}</span>` : ''}
      </div>
    </div>`;
  document.getElementById('ab-significance').innerHTML = sigHTML;

  // Daily Chart
  renderABDailyChart(t);

  // AI insights for this test
  const testInsights = [];
  if (t.result.recommendation) {
    testInsights.push({ level: t.result.canPromote ? 'positive' : t.status === 'paused' ? 'warning' : 'info', icon: t.result.canPromote ? '🟢' : '💡', text: `<strong>AI 分析</strong>：${t.result.recommendation}` });
  }
  if (winner && !winner.isControl && control && control.metrics && winner.metrics) {
    const roasDelta = ((winner.metrics.roas - control.metrics.roas) / control.metrics.roas * 100).toFixed(1);
    if (roasDelta > 10) {
      testInsights.push({ level: 'positive', icon: '📈', text: `<strong>ROAS 提升显著</strong>：${winner.name} ROAS ${winner.metrics.roas} vs 对照组 ${control.metrics.roas}，提升 <span class="metric">${roasDelta}%</span>。如推广为正式版本，预计月节省花费可观。` });
    }
  }
  const aiEl = document.getElementById('ab-detail-ai');
  if (aiEl) aiEl.innerHTML = testInsights.length ? AI.panelHTML('ai-ab-detail', testInsights) : '';

  // Promote section
  const promoteEl = document.getElementById('ab-promote-section');
  if (t.result.canPromote && winner) {
    promoteEl.innerHTML = `
      <div class="ab-promote-card">
        <h3>推广为落地页新版本</h3>
        <p>测试 "${t.name}" 已达到 ${t.result.confidence}% 统计显著性。胜出变体「${winner.name}」在核心指标上全面优于对照组。
           点击下方按钮将胜出方案推广为 <strong>${t.domain}${t.pagePath}</strong> 的新版本，替换当前 ${t.pageVersionId}。</p>
        <button class="ab-promote-btn" onclick="promoteABWinner(${abCurrentTest})">推广为新版本</button>
      </div>`;
  } else if (t.status === 'completed' && !t.result.canPromote) {
    promoteEl.innerHTML = `<div class="ab-promote-card" style="border-color:var(--yellow);background:linear-gradient(135deg,rgba(217,119,6,0.05),rgba(79,70,229,0.05));">
      <h3 style="color:var(--yellow);">测试已完成但未推广</h3>
      <p>该测试差异不显著或未达到推广条件。</p>
    </div>`;
  } else {
    promoteEl.innerHTML = '';
  }
}

function renderABDailyChart(t) {
  const hasData = t.variants.some(v => v.dailyData && v.dailyData.length > 0);
  if (!hasData) return;

  const labels = t.variants[0].dailyData.map(d => d.date);
  const metric = t.targetMetric;
  const datasets = t.variants.map((v, i) => ({
    label: v.name,
    data: v.dailyData.map(d => d[metric]),
    borderColor: AB_COLORS[i],
    backgroundColor: AB_COLORS[i] + '20',
    pointRadius: 4,
    pointBackgroundColor: AB_COLORS[i],
    tension: 0.3,
    fill: false,
    borderWidth: v.isControl ? 2 : 3,
    borderDash: v.isControl ? [5, 3] : [],
  }));

  destroyChart('chart-ab-daily');
  chartInstances['chart-ab-daily'] = new Chart(
    document.getElementById('chart-ab-daily').getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#5a5e72' } },
          title: { display: true, text: `每日 ${metric} 趋势`, color: '#8b8fa3', font: { size: 13 } }
        },
        scales: {
          x: { ticks: { color: '#8b8fa3' }, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { ticks: { color: '#8b8fa3' }, grid: { color: 'rgba(0,0,0,0.06)' }, beginAtZero: false }
        }
      }
    }
  );
}

function promoteABWinner(testIdx) {
  const t = AB_TEST_DATA.tests[testIdx];
  const winner = t.variants.find(v => v.id === t.result.currentWinner);
  if (!winner) return;

  const site = LP_VERSION_DATA.sites.find(s => s.domain === t.domain);
  if (!site) return;
  const page = site.pages.find(p => p.path === t.pagePath);
  if (!page) return;

  const currentVer = page.versions.find(v => v.isActive);
  const newVerNum = currentVer ? 'v' + (parseFloat(currentVer.versionId.replace('v', '')) + 0.1).toFixed(1) : 'v1.0';
  const elemDesc = Object.entries(winner.elements).map(([k, v]) => `${k}: ${v}`).join('; ');

  if (currentVer) currentVer.isActive = false;
  const newVersion = {
    versionId: newVerNum,
    name: `A/B胜出 - ${winner.name}`,
    deployDate: new Date().toISOString().split('T')[0],
    endDate: null,
    isActive: true,
    changelog: `从A/B测试「${t.name}」推广。胜出变体: ${winner.name}。元素变更: ${elemDesc}。置信度: ${t.result.confidence}%`,
    metrics: winner.metrics ? { ...winner.metrics, qualityScore: currentVer ? currentVer.metrics.qualityScore : 7, landingPageExp: '平均', pageLoadSpeed: currentVer ? currentVer.metrics.pageLoadSpeed : 2.0 } : (currentVer ? { ...currentVer.metrics } : {})
  };
  if (currentVer) currentVer.endDate = new Date().toISOString().split('T')[0];
  page.versions.unshift(newVersion);
  page.healthStatus = 'ok';
  t.result.canPromote = false;
  t.result.promotedAsVersion = newVerNum;

  renderABDetail();

  const btn = document.querySelector('.ab-promote-btn');
  if (btn) {
    btn.textContent = `✓ 已推广为 ${newVerNum}`;
    btn.disabled = true;
  }
}

// ============================================================
// A/B Test Creation System
// ============================================================
const abForm = {
  selectedElements: [],
  variants: [],
  step: 1,

  init() {
    document.getElementById('ab-create-btn').addEventListener('click', () => this.open());
    document.getElementById('ab-create-back').addEventListener('click', () => this.close());

    const prodSel = document.getElementById('abc-product');
    LP_VERSION_DATA.sites.forEach(s => {
      prodSel.innerHTML += `<option value="${s.productShort}">${s.product}</option>`;
    });
    prodSel.addEventListener('change', () => this.onProductChange());

    document.getElementById('abc-add-variant').addEventListener('click', () => this.addVariant());
  },

  open() {
    document.getElementById('ab-list-view').style.display = 'none';
    document.getElementById('ab-detail-view').style.display = 'none';
    document.getElementById('ab-create-view').style.display = '';
    this.reset();
  },

  close() {
    document.getElementById('ab-create-view').style.display = 'none';
    document.getElementById('ab-list-view').style.display = '';
    renderABTests();
  },

  reset() {
    this.step = 1;
    this.selectedElements = [];
    this.variants = [
      { id: 'control', name: '对照组 (当前版本)', isControl: true, elements: {} },
      { id: 'variant-a', name: '变体A', isControl: false, elements: {} }
    ];
    document.getElementById('abc-name').value = '';
    document.getElementById('abc-product').value = '';
    document.getElementById('abc-page').innerHTML = '<option value="">请先选择产品</option>';
    document.getElementById('abc-version-info').textContent = '--';
    document.getElementById('abc-min-sample').value = '1000';
    document.getElementById('abc-target-metric').value = 'payRate';
    document.getElementById('abc-confidence').value = '95';
    this.goToStep(1);
    this.renderElementPicker();
    this.renderVariants();
  },

  onProductChange() {
    const prod = document.getElementById('abc-product').value;
    const pageSel = document.getElementById('abc-page');
    pageSel.innerHTML = '<option value="">请选择落地页</option>';
    document.getElementById('abc-version-info').textContent = '--';

    if (!prod) return;
    const site = LP_VERSION_DATA.sites.find(s => s.productShort === prod);
    if (!site) return;

    site.pages.forEach(p => {
      const activeVer = p.versions.find(v => v.isActive);
      const label = `${site.domain}${p.path} (${p.name})${activeVer ? ' - ' + activeVer.versionId : ' - 未上线'}`;
      pageSel.innerHTML += `<option value="${p.path}" data-domain="${site.domain}">${label}</option>`;
    });

    pageSel.onchange = () => {
      const path = pageSel.value;
      if (!path) { document.getElementById('abc-version-info').textContent = '--'; return; }
      const page = site.pages.find(pg => pg.path === path);
      const v = page ? page.versions.find(vv => vv.isActive) : null;
      document.getElementById('abc-version-info').textContent = v
        ? `${v.versionId} - ${v.name} (${v.deployDate})`
        : '该页面尚未上线，将基于新页面测试';

      this.variants[0].name = v ? `对照组 (${v.versionId} 当前版本)` : '对照组 (当前)';
      this.renderVariants();
    };
  },

  renderElementPicker() {
    const picker = document.getElementById('abc-element-picker');
    picker.innerHTML = AB_TEST_DATA.testableElements.map(el =>
      `<div class="ab-el-chip ${this.selectedElements.includes(el.id) ? 'selected' : ''}" data-elid="${el.id}" onclick="abForm.toggleElement('${el.id}')">${el.name}</div>`
    ).join('');
  },

  toggleElement(elId) {
    const idx = this.selectedElements.indexOf(elId);
    if (idx >= 0) this.selectedElements.splice(idx, 1);
    else this.selectedElements.push(elId);
    this.renderElementPicker();
    this.renderVariants();
  },

  addVariant() {
    const num = this.variants.length;
    const letters = 'ABCDEFGH';
    this.variants.push({
      id: `variant-${letters[num - 1].toLowerCase()}`,
      name: `变体${letters[num - 1]}`,
      isControl: false,
      elements: {}
    });
    this.renderVariants();
  },

  removeVariant(idx) {
    if (this.variants.length <= 2) return;
    this.variants.splice(idx, 1);
    this.renderVariants();
  },

  renderVariants() {
    const container = document.getElementById('abc-variants-editor');
    const elDefs = AB_TEST_DATA.testableElements;

    container.innerHTML = this.variants.map((v, vi) => {
      const fields = this.selectedElements.map(elId => {
        const def = elDefs.find(e => e.id === elId);
        const val = v.elements[elId] || '';
        const inputType = def && def.type === 'color' ? 'color' : 'text';
        const placeholder = v.isControl ? '当前版本值 (自动获取)' : `输入${def ? def.name : elId}`;
        return `<div class="ab-field-row">
          <label class="ab-field-label">${def ? def.name : elId}</label>
          <input type="${inputType}" class="ab-input" value="${val}" placeholder="${placeholder}"
            onchange="abForm.variants[${vi}].elements['${elId}']=this.value"
            ${inputType === 'color' ? 'style="height:38px;padding:4px 8px;"' : ''}>
        </div>`;
      }).join('');

      const noElements = this.selectedElements.length === 0
        ? '<div style="color:var(--text-muted);font-size:12px;padding:8px 0;">请先在上方选择要测试的元素类型</div>' : '';

      return `<div class="ab-variant-editor ${v.isControl ? 'is-control' : ''}">
        <div class="ab-variant-editor-header">
          <h4>
            <span style="color:${AB_COLORS[vi]};">●</span>
            <input type="text" class="ab-input" value="${v.name}" style="border:none;background:transparent;padding:0;font-size:14px;font-weight:700;color:var(--text-primary);width:auto;"
              onchange="abForm.variants[${vi}].name=this.value">
            ${v.isControl ? '<span class="ab-variant-badge control-badge">对照组</span>' : ''}
          </h4>
          ${!v.isControl && this.variants.length > 2 ? `<button class="ab-variant-remove" onclick="abForm.removeVariant(${vi})" title="删除变体">&times;</button>` : ''}
        </div>
        <div class="ab-variant-fields">${fields}</div>
        ${noElements}
      </div>`;
    }).join('');
  },

  renderTrafficEditor() {
    const editor = document.getElementById('abc-traffic-editor');
    const equal = Math.floor(100 / this.variants.length);
    const remainder = 100 - equal * this.variants.length;

    if (!this.variants._splits) {
      this.variants._splits = this.variants.map((_, i) => i === 0 ? equal + remainder : equal);
    }
    while (this.variants._splits.length < this.variants.length) {
      this.variants._splits.push(equal);
    }

    const rebalance = () => {
      const total = this.variants._splits.reduce((a, b) => a + b, 0);
      if (total !== 100) this.variants._splits[0] += 100 - total;
      this.updateTrafficPreview();
    };

    editor.innerHTML = this.variants.map((v, i) => `
      <div class="ab-traffic-row">
        <span class="ab-traffic-name"><span style="color:${AB_COLORS[i]};">●</span> ${v.name}</span>
        <input type="range" class="ab-traffic-slider" min="5" max="90" value="${this.variants._splits[i]}"
          oninput="abForm.variants._splits[${i}]=+this.value; document.getElementById('ab-tpct-${i}').textContent=this.value+'%'; abForm.updateTrafficPreview();">
        <span class="ab-traffic-pct" id="ab-tpct-${i}">${this.variants._splits[i]}%</span>
      </div>
    `).join('');

    this.updateTrafficPreview();
  },

  updateTrafficPreview() {
    const preview = document.getElementById('abc-traffic-preview');
    if (!preview) return;
    const splits = this.variants._splits || this.variants.map(() => Math.floor(100 / this.variants.length));
    preview.innerHTML = splits.map((pct, i) =>
      `<div class="ab-split-segment-lg" style="width:${pct}%;background:${AB_COLORS[i]};">${pct}%</div>`
    ).join('');
  },

  renderPreview() {
    const name = document.getElementById('abc-name').value || '(未命名)';
    const prod = document.getElementById('abc-product').value || '--';
    const pageSel = document.getElementById('abc-page');
    const page = pageSel.value || '--';
    const domain = pageSel.selectedOptions[0]?.dataset?.domain || '';
    const metric = document.getElementById('abc-target-metric').value;
    const conf = document.getElementById('abc-confidence').value;
    const sample = document.getElementById('abc-min-sample').value;
    const splits = this.variants._splits || this.variants.map(() => Math.floor(100 / this.variants.length));

    const variantsHTML = this.variants.map((v, i) => {
      const elemRows = this.selectedElements.map(elId => {
        const def = AB_TEST_DATA.testableElements.find(e => e.id === elId);
        const val = v.elements[elId] || (v.isControl ? '(当前值)' : '(未设置)');
        const isColor = def && def.type === 'color';
        return `<div class="ab-preview-row"><span class="key">${def ? def.name : elId}</span><span class="val">${val}${isColor && val.startsWith('#') ? ` <span class="ab-element-color" style="background:${val}"></span>` : ''}</span></div>`;
      }).join('');
      return `<div class="ab-preview-variant ${v.isControl ? 'control-preview' : ''}" style="border-left-color:${AB_COLORS[i]};">
        <h5>${v.name} — 流量 ${splits[i]}%</h5>
        ${elemRows || '<div style="color:var(--text-muted);font-size:12px;">未配置元素</div>'}
      </div>`;
    }).join('');

    document.getElementById('abc-preview').innerHTML = `
      <div class="ab-preview-section">
        <h4>基础信息</h4>
        <div class="ab-preview-row"><span class="key">测试名称</span><span class="val">${name}</span></div>
        <div class="ab-preview-row"><span class="key">产品</span><span class="val">${prod}</span></div>
        <div class="ab-preview-row"><span class="key">落地页</span><span class="val">${domain}${page}</span></div>
        <div class="ab-preview-row"><span class="key">目标指标</span><span class="val">${metric}</span></div>
        <div class="ab-preview-row"><span class="key">置信度目标</span><span class="val">${conf}%</span></div>
        <div class="ab-preview-row"><span class="key">最小样本量</span><span class="val">${sample} / 变体</span></div>
      </div>
      <div class="ab-preview-section">
        <h4>变体配置 (${this.variants.length} 个)</h4>
        <div class="ab-preview-variants">${variantsHTML}</div>
      </div>
      <div class="ab-preview-section">
        <h4>流量分配</h4>
        <div class="ab-split-bar-lg">${splits.map((pct, i) =>
          `<div class="ab-split-segment-lg" style="width:${pct}%;background:${AB_COLORS[i]};">${this.variants[i].name.slice(0, 8)} ${pct}%</div>`
        ).join('')}</div>
      </div>`;
  },

  goToStep(n) {
    this.step = n;
    document.querySelectorAll('.ab-form-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`ab-step-${n}`).classList.add('active');

    document.querySelectorAll('.ab-step').forEach(el => {
      const s = +el.dataset.step;
      el.classList.remove('active', 'done');
      if (s === n) el.classList.add('active');
      else if (s < n) el.classList.add('done');
    });

    if (n === 3) this.renderTrafficEditor();
    if (n === 4) this.renderPreview();
  },

  validate(step) {
    if (step >= 2) {
      if (!document.getElementById('abc-name').value.trim()) { alert('请输入测试名称'); return false; }
      if (!document.getElementById('abc-product').value) { alert('请选择产品'); return false; }
      if (!document.getElementById('abc-page').value) { alert('请选择落地页'); return false; }
    }
    if (step >= 3 && this.selectedElements.length === 0) {
      alert('请至少选择一个测试元素'); return false;
    }
    return true;
  }
};

function abFormNext(step) {
  if (!abForm.validate(step)) return;
  abForm.goToStep(step);
}

function abSaveTest(status) {
  const name = document.getElementById('abc-name').value.trim();
  const prod = document.getElementById('abc-product').value;
  const pageSel = document.getElementById('abc-page');
  const pagePath = pageSel.value;
  const domain = pageSel.selectedOptions[0]?.dataset?.domain || '';

  if (!name || !prod || !pagePath) { alert('请填写完整基础信息'); return; }

  const site = LP_VERSION_DATA.sites.find(s => s.productShort === prod);
  const page = site ? site.pages.find(p => p.path === pagePath) : null;
  const activeVer = page ? page.versions.find(v => v.isActive) : null;

  const splits = abForm.variants._splits || abForm.variants.map(() => Math.floor(100 / abForm.variants.length));
  const today = new Date().toISOString().split('T')[0];

  const newTest = {
    testId: 'ab-' + String(AB_TEST_DATA.tests.length + 1).padStart(3, '0'),
    name,
    product: prod,
    domain,
    pagePath,
    pageVersionId: activeVer ? activeVer.versionId : '--',
    status,
    startDate: status === 'running' ? today : null,
    endDate: null,
    daysRunning: 0,
    trafficSplit: splits.slice(0, abForm.variants.length),
    targetMetric: document.getElementById('abc-target-metric').value,
    secondaryMetrics: [],
    minSampleSize: +document.getElementById('abc-min-sample').value || 1000,
    confidenceTarget: +document.getElementById('abc-confidence').value || 95,
    variants: abForm.variants.map(v => ({
      id: v.id,
      name: v.name,
      isControl: v.isControl,
      elements: { ...v.elements },
      metrics: null,
      dailyData: []
    })),
    result: {
      currentWinner: null,
      confidence: 0,
      improvement: {},
      recommendation: status === 'draft' ? '草稿状态，测试尚未启动。' : '测试刚启动，等待数据积累。',
      canPromote: false
    }
  };

  AB_TEST_DATA.tests.push(newTest);
  abForm.close();
}

abForm.init();

// ============================================================
// VIEW 6: Alerts
// ============================================================
function renderAlerts(severity = 'all') {
  const list = document.getElementById('alerts-list');
  const allInsights = AI.collectAll();
  const filtered = severity === 'all' ? allInsights : allInsights.filter(a => a.level === severity);

  const severityMap = {
    critical: { icon: '🔴', label: '紧急', cssClass: 'high' },
    warning: { icon: '🟡', label: '优化', cssClass: 'medium' },
    info: { icon: '💡', label: '建议', cssClass: 'medium' },
    positive: { icon: '🟢', label: '亮点', cssClass: 'low' },
  };

  const countByLevel = {};
  allInsights.forEach(a => { countByLevel[a.level] = (countByLevel[a.level] || 0) + 1; });

  const summaryHTML = `<div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;">
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 20px;flex:1;min-width:120px;">
      <div style="font-size:11px;color:var(--text-secondary);">总建议数</div>
      <div style="font-size:24px;font-weight:700;margin-top:4px;">${allInsights.length}</div>
    </div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 20px;flex:1;min-width:120px;">
      <div style="font-size:11px;color:var(--red);">🔴 紧急</div>
      <div style="font-size:24px;font-weight:700;color:var(--red);margin-top:4px;">${countByLevel.critical || 0}</div>
    </div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 20px;flex:1;min-width:120px;">
      <div style="font-size:11px;color:var(--yellow);">🟡 优化</div>
      <div style="font-size:24px;font-weight:700;color:var(--yellow);margin-top:4px;">${countByLevel.warning || 0}</div>
    </div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 20px;flex:1;min-width:120px;">
      <div style="font-size:11px;color:var(--blue);">💡 建议</div>
      <div style="font-size:24px;font-weight:700;color:var(--blue);margin-top:4px;">${countByLevel.info || 0}</div>
    </div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 20px;flex:1;min-width:120px;">
      <div style="font-size:11px;color:var(--green);">🟢 亮点</div>
      <div style="font-size:24px;font-weight:700;color:var(--green);margin-top:4px;">${countByLevel.positive || 0}</div>
    </div>
  </div>`;

  list.innerHTML = summaryHTML + filtered.map(a => {
    const s = severityMap[a.level] || severityMap.info;
    return `<div class="alert-card ${s.cssClass}">
      <div class="alert-icon">${s.icon}</div>
      <div class="alert-body">
        <div class="alert-title" style="font-size:11px;color:var(--accent);margin-bottom:4px;">${a.source}</div>
        <div class="alert-message" style="font-size:13px;line-height:1.6;">${a.text}</div>
      </div>
    </div>`;
  }).join('');
}

document.querySelectorAll('.alert-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.alert-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAlerts(btn.dataset.severity);
  });
});

// ============================================================
// VIEW 10: Keyword Expansion (关键词拓展分析)
// ============================================================
document.getElementById('kw-expand-product')?.addEventListener('change', renderKeywordExpansion);
document.getElementById('kw-suggest-category')?.addEventListener('change', renderKeywordExpansion);
document.getElementById('kw-suggest-market')?.addEventListener('change', renderKeywordExpansion);

function getAllKeywords() {
  const kwSets = [
    { key: 'pu-in-comp', label: 'Pu-IN-竞品词', product: 'pu', data: typeof ADW_PU_IN_COMP_KEYWORDS !== 'undefined' ? ADW_PU_IN_COMP_KEYWORDS : [] },
    { key: 'pu-in-brand', label: 'Pu-IN-品牌词', product: 'pu', data: typeof ADW_PU_IN_BRAND_KEYWORDS !== 'undefined' ? ADW_PU_IN_BRAND_KEYWORDS : [] },
    { key: 'pu-in-emerald', label: 'Pu-IN-emeraldchat', product: 'pu', data: typeof ADW_PU_IN_EMERALD_KEYWORDS !== 'undefined' ? ADW_PU_IN_EMERALD_KEYWORDS : [] },
    { key: 'ft-in-func', label: 'Ft-IN-功能词', product: 'ft', data: typeof ADW_FT_IN_FUNC_KEYWORDS !== 'undefined' ? ADW_FT_IN_FUNC_KEYWORDS : [] },
    { key: 'ppt-uk', label: 'Ppt-UK', product: 'ppt', data: typeof ADW_PPT_UK_KEYWORDS !== 'undefined' ? ADW_PPT_UK_KEYWORDS : [] },
    { key: 'ppt-us', label: 'Ppt-US', product: 'ppt', data: typeof ADW_PPT_US_KEYWORDS !== 'undefined' ? ADW_PPT_US_KEYWORDS : [] },
  ];
  return kwSets;
}

function getAllSearchTerms() {
  const stSets = [
    { key: 'pu-in-comp', label: 'Pu-IN-竞品词', product: 'pu', market: 'IN', data: typeof ADW_PU_IN_COMP_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_COMP_SEARCH_TERMS : [] },
    { key: 'pu-in-brand', label: 'Pu-IN-品牌词', product: 'pu', market: 'IN', data: typeof ADW_PU_IN_BRAND_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_BRAND_SEARCH_TERMS : [] },
    { key: 'pu-in-emerald', label: 'Pu-IN-emeraldchat', product: 'pu', market: 'IN', data: typeof ADW_PU_IN_EMERALD_SEARCH_TERMS !== 'undefined' ? ADW_PU_IN_EMERALD_SEARCH_TERMS : [] },
    { key: 'ft-in-func', label: 'Ft-IN-功能词', product: 'ft', market: 'IN', data: typeof ADW_FT_IN_FUNC_SEARCH_TERMS !== 'undefined' ? ADW_FT_IN_FUNC_SEARCH_TERMS : [] },
    { key: 'ppt-uk', label: 'Ppt-UK', product: 'ppt', market: 'UK', data: typeof ADW_PPT_UK_SEARCH_TERMS !== 'undefined' ? ADW_PPT_UK_SEARCH_TERMS : [] },
    { key: 'ppt-us', label: 'Ppt-US', product: 'ppt', market: 'US', data: typeof ADW_PPT_US_SEARCH_TERMS !== 'undefined' ? ADW_PPT_US_SEARCH_TERMS : [] },
    { key: 'ppt-us-pmax', label: 'Ppt-US-PMax', product: 'ppt', market: 'US', data: typeof ADW_PPT_US_PMAX_SEARCH_TERMS !== 'undefined' ? ADW_PPT_US_PMAX_SEARCH_TERMS : [] },
  ];
  return stSets;
}

function buildKeywordSet(kwSets) {
  const kwSet = new Set();
  kwSets.forEach(s => s.data.forEach(k => kwSet.add(k.keyword.toLowerCase().replace(/"/g, '').trim())));
  return kwSet;
}

function findUncapturedTerms(productFilter) {
  const kwSets = getAllKeywords();
  const stSets = getAllSearchTerms();

  const filteredKW = productFilter === 'all' ? kwSets : kwSets.filter(s => s.product === productFilter);
  const filteredST = productFilter === 'all' ? stSets : stSets.filter(s => s.product === productFilter);

  const kwSet = buildKeywordSet(filteredKW);

  const uncaptured = [];
  const negCandidates = [];

  filteredST.forEach(stGroup => {
    stGroup.data.forEach(st => {
      const termLower = st.term.toLowerCase().trim();
      const isKeyword = kwSet.has(termLower);

      if (!isKeyword && st.purchaseNew > 0) {
        uncaptured.push({ ...st, source: stGroup.label, market: stGroup.market });
      }

      if (st.purchaseNew === 0 && ((st.cost && st.cost > 100) || (st.pageView && st.pageView > 500))) {
        negCandidates.push({ ...st, source: stGroup.label, market: stGroup.market });
      }
    });
  });

  uncaptured.sort((a, b) => b.purchaseNew - a.purchaseNew);
  negCandidates.sort((a, b) => (b.cost || b.pageView || 0) - (a.cost || a.pageView || 0));

  return { uncaptured, negCandidates, kwSet };
}

const SUGGESTED_KEYWORDS = [
  { keyword: 'random video chat with strangers', category: 'scene', markets: ['US','UK','IN'], products: ['pu','ppt','ft'], competition: '中', volume: '高', reason: '核心场景描述，搜索量大，比"video chat"更精准' },
  { keyword: 'talk to strangers online free', category: 'scene', markets: ['US','UK'], products: ['pu','ppt'], competition: '中', volume: '高', reason: '免费诉求明确，转化意图强' },
  { keyword: 'random video chat no sign up', category: 'scene', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '中', reason: '免注册需求，降低用户决策门槛' },
  { keyword: 'video chat with strangers online', category: 'scene', markets: ['US','UK','IN'], products: ['pu','ppt','ft'], competition: '中', volume: '高', reason: '在线视频聊天场景词，流量大' },
  { keyword: 'free random video call app', category: 'scene', markets: ['IN'], products: ['pu','ft'], competition: '低', volume: '中', reason: '印度市场免费诉求强，app 意图明确' },
  { keyword: 'online video chat rooms', category: 'scene', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '中', reason: '聊天室场景，用户粘性高' },
  { keyword: 'live video chat with girls', category: 'scene', markets: ['IN','ME'], products: ['pu','ppt'], competition: '高', volume: '高', reason: '精准人群词，转化率高但竞争激烈' },
  { keyword: 'stranger video call app for android', category: 'scene', markets: ['IN'], products: ['pu','ft'], competition: '低', volume: '中', reason: '安卓设备指向性强，印度安卓占比高' },

  { keyword: 'apps like omegle but safe', category: 'compare', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '中', reason: 'Omegle关闭后安全替代需求大' },
  { keyword: 'omegle alternative 2026', category: 'compare', markets: ['US','UK','IN'], products: ['pu','ppt','ft'], competition: '高', volume: '高', reason: '年份词，搜索意图最新最精准' },
  { keyword: 'emeraldchat alternative free', category: 'compare', markets: ['IN'], products: ['pu'], competition: '低', volume: '中', reason: '竞品替代+免费，双重意图' },
  { keyword: 'better than chatroulette', category: 'compare', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '低', reason: '对比意图强，转化率高' },
  { keyword: 'monkey app replacement', category: 'compare', markets: ['US'], products: ['ppt'], competition: '低', volume: '中', reason: 'Monkey App替代需求' },
  { keyword: 'sites like omegle for adults', category: 'compare', markets: ['US','UK'], products: ['ppt'], competition: '中', volume: '高', reason: '成人社交需求，Omegle替代' },
  { keyword: 'chatrandom alternative 2026', category: 'compare', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '低', reason: 'ChatRandom竞品延伸' },
  { keyword: 'omegle shut down alternative', category: 'compare', markets: ['US','UK','IN'], products: ['pu','ppt'], competition: '中', volume: '高', reason: 'Omegle关闭事件带来的需求红利' },

  { keyword: 'make friends online video call', category: 'need', markets: ['IN','US'], products: ['pu','ft'], competition: '低', volume: '中', reason: '交友需求+视频通话，意图匹配度高' },
  { keyword: 'meet new people app free', category: 'need', markets: ['US','UK'], products: ['ppt'], competition: '中', volume: '中', reason: '认识新朋友的诉求，免费定位' },
  { keyword: 'anonymous video chat', category: 'need', markets: ['US','UK'], products: ['ppt'], competition: '中', volume: '中', reason: '匿名社交需求，隐私诉求强' },
  { keyword: 'video chat to make friends', category: 'need', markets: ['IN'], products: ['pu','ft'], competition: '低', volume: '中', reason: '以交友为目的的视频聊天' },
  { keyword: 'safe video chat app', category: 'need', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '中', reason: '安全诉求，适合女性用户拉新' },
  { keyword: 'one on one video call online', category: 'need', markets: ['US','UK','IN'], products: ['pu','ppt'], competition: '低', volume: '中', reason: '1对1精准描述你的产品形态' },
  { keyword: 'instant video chat no registration', category: 'need', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '低', reason: '即时+免注册，降低转化漏斗' },
  { keyword: 'live 1v1 video chat app', category: 'need', markets: ['US','UK','IN'], products: ['pu','ppt'], competition: '低', volume: '中', reason: '直接描述产品核心功能' },

  { keyword: 'video chat app india', category: 'geo', markets: ['IN'], products: ['pu','ft'], competition: '低', volume: '高', reason: '印度地域词，搜索量大竞争低' },
  { keyword: 'random chat uk', category: 'geo', markets: ['UK'], products: ['ppt'], competition: '低', volume: '中', reason: '英国地域词，精准定位' },
  { keyword: 'best video call app in india 2026', category: 'geo', markets: ['IN'], products: ['pu','ft'], competition: '低', volume: '中', reason: '印度+年份+最佳，购买意图强' },
  { keyword: 'video chat app usa', category: 'geo', markets: ['US'], products: ['ppt'], competition: '低', volume: '中', reason: '美国地域词' },
  { keyword: 'random video chat arab', category: 'geo', markets: ['ME'], products: ['ppt'], competition: '低', volume: '中', reason: '中东阿拉伯地区定向' },
  { keyword: 'online video call india free', category: 'geo', markets: ['IN'], products: ['pu','ft'], competition: '低', volume: '高', reason: '印度+免费+视频通话，高搜索量' },

  { keyword: 'how to video chat with strangers safely', category: 'longtail', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '低', reason: '问句词竞争极低，可做内容页SEO+广告' },
  { keyword: 'best app to talk to strangers on video', category: 'longtail', markets: ['US','UK','IN'], products: ['pu','ppt'], competition: '低', volume: '中', reason: '"best"意图强，用户正在做选择' },
  { keyword: 'where to video chat with random people', category: 'longtail', markets: ['US'], products: ['ppt'], competition: '低', volume: '低', reason: '问句+场景，适合内容营销' },
  { keyword: 'free app to meet strangers on video call', category: 'longtail', markets: ['IN'], products: ['pu','ft'], competition: '低', volume: '低', reason: '完整需求描述，精准匹配' },
  { keyword: 'is there an app like omegle that still works', category: 'longtail', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '中', reason: 'Omegle关闭后的直接替代搜索' },
  { keyword: 'what is the best random video chat app 2026', category: 'longtail', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '中', reason: '年份+最佳+品类，高购买意图' },

  { keyword: 'emeraldchat login', category: 'competitor', markets: ['IN'], products: ['pu'], competition: '中', volume: '中', reason: 'Emeraldchat用户截流' },
  { keyword: 'chatroulette free', category: 'competitor', markets: ['US','UK'], products: ['ppt'], competition: '中', volume: '中', reason: 'Chatroulette免费版需求' },
  { keyword: 'omegle video chat online', category: 'competitor', markets: ['US','UK','IN'], products: ['pu','ppt'], competition: '高', volume: '高', reason: 'Omegle品牌+功能组合词' },
  { keyword: 'monkey cool app', category: 'competitor', markets: ['US'], products: ['ppt'], competition: '低', volume: '中', reason: 'Monkey App变体搜索' },
  { keyword: 'camsurf random chat', category: 'competitor', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '低', reason: 'CamSurf竞品截流' },
  { keyword: 'shagle video chat', category: 'competitor', markets: ['US','UK'], products: ['ppt'], competition: '低', volume: '低', reason: 'Shagle竞品截流' },
  { keyword: 'chathub alternative', category: 'competitor', markets: ['US','UK','IN'], products: ['pu','ppt'], competition: '低', volume: '低', reason: 'ChatHub替代需求' },
  { keyword: 'bazoocam alternative', category: 'competitor', markets: ['UK'], products: ['ppt'], competition: '低', volume: '低', reason: 'Bazoocam竞品截流（欧洲流量）' },
];

const CATEGORY_LABELS = { scene: '场景词', compare: '对比词', need: '需求词', geo: '地域词', longtail: '长尾问句', competitor: '竞品延伸词' };

function renderKeywordExpansion() {
  const productFilter = document.getElementById('kw-expand-product').value;
  const categoryFilter = document.getElementById('kw-suggest-category').value;
  const marketFilter = document.getElementById('kw-suggest-market').value;

  const { uncaptured, negCandidates, kwSet } = findUncapturedTerms(productFilter);

  const totalUncapturedConv = uncaptured.reduce((s, t) => s + t.purchaseNew, 0);
  const totalUncapturedValue = uncaptured.reduce((s, t) => s + t.purchaseNewValue, 0);
  const totalNegWaste = negCandidates.reduce((s, t) => s + (t.cost || 0), 0);

  let suggestedNew = SUGGESTED_KEYWORDS.filter(s => !kwSet.has(s.keyword.toLowerCase()));
  if (categoryFilter !== 'all') suggestedNew = suggestedNew.filter(s => s.category === categoryFilter);
  if (marketFilter !== 'all') suggestedNew = suggestedNew.filter(s => s.markets.includes(marketFilter));
  if (productFilter !== 'all') suggestedNew = suggestedNew.filter(s => s.products.includes(productFilter));

  document.getElementById('kw-expand-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">未收编高价值词</div>
      <div class="kpi-value" style="color:var(--accent)">${uncaptured.length}</div>
      <div class="kpi-sub kpi-neutral">有转化但未添加为关键词</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">未收编词总转化</div>
      <div class="kpi-value" style="color:var(--green)">${fmt(totalUncapturedConv, 1)}</div>
      <div class="kpi-sub kpi-neutral">价值 ${fmt(totalUncapturedValue, 0)} HKD</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">建议否定的词</div>
      <div class="kpi-value" style="color:var(--red)">${negCandidates.length}</div>
      <div class="kpi-sub" style="color:var(--red)">浪费约 ${fmt(totalNegWaste, 0)} HKD</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">中长尾新机会</div>
      <div class="kpi-value" style="color:var(--purple,#7c3aed)">${suggestedNew.length}</div>
      <div class="kpi-sub kpi-neutral">你还没覆盖的关键词</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">当前关键词数</div>
      <div class="kpi-value">${kwSet.size}</div>
      <div class="kpi-sub kpi-neutral">已添加的独立关键词</div>
    </div>
  `;

  const insights = [];
  if (uncaptured.length > 10) {
    insights.push({ level: 'critical', icon: '🔴', text: `<strong>大量高价值词未收编</strong>：${uncaptured.length} 个搜索词已产生付费转化（合计 ${fmt(totalUncapturedConv, 1)} 次，${fmt(totalUncapturedValue, 0)} HKD），但尚未被添加为独立关键词。<span class="action">这些词目前通过广泛匹配触发，建议立即添加为精确匹配</span>，可降低 CPC 并提高匹配精度。` });
  }
  if (negCandidates.length > 5) {
    insights.push({ level: 'warning', icon: '🟡', text: `<strong>预算泄漏</strong>：${negCandidates.length} 个搜索词带来流量但零付费转化，合计浪费约 <span class="metric">${fmt(totalNegWaste, 0)} HKD</span>。<span class="action">建议添加为否定关键词</span>。` });
  }
  if (suggestedNew.length > 0) {
    const lowCompetition = suggestedNew.filter(s => s.competition === '低');
    insights.push({ level: 'info', icon: '💡', text: `<strong>中长尾词机会</strong>：发现 ${suggestedNew.length} 个你尚未覆盖的潜在关键词，其中 ${lowCompetition.length} 个竞争度低。这些词通常 CPC 更低、意图更精准、转化率更高。<span class="action">建议优先测试低竞争高意图词</span>。` });
  }
  const allTermSets = getAllSearchTerms();
  const filteredST = productFilter === 'all' ? allTermSets : allTermSets.filter(s => s.product === productFilter);
  const totalTerms = filteredST.reduce((s, g) => s + g.data.length, 0);
  const termsWithPurchase = filteredST.reduce((s, g) => s + g.data.filter(t => t.purchaseNew > 0).length, 0);
  insights.push({ level: 'info', icon: '📊', text: `<strong>覆盖率</strong>：${totalTerms} 个搜索词中仅 ${termsWithPurchase} 个产生付费（${(termsWithPurchase/totalTerms*100).toFixed(1)}%），${uncaptured.length} 个有转化词未被收编为关键词（收编率 ${((termsWithPurchase - uncaptured.length) / Math.max(termsWithPurchase,1) * 100).toFixed(0)}%）。` });

  const aiEl = document.getElementById('kw-expand-ai');
  if (aiEl) aiEl.innerHTML = AI.panelHTML('ai-kw-expand', insights);

  document.getElementById('uncaptured-tbody').innerHTML = uncaptured.slice(0, 60).map(t => {
    const action = t.purchaseNew >= 5
      ? '<span class="action-tag tag-exact">💎 添加精确匹配</span>'
      : t.purchaseNew >= 2
        ? '<span class="action-tag tag-watch">🟡 添加词组匹配</span>'
        : '<span class="action-tag tag-watch">🟡 观察后决定</span>';
    return `<tr>
      <td><strong>${t.term}</strong></td>
      <td>${t.source}</td>
      <td>${t.matchType}</td>
      <td><strong style="color:var(--green)">${t.purchaseNew}</strong></td>
      <td>${fmt(t.purchaseNewValue, 2)}</td>
      <td>${fmt(t.firstVisit || 0)}</td>
      <td>${fmt(t.pageView || 0)}</td>
      <td>${action}</td>
    </tr>`;
  }).join('');

  document.getElementById('negate-tbody').innerHTML = negCandidates.slice(0, 40).map(t => {
    const waste = t.cost > 500 ? '<span class="efficiency-bad">严重</span>' :
                  t.cost > 200 ? '<span class="efficiency-warn">中等</span>' :
                  (t.pageView || 0) > 1000 ? '<span class="efficiency-warn">流量浪费</span>' :
                  '<span class="efficiency-warn">轻度</span>';
    return `<tr>
      <td><strong>${t.term}</strong></td>
      <td>${t.source}</td>
      <td>${t.cost ? fmt(t.cost, 0) : '-'}</td>
      <td>${fmt(t.firstVisit || 0)}</td>
      <td>${fmt(t.pageView || 0)}</td>
      <td>${waste}</td>
      <td><span class="action-tag tag-negate">🔴 否定匹配</span></td>
    </tr>`;
  }).join('');

  let allSuggested = SUGGESTED_KEYWORDS;
  if (categoryFilter !== 'all') allSuggested = allSuggested.filter(s => s.category === categoryFilter);
  if (marketFilter !== 'all') allSuggested = allSuggested.filter(s => s.markets.includes(marketFilter));
  if (productFilter !== 'all') allSuggested = allSuggested.filter(s => s.products.includes(productFilter));

  document.getElementById('suggest-tbody').innerHTML = allSuggested.map(s => {
    const isCovered = kwSet.has(s.keyword.toLowerCase());
    const statusHTML = isCovered
      ? '<span class="action-tag tag-keep">✅ 已覆盖</span>'
      : '<span class="action-tag tag-exact">🆕 新机会</span>';
    const compColor = s.competition === '低' ? 'var(--green)' : s.competition === '中' ? 'var(--yellow)' : 'var(--red)';
    const volColor = s.volume === '高' ? 'var(--green)' : s.volume === '中' ? 'var(--yellow)' : 'var(--text-muted)';
    const productLabels = s.products.map(p => p === 'pu' ? 'Pu' : p === 'ppt' ? 'Ppt' : 'Ft').join(', ');
    return `<tr class="${isCovered ? '' : 'row-highlight'}">
      <td><strong>${s.keyword}</strong></td>
      <td><span class="kw-group-badge">${CATEGORY_LABELS[s.category]}</span></td>
      <td>${s.markets.join(', ')}</td>
      <td>${productLabels}</td>
      <td style="color:${compColor};font-weight:600">${s.competition}</td>
      <td style="color:${volColor};font-weight:600">${s.volume}</td>
      <td>${statusHTML}</td>
      <td style="font-size:12px;max-width:250px;">${s.reason}</td>
    </tr>`;
  }).join('');

  const top15u = uncaptured.filter(t => t.purchaseNew > 0).slice(0, 15);
  destroyChart('chart-uncaptured');
  chartInstances['chart-uncaptured'] = new Chart(
    document.getElementById('chart-uncaptured').getContext('2d'), {
      type: 'bar',
      data: {
        labels: top15u.map(t => t.term.length > 25 ? t.term.substring(0, 25) + '…' : t.term),
        datasets: [{
          label: '新付费转化',
          data: top15u.map(t => t.purchaseNew),
          backgroundColor: top15u.map(t => t.purchaseNew >= 5 ? 'rgba(79,70,229,0.7)' : 'rgba(217,119,6,0.7)'),
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: '#dfe1e6' } }, y: { ticks: { font: { size: 10 } } } }
      }
    }
  );

  const coveredCount = termsWithPurchase - uncaptured.length;
  destroyChart('chart-kw-coverage');
  chartInstances['chart-kw-coverage'] = new Chart(
    document.getElementById('chart-kw-coverage').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['已收编为关键词', '有转化未收编', '无转化搜索词'],
        datasets: [{
          data: [Math.max(0, coveredCount), uncaptured.length, totalTerms - termsWithPurchase],
          backgroundColor: ['rgba(22,163,74,0.7)', 'rgba(79,70,229,0.7)', 'rgba(100,100,120,0.4)'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#5a5e72' } } }
      }
    }
  );
}

// ============================================================
// Init
// ============================================================
renderOverview();
renderDrillDown();
initDailySelect();
Drawer.init();
