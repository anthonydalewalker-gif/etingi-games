# Adding a game to the catalog
Edit `site/games.json` (the only file to change). Add an object to `games`; put a square icon (512px PNG/SVG) in `site/icons/`.
Fields: `id, name, tagline, description, icon, url, plannedUrl, category, tags[], accounts (required|optional|none), offline, owner, featured, status (live|coming-soon)`.
Same field names as Walker Games' `apps.json` (pwa-hub), plus the extras above, so entries can be copied across.
- Game App Creator: Run N Rumble entry is seeded — confirm `url`/`plannedUrl` and set `accounts` once cloud saves exist.
- Walker Games: Tic-Tac-Toe entry is seeded (URL confirmed); add more games by copying an entry.
Validate with `python3 -m json.tool site/games.json` before uploading.
