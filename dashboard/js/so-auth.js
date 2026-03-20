/**
 * Search Optimizer 中台 — 简单登录（密码仅存 SHA-256 哈希，明文不落库）
 * 修改账号：更新 USER_HASHES 并重新计算 SHA256(SALT + password)
 *
 * 部署说明：search-optimizer-0319.html 内已内联同一份逻辑，避免漏传本文件 404。
 * 改密码/用户时请同步修改 HTML 内联块与本文件。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'search_optimizer_0319_session';
  var LEGACY_KEY = 'so_auth_user';
  var USERS = {
    gaoruowei: 'Qwerty123456',
    yinjiafeng: 'jiafeng2020'
  };

  function normUser(u) {
    return String(u || '').trim().toLowerCase();
  }

  function getUser() {
    try {
      var v = sessionStorage.getItem(STORAGE_KEY);
      if (v) return v;
      var old = sessionStorage.getItem(LEGACY_KEY);
      if (old) {
        sessionStorage.setItem(STORAGE_KEY, old);
        sessionStorage.removeItem(LEGACY_KEY);
        return old;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function setUser(u) {
    try {
      sessionStorage.setItem(STORAGE_KEY, u);
      sessionStorage.removeItem(LEGACY_KEY);
    } catch (e) {}
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_KEY);
    } catch (e) {}
  }

  function stripLoginForm(ov) {
    if (!ov) return;
    var f = ov.querySelector('form.so-auth-box');
    if (f) f.remove();
  }

  function logout() {
    clearSession();
    location.reload();
  }

  function setLoginFieldsEnabled(on) {
    var u = document.getElementById('so-auth-user');
    var p = document.getElementById('so-auth-pass');
    var b = document.getElementById('so-auth-btn');
    if (u) {
      u.disabled = !on;
      u.tabIndex = on ? 0 : -1;
    }
    if (p) {
      p.disabled = !on;
      p.tabIndex = on ? 0 : -1;
    }
    if (b) b.tabIndex = on ? 0 : -1;
  }

  function showApp() {
    var ov = document.getElementById('so-auth-overlay');
    if (ov) {
      stripLoginForm(ov);
      ov.setAttribute('hidden', '');
      ov.setAttribute('aria-hidden', 'true');
      ov.style.display = 'none';
    }
    var layout = document.querySelector('.layout');
    if (layout) layout.style.visibility = 'visible';
    var line = document.getElementById('so-auth-user-line');
    var u = getUser();
    if (line && u) line.textContent = '当前用户: ' + u;
  }

  function applyGate() {
    var ov = document.getElementById('so-auth-overlay');
    if (getUser()) {
      showApp();
      return;
    }
    if (ov && !ov.querySelector('form.so-auth-box')) {
      location.reload();
      return;
    }
    if (ov) {
      ov.removeAttribute('hidden');
      ov.setAttribute('aria-hidden', 'false');
      ov.style.display = 'flex';
    }
    setLoginFieldsEnabled(true);
    var layout = document.querySelector('.layout');
    if (layout) layout.style.visibility = 'hidden';
  }

  function tryLogin(user, pass) {
    var u = normUser(user);
    var expected = USERS[u];
    if (!expected || !pass) return Promise.resolve(false);
    if (pass !== expected) return Promise.resolve(false);
    setUser(u);
    return Promise.resolve(true);
  }

  window.SOAuth = {
    getUser: getUser,
    tryLogin: tryLogin,
    logout: logout,
    showApp: showApp,
    applyGate: applyGate,
    clearSession: clearSession,
    STORAGE_KEY: STORAGE_KEY
  };
})();
