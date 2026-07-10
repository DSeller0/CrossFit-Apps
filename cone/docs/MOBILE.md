# Cone — Android/iOS Publishing Assessment

Written 2026-07-09. **Recommendation: do nothing now.** Horizon is single-coach/single-box for 6+ months and the backlog covers current needs. This doc exists so the decision is pre-made and costed when a trigger fires — it creates no backlog items.

**Revisit triggers:** (a) expansion beyond one box becomes real; (b) athlete identity ships (#30/#31 — athletes, not the coach, are the store-app audience); (c) chunk-hash-404 pain grows enough to justify #29+service-worker on its own merits.

## Where Cone already stands (better than assumed)

Discovered during the 2026-07-09 benchmark walk: **Cone is already ~60% of a PWA.**

- A complete **`manifest.json`** (repo root) is linked from every public page: `standalone` display, correct `/CrossFit-Apps/` scope + start_url, 192/512 maskable icons, theme colors, and app shortcuts (Leaderboard/Agenda/Meu perfil).
- **`Index.jsx:195`** implements a custom in-theme install banner (`beforeinstallprompt` + `appinstalled`) — "Adicionar à tela inicial / Instalar".
- Served over HTTPS on GitHub Pages ⇒ **installable on Android today** (Chrome WebAPK: home-screen icon, standalone window). On iOS, Add-to-Home-Screen works but is manual (Safari share menu; no banner support).
- **Missing: a service worker.** Consequences: no offline shell, no precache (every visit re-downloads), no mitigation of the chunk-hash-404 problem, and Chrome's richer-install criteria degrade. Legacy `sw.js` code exists only in the retired `schedule_builder_*.html` files — nothing current registers one.

## Paths, in ascending cost

### 1. Finish the PWA (service worker) — S/M, the only near-term-worthy step
`vite-plugin-pwa` (Workbox) in both configs; precache each build's assets; runtime-cache Supabase GETs (network-first). Benefits: installed-app feel, faster loads on gym Wi-Fi, and **substantially fixes chunk-hash 404s** (old clients keep a consistent precached bundle until the new SW activates atomically). Complications: two builds sharing one origin need either two SWs with disjoint scopes (`/CrossFit-Apps/` vs `/CrossFit-Apps/cone/`) or one SW built from the public config covering both — decide at implementation. **#29 (Vercel) first** makes this materially easier (cache-control headers, single deploy, clean base path).

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
| Chunk-hash pain / general polish | #29 Vercel → path 1 (SW) |
| "Put it on athletes' phones" (one box) | Path 1 only — the install banner already exists |
| Play-Store credibility for pitching boxes | Path 1 → path 2 (TWA) |
| iOS App Store required (business) | Path 3, after #30/#31 + push story exists |
