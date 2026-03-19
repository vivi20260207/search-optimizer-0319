/**
 * Search Optimizer 中台 - 异常检测引擎 & 根因分析树
 * 2026-03-19
 */
const Engine = {

  // ─── 模块 0：数据可信度校验 ───
  checkDataTrust(campaigns) {
    const results = [];
    const dataPeriodDays = 46; // 2026-02-01 ~ 2026-03-18

    campaigns.forEach(c => {
      const trust = {
        name: c.name,
        budgetUtil: null,
        bidStatus: 'Eligible',
        convLag: false,
        iosGap: null,
        warnings: []
      };

      if (c.targetCPA) {
        const estimatedDailyBudget = c.targetCPA * 10;
        trust.budgetUtil = (c.spend / dataPeriodDays) / estimatedDailyBudget * 100;
        if (trust.budgetUtil > 95) {
          trust.bidStatus = 'Limited by budget';
          trust.warnings.push({ type: 'budget_limited', msg: '预算受限：日均花费接近预算上限，CPA 数据可能虚高' });
        }
      }

      if (c.type === 'Search' && c.bidding === 'MaxConv' && c.newPayUsers < 30) {
        trust.bidStatus = 'Learning';
        trust.warnings.push({ type: 'learning', msg: `出价策略学习期：累计转化仅 ${c.newPayUsers} 次（建议 ≥30 次后再决策）` });
      }

      const iosTotal = c.newIOS + c.newAndroid;
      if (iosTotal > 0) {
        const iosRatio = c.newIOS / iosTotal * 100;
        const androidRatio = 100 - iosRatio;
        if (androidRatio > 30) {
          const estWaste = c.spend * (c.newAndroid / c.newUsers);
          trust.iosGap = { iosRatio, androidRatio, estWaste };
          if (androidRatio > 50) {
            trust.warnings.push({ type: 'ios_gap', msg: `iOS 归因折损：Android 占比 ${androidRatio.toFixed(0)}%，估算浪费 ${U.fmtK(Math.round(estWaste))} HKD` });
          }
        }
      }

      results.push(trust);
    });

    return results;
  },

  // ─── 模块 1-3：异常检测（带统计门槛）───
  detectAnomalies(campaigns, kwMap, stMap, devMap) {
    const anomalies = [];
    const avgSpend = campaigns.reduce((s, c) => s + c.spend, 0) / campaigns.length;

    campaigns.forEach(c => {
      // Campaign 级异常
      if (c.spend > avgSpend * 1.5 && c.roas < 0.7 && c.spend > 500) {
        anomalies.push({
          severity: 'critical',
          level: 'Campaign',
          target: c.name,
          type: 'high_waste',
          title: `高浪费：${U.campShortName(c.name)}`,
          desc: `花费 ${U.fmtK(Math.round(c.spend))} HKD（均值 1.5 倍以上），ROAS 仅 ${U.fmt(c.roas)}`,
          campaign: c,
          rootCause: null
        });
      }

      if (c.roas >= 1.2 && c.spend > 300) {
        anomalies.push({
          severity: 'positive',
          level: 'Campaign',
          target: c.name,
          type: 'cash_cow',
          title: `印钞机：${U.campShortName(c.name)}`,
          desc: `ROAS ${U.fmt(c.roas)}，表现优异`,
          campaign: c,
          rootCause: null
        });
      }

      if (c.roas < 0.5 && c.spend > 500) {
        anomalies.push({
          severity: 'critical',
          level: 'Campaign',
          target: c.name,
          type: 'severe_loss',
          title: `严重亏损：${U.campShortName(c.name)}`,
          desc: `ROAS ${U.fmt(c.roas)}，低于 0.5 回本线，花费 ${U.fmtK(Math.round(c.spend))} HKD`,
          campaign: c,
          rootCause: null
        });
      }

      // Ad Group 级异常（通过 keyword 聚合）
      const kws = kwMap[c.name] || [];
      if (kws.length) {
        const agMap = {};
        kws.forEach(kw => {
          const ag = kw.adGroup || '默认';
          if (!agMap[ag]) agMap[ag] = { name: ag, spend: 0, clicks: 0, conv: 0, broadSpend: 0, totalSpend: 0, lowQsCount: 0, totalQs: 0, qsWeight: 0, keywords: [] };
          agMap[ag].spend += kw.cost || 0;
          agMap[ag].clicks += kw.clicks || 0;
          agMap[ag].conv += kw.purchaseNew || 0;
          if (U.parseMatchType(kw.matchType) === 'Broad') agMap[ag].broadSpend += kw.cost || 0;
          agMap[ag].totalSpend += kw.cost || 0;
          if (kw.qualityScore && kw.qualityScore !== '') {
            const qs = parseInt(kw.qualityScore);
            agMap[ag].totalQs += qs * (kw.cost || 1);
            agMap[ag].qsWeight += (kw.cost || 1);
            if (qs <= 5) agMap[ag].lowQsCount++;
          }
          agMap[ag].keywords.push(kw);
        });

        Object.values(agMap).forEach(ag => {
          const broadPct = ag.totalSpend > 0 ? ag.broadSpend / ag.totalSpend * 100 : 0;
          const avgQs = ag.qsWeight > 0 ? ag.totalQs / ag.qsWeight : null;
          const agCPA = ag.conv > 0 ? ag.spend / ag.conv : null;

          if (broadPct > 70 && agCPA && c.newCPA && agCPA > c.newCPA * 1.3 && ag.spend > 200) {
            anomalies.push({
              severity: 'warning',
              level: 'Ad Group',
              target: `${U.campShortName(c.name)} → ${ag.name}`,
              type: 'broad_overflow',
              title: `广泛匹配失控：${ag.name}`,
              desc: `Broad 消耗占比 ${broadPct.toFixed(0)}%，组 CPA ${U.fmt(agCPA)} 超出 Campaign 均值 30%`,
              campaign: c,
              adGroup: ag,
              rootCause: null
            });
          }

          if (avgQs !== null && avgQs < 5 && ag.spend > 200) {
            anomalies.push({
              severity: 'warning',
              level: 'Ad Group',
              target: `${U.campShortName(c.name)} → ${ag.name}`,
              type: 'low_qs',
              title: `质量分过低：${ag.name}`,
              desc: `加权平均 QS ${U.fmt(avgQs, 1)}，严重拖累 CPC 和排名`,
              campaign: c,
              adGroup: ag,
              rootCause: null
            });
          }
        });

        // Keyword 级异常
        kws.forEach(kw => {
          if ((kw.cost || 0) > 100 && (!kw.purchaseNew || kw.purchaseNew === 0) && kw.clicks > 20) {
            anomalies.push({
              severity: 'warning',
              level: 'Keyword',
              target: `${kw.keyword} [${U.parseMatchType(kw.matchType)}]`,
              type: 'zero_conv_high_spend',
              title: `高花费零转化：${kw.keyword}`,
              desc: `花费 ${U.fmtK(Math.round(kw.cost))} HKD，${kw.clicks} 次点击，0 转化`,
              campaign: c,
              keyword: kw,
              rootCause: null
            });
          }

          if (kw.landingPageExp && kw.landingPageExp.includes('低于') && (kw.cost || 0) > 50) {
            anomalies.push({
              severity: 'info',
              level: 'Keyword',
              target: kw.keyword,
              type: 'lp_below',
              title: `落地页体验差：${kw.keyword}`,
              desc: `LP Experience 低于平均水平，正在拖累 QS 和排名`,
              campaign: c,
              keyword: kw,
              rootCause: null
            });
          }

          if (kw.purchaseNew >= 3 && kw.cpa && c.newCPA && kw.cpa < c.newCPA * 0.8 && kw.impressionShare === '< 10%') {
            anomalies.push({
              severity: 'positive',
              level: 'Keyword',
              target: kw.keyword,
              type: 'scale_opportunity',
              title: `扩量机会：${kw.keyword}`,
              desc: `CPA ${U.fmt(kw.cpa)} 低于均值 20%+，展示份额 < 10%，建议提价抢量`,
              campaign: c,
              keyword: kw,
              rootCause: null
            });
          }
        });
      }

      // Search Term 级异常：高花费零转化搜索词
      const sts = stMap[c.name] || [];
      sts.forEach(st => {
        if ((st.cost || 0) > 50 && (!st.purchaseNew || st.purchaseNew === 0) && (st.clicks || 0) > 10) {
          anomalies.push({
            severity: 'warning',
            level: 'Search Term',
            target: st.term,
            type: 'waste_search_term',
            title: `浪费搜索词：${st.term}`,
            desc: `花费 ${U.fmt(st.cost)} HKD，${st.clicks} 次点击，0 付费转化 → 建议否定`,
            campaign: c,
            searchTerm: st,
            rootCause: null
          });
        }
      });
    });

    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
      return (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9);
    });
  },

  // ─── 模块 4：根因分析树 ───
  buildRootCause(anomaly, kwMap, stMap, devMap) {
    const c = anomaly.campaign;
    if (!c) return [];
    const steps = [];

    // Step 1: 检查预算和策略状态
    steps.push({
      step: 1,
      title: '检查环境干扰',
      detail: c.targetCPA
        ? `预算目标 tCPA=${c.targetCPA}，出价策略 ${c.bidding}${c.newPayUsers < 30 ? '（⚠️ 学习期，转化 < 30）' : ''}`
        : `出价策略 ${c.bidding}，无明确 tCPA 目标`,
      status: c.newPayUsers < 30 ? 'warning' : 'ok'
    });

    // Step 2: 下钻 Ad Group
    const kws = kwMap[c.name] || [];
    if (kws.length) {
      const agMap = {};
      kws.forEach(kw => {
        const ag = kw.adGroup || '默认';
        if (!agMap[ag]) agMap[ag] = { name: ag, spend: 0, conv: 0, clicks: 0, imp: 0, broadSpend: 0, qsW: 0, qsWt: 0 };
        agMap[ag].spend += kw.cost || 0;
        agMap[ag].conv += kw.purchaseNew || 0;
        agMap[ag].clicks += kw.clicks || 0;
        agMap[ag].imp += kw.impressions || 0;
        if (U.parseMatchType(kw.matchType) === 'Broad') agMap[ag].broadSpend += kw.cost || 0;
        if (kw.qualityScore) { agMap[ag].qsW += parseInt(kw.qualityScore) * (kw.cost || 1); agMap[ag].qsWt += (kw.cost || 1); }
      });

      const groups = Object.values(agMap).sort((a, b) => b.spend - a.spend);
      const topGroup = groups[0];
      if (topGroup) {
        const topCPA = topGroup.conv > 0 ? topGroup.spend / topGroup.conv : null;
        const topBroadPct = topGroup.spend > 0 ? topGroup.broadSpend / topGroup.spend * 100 : 0;
        const topQS = topGroup.qsWt > 0 ? topGroup.qsW / topGroup.qsWt : null;
        steps.push({
          step: 2,
          title: '定位异常广告组',
          detail: `最高消耗组 "${topGroup.name}"：花费 ${U.fmtK(Math.round(topGroup.spend))} HKD，占总花费 ${U.fmtPct(U.pct(topGroup.spend, c.spend))}，CPA ${topCPA ? U.fmt(topCPA) : '无转化'}`,
          status: (topCPA && c.newCPA && topCPA > c.newCPA * 1.3) ? 'bad' : 'ok',
          data: { group: topGroup.name, spend: topGroup.spend, cpa: topCPA, broadPct: topBroadPct, avgQs: topQS }
        });

        // Step 3: 分析特征
        const features = [];
        if (topBroadPct > 60) features.push(`广泛匹配消耗占 ${topBroadPct.toFixed(0)}%（过高）`);
        if (topQS !== null && topQS < 6) features.push(`加权 QS ${topQS.toFixed(1)}（偏低）`);
        const devs = devMap[c.name];
        if (devs) {
          const mobile = devs.find(d => d.device === '手机');
          const desktop = devs.find(d => d.device === '计算机');
          if (mobile && desktop && mobile.cost > 0 && desktop.cost > 0) {
            const mobilePct = mobile.cost / (mobile.cost + desktop.cost) * 100;
            features.push(`Mobile 消耗 ${mobilePct.toFixed(0)}%`);
          }
        }

        steps.push({
          step: 3,
          title: '组内特征分析',
          detail: features.length > 0 ? features.join('；') : '无明显异常特征',
          status: features.length > 1 ? 'bad' : 'ok'
        });

        // Step 4: 定位关键词
        const groupKws = kws.filter(kw => kw.adGroup === topGroup.name).sort((a, b) => (b.cost || 0) - (a.cost || 0));
        const topKw = groupKws[0];
        if (topKw) {
          const kwFeatures = [];
          if (topKw.qualityScore) kwFeatures.push(`QS ${topKw.qualityScore}`);
          if (topKw.landingPageExp) kwFeatures.push(`LP: ${topKw.landingPageExp}`);
          if (topKw.adRelevance) kwFeatures.push(`Rel: ${topKw.adRelevance}`);
          steps.push({
            step: 4,
            title: '定位关键词',
            detail: `核心消耗词 "${topKw.keyword}" [${U.parseMatchType(topKw.matchType)}]：花费 ${U.fmtK(Math.round(topKw.cost || 0))}，${kwFeatures.join('，')}`,
            status: (topKw.qualityScore && parseInt(topKw.qualityScore) < 6) ? 'bad' : 'ok'
          });
        }
      }
    }

    // Step 5: 操作建议
    const suggestions = [];
    if (anomaly.type === 'high_waste' || anomaly.type === 'severe_loss') {
      suggestions.push('检查搜索词报告，否定无效词');
      suggestions.push('审查广泛匹配覆盖范围，考虑收紧为词组匹配');
      if (kws.some(kw => kw.landingPageExp && kw.landingPageExp.includes('低于'))) {
        suggestions.push('优化落地页体验（提升加载速度和相关性）');
      }
    } else if (anomaly.type === 'cash_cow') {
      suggestions.push('检查 Impression Share，如因预算受限则增加预算');
      suggestions.push('核心高转化词提价 10-20% 测试扩量');
    } else if (anomaly.type === 'broad_overflow') {
      suggestions.push('将高消耗广泛匹配词改为词组匹配');
      suggestions.push('添加否定关键词清理无效流量');
    } else if (anomaly.type === 'zero_conv_high_spend') {
      suggestions.push('暂停此关键词或大幅降价');
      suggestions.push('检查搜索词报告中该词触发的实际搜索词');
    } else if (anomaly.type === 'scale_opportunity') {
      suggestions.push('提价 15-30% 测试扩量');
      suggestions.push('单提为 Exact 匹配并独立给高价');
    }

    steps.push({
      step: steps.length + 1,
      title: '操作建议 (SOP)',
      detail: suggestions.length > 0 ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') : '暂无具体建议',
      status: 'action',
      suggestions
    });

    return steps;
  }
};
