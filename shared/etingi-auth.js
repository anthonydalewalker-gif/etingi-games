/*! Etingi Games shared login widget v1.4 (guest play + All Games back button) — https://www.etingi.com/shared/etingi-auth.js
 * Classic script (no bundler). Exposes window.EtingiAuth. See WIDGET.md. */
(function () {
  'use strict';
  var SCRIPT = document.currentScript;
  var BASE = SCRIPT ? SCRIPT.src.replace(/[^/]*$/, '') : '/shared/';
  var CFG = Object.assign({ storageKey: 'etingi-auth', cookieDomain: '.etingi.com', hubUrl: (/(^|\.)etingi\.com$/.test(location.hostname) ? location.origin + '/' : 'https://www.etingi.com/') },
    window.ETINGI_CONFIG || {});
  var state = { sb: null, user: null, profile: null, recovery: false, listeners: [], ready: null };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // capture email-link params before supabase-js consumes them
  var HP = new URLSearchParams(location.hash.replace(/^#/, '')), QP = new URLSearchParams(location.search);
  var LINK = HP.get('access_token') ? (HP.get('type') || 'link') : (HP.get('error_description') || QP.get('error_description')) ? 'error' : null;
  var LINKERR = HP.get('error_description') || QP.get('error_description') || '';

  // ---- password-reset completion marker (stops a second "choose a new password" prompt) ----
  var RDONE = 'etingi.pwreset.done';
  function recoveryDone() { try { var t = +(sessionStorage.getItem(RDONE) || localStorage.getItem(RDONE) || 0); return t > 0 && Date.now() - t < 3600e3; } catch (e) { return false; } }
  function markRecoveryDone() {
    state.recovery = false;
    try { sessionStorage.setItem(RDONE, String(Date.now())); localStorage.setItem(RDONE, String(Date.now())); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} // drop #access_token…&type=recovery
    if (useCookie) state.last = cookieStorage.getItem(CFG.storageKey); // session refresh after the save must not trigger a reload
  }
  // A fresh recovery link starts a new reset, so forget an old marker.
  if (LINK === 'recovery') { try { sessionStorage.removeItem(RDONE); localStorage.removeItem(RDONE); } catch (e) {} }

  // ---- dedicated password-reset page (always a clean hub page, never a game) ----
  function resetBase() {
    if (CFG.resetUrl) return CFG.resetUrl;
    var u = BASE.replace(/shared\/$/, '') + 'account.html';
    return u.replace(/^https:\/\/etingi\.com\//, 'https://www.etingi.com/');
  }
  function resetUrl(ret) { return resetBase() + '?mode=reset' + (ret ? '&return=' + encodeURIComponent(ret) : ''); }
  function onResetPage() { var r = resetBase().split('?')[0].replace(/\.html$/, ''); var h = (location.origin + location.pathname).replace(/\.html$/, ''); return h.replace('://etingi.com', '://www.etingi.com') === r && /[?&]mode=reset\b/.test(location.search); }
  // A recovery link that landed on a game page (old emails, server-sent links): move it to the reset page, keeping the tokens.
  if (LINK === 'recovery' && !onResetPage()) {
    try { location.replace(resetUrl(location.origin + location.pathname) + location.hash); } catch (e) {}
    return;
  }

  // ---- storage: chunked cookie on .etingi.com when served from etingi.com, else localStorage ----
  var useCookie = CFG.cookieDomain && location.hostname.replace(/^\./, '').endsWith(CFG.cookieDomain.replace(/^\./, ''));
  var CH = 3000;
  function readCookie(n) { var m = document.cookie.match('(?:^|; )' + n.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : null; }
  function writeCookie(n, v, maxAge) { document.cookie = n + '=' + encodeURIComponent(v) + '; domain=' + CFG.cookieDomain + '; path=/; max-age=' + maxAge + '; secure; samesite=lax'; }
  var cookieStorage = {
    getItem: function (k) { var c = readCookie(k + '.n'); if (c == null) return null; var s = ''; for (var i = 0; i < +c; i++) { var p = readCookie(k + '.' + i); if (p == null) return null; s += p; } return s; },
    setItem: function (k, v) { cookieStorage.removeItem(k); var n = Math.ceil(v.length / CH) || 1; for (var i = 0; i < n; i++) writeCookie(k + '.' + i, v.slice(i * CH, (i + 1) * CH), 34560000); writeCookie(k + '.n', String(n), 34560000); },
    removeItem: function (k) { var c = +(readCookie(k + '.n') || 0); for (var i = 0; i < Math.max(c, 8); i++) writeCookie(k + '.' + i, '', 0); writeCookie(k + '.n', '', 0); }
  };

  function load(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); }); }
  function css() { if (document.getElementById('etingi-auth-css')) return; var l = document.createElement('link'); l.id = 'etingi-auth-css'; l.rel = 'stylesheet'; l.href = BASE + 'etingi-auth.css'; document.head.appendChild(l); }

  function emit() { var u = state.user ? Object.assign({}, state.user, { profile: state.profile }) : null; state.listeners.forEach(function (f) { try { f(u); } catch (e) { console.error(e); } }); }
  async function loadProfile() {
    if (!state.user) { state.profile = null; return null; }
    var r = await state.sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    state.profile = r.data || null; return state.profile;
  }

  async function init(opts) {
    if (state.ready) return state.ready;
    state.ready = (async function () {
      Object.assign(CFG, opts || {});
      css();
      if (!window.supabase) await load(BASE + 'supabase.js');
      state.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: {
        persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit',
        storageKey: CFG.storageKey, storage: useCookie ? cookieStorage : window.localStorage } });
      state.sb.auth.onAuthStateChange(function (ev, s) {
        var prev = state.user && state.user.id; state.user = s ? s.user : null;
        if (ev === 'PASSWORD_RECOVERY' && LINK === 'recovery' && !recoveryDone()) { state.recovery = true; if (!onResetPage()) setTimeout(function () { open('reset'); }, 0); }
        if ((state.user && state.user.id) !== prev) loadProfile().then(emit, emit);
      });
      var d = await state.sb.auth.getSession(); state.user = d.data.session ? d.data.session.user : null;
      try { await loadProfile(); } catch (e) {}
      emit();
      if (LINK) setTimeout(handleLink, 0);
      // pick up logins/logouts made in other tabs or sibling subdomains
      if (useCookie) { state.last = cookieStorage.getItem(CFG.storageKey); document.addEventListener('visibilitychange', function () { if (document.visibilityState !== 'visible') return; var now = cookieStorage.getItem(CFG.storageKey); if (now !== state.last) { state.last = now; location.reload(); } }); }
      return api;
    })();
    return state.ready;
  }

  function handleLink() {
    history.replaceState(null, '', location.pathname + location.search.replace(/[?&]error[^&]*/g, ''));
    if (LINK === 'error' && onResetPage()) return;
    if (LINK === 'error') return open('login', { msg: 'That email link didn\'t work: ' + LINKERR + '. Links expire and work once; request a new one.' });
    if ((LINK === 'recovery' || state.recovery) && !recoveryDone()) return onResetPage() ? null : open('reset');
    if (state.user) toast(LINK === 'signup' ? '✅ Email confirmed. Welcome to Etingi Games!' : '✅ You\'re logged in.');
  }

  // ---- errors ----
  function errText(e) {
    var clean = function (v) { if (v == null) return ''; if (typeof v !== 'string') { try { v = v.message || v.msg || JSON.stringify(v); } catch (x) { v = ''; } } v = String(v).trim(); return /^(\{\}|\[\]|null|undefined|\[object Object\])$/.test(v) ? '' : v; };
    var m = typeof e === 'string' ? clean(e) : [e && e.code, e && e.error_code, e && e.error, e && e.msg, e && e.message].map(clean).filter(Boolean).join(' ');
    var st = e && typeof e === 'object' ? (e.status || 0) : 0; var n = m.replace(/_/g, ' ');
    if (!n && st >= 500) return 'Our server couldn\'t finish this right now (it may not be able to send email to that address yet). Please try again later.';
    if (!n) return 'Something went wrong' + (st ? ' (error ' + st + ')' : '') + '. Please try again.';
    if (/invalid.?credentials|invalid login/i.test(n)) return 'Wrong email/username or password.';
    if (/not confirmed/i.test(n)) return 'Please confirm your email first. Check your inbox (and spam) for the link.';
    if (/already registered|user already exists/i.test(n)) return 'An account with this email already exists. Log in, or use "Forgot password?".';
    if (/weak|password should/i.test(n)) return 'Please choose a stronger password (at least 8 characters).';
    if (/rate limit|too many|429/i.test(n)) return 'Too many attempts or emails right now. Please wait a few minutes.';
    if (/not authori[sz]ed|error sending|could not send/i.test(n)) return 'We couldn\'t send email to that address yet. Please try again later.';
    if (/redirect/i.test(n)) return 'This site isn\'t on the login redirect list yet (setup in progress).';
    if (/database error saving new user|23505|23514|invalid username/i.test(n)) return 'That username isn\'t available. Try another.';
    if (/fetch|network|connection/i.test(n)) return 'Couldn\'t reach the server. Check your connection.';
    return 'Something went wrong (' + n.slice(0, 80) + ').';
  }
  async function invoke(fn, body) {
    var r = await state.sb.functions.invoke(fn, { body: body });
    if (r.error) { var j = null; try { j = await r.error.context.json(); } catch (e) {} return { error: (j && j.error) || (/fetch|network/i.test(r.error.message || '') ? 'Connection problem' : 'Server error') }; }
    return r.data || {};
  }
  var emailOk = function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); };
  function here() { return location.origin + location.pathname; }

  // ---- auth forms (render into any element) ----
  function render(el, mode, o) {
    o = o || {}; var L = mode === 'login', S = mode === 'signup', F = mode === 'forgot', R = mode === 'reset', RS = mode === 'resend';
    var title = L ? 'Log in' : S ? 'Create your account' : F ? 'Forgot your password?' : R ? 'Choose a new password' : RS ? 'Resend confirmation email' : 'Check your email';
    if (mode === 'sent') {
      el.innerHTML = '<div class="ea-form"><h2>📧 Check your email</h2><p>' + (o.kind === 'confirm' ? 'We sent a confirmation link to <b>' + esc(o.email) + '</b>. Click it to activate your account.' : 'If an account exists' + (o.email ? ' for <b>' + esc(o.email) + '</b>' : '') + ', we sent a link to choose a new password.') + '</p><p class="ea-note">Nothing after a few minutes? Check spam.</p><div class="ea-msg"></div><div class="ea-row">' + (o.kind === 'confirm' ? '<button type="button" class="ea-btn ea-alt" data-a="re2">Resend</button>' : '') + '<button type="button" class="ea-btn" data-go="login">Go to log in</button></div></div>';
    } else {
      el.innerHTML = '<form class="ea-form" novalidate><h2>' + title + '</h2>' +
        ((L || S) ? '<div class="ea-tabs"><button type="button" class="' + (L ? 'on' : '') + '" data-go="login">Log in</button><button type="button" class="' + (S ? 'on' : '') + '" data-go="signup">New account</button></div>' : '') +
        (L ? '<label>Email or username<input name="id" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="254" value="' + esc(o.id) + '"></label><label>Password<input name="p" type="password" autocomplete="current-password"></label>' : '') +
        (S ? '<label>Email<input name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com"></label><label>Username <small>(shown to other players)</small><input name="u" autocomplete="nickname" maxlength="16" autocapitalize="off" spellcheck="false" placeholder="3–16 letters, numbers, _"></label><label>Password<input name="p" type="password" autocomplete="new-password" placeholder="at least 8 characters"></label><label>Repeat password<input name="p2" type="password" autocomplete="new-password"></label><label class="ea-check"><input name="beta" type="checkbox"> <span>Email me about new beta games. Optional. We\'ll only use your email for this, and you can turn it off anytime on your profile.</span></label>' : '') +
        (F ? '<p>Enter your email or username and we\'ll email you a reset link.</p><label>Email or username<input name="id" autocomplete="username" autocapitalize="off" spellcheck="false" value="' + esc(o.id) + '"></label>' : '') +
        (RS ? '<p>Enter the email you signed up with.</p><label>Email<input name="email" type="email" autocomplete="email" value="' + esc(o.email) + '"></label>' : '') +
        (R ? '<label>New password<input name="p" type="password" autocomplete="new-password" placeholder="at least 8 characters"></label><label>Repeat new password<input name="p2" type="password" autocomplete="new-password"></label>' : '') +
        '<div class="ea-msg" role="status">' + esc(o.msg) + '</div><button class="ea-btn ea-primary" type="submit">' + (L ? 'Log in' : S ? 'Create account' : F ? 'Send reset link' : R ? 'Save new password' : 'Resend email') + '</button>' +
        (L ? '<div class="ea-row"><button type="button" class="ea-link" data-go="forgot">Forgot password?</button><button type="button" class="ea-link" data-go="resend">Resend confirmation</button></div>' : '') +
        ((F || RS) ? '<div class="ea-row"><button type="button" class="ea-link" data-go="login">◀ Back to log in</button></div>' : '') + '</form>';
    }
    var msg = function (t) { el.querySelector('.ea-msg').textContent = t; };
    el.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { var i = el.querySelector('[name=id]'); render(el, b.dataset.go, Object.assign({}, o, { msg: '', id: i ? i.value.trim() : o.id })); }; });
    var re2 = el.querySelector('[data-a=re2]'); if (re2) re2.onclick = async function () { re2.disabled = true; var r = await state.sb.auth.resend({ type: 'signup', email: o.email, options: { emailRedirectTo: o.redirect || here() } }); msg(r.error ? errText(r.error) : 'Sent again.'); };
    var form = el.querySelector('form'); if (!form) return;
    setTimeout(function () { var f = form.querySelector('input'); if (f && !matchMedia('(pointer:coarse)').matches) f.focus(); }, 30);
    var v = function (n) { var i = form.querySelector('[name=' + n + ']'); return i ? (n[0] === 'p' ? i.value : i.value.trim()) : ''; };
    form.onsubmit = async function (e) {
      e.preventDefault(); var go = form.querySelector('[type=submit]'); go.disabled = true;
      try {
        await init(); var sb = state.sb, redirect = o.redirect || here(), err = null;
        if (L) {
          var id = v('id'), p = v('p'); if (!id || !p) throw 'Enter your email or username and password.'; msg('Logging in…');
          if (id.indexOf('@') > -1) { var r = await sb.auth.signInWithPassword({ email: id, password: p }); if (r.error) err = r.error.code || r.error.message; }
          else { var r2 = await invoke('account', { action: 'login', identifier: id, password: p }); if (r2.error) err = r2.error; else { var s = await sb.auth.setSession({ access_token: r2.access_token, refresh_token: r2.refresh_token }); if (s.error) err = s.error.message; } }
          if (err) throw errText(err);
          msg('✅ Logged in.'); if (o.onDone) o.onDone(); return;
        }
        if (S) {
          var em = v('email'), u = v('u'), p1 = v('p');
          if (!emailOk(em)) throw 'Please enter a valid email address.'; if (!/^[A-Za-z0-9_]{3,16}$/.test(u)) throw 'Username must be 3–16 letters, numbers or _.';
          if (p1.length < 8) throw 'Password must be at least 8 characters.'; if (p1 !== v('p2')) throw 'The passwords don\'t match.';
          msg('Creating account…');
          var av = await sb.rpc('username_available', { p_username: u }); if (av.error) throw errText(av.error); if (!av.data) throw 'That username is taken. Try another.';
          var beta = !!(form.querySelector('[name=beta]') || {}).checked, md = { username: u, beta_emails: beta }; if (beta) md.beta_emails_at = new Date().toISOString();
          var su = await sb.auth.signUp({ email: em, password: p1, options: { data: md, emailRedirectTo: redirect } }); if (su.error) throw errText(su.error);
          if (su.data.user && Array.isArray(su.data.user.identities) && su.data.user.identities.length === 0) throw 'An account with this email already exists. Log in, or use "Forgot password?".';
          if (su.data.session) { if (o.onDone) o.onDone(); return; }
          return render(el, 'sent', Object.assign({}, o, { kind: 'confirm', email: em }));
        }
        if (F) {
          var fid = v('id'); if (!fid) throw 'Enter your email or username.'; msg('Sending…');
          if (fid.indexOf('@') > -1) { if (!emailOk(fid)) throw 'Please enter a valid email address.'; var rr = await sb.auth.resetPasswordForEmail(fid, { redirectTo: resetUrl(o.returnTo || o.redirect || here()) }); if (rr.error) err = rr.error.code || rr.error.message; }
          else { var ri = await invoke('account', { action: 'reset', identifier: fid, redirectTo: resetUrl(o.returnTo || o.redirect || here()) }); if (ri.error) err = ri.error; }
          if (err && !/user.?not.?found/i.test(err)) throw errText(err);
          return render(el, 'sent', Object.assign({}, o, { kind: 'reset', email: fid.indexOf('@') > -1 ? fid : '' }));
        }
        if (RS) {
          var re = v('email'); if (!emailOk(re)) throw 'Please enter a valid email address.'; msg('Sending…');
          var rs = await sb.auth.resend({ type: 'signup', email: re, options: { emailRedirectTo: redirect } }); if (rs.error) throw errText(rs.error);
          msg('📧 If that account is waiting for confirmation, a new link is on its way.'); go.disabled = false; return;
        }
        if (R) {
          var np = v('p'); if (np.length < 8) throw 'Password must be at least 8 characters.'; if (np !== v('p2')) throw 'The passwords don\'t match.';
          msg('Saving…'); var up = await sb.auth.updateUser({ password: np });
          if (up.error) throw (/session|jwt|missing/i.test(up.error.message) ? 'This reset link has expired or you aren\'t signed in via a reset link. Request a new one from "Forgot password?".' : errText(up.error));
          markRecoveryDone(); msg('🔑 Password updated. You\'re logged in.'); if (o.onDone) o.onDone(); return;
        }
      } catch (ex) { go.disabled = false; msg(typeof ex === 'string' ? ex : errText(ex)); }
    };
  }

  // ---- modal ----
  var modal;
  function close() { if (modal) { modal.remove(); modal = null; } }
  function open(mode, o) {
    css(); close(); o = o || {};
    modal = document.createElement('div'); modal.className = 'ea-overlay';
    modal.innerHTML = '<div class="ea-modal" role="dialog" aria-modal="true"><button class="ea-x" aria-label="Close">✕</button><div class="ea-body"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.ea-x').onclick = function () { close(); if (o.onCancel) o.onCancel(); };
    modal.onclick = function (e) { if (e.target === modal) { close(); if (o.onCancel) o.onCancel(); } };
    var done = o.onDone; o.onDone = function () { setTimeout(close, 400); if (done) done(); };
    render(modal.querySelector('.ea-body'), mode || 'login', o);
  }
  function toast(t) { css(); var d = document.createElement('div'); d.className = 'ea-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3500); }

  // ---- user menu ----
  function mountMenu(target, o) {
    o = o || {}; var el = typeof target === 'string' ? document.querySelector(target) : target; if (!el) return;
    css(); el.classList.add('ea-menu');
    function draw(u) {
      if (!u) { el.innerHTML = '<button class="ea-btn ea-primary ea-sm" data-a="in">' + esc(o.guestLabel || 'Sign in') + '</button>'; el.querySelector('[data-a=in]').onclick = function () { open('login'); }; return; }
      var name = (u.profile && (u.profile.display_name || u.profile.username)) || (u.email || '').split('@')[0];
      el.innerHTML = '<button class="ea-chip" aria-haspopup="true"><span class="ea-av">' + (u.profile && u.profile.avatar_url ? '<img src="' + esc(u.profile.avatar_url) + '" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover">' : esc(name.slice(0, 1).toUpperCase())) + '</span><span class="ea-nm">' + esc(name) + '</span> ▾</button><div class="ea-dd" hidden><div class="ea-dd-h">Signed in as<br><b>' + esc(name) + '</b></div><a href="' + esc(o.profileUrl || CFG.hubUrl + 'profile.html') + '">👤 Profile</a><a href="' + esc(o.hubUrl || CFG.hubUrl) + '">🎮 All games</a><button data-a="out">🚪 Log out</button></div>';
      var dd = el.querySelector('.ea-dd');
      el.querySelector('.ea-chip').onclick = function (e) { e.stopPropagation(); dd.hidden = !dd.hidden; };
      document.addEventListener('click', function () { dd.hidden = true; });
      el.querySelector('[data-a=out]').onclick = function () { signOut(); };
    }
    draw(null); onChange(draw); init();
  }
  function onChange(f) { state.listeners.push(f); if (state.sb) f(state.user ? Object.assign({}, state.user, { profile: state.profile }) : null); return function () { state.listeners = state.listeners.filter(function (x) { return x !== f; }); }; }
  async function signOut() { await init(); await state.sb.auth.signOut().catch(function () {}); if (useCookie) cookieStorage.removeItem(CFG.storageKey); state.user = null; state.profile = null; emit(); toast('🚪 Logged out'); }
  async function requireLogin() {
    await init(); if (state.user) return Object.assign({}, state.user, { profile: state.profile });
    return new Promise(function (res, rej) { open('login', { onDone: function () { setTimeout(function () { res(Object.assign({}, state.user, { profile: state.profile })); }, 300); }, onCancel: function () { rej(new Error('login cancelled')); } }); });
  }

  // ---- guest play + soft (non-blocking) sign-in prompt ----
  function isGuest() { return !state.user; }
  function cur() { return state.user ? Object.assign({}, state.user, { profile: state.profile }) : null; }
  var bar;
  function promptSave(o) {
    o = o || {}; css();
    return init().then(function () {
      if (state.user) return cur();
      var key = 'etingi-soft-prompt-' + (o.id || 'default');
      if (!o.force) { try { if (sessionStorage.getItem(key)) return null; } catch (e) {} }
      return new Promise(function (res) {
        if (bar) bar.remove();
        bar = document.createElement('div'); bar.className = 'ea-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Save your progress');
        bar.innerHTML = '<span>' + esc(o.text || '💾 Playing as guest. Sign in to save your progress.') + '</span><button class="ea-btn ea-primary ea-sm" data-a="in">Sign in</button><button class="ea-btn ea-sm" data-a="up">Create free account</button><button class="ea-x2" data-a="no" aria-label="Not now">Not now</button>';
        document.body.appendChild(bar);
        var fin = function (v) { if (bar) { bar.remove(); bar = null; } res(v); };
        var go = function (m) { open(m, { redirect: o.redirect || location.href, onDone: function () { setTimeout(function () { fin(cur()); }, 300); } }); };
        bar.querySelector('[data-a=in]').onclick = function () { go('login'); };
        bar.querySelector('[data-a=up]').onclick = function () { go('signup'); };
        bar.querySelector('[data-a=no]').onclick = function () { try { sessionStorage.setItem(key, '1'); } catch (e) {} fin(null); };
        if (o.timeout) setTimeout(function () { if (bar) fin(null); }, o.timeout);
      });
    }).catch(function () { return null; });
  }
  // beta-games email opt-in, stored in Supabase auth user_metadata (owner-writable, no schema change)
  function betaEmails() { return !!(state.user && state.user.user_metadata && state.user.user_metadata.beta_emails === true); }
  async function setBetaEmails(on) {
    await init(); if (!state.user) throw new Error('Not signed in');
    var d = { beta_emails: !!on }; d[on ? 'beta_emails_at' : 'beta_emails_off_at'] = new Date().toISOString();
    var r = await state.sb.auth.updateUser({ data: d }); if (r.error) throw r.error; state.user = r.data.user; emit(); return !!on;
  }

  // ---- "← All Games" back button (v1.4): auto on game pages, opt-out / reposition per game ----
  var backEl = null;
  function gamesUrl() { return (CFG.hubUrl || 'https://www.etingi.com/').replace(/\/?$/, '/') + 'games.html'; }
  function isHubPage() {
    var p = (location.pathname || '/').replace(/\/+$/, '') || '/';
    var base = p.split('/').pop() || '';
    if (p === '/' || p === '') return true;
    if (/^(index|games|account|profile)(\.html)?$/i.test(base) && p.split('/').filter(Boolean).length <= 1) return true;
    // local hub preview: /site/index.html etc.
    if (/\/(index|games|account|profile)(\.html)?$/i.test(p) && !/\/(chess|run-n-rumble|tictactoe|games)\//i.test(p)) {
      var segs = p.split('/').filter(Boolean);
      if (segs.length <= 2) return true;
    }
    return false;
  }
  function backAttr() {
    var s = SCRIPT && SCRIPT.getAttribute && SCRIPT.getAttribute('data-etingi-back');
    if (s == null || s === '') {
      try { s = document.documentElement.getAttribute('data-etingi-back') || document.body && document.body.getAttribute('data-etingi-back'); } catch (e) { s = null; }
    }
    return s == null ? '' : String(s).trim();
  }
  function removeBack() { if (backEl && backEl.parentNode) backEl.parentNode.removeChild(backEl); backEl = null; }
  function buildBack(href) {
    css();
    var a = document.createElement('a');
    a.className = 'ea-back';
    a.href = href || gamesUrl();
    a.setAttribute('aria-label', 'Back to all games');
    a.innerHTML = '<span class="ea-back-arrow" aria-hidden="true">←</span><span class="ea-back-label">All Games</span>';
    return a;
  }
  function placeFixed(el) {
    el.classList.add('ea-back-fixed');
    // Run N Rumble parks #account top-left on title/pause, and icons sit top-right — sit just under the account chip.
    if (/\/run-n-rumble(\/|$)/i.test(location.pathname)) el.classList.add('ea-back-rnr');
    // Chess HUD topbar spans the top on phones; nudge slightly so the pill sits in the safe corner.
    if (/\/chess(\/|$)/i.test(location.pathname)) el.classList.add('ea-back-chess');
    document.body.appendChild(el);
  }
  function mountBack(target) {
    css();
    if (target === false || target === null || target === 'off' || target === 'false' || target === '0') {
      removeBack(); return null;
    }
    removeBack();
    var href = gamesUrl();
    if (target === undefined || target === true || target === 'auto') {
      backEl = buildBack(href);
      placeFixed(backEl);
      return backEl;
    }
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    // If they pass a container, put the link inside it (unfixed).
    if (el.tagName && el.tagName.toLowerCase() === 'a' && el.classList.contains('ea-back')) {
      backEl = el; return backEl;
    }
    backEl = buildBack(href);
    backEl.classList.remove('ea-back-fixed', 'ea-back-tr', 'ea-back-rnr', 'ea-back-chess');
    el.appendChild(backEl);
    return backEl;
  }
  function autoBack() {
    var attr = backAttr().toLowerCase();
    if (attr === 'off' || attr === 'false' || attr === '0' || attr === 'no') return;
    if (isHubPage()) return;
    if (attr && attr !== 'on' && attr !== 'auto' && attr !== 'true' && attr !== 'yes') {
      // treat as selector
      if (document.querySelector(attr)) return mountBack(attr);
    }
    mountBack('auto');
  }
  // mount after DOM is ready so body exists and data-etingi-back on <body> is readable
  function scheduleAutoBack() {
    var go = function () { try { autoBack(); } catch (e) { console.error(e); } };
    if (document.body) go();
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else setTimeout(go, 0);
  }
  scheduleAutoBack();

  var api = {
    isGuest: isGuest, onAuthChange: onChange, promptSave: promptSave, getBetaEmails: betaEmails, setBetaEmails: setBetaEmails, get ready() { return init(); },
    version: '1.4.0', resetUrl: resetUrl, get recovery() { return state.recovery && !recoveryDone(); }, get recoveryDone() { return recoveryDone(); }, linkType: LINK, linkError: LINKERR, init: init, mountMenu: mountMenu, mountBack: mountBack, onChange: onChange, requireLogin: requireLogin, signOut: signOut,
    open: open, close: close, render: render, toast: toast, errText: errText,
    get client() { return state.sb; }, get user() { return state.user; }, get profile() { return state.profile; },
    reloadProfile: function () { return loadProfile().then(function (p) { emit(); return p; }); },
    get usesSharedCookie() { return !!useCookie; }, config: CFG, gamesUrl: gamesUrl
  };
  window.EtingiAuth = api;
})();
