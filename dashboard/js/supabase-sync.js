/**
 * Supabase Sync Layer — Search Optimizer 中台
 *
 * 策略：Write-through cache
 *   - localStorage 用于即时读取（UI 零延迟）
 *   - Supabase 用于跨设备持久化 + 软删除历史
 *   - 首次加载时自动把 localStorage 数据迁移到 Supabase
 *   - 后续加载从 Supabase 拉取最新数据覆盖 localStorage
 */
(function () {
  'use strict';

  var SUPABASE_URL  = 'https://lthetksmtttdsdygnicj.supabase.co';
  var SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0aGV0a3NtdHR0ZHNkeWduaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzY4MzIsImV4cCI6MjA4OTU1MjgzMn0.4kUg_mWph5-EUAQo6HslhtD_u4qJc66toso2TsLMk2o';

  var _sb = null;
  function sb() {
    if (!_sb && typeof supabase !== 'undefined' && supabase.createClient) {
      _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _sb;
  }

  var LS = {
    negkw:   'negkw_diag_notes',
    rca:     'rca_diag_notes',
    pb:      'POSTBACK_LOG_TEXT',
    mNegkw:  '_sb_mig_negkw',
    mRca:    '_sb_mig_rca',
    mPb:     '_sb_mig_pb',
    mSet:    '_sb_mig_settings'
  };

  function showSyncStatus(msg, ok) {
    var el = document.getElementById('sb-sync-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sb-sync-status';
      el.style.cssText = 'position:fixed;bottom:8px;right:8px;padding:6px 14px;border-radius:8px;font-size:11px;z-index:99999;transition:opacity .5s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.style.background = ok ? '#10b981' : '#ef4444';
    el.style.color = '#fff';
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; }, ok ? 3000 : 8000);
  }

  window.SBSync = {
    ready: false,

    async init() {
      var client = sb();
      if (!client) {
        console.warn('[SB] Supabase client not available — supabase CDN may not have loaded');
        showSyncStatus('☁️ 云端同步不可用（Supabase 未加载）', false);
        return;
      }

      // Quick connectivity test
      try {
        var test = await client.from('postback_log').select('id').limit(1);
        if (test.error) throw test.error;
      } catch (e) {
        console.error('[SB] Connectivity test failed:', e);
        showSyncStatus('☁️ 云端连接失败: ' + (e.message || e), false);
        return;
      }

      console.log('[SB] Connected to Supabase ✓');

      try {
        await Promise.all([
          this._syncNotes('negkw'),
          this._syncNotes('rca'),
          this._syncPostback(),
          this._syncSettings()
        ]);
        this.ready = true;
        var noteCount = 0;
        try {
          var n1 = JSON.parse(localStorage.getItem(LS.negkw) || '{}');
          var n2 = JSON.parse(localStorage.getItem(LS.rca) || '{}');
          Object.values(n1).forEach(function(a){ noteCount += a.length; });
          Object.values(n2).forEach(function(a){ noteCount += a.length; });
        } catch(e){}
        console.log('[SB] ✅ Sync complete — ' + noteCount + ' notes loaded');
        showSyncStatus('☁️ 已同步 (' + noteCount + ' 条备注)', true);
      } catch (e) {
        console.error('[SB] Sync error:', e);
        showSyncStatus('☁️ 同步出错: ' + (e.message || e), false);
      }
    },

    /* ─── Notes ─── */

    async _syncNotes(type) {
      var lsKey  = LS[type];
      var migKey = type === 'negkw' ? LS.mNegkw : LS.mRca;

      // Step 1: Migrate localStorage → Supabase (one-time per browser)
      if (!localStorage.getItem(migKey)) {
        var migOk = false;
        try {
          var local = JSON.parse(localStorage.getItem(lsKey) || '{}');
          var ids = Object.keys(local);
          if (ids.length) {
            var rows = [];
            ids.forEach(function (did) {
              (local[did] || []).forEach(function (n) {
                rows.push({
                  note_type: type, diag_id: did, content: n.text,
                  role: n.role || 'user',
                  created_at: new Date(n.ts || Date.now()).toISOString()
                });
              });
            });
            if (rows.length) {
              for (var i = 0; i < rows.length; i += 100) {
                var ins = await sb().from('diagnostic_notes').insert(rows.slice(i, i + 100));
                if (ins.error) throw ins.error;
              }
              console.log('[SB] Migrated ' + rows.length + ' ' + type + ' notes to cloud');
            }
          }
          migOk = true;
        } catch (e) {
          console.error('[SB] Migration error for ' + type + ':', e);
        }
        if (migOk) localStorage.setItem(migKey, '1');
      }

      // Step 2: Pull from Supabase → update localStorage
      try {
        var res = await sb()
          .from('diagnostic_notes')
          .select('id, diag_id, content, role, created_at')
          .eq('note_type', type)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (res.error) throw res.error;

        var cloudData = res.data || [];
        var localRaw = localStorage.getItem(lsKey);
        var localNotes = {};
        try { localNotes = JSON.parse(localRaw || '{}'); } catch(e){}
        var localCount = 0;
        Object.values(localNotes).forEach(function(a){ localCount += (a||[]).length; });

        // Safety: don't overwrite local data with empty cloud if local has content
        if (cloudData.length === 0 && localCount > 0) {
          console.log('[SB] Cloud has 0 ' + type + ' notes but local has ' + localCount + ' — keeping local (migration may be pending)');
          return;
        }

        var grouped = {};
        cloudData.forEach(function (r) {
          if (!grouped[r.diag_id]) grouped[r.diag_id] = [];
          grouped[r.diag_id].push({
            text: r.content, role: r.role,
            ts: new Date(r.created_at).getTime(),
            _sbId: r.id
          });
        });
        localStorage.setItem(lsKey, JSON.stringify(grouped));
        console.log('[SB] Pulled ' + cloudData.length + ' ' + type + ' notes from cloud');
      } catch (e) {
        console.warn('[SB] Pull error for ' + type + ':', e);
      }
    },

    /* ─── Postback ─── */

    async _syncPostback() {
      if (!localStorage.getItem(LS.mPb)) {
        var txt = localStorage.getItem(LS.pb) || '';
        if (txt.trim()) {
          try {
            var existing = await sb().from('postback_log').select('id').order('id').limit(1);
            if (existing.data && existing.data.length) {
              var upd = await sb().from('postback_log')
                .update({ content: txt, updated_at: new Date().toISOString() })
                .eq('id', existing.data[0].id);
              if (upd.error) throw upd.error;
            } else {
              var ins = await sb().from('postback_log').insert({ content: txt });
              if (ins.error) throw ins.error;
            }
            console.log('[SB] Migrated postback log');
            localStorage.setItem(LS.mPb, '1');
          } catch(e) {
            console.error('[SB] Postback migration error:', e);
          }
        } else {
          localStorage.setItem(LS.mPb, '1');
        }
      }

      try {
        var res = await sb().from('postback_log').select('content').order('updated_at', { ascending: false }).limit(1);
        if (res.data && res.data.length) {
          var cloudContent = res.data[0].content || '';
          var localContent = localStorage.getItem(LS.pb) || '';
          if (cloudContent && cloudContent.length >= localContent.length) {
            localStorage.setItem(LS.pb, cloudContent);
            var ta = document.getElementById('postback-log-textarea');
            if (ta && ta !== document.activeElement) ta.value = cloudContent;
          }
        }
      } catch(e) {
        console.warn('[SB] Postback pull error:', e);
      }
    },

    /* ─── Settings ─── */

    async _syncSettings() {
      var keys = [];

      if (!localStorage.getItem(LS.mSet)) {
        try {
          var rows = [];
          keys.forEach(function (k) {
            var v = localStorage.getItem(k);
            if (v) rows.push({ key: k, value: v });
          });
          if (rows.length) {
            var ups = await sb().from('user_settings').upsert(rows, { onConflict: 'key' });
            if (ups.error) throw ups.error;
            console.log('[SB] Migrated settings');
          }
          localStorage.setItem(LS.mSet, '1');
        } catch(e) {
          console.error('[SB] Settings migration error:', e);
        }
      }

      try {
        var res = await sb().from('user_settings').select('key, value');
        if (res.data) res.data.forEach(function (r) { if (r.value) localStorage.setItem(r.key, r.value); });
      } catch(e) {
        console.warn('[SB] Settings pull error:', e);
      }
    },

    /* ═══ Write Methods (fire-and-forget from UI code) ═══ */

    async addNote(noteType, diagId, text, role, ts) {
      if (!sb()) return null;
      try {
        var res = await sb().from('diagnostic_notes')
          .insert({
            note_type: noteType, diag_id: diagId, content: text,
            role: role || 'user',
            created_at: ts ? new Date(ts).toISOString() : new Date().toISOString()
          })
          .select('id')
          .single();
        if (res.error) throw res.error;
        return res.data ? res.data.id : null;
      } catch (e) { console.warn('[SB] addNote err', e); return null; }
    },

    async deleteNote(sbId) {
      if (!sbId || !sb()) return;
      try {
        await sb().from('diagnostic_notes')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', sbId);
      } catch (e) { console.warn('[SB] delNote err', e); }
    },

    async deleteLastSystemNote(noteType, diagId) {
      if (!sb()) return;
      try {
        var res = await sb().from('diagnostic_notes')
          .select('id')
          .eq('note_type', noteType).eq('diag_id', diagId)
          .eq('role', 'system').is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(1);
        if (res.data && res.data.length) {
          await sb().from('diagnostic_notes')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', res.data[0].id);
        }
      } catch (e) { console.warn('[SB] delLast err', e); }
    },

    async savePostback(content) {
      if (!sb()) return;
      try {
        var existing = await sb().from('postback_log').select('id').order('id').limit(1);
        if (existing.data && existing.data.length) {
          await sb().from('postback_log')
            .update({ content: content, updated_at: new Date().toISOString() })
            .eq('id', existing.data[0].id);
        } else {
          await sb().from('postback_log').insert({ content: content });
        }
      } catch (e) { console.warn('[SB] savePB err', e); }
    },

    async saveSetting(key, value) {
      if (!sb()) return;
      try {
        await sb().from('user_settings').upsert(
          { key: key, value: value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      } catch (e) { console.warn('[SB] saveSetting err', e); }
    },

    async deleteSetting(key) {
      if (!sb()) return;
      try { await sb().from('user_settings').delete().eq('key', key); }
      catch (e) { console.warn('[SB] delSetting err', e); }
    },

    // ── Knowledge Base ──

    _kbCache: null,
    _kbCacheTime: 0,

    clearKnowledgeCache() {
      this._kbCache = null;
      this._kbCacheTime = 0;
    },

    async getKnowledge(filterTags) {
      if (!sb()) return [];
      var now = Date.now();
      if (this._kbCache && now - this._kbCacheTime < 300000) {
        return filterTags ? this._kbCache.filter(function(k) {
          return k.tags && k.tags.some(function(t) { return filterTags.indexOf(t) >= 0; });
        }) : this._kbCache;
      }
      try {
        var res = await sb().from('knowledge_base')
          .select('id, category, content, tags, source, owner, scope, product, status, reviewed_by, reviewed_at, created_at')
          .is('deleted_at', null)
          .order('id');
        if (res.error) {
          // Fallback: new columns may not exist yet (migration not run)
          res = await sb().from('knowledge_base')
            .select('id, category, content, tags, source, created_at')
            .is('deleted_at', null)
            .order('id');
          if (res.error) throw res.error;
        }
        this._kbCache = res.data || [];
        this._kbCacheTime = now;
        if (filterTags) {
          return this._kbCache.filter(function(k) {
            return k.tags && k.tags.some(function(t) { return filterTags.indexOf(t) >= 0; });
          });
        }
        return this._kbCache;
      } catch (e) { console.warn('[SB] getKB err', e); return []; }
    },

    async addKnowledge(category, content, source, tags, owner, product) {
      if (!sb()) return null;
      try {
        var row = { category: category, content: content, source: source || 'user', tags: tags || [],
          owner: owner || null, scope: 'personal', status: 'pending_review' };
        if (product) row.product = product;
        var res = await sb().from('knowledge_base')
          .insert(row)
          .select('id').single();
        if (res.error) throw res.error;
        this._kbCache = null;
        return res.data ? res.data.id : null;
      } catch (e) { console.warn('[SB] addKB err', e); return null; }
    },

    async approveKnowledge(kbId, scope, product, reviewedBy) {
      if (!kbId || !sb()) return;
      try {
        var upd = { status: 'approved', scope: scope || 'team', reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() };
        if (scope === 'product' && product) upd.product = product;
        await sb().from('knowledge_base').update(upd).eq('id', kbId);
        this._kbCache = null;
      } catch (e) { console.warn('[SB] approveKB err', e); }
    },

    async rejectKnowledge(kbId, reviewedBy) {
      if (!kbId || !sb()) return;
      try {
        await sb().from('knowledge_base').update({
          status: 'rejected', reviewed_by: reviewedBy, reviewed_at: new Date().toISOString()
        }).eq('id', kbId);
        this._kbCache = null;
      } catch (e) { console.warn('[SB] rejectKB err', e); }
    },

    async getKBHistory(kbId) {
      if (!sb()) return [];
      try {
        var res = await sb().from('knowledge_base')
          .select('id, category, content, source, tags, created_at, deleted_at')
          .or('id.eq.' + kbId + ',tags.cs.{kb_' + kbId + '}')
          .order('created_at', { ascending: true });
        if (res.error) throw res.error;
        return res.data || [];
      } catch (e) { console.warn('[SB] getKBHistory err', e); return []; }
    },

    async deleteKnowledge(kbId) {
      if (!kbId || !sb()) return;
      try {
        await sb().from('knowledge_base')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', kbId);
        this._kbCache = null;
      } catch (e) { console.warn('[SB] delKB err', e); }
    },

    async saveSnapshot(dataType, snapshotDate, data, recordCount) {
      if (!sb()) return;
      try {
        await sb().from('adw_snapshots').upsert({
          data_type: dataType, snapshot_date: snapshotDate,
          data: data, record_count: recordCount,
          created_at: new Date().toISOString()
        }, { onConflict: 'snapshot_date,data_type' });
      } catch (e) { console.warn('[SB] saveSnap err', e); }
    },

    // ── AB Tests ──

    _abCache: null,
    _abCacheTime: 0,

    clearABCache() {
      this._abCache = null;
      this._abCacheTime = 0;
    },

    async getABTests(forceRefresh) {
      if (!sb()) return null;
      var now = Date.now();
      if (!forceRefresh && this._abCache && now - this._abCacheTime < 60000) {
        return this._abCache;
      }
      try {
        var res = await sb().from('ab_tests')
          .select('*')
          .order('created_at', { ascending: false });
        if (res.error) throw res.error;

        var tests = res.data || [];

        var resultsRes = await sb().from('ab_results').select('*');
        if (resultsRes.error) throw resultsRes.error;
        var allResults = resultsRes.data || [];

        var resultsByTest = {};
        allResults.forEach(function(r) {
          if (!resultsByTest[r.test_id]) resultsByTest[r.test_id] = [];
          resultsByTest[r.test_id].push(r);
        });

        var formatted = tests.map(function(t) {
          return SBSync._formatABTest(t, resultsByTest[t.id] || []);
        });

        this._abCache = formatted;
        this._abCacheTime = now;
        return formatted;
      } catch (e) {
        console.warn('[SB] getABTests err', e);
        return null;
      }
    },

    _formatABTest: function(t, results) {
      var meta = {};
      try { meta = t.notes ? JSON.parse(t.notes) : {}; } catch(e) {}

      var variants = t.variants || [];
      var trafficSplit = variants.map(function(v) { return v.weight || Math.floor(100 / (variants.length || 1)); });

      var startDate = t.started_at ? t.started_at.split('T')[0] : null;
      var endDate = t.completed_at ? t.completed_at.split('T')[0] : null;
      var daysRunning = 0;
      if (startDate) {
        var end = endDate ? new Date(endDate) : new Date();
        daysRunning = Math.max(0, Math.round((end - new Date(startDate)) / 86400000));
      }

      var resultMap = {};
      results.forEach(function(r) { resultMap[r.variant_id] = r; });

      var formattedVariants = variants.map(function(v) {
        var r = resultMap[v.id];
        var metrics = null;
        if (r && r.visitors > 0) {
          var uniqueV = r.unique_visitors || r.visitors;
          metrics = {
            visitors: r.visitors,
            clicks: r.cta_clicks || 0,
            bounceRate: uniqueV > 0 ? +(r.bounce_count / uniqueV * 100).toFixed(1) : 0,
            avgDuration: +r.avg_time_sec || 0,
            registerRate: uniqueV > 0 ? +(r.register_count / uniqueV * 100).toFixed(1) : 0,
            payRate: uniqueV > 0 ? +(r.pay_count / uniqueV * 100).toFixed(1) : 0,
            conversions: r.pay_count || 0,
            revenue: +r.revenue || 0,
            cost: +r.cost || 0,
            cpa: r.pay_count > 0 ? +((+r.cost || 0) / r.pay_count).toFixed(1) : 0,
            roas: (+r.cost || 0) > 0 ? +((+r.revenue || 0) / (+r.cost || 1)).toFixed(2) : 0
          };
        }
        return {
          id: v.id,
          name: v.name || v.id,
          isControl: !!v.isControl,
          elements: v.elements || {},
          metrics: metrics,
          dailyData: []
        };
      });

      var resultObj = SBSync._computeABResult(formattedVariants, t);

      return {
        testId: t.id,
        name: t.name,
        product: t.product,
        domain: meta.domain || '',
        pagePath: meta.pagePath || '',
        pageVersionId: meta.pageVersionId || '--',
        status: t.status,
        startDate: startDate,
        endDate: endDate,
        daysRunning: daysRunning,
        trafficSplit: trafficSplit,
        targetMetric: t.primary_metric || 'registerRate',
        secondaryMetrics: meta.secondaryMetrics || [],
        minSampleSize: t.min_sample_size || 1000,
        confidenceTarget: meta.confidenceTarget || 95,
        variants: formattedVariants,
        result: resultObj
      };
    },

    _computeABResult: function(variants, test) {
      var control = variants.find(function(v) { return v.isControl; });
      if (!control || !control.metrics) {
        return { currentWinner: test.winner_variant || null, confidence: 0, improvement: {},
          recommendation: test.status === 'draft' ? '草稿状态，测试尚未启动。' : '等待数据积累…',
          canPromote: false };
      }

      var best = null;
      var bestScore = -Infinity;
      var targetKey = test.primary_metric || 'registerRate';
      var keyMap = { 'register_rate': 'registerRate', 'pay_rate': 'payRate', 'bounce_rate': 'bounceRate', 'cta_click_rate': 'clicks' };
      var mappedKey = keyMap[targetKey] || targetKey;
      var lowerBetter = (mappedKey === 'bounceRate' || mappedKey === 'cpa');

      variants.forEach(function(v) {
        if (v.isControl || !v.metrics) return;
        var val = v.metrics[mappedKey];
        var cv = control.metrics[mappedKey];
        if (val == null || cv == null) return;
        var score = lowerBetter ? cv - val : val - cv;
        if (score > bestScore) { bestScore = score; best = v; }
      });

      var confidence = 0;
      var improvement = {};
      if (best && best.metrics && control.metrics) {
        var cv = control.metrics;
        var bv = best.metrics;
        var totalVisitors = variants.reduce(function(s, v) { return s + (v.metrics ? v.metrics.visitors : 0); }, 0);
        confidence = SBSync._approxConfidence(cv, bv, mappedKey, lowerBetter);

        ['registerRate', 'payRate', 'bounceRate', 'cpa', 'roas', 'avgDuration'].forEach(function(k) {
          if (cv[k] && bv[k] && cv[k] !== 0) {
            var pct = ((bv[k] - cv[k]) / Math.abs(cv[k]) * 100).toFixed(1);
            improvement[k] = (pct > 0 ? '+' : '') + pct + '%';
          }
        });
      }

      var canPromote = confidence >= (test.min_sample_size ? 95 : 95) && best != null && test.status === 'completed';
      if (test.winner_variant) canPromote = false;

      var recommendation = '';
      if (test.status === 'draft') {
        recommendation = '草稿状态，测试尚未启动。';
      } else if (!best) {
        recommendation = '暂无胜出变体，等待更多数据。';
      } else if (confidence >= 95) {
        recommendation = '变体「' + best.name + '」显著优于对照组，置信度 ' + confidence + '%。建议推广为正式版本。';
        canPromote = test.status === 'completed' && !test.winner_variant;
      } else if (confidence >= 80) {
        recommendation = '变体「' + best.name + '」领先，置信度 ' + confidence + '%，距 95% 目标差 ' + (95 - confidence).toFixed(1) + '%。继续运行 3-5 天。';
      } else {
        recommendation = '数据仍在积累中，当前置信度 ' + confidence + '%，需更多样本。';
      }

      return {
        currentWinner: best ? best.id : null,
        confidence: confidence,
        improvement: improvement,
        recommendation: recommendation,
        canPromote: canPromote,
        promotedAsVersion: test.winner_variant ? 'promoted' : null
      };
    },

    _approxConfidence: function(cv, bv, key, lowerBetter) {
      if (!cv.visitors || !bv.visitors) return 0;
      var p1 = (cv[key] || 0) / 100;
      var p2 = (bv[key] || 0) / 100;
      if (key === 'visitors' || key === 'clicks' || key === 'conversions' || key === 'revenue' || key === 'cost') {
        p1 = cv[key] / (cv.visitors || 1);
        p2 = bv[key] / (bv.visitors || 1);
      }
      var n1 = cv.visitors;
      var n2 = bv.visitors;
      if (n1 < 10 || n2 < 10) return 0;
      var se = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
      if (se === 0) return 0;
      var z = Math.abs(p2 - p1) / se;
      // Approximate two-tailed p → confidence via z-score lookup
      var conf;
      if (z >= 3.29) conf = 99.9;
      else if (z >= 2.58) conf = 99.0;
      else if (z >= 2.33) conf = 98.0;
      else if (z >= 1.96) conf = 95.0;
      else if (z >= 1.65) conf = 90.0;
      else if (z >= 1.28) conf = 80.0;
      else if (z >= 1.04) conf = 70.0;
      else if (z >= 0.84) conf = 60.0;
      else if (z >= 0.67) conf = 50.0;
      else conf = +(z / 0.67 * 50).toFixed(1);
      return +conf.toFixed(1);
    },

    async getABDailyData(testId) {
      if (!sb()) return [];
      try {
        var res = await sb().from('ab_events')
          .select('variant_id, event_type, created_at, visitor_id')
          .eq('test_id', testId)
          .order('created_at', { ascending: true });
        if (res.error) throw res.error;
        var events = res.data || [];
        if (!events.length) return [];

        var dayVariant = {};
        events.forEach(function(ev) {
          var day = ev.created_at.split('T')[0];
          var key = day + '|' + ev.variant_id;
          if (!dayVariant[key]) dayVariant[key] = { date: day, variant_id: ev.variant_id, visitors: 0, cta_clicks: 0, _vids: {} };
          var dv = dayVariant[key];
          if (ev.event_type === 'page_view') {
            dv.visitors++;
            dv._vids[ev.visitor_id] = 1;
          }
          if (ev.event_type === 'cta_click') dv.cta_clicks++;
        });

        return Object.values(dayVariant).map(function(dv) {
          var uv = Object.keys(dv._vids).length || dv.visitors;
          return { date: dv.date, variant_id: dv.variant_id, visitors: uv };
        });
      } catch (e) { console.warn('[SB] getABDaily err', e); return []; }
    },

    async createABTest(testData) {
      if (!sb()) return null;
      try {
        var meta = {
          domain: testData.domain || '',
          pagePath: testData.pagePath || '',
          pageVersionId: testData.pageVersionId || '--',
          secondaryMetrics: testData.secondaryMetrics || [],
          confidenceTarget: testData.confidenceTarget || 95
        };

        var variants = testData.variants.map(function(v, i) {
          return {
            id: v.id,
            name: v.name,
            isControl: !!v.isControl,
            weight: testData.trafficSplit ? testData.trafficSplit[i] : Math.floor(100 / testData.variants.length),
            elements: v.elements || {},
            config_path: v.config_path || null
          };
        });

        var row = {
          name: testData.name,
          product: testData.product,
          market: testData.market || 'ALL',
          status: testData.status || 'draft',
          traffic_percent: 100,
          variants: variants,
          min_sample_size: testData.minSampleSize || 1000,
          primary_metric: testData.targetMetric || 'register_rate',
          notes: JSON.stringify(meta)
        };
        if (testData.status === 'running') row.started_at = new Date().toISOString();

        var res = await sb().from('ab_tests').insert(row).select('id').single();
        if (res.error) throw res.error;
        this.clearABCache();
        return res.data ? res.data.id : null;
      } catch (e) { console.warn('[SB] createAB err', e); return null; }
    },

    async updateABTest(testId, updates) {
      if (!sb() || !testId) return;
      try {
        var row = {};
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.status !== undefined) {
          row.status = updates.status;
          if (updates.status === 'running' && !updates.skipStartTime) row.started_at = new Date().toISOString();
          if (updates.status === 'completed') row.completed_at = new Date().toISOString();
        }
        if (updates.winner_variant !== undefined) row.winner_variant = updates.winner_variant;
        if (updates.variants !== undefined) row.variants = updates.variants;
        if (updates.notes !== undefined) row.notes = typeof updates.notes === 'string' ? updates.notes : JSON.stringify(updates.notes);

        await sb().from('ab_tests').update(row).eq('id', testId);
        this.clearABCache();
      } catch (e) { console.warn('[SB] updateAB err', e); }
    },

    async refreshABResults(testId) {
      if (!sb() || !testId) return;
      try {
        await sb().rpc('refresh_ab_results', { p_test_id: testId });
      } catch (e) { console.warn('[SB] refreshABResults err', e); }
    }
  };

  // Auto-init
  function doInit() {
    SBSync.init().catch(function(e) { console.error('[SB] init failed:', e); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit);
  } else {
    doInit();
  }
})();
