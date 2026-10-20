# Etingi shared login widget (v1)

One drop-in script gives any game the Etingi sign-in / user menu, backed by Supabase project `vrfwzpykuisesbbukxrp`
(same accounts as Chess Legends). Files: `shared/etingi-config.js`, `shared/etingi-auth.js`, `shared/etingi-auth.css`, `shared/supabase.js` (supabase-js v2 UMD, loaded automatically if `window.supabase` is missing).

## Include
```html
<script src="https://etingi.com/shared/etingi-config.js"></script>
<script src="https://etingi.com/shared/etingi-auth.js"></script>   <!-- loads its own CSS + supabase.js -->
<div id="account"></div>
<script>
  EtingiAuth.mountMenu('#account');               // "Log in" button, or avatar + username menu (Profile, All games, Log out)
  EtingiAuth.onChange(user => { /* null or {id,email,profile:{username,elo,...}} */ });
  // when an action needs an account (cloud save, ranked play):
  async function save() { const user = await EtingiAuth.requireLogin(); /* opens modal if needed */
    const sb = EtingiAuth.client; /* same supabase client, RLS applies */ }
</script>
```
Until etingi.com is live, use the preview/hub URL or copy the 4 files into your game (relative paths work).
Guest/offline play: don't call `requireLogin()` at startup; the widget never blocks a game. If the network is down, `init()` rejects and the menu just shows "Log in".

## API
`init(opts?)` · `mountMenu(el, {profileUrl, hubUrl})` · `onChange(fn)` → unsubscribe · `requireLogin()` → user · `signOut()` ·
`open(mode)` modes `login|signup|forgot|resend|reset` · `render(el, mode, {onDone, redirect})` (inline form) · `client` · `user` · `profile` · `reloadProfile()` · `toast(text)`.
Restyle with CSS variables `--ea-bg --ea-fg --ea-muted --ea-accent --ea-accent2 --ea-field --ea-border --ea-radius --ea-font`.

Login accepts email (signInWithPassword) or username (existing `account` edge function, action `login`). Signup = email + username
(`username_available` RPC) + password, with confirmation email. Email links come back to the page that sent them (`emailRedirectTo` = current page), so that page must be on the Supabase redirect allow list.

## Sessions across games
- On any `*.etingi.com` host (and etingi.com itself) the session is stored in chunked cookies `etingi-auth.*` with `domain=.etingi.com; secure; samesite=lax` → log in once, logged in on every subdomain game. Tabs/sites re-sync when a tab becomes visible.
- On other hosts (netlify.app, github.io, hostc preview, localhost) it falls back to `localStorage` key `etingi-auth`, which is **per origin**: same account works, but players log in again per domain.
- Paths under one origin (`etingi.com/run-n-rumble/`) share the session automatically.
- Security: every `*.etingi.com` subdomain can read the session cookie — only host trusted first-party games there.
- Chess Legends currently uses storageKey `chess-legends-online` in localStorage; it must switch to this widget (or key + cookie storage) to share sessions.

## Backend status (done by Strategy Game Creator, Oct 20 2026)
- site_url `https://etingi.com`; redirect list includes `etingi.com/**`, `*.etingi.com/**` and the preview URL.
- `account` edge function CORS allows etingi.com, *.etingi.com, github.io, the Netlify chess site, the preview and localhost.
- `profiles.display_name` (≤40) and `avatar_url` (https, ≤500) are editable by the owner (`profiles_update_own`; UPDATE granted only on those 2 columns).
  Username changes: `rpc('change_username', {new_username})` (3–16 `[A-Za-z0-9_]`, case-insensitive unique).
- The user menu shows `display_name` (falling back to username) and the avatar image if set.
