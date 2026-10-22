/* Etingi sign-in gate. Include right after etingi-auth.js on any game page.
 * Hides the game behind a full-screen sign-in screen until a player is signed in
 * (shared .etingi.com session). After sign-in or email confirmation the page reloads into the game. */
(function () {
  var st = document.createElement('style');
  st.textContent = 'html.eg-locked body>*:not(#eg-gate):not(.ea-overlay):not(.ea-toast){visibility:hidden!important}' +
    'html.eg-locked,html.eg-locked body{overflow:hidden!important}' +
    '#eg-gate{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 30% 20%,#1b2350,#0a0d1c 70%);color:#eef;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center}' +
    '#eg-gate .c{max-width:420px}#eg-gate h1{font-size:28px;margin:0 0 8px}#eg-gate p{opacity:.85;margin:0 0 20px}' +
    '#eg-gate button,#eg-gate a.b{display:inline-block;margin:6px;padding:12px 22px;border-radius:12px;border:0;font:600 16px system-ui;cursor:pointer;text-decoration:none}' +
    '#eg-gate .p{background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff}#eg-gate .s{background:#ffffff1a;color:#eef}' +
    '#eg-gate small{display:block;margin-top:28px;opacity:.6}#eg-gate .ld{opacity:.7}';
  document.head.appendChild(st);
  document.documentElement.classList.add('eg-locked');
  var hub = (window.ETINGI_GATE_HUB || 'https://www.etingi.com/');
  function gate() {
    var g = document.getElementById('eg-gate');
    if (!g) { g = document.createElement('div'); g.id = 'eg-gate'; document.body.appendChild(g); }
    return g;
  }
  function show(html) { var put = function () { gate().innerHTML = html; wire(); }; document.body ? put() : document.addEventListener('DOMContentLoaded', put); }
  var name = document.title.split(/[–:|-]/)[0].trim() || 'this game';
  function wire() {
    var g = document.getElementById('eg-gate'); if (!g) return;
    g.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { EtingiAuth.open(b.dataset.m, { redirect: location.href, onDone: function () { setTimeout(function () { location.reload(); }, 500); } }); }; });
  }
  show('<div class="c ld">Checking your Etingi account…</div>');
  function unlock() { document.documentElement.classList.remove('eg-locked'); var g = document.getElementById('eg-gate'); if (g) g.remove(); }
  function lock() {
    document.documentElement.classList.add('eg-locked');
    show('<div class="c"><div style="font-size:48px">🔐</div><h1>Sign in to play</h1><p>' + name.replace(/[<>&]/g, '') + ' is part of Etingi Games. Log in or create a free account to play. One account works in every game.</p>' +
      '<button class="p" data-m="login">Log in</button><button class="s" data-m="signup">Create free account</button>' +
      '<p style="margin-top:18px"><a class="b s" href="' + hub + '">← Back to Etingi Games</a></p><small>Created by AD Walker Builds</small></div>');
  }
  if (!window.EtingiAuth) { lock(); return; }
  EtingiAuth.init().then(function () { EtingiAuth.onChange(function (u) { u ? unlock() : lock(); }); })
    .catch(function () { lock(); });
})();
