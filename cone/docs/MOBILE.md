# Cone — Android/iOS Publishing Assessment

Written 2026-07-09. **Recommendation: do nothing now.** Horizon is single-coach/single-box for 6+ months and the backlog covers current needs. This doc exists so the decision is pre-made and costed when a trigger fires — it creates no backlog items.

**Revisit triggers:** (a) expansion beyond one box becomes real; (b) athlete identity ships (#30/#31 — athletes, not the coach, are the store-app audience); (c) chunk-hash-404 pain grows enough to justify #29+service-worker on its own merits.

## Where Cone already stands (better than assumed)

Discovered during the 2026-07-09 benchmark walk: **Cone is already ~60% of a PWA.**

- A complete **`manifest.json`** (repo root) is linked from every public page: `standalone` display, correct `/CrossFit-Apps/` scope + start_url, 192/512 maskable icons, theme colors, and app shortcuts (Leaderboard/Agenda/Meu perfil).
- **`Index.jsx:195`** implements a custom in-theme install banner (`beforeinstallprompt` + `appinstalled`) — "Adicionar à tela inicial / Instalar".
- Served over HTTPS on GitHub Pages ⇒ **installable on Android today** (Chrome WebAPK: home-screen icon, standalone window). On iOS, Add-to-Home-Screen works but is manual (Safari share menu; no banner support).
- ✅ **A service worker SHIPPED (corrected 2026-09-05 — this line used to say the opposite).** `sw.js`
  at the repo root is live at `CACHE_VERSION = 'cone-v8'`, precaching 9 HTML pages + `manifest.json`
  with a stale-while-revalidate handler for everything else. `src/public/registerSW.js` registers it
  from **six** public entry points (`index/Index.jsx:92`, `leaderboard/main.jsx:7`, `me/Me.jsx:107`,
  `results/Results.jsx:124`, `schedule/Schedule.jsx:173`, `tema/Tema.jsx:36`). It was hand-rolled, not
  `vite-plugin-pwa`. ⚠️ **`cache.addAll` rejects atomically**, so one 404 in `PRECACHE_URLS` stops the
  worker installing for every user on every page — which is why the retired `athletes.html` stub is
  still in the repo. `tv.html` is built but deliberately not precached.

## Paths, in ascending cost

### 1. ~~Finish the PWA (service worker)~~ — ✅ **ESSENTIALLY DONE (2026-08-05)**
The hand-rolled `sw.js` above covers the offline shell and precache this path was written to buy, so
the near-term step is spent. What it did **not** buy: the SPA build's own assets are not precached
(the worker registers at scope `/CrossFit-Apps/` and precaches public HTML only), and **chunk-hash
404s are not fixed** — that still needs #29 or a Workbox build that precaches each build's
fingerprinted assets. Two builds share one origin, so a full `vite-plugin-pwa` adoption still has to
choose between two SWs with disjoint scopes (`/CrossFit-Apps/` vs `/CrossFit-Apps/cone/`) or one SW
covering both. ⚠️ **On localhost that same scope makes the worker serve precached production assets
over the SPA dev server, with no console error** — see CLAUDE.md's service-worker poisoning note.

### 2. Play Store via TWA (Bubblewrap) — S on top of path 1
Wraps the (finished) PWA for the Play Store. Google Play developer account: **$25 one-time**. Needs Digital Asset Links (`assetlinks.json`) — trivial on Vercel, awkward-but-possible on GH Pages. Android only. Store presence without touching app code.

### 3. Capacitor — M/L, only if iOS App Store presence becomes a business need
Native shell for both stores. Costs: base-path/dual-build rework (webDir expects one self-contained bundle), deep-link config, native project maintenance. **iOS specifics:** Apple Developer **$99/year**; building requires **macOS + Xcode — you are on Windows**, so a Mac, a borrowed one, or a cloud build service (Codemagic, Ionic Appflow — both have free tiers, paid for regular use). **App Review risk is real:** guideline 4.2 (minimum functionality) rejects thin web wrappers; mitigation is genuine native capability (push notifications, haptics) — likely fine once athlete accounts + push reminders exist (#40 era), risky before.
Note: iOS 16.4+ supports **web push for installed PWAs**, so even "athlete class reminders" may not require Capacitor — re-evaluate at trigger time.

### 4. React Native / Expo rewrite — rejected
A full client rewrite to escape a WebView the product doesn't suffer from. Not justified at any foreseeable scale.

## Decision table (pre-made)

| Trigger fires | Do |
|---|---|
| Chunk-hash pain / general polish | #29 Vercel — path 1's SW shipped 2026-08-05 and does **not** cover it |
| "Put it on athletes' phones" (one box) | Nothing to build — the install banner and the SW both exist |
| Play-Store credibility for pitching boxes | Path 2 (TWA) — path 1 is no longer a prerequisite |
| iOS App Store required (business) | Path 3, after #30/#31 + push story exists |
