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
      var keys = ['gemini_api_key', 'gemini_model'];

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

    async saveSnapshot(dataType, snapshotDate, data, recordCount) {
      if (!sb()) return;
      try {
        await sb().from('adw_snapshots').upsert({
          data_type: dataType, snapshot_date: snapshotDate,
          data: data, record_count: recordCount,
          created_at: new Date().toISOString()
        }, { onConflict: 'snapshot_date,data_type' });
      } catch (e) { console.warn('[SB] saveSnap err', e); }
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
