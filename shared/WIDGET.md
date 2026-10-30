# Etingi shared login widget (v1.4)

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
Guest/offline play: see the guest section below; the widget never blocks a game. If the network is down, `init()` rejects and the menu just shows "Log in".

## Guest play + optional sign-in (v1.3, Oct 24 2026: A.D's rule)
Every Etingi game is **free to play as a guest**. Sign-in is optional and only saves progress. **Do not include `etingi-gate.js`** (deprecated) and do not call `requireLogin()` at startup.
```js
await EtingiAuth.ready;                    // same as init(); resolves even for guests
EtingiAuth.isGuest()                       // true when nobody is signed in
EtingiAuth.onAuthChange(u => { ... })      // alias of onChange: null (guest) or user; fires on sign-in/out
// Soft, non-blocking prompt (bottom bar: "Sign in" / "Create free account" / "Not now"). Never covers the game.
const user = await EtingiAuth.promptSave({ id: 'my-game', text: '💾 Sign in to save your progress.' });
// -> user object if they signed in, null if they chose "Not now" (remembered for this tab session per id; pass force:true to show anyway)
EtingiAuth.mountMenu('#account', { guestLabel: 'Sign in to save' })  // guest button label (default "Sign in")
EtingiAuth.getBetaEmails() / await EtingiAuth.setBetaEmails(true|false)  // beta-games email opt-in (signed-in users)
```
Pattern for saving: always save locally (localStorage) for guests; when `!isGuest()`, also save to your Supabase table (RLS on `auth.uid()`). Call `promptSave()` at a natural moment (after a win, level end), not on load. On `onAuthChange(user)` merge the local guest save into the cloud save.

Beta-email opt-in is stored in Supabase auth `user_metadata` (`beta_emails` boolean, `beta_emails_at` / `beta_emails_off_at` ISO timestamps). It is set from the unchecked-by-default box on signup and the toggle on profile.html.

## "← All Games" back button (v1.4, Oct 27 2026)
On every **game** page that loads the widget, a small fixed pill appears (top-left by default) linking to `https://www.etingi.com/games.html`. It is **not** shown on hub pages (`index`, `games`, `account`, `profile`). Colors match the Etingi logo (cyan → orange). Safe-area padding is included for notched iPhones.

```html
<!-- default: auto on game pages -->
<script src="../shared/etingi-auth.js"></script>

<!-- opt out -->
<script src="../shared/etingi-auth.js" data-etingi-back="off"></script>
<!-- or on <html>/<body>: data-etingi-back="off" -->

<!-- mount into your own element (unfixed) -->
<script src="../shared/etingi-auth.js" data-etingi-back="#my-back-slot"></script>
```
```js
EtingiAuth.mountBack()            // force the default fixed pill
EtingiAuth.mountBack('#slot')     // put the link inside an element you own
EtingiAuth.mountBack(false)       // remove / disable
EtingiAuth.gamesUrl()             // hub games list URL
```
Built-in placement tweaks: **Run N Rumble** sits just under its top-left account chip (icons already own top-right); **Chess** uses a slightly tighter top-left pill so it sits in the safe corner beside the HUD topbar. Override with `mountBack(el)` or `data-etingi-back` if you need a different spot.


## API
`init(opts?)` · `mountMenu(el, {profileUrl, hubUrl})` · `mountBack(el|false)` · `gamesUrl()` · `onChange(fn)` → unsubscribe · `requireLogin()` → user · `signOut()` ·
`isGuest()` · `onAuthChange(fn)` · `promptSave(opts)` · `getBetaEmails()` · `setBetaEmails(bool)` · `ready` · `open(mode)` modes `login|signup|forgot|resend|reset` · `render(el, mode, {onDone, redirect})` (inline form) · `client` · `user` · `profile` · `reloadProfile()` · `toast(text)`.
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
