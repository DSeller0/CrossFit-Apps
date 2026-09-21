# Cone — CLAUDE.md

## App overview
CrossFit coaching management app. Vite + React 19 + Supabase.  
**Repo:** https://github.com/DSeller0/CrossFit-Apps  
**Deploy:** GitHub Pages at https://dseller0.github.io/CrossFit-Apps/ via GitHub Actions (push to `main`).  
**Working dir:** `cone/` subfolder. Dev server: `npm run dev` inside `cone/`.  
**The board:** [docs/BACKLOG.md](./docs/BACKLOG.md) — open items are `## ▶ Now` + Icebox P1–P4.  
**The process:** [docs/WORKFLOW.md](./docs/WORKFLOW.md) — session ritual, board row grammar, design lanes.

---

## Where the rest lives

This file is the **always-loaded core**: what every session needs whatever it is working on.
Everything below is just as authoritative — it loads on demand. Each line names the **traps** its
file holds, so you know to open it *before* you need it, not after.

🔴 **These are earned notes, not a generated map** — things tried and rejected, bugs caught live
against real data. Nothing here can be rebuilt by re-reading the source. When you change one of
these areas, correct its file in the same session (WORKFLOW.md, "Docs are part of Done").

| File | What it holds — and the traps inside it |
|---|---|
| [docs/arch/criador.md](./docs/arch/criador.md) | Criador's layout (#58) and its text grammar (#92). ⚠️ `scrollToEditor` stays in the container · `WeekGrid` returns a **fragment**, not a wrapper div (`position:sticky` is clipped by its parent's box) · `serializeBlock`'s header is keyed on `block.type`, never `typeUnresolved` · a station duration is **mm:ss only** · `Descanso 1:00` inside Estações is a rest *station*, not a rest exercise. |
| [docs/arch/publicador.md](./docs/arch/publicador.md) | The 5 export formats, the `--a-*` 8-role colour model, the fit machine. ⚠️ `resolveExportPalette` returns **literal hex, never `var(--…)`** — a raster must not shift when the coach's theme changes · `measureFit` must walk `[data-fitblock]`, **not** the canvas root · the measurement effect must always set a **fresh** `overflowInfo` object, or auto-shrink stops after one step · blocks in a hidden zone **collapse**, never drop. |
| [docs/arch/agenda-resultados.md](./docs/arch/agenda-resultados.md) | Agenda — the only surface that writes `events` — plus Resultados' one surface. 🔴 **The Agenda is the editor**: don't reintroduce a read-only view an Afiliados pane already owns · the day pane is **not** conditional · **no stat here may claim attendance**, because `events` does not know who showed up · the roster **is** the form container, so don't restore a detail pane. |
| [docs/arch/atletas-afiliados.md](./docs/arch/atletas-afiliados.md) | The grade/ficha rebuild (#160) and the coach's panels (#161/#162). 🔑 "Prescribed" means `matchesAthlete` **with the athlete's scopes** (#164) — a helper called without them treats the athlete as `{SEM_BOX}`, which is why four signals read `—` on real data · the invoice **freeze** is enforced by which data source each status reads, not by the reducer · `calcKPIs.freq` was **dropped, not migrated**. |
| [docs/arch/tv.md](./docs/arch/tv.md) | The wall display, TvController, the `tv_state` columns. 🔴 **`push()` is patch-only** — a local-only field that is not a DB column poisons the upsert and freezes every later update · the timer clock is **never** an `aria-live` region (it ticks at 250 ms) · `Timer.jsx`'s running screen has no exit control **on purpose** · the three block-render paths that must stay in sync. |
| [docs/arch/shared-utils.md](./docs/arch/shared-utils.md) | `src/public/shared/` components + `src/public/lib/` helpers. **Check here before reimplementing any formatter, date or ranking helper.** ⚠️ Shared components must not use the `ti` webfont — `leaderboard.html` doesn't load it, so the icon silently renders nothing · `ExerciseList`'s four sizes, and why `compact` is not a phone size · every `ALIASES` value must be an **exact** existing entry name or it resolves to nothing. |
| [docs/arch/design-system.md](./docs/arch/design-system.md) | Themes, tokens, the `index.css` triage, the UI primitives, the gallery, AppChrome. ⚠️ `var(--card)` is **not defined** · `--border` and `--divider` were byte-identical in every theme until #137, so every call site that "chose" between them chose nothing · any focusable control on a public page is **≥16px** (iOS Safari zooms below that) · every `outline:none` must ship its own replacement · never freeze a token's *value* as a focus colour. |
| [docs/arch/supabase.md](./docs/arch/supabase.md) | Migrations `0001`–`0010`, RLS in full, prod divergence, the local stack — and the three case histories behind the load-path rule below. ⚠️ `supabase db diff --linked` **silently ignores RLS-policy divergence**; enumerate with `db dump --linked` · `0005`–`0010` show an empty remote in `migration list` but their DDL **is** live on prod, so don't re-apply · service-worker and cross-port cache poisoning make edits appear not to land, with no console error. |
| [docs/arch/code-policy.md](./docs/arch/code-policy.md) | The `react-refresh` and react-hooks policies — both at zero, so a new warning fails CI. ⚠️ A ref passed as a prop **must** be named `*Ref`, or every `.current =` in the child trips `immutability` · sync from a prop **during render**, not in an effect — except when it needs `Date.now()` · `eslint-disable-next-line` targets the literal next line, so the prose reason goes **above** the directive. |

Also on demand, unchanged: [docs/BACKLOG.md](./docs/BACKLOG.md) (the board) ·
[docs/WORKFLOW.md](./docs/WORKFLOW.md) (the ritual, the row grammar, `## Must-haves`) ·
[docs/plans/](./docs/plans/) · [docs/reviews/](./docs/reviews/).

---

## Structure

### Public pages (standalone HTML + vanilla JS)
Each page is a self-contained HTML file. Most use a React component mounted at `#root`.

| Page | Source |
|---|---|
| `index.html` | full-width week grid → selected-day panel (session + ranking) + box-warnings strip (#53) |
| `schedule.html` | week schedule + RM calculator |
| `results.html` | week results logging + leaderboard |
| `me.html` | athlete profile + PRs + goals |
| `leaderboard.html` | all-time rankings |
| `timer.html` | standalone WOD timer (launched from schedule.html) |
| `tv.html` | TV display for gym wall (no nav) |
| `athletes.html` | **RETIRED (#52) — a redirect stub, not an app.** Maps `?athlete=<id>` → `me.html?id=<id>`. Keep the file: `sw.js` precaches it and `cache.addAll` rejects **atomically** on a 404, so deleting it stops the service worker installing for every user, on every page. |
| `tema.html` | theme picker (#143 · plans/67) — 8 theme cards (4 → 8 with #43/plans/87) with live `--pv-*` previews, reached from a Nav-sheet tile. Writes **`cone_theme_user`** (the visitor's own pick, which always beats the box default) **and** the legacy `cone_theme` the pre-paint script reads; shows a "Usar o tema do box" reset only once a personal pick exists. |
| `recover.html` | data recovery ("Recuperar dados") |

**Page whitelist** — the HTML entry list lives in `cone/vite.public.config.js` (`rollupOptions.input`, **10** pages). Every new public HTML page must be added there or it isn't built and 404s live. (`deploy.yml` at the repo root copies `public-dist/` wholesale — no whitelist there anymore.) The HTML entry files and `themes.css` live at the **repo root** (`CrossFit-Apps/`), not inside `cone/` — the public Vite config sets `root: '..'`.

**Never-built legacy HTML (plans/48, 2026-07-27)** — of 33 tracked root `.html` files, 18 (old design mockups, `athletes_v1/v2.html`, `me-a/b/c.html`, `designer.html`) were zero-consumer and deleted; the 4 `schedule_builder_*` variants moved to `legacy/` (kept at the time for the `exerciseRows` reference below, not deployed). **`log.html` looked the same — untracked from `vite.public.config.js`'s input, never built — but was NOT dead:** `Publicador.jsx`'s `PresenterView` built a live share URL (`_presenterLogUrl`) pointing at it. Since only `public-dist/`'s **10** built pages actually deploy, that URL 404d on the real site — a pre-existing bug, filed as #113 and not fixed by that sweep (deletion-only). ⚠️ **#113 is REOPENED as #207 — the C5·b1 fix does not work.** It repointed the share URL at `schedule.html?id=<sessionId>` (`Publicador.jsx:476-480`), which is built and deployed but never opens a session: `Schedule.jsx:393` gates on `date` **and** `session` together, so `?id=` has no path to one. It falls through to the athlete-lock branch (`:155` → `:376-378`), which writes the **session** id into `localStorage.cone_athlete_filter` **unvalidated** — corrupting the visitor's stored filter and rendering `● —` at `:1280`. 🔑 **The working convention is `?date=…&session=…`** (`index/rail.jsx:99`, `tv/slides.jsx:78`/`:610`); `Timer.jsx:472-481` uses a second one, `date`+`openLog`. ⚠️ The rationale comment at `Publicador.jsx:476-478` still states the broken behaviour as the design, and `?id=` is **not** dead once the URL is fixed — `lockedId` drives six live kiosk render sites (`:917` `:941` `:1072` `:1276` `:1280` `:1440`). ✅ **`log.html`, its two classic scripts (`cone-client.js`/`cone-utils.js`) and `legacy/` are all DELETED now (plans/85, 2026-09-06)** — nothing linked `log.html` once #113 closed, and `legacy/`'s 4 files were byte-identical pairs with zero references; the `exerciseRows` history they document survives only as prose below, not in a live file.

### SPA (React — `src/`)
Entry: `src/App.jsx`. All tabs lazy-loaded with `React.lazy()`:  
Criador, Atletas, Exercícios, Afiliados, Resultados, Agenda, Publicador, Configurações, TvController.  
Providers: `AuthContext` (session), `SyncContext` (sessions + events + Supabase sync).

Per-tab architecture — Criador, Publicador, Agenda/Resultados, Atletas/Afiliados, TV — lives in
[docs/arch/](./docs/arch/); the table under "Where the rest lives" says which file holds what.

---

## Supabase clients — CRITICAL

**Two clients exist — use the correct one:**
- `src/utils/supabase.js` → SPA only (components under `src/components/`)
- `src/public/supabaseClient.js` → public pages (components under `src/public/`)

Importing both in the same bundle causes a GoTrueClient warning (non-fatal but visible in console).

**A load/read path never writes.** A recurring bug class (#76, #109, #111 — plans/45, /47), not a
one-off: `results_v2` wrote back on every load until #76, which destroyed `updated_at` as a
provenance signal and cost migration `0007` a whole new column to recover. When a load path needs to
migrate or re-sort data, the function doing the **reading returns a `needsSave` flag** and the
caller decides whether to persist — `exerciciosHelpers.js`'s `initRegistry` returning
`{ registry, needsSave }` is the reference shape. Mount effects are the other half:
`useEffect(() => { save(x) }, [x])` **runs on mount**, so state seeded from `useState(load…)`
re-persists merely by opening the component — save from the mutators that actually change it
(`afiliados/Afiliados.jsx`'s `saveLoc`/`deleteLoc`/`toggleAthlete`). A debounced blob writer must
**flush on unmount** (#181): SPA tabs unmount on switch, and a cleanup that only `clearTimeout`s
drops the last edit.

📖 **The three case histories — including the mount write that silently overwrote a newer server
document with stale localStorage, deleting a session that existed only on the server — are in
[docs/arch/supabase.md](./docs/arch/supabase.md).**

Both clients read `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — never hardcode a URL/key in `src/`. Vite picks the file by mode: `npm run dev` / `dev:public` → `.env.development` (local stack); `npm run build` / CI → `.env.production` (prod, `https://crsalcpvsedmiabkeibp.supabase.co`, committed — anon key is public by design). `vite.public.config.js` needs `envDir` set explicitly (its `root` is the repo root, but the env files live in `cone/`).

**Schema:** 10 single-row JSONB blobs (id=1, value=JSONB: `sessions, athletes, results, events, locations, coach_profile, settings, exercise_registry, goals_data, templates`) — was 11 until `0010` dropped `lb_colors` (#60/#43, plans/87), plus `results_v2` (normalized), `tv_state` and `class_executions` (both hand-reconstructed into the migration from code + docs — see [docs/arch/tv.md](./docs/arch/tv.md)).  

**RLS:** anon read is **no longer read-all**. Five tables are locked to `is_allowed_user()` reads:
`coach_profile` + `locations` (`0006`, #81 — Pix key + service rates) and `events` + `templates` +
`results` (`0009`, #150). `0009` locked a sixth, `lb_colors`, which `0010` then dropped (#60/#43).
🔑 **The principle for any new table: a `"public read"` policy is justified only by a real
public-page `.from()` call site** — all six had zero. Each keeps its own `is_allowed_user()` write
policy, which is **`FOR ALL` (no `FOR` clause) and therefore covers the coach's read too** — that is
the mechanism the lock depends on, so if you touch one of these policies, verify an *authenticated*
read or you blank the coach's tab. Anon writes go through the `class_checkin`/`log_result` RPCs only
(#7, `0003`). ⚠️ **Every *other* table is still anon-readable**, so the SPA email login is not a
general read gate, and a `?box=` link (#80) is a view filter, not access control.

📖 **The full narrative — the anon INSERT hole `0009` closed on legacy `results`, the
`class_executions` auth hardening (#34/`0004`), and the backup that read four tables as empty for
three months (#199) — is in [docs/arch/supabase.md](./docs/arch/supabase.md).**

---

## Data colours + exercise data shapes

The rest of the design system — themes, tokens, the `index.css` triage, the UI primitives, the
gallery — is in [docs/arch/design-system.md](./docs/arch/design-system.md). These two blocks stay
here because every tab touches them.

**Data colors — exempt from tokenization (they identify a thing, so they must stay stable across every theme):**

*Block families* (`blkColor`, `lib/wod.js`):
- RED: WOD / HIIT / MetCon
- AMBER: EMOM / For Time / AMRAP / Estações
- BLUE: Força / LPO / Core / Acessórios
- GREEN: Aquecimento / Skill / Cardio / Mobilidade

*Scales* (`SCALE_COL` / `scaleColor()`, `lib/wod.js` — canonical since #51): RX teal · Inter orange · SC violet · Adaptado warm-grey, plus one fallback grey. This reconciled two diverged copies (`Results.jsx` had Inter orange, `Athletes.jsx` had it gold; Results' red Adaptado collided with the RED block family and misread as an error). **All public pages are on it since #52** — `me.html` was a *third* copy that painted SC orange and Inter blue (the same result showed a different-colored badge depending on which page you opened), and `athletes.html`'s copy retired with the page. `scaleLabel()`/`SCALE_SHORT` gives the short form ("Adaptado" → "Adap") for tight aligned columns.

⚠️ **`exerciseRows` had been a dead write path** (audited #52) until **#116 gave it its first real writer**: `ScoreFields.jsx`'s `ExerciseNotesRows`, a per-exercise adaptation-note row (`{exId, name, note}`) revealed only when the block's `scale` isn't RX. **It still carries no `scale` field of its own** — a deliberate #116 decision — so `deriveScale(blk)` (`wod.js:78`, the ONE place that reads the field itself) still falls through to the flat `blk.scale` on every row: the per-exercise "an athlete who scaled one movement did not do the WOD RX" signal `deriveScale` was built for stays dormant until a future write includes a real `scale`. **Three other files CALL `deriveScale()`** (not the field itself) — `leaderboard/Leaderboard.jsx`, `results/resultsHelpers.js`, `me/Me.jsx` — the distinction matters: only `deriveScale` lights up for free from a `scale` write; everything else is net-new UI. Before #116 the only writer, ever, was the retired `legacy/schedule_builder_pt.html` (moved out of the root by plans/48, deleted outright by plans/85 — see above). [plans/22](./docs/plans/22-athlete-character-stats.md) step 4 now **extends** #116's shape with `{load, loadUnit}` for strength blocks, rather than reviving it from scratch. Do not assume a block's `exerciseRows` carries a `scale` or `load` — check what's actually there.

**`--podium-1/2/3`** (themes.css, all 8 themes): medal colors, tuned per palette. Row tints derive from them via `color-mix()` at the call site — 3 tokens, not 6.

**Exercise data shapes:**
```js
// Standard exercise (dist/distUnit are siblings of sets/reps — #37; exVolStr renders dist first)
{ id, name, sets, reps, dist?, distUnit?: 'm'|'cal', intensity: { mode, ... }, note }

// Complex exercise
{ id, name?, isComplex: true, sets, complexMovements: [{ id, name, reps }], intensity, note }

// A per-athlete BLOCK ENTRY (results_v2 .blocks[]) — keys declared once in
// public/lib/resultEntry.js's ATHLETE_KEY_DEFAULTS, so a new field is added there and
// every reset site follows through clearAthleteKeys:
//   { blockId, blockType, blockLabel,            // identity, always from the CURRENT block
//     rpe, scale, perfTime, perfRounds, perfReps,
//     finished, checkpoint,                      // #112 DNF
//     exerciseRows,                              // #116 per-exercise adaptation notes
//     skipped }                                  // #157 "não fez"
// ⚠️ `skipped: true` means PRESENT BUT DID NOT DO THIS BLOCK, and carries NO scale/RPE —
// absence and a zero score must stay distinguishable in results_v2 (#61a forbids
// fabricating either). Every reader that ranks or counts a block drops it: rankResults
// (wod.js — filtered THERE, not at its six call sites, because Index/Leaderboard/TV build
// entries independently of blockEntries), blockEntries (results/resultsHelpers.js, treats
// it as a missing entry), calcBlockStats (lib/sessions.js, planned-not-executed), and
// perfStr returns an em dash as a safety net.

// intensity modes: 'progression' | 'pct' | 'gender'   (+ legacy 'cardio')
// cardio: LEGACY — the Cardio intensity tab was removed in #37; distance now lives in
//         dist/distUnit. Old { mode:'cardio', cardioVal, cardioUnit } data still renders
//         (exVolStr fallback) and lazy-normalizes to dist/distUnit on edit/save.
// gender: { mode:'gender', Masculino_RX, Masculino_Inter, Masculino_SC, Feminino_*, *_unit }
// Registry entries may carry defaults{sets?,reps?,dist?,distUnit?,intensity?} (#38 ghost loads).
```

---

## Build + deploy

- Dev: `supabase start` (once per Docker session) then `npm run dev` inside `cone/` — talks to the local stack, never prod
- Build: `npm run build` → `dist/`
- Tests: `npm test` (**1113 tests across 31 files**, re-measured 2026-09-18 — #164/plans/91 added 30, no new file: `lib/sessions.test.js` +23 (`sessionScopes`/`matchesAthlete`/`athleteScopes` and `calcBlockStats`' `{box}` vs `{scopes}`), `atletasHelpers.test.js` +5 (one untargeted case per scope-taking helper — every earlier fixture set `mainTraining`, so the rule had zero coverage), `meHelpers.test.js` +2. **1083** before it — plans/90 added none; the +7 since the 2026-09-06 count is `theme.test.js` (plans/87) and `exportPalette.test.js` (plans/88) growing, no new file. **1076 on 2026-09-06** — #174/plans/86 added 1 and no new file; earlier figure 1075 on 2026-09-05 — a same-day code-review pass on #59/C5·c added 4 more to the same two files before push: `billing.test.js` gained `effectiveRateSource` (2, incl. the exact case the Valor-column bug turned on — resolves to a real historical rate even when the location's CURRENT rate is falsy) and `affiliateHelpers.test.js` gained 2 for `appendRateVersion` on a legacy location missing `rateUnit`/`currency` (a no-op edit doesn't mint a spurious version; a real rate change still does). #59/C5·c/plans/81 itself had added 19 to the same two files earlier 2026-09-04: `publicador/billing.test.js` gained 11 (`rateAsOf`'s date-resolution table incl. the same-day-double-edit tiebreak and the before-every-version null case, plus 3 `calcTotal`-with-history precedence tests) and `afiliados/affiliateHelpers.test.js` gained 8 (`rateLabel`'s optional `isoDate` param, `appendRateVersion`'s epoch-backfill-on-first-edit + no-op-when-unchanged + append-without-rebackfilling cases). Earlier same day, #59/C5·b2/plans/83 added 22 in a new `publicador/layoutHelpers.test.js` (`distributeZones` incl. the hidden-zone collapse rule at 1/2/3 zonas, `zoneCollapseMessage`'s singular/plural + multi-zone join, `zoneColumnWidths`, `visibleWeekDates`'s day-picker filter, `monthCellSessions`'s per-box grouping + truncation) — the three pure helpers the plan's acceptance named explicitly; fit-checking (`fitCheck.js`) and title defaults (`titleHelpers.js`) are DOM/context-dependent and verified live instead, not unit tested. Earlier, #59/C5·b1/plans/82 added 16 in `publicador/exportPalette.test.js` (the 8-role table; `resolveExportThemeId`'s box-preset-then-coach-theme precedence; `resolveExportPalette`'s custom-override + literal-hex + unknown-id-fallthrough; the legacy-colour migration helpers). Earlier, #59/plans/81 C5·a added 78 in two new pure suites: `publicador/eventFilter.test.js` (48 — `matchesEvent`/`matchingAthleteIds` at both granularities, the personal-only athlete rule, `filterEvents`/`filterDay`, `activeCount`/`clearFilter`/`toggleInSet`, and both presets) and `publicador/agenda/agendaHelpers.test.js` (30 — `dayTitle`'s capitalisation, `monthStats`' padding-day exclusion, `seriesScopes`' three counts, and `SERIES_EDIT_FIELDS` never carrying `date`/`status`/`id`/`recurrenceGroup`). Earlier same-day, #59/plans/81 Phase 0 added 22 tests: 5 direct `monthGridCells` cases to `week.test.js` (a month starting Sunday, one starting Saturday, a 28-day February, a 6-row month, `inMonth` on padding days — it had 3 consumers and no direct test before this) and a **new** `publicador/exportHelpers.test.js` (17 tests: `buildProgressionLines`/`exLine`/`complexLine`/`buildMobileSession`/`getWeeksOfMonth`/`mfs`), unlocked by deleting the module-scope `window.SpeechRecognition` read that made the file unimportable under vitest's `environment:'node'`. Earlier same-day: #57/plans/80 added the #157 gate as a pure predicate (`isBlockResolved`/`saveGate`) plus `resultSummary`/`topScale`/`sessionProgress` and a session-scoped `calcSessionKPIs` to `resultadosHelpers.test.js`, the migrated `resultKpis`/`resultHistory` to `atletasHelpers.test.js` (⚠️ `calcKPIs`'s own suite was deleted with it — `freq` no longer exists to test), and `skipped` durability to `resultEntry.test.js`): wod, week, sessions, goals, registry, boxScope, exerciseGroups, resultEntry, theme (`public/lib/`) · entries (`public/`) · meHelpers (`public/me/`) · scheduleHelpers (`public/schedule/`) · pix, resultMappers, storage, config (`utils/`) · blockModel, textFormat (`criador/`) · exerciciosHelpers, resultadosHelpers, stateBackup, billing, atletasHelpers, affiliateHelpers, billingState, exportHelpers, exportPalette, **eventFilter**, **layoutHelpers** (`components/tabs/`) · **agendaHelpers** (`components/tabs/publicador/agenda/`) · useClassTracking (`hooks/`))
- Lint: `npm run lint` (`eslint.config.js`) — gated in CI (below), **clean at `--max-warnings 0`** since #108/plans/51 took the react-hooks correctness cluster 84 → 0 (2026-07-27). The five rules (`set-state-in-effect`/`refs`/`immutability`/`purity`/`static-components`) are back on the plugin's default `error`; there is no floor left to ratchet, so **a new warning fails CI**. Every surviving instance carries an inline disable with a written reason at the site — see the `eslint-disable` policy below
- CI: push to `main` → GitHub Actions → gh-pages deploy (cone/ subfolder); also runs `npm test` then `npm run lint` (plans/43, #32) — a lint regression fails the build same as a test failure

**Chunk hash 404 (GitHub Pages limitation):** After every CI deploy, lazy-loaded chunk filenames change. Old hashes 404 until users hard-refresh (Ctrl+Shift+R). GitHub Pages cannot set `Cache-Control: no-cache`. This is structural — do not re-diagnose, just document and tell the user to hard-refresh.

**Lint + React-hooks policy** — the `react-refresh/only-export-components` exemptions and the
react-hooks correctness conventions are in [docs/arch/code-policy.md](./docs/arch/code-policy.md).
Both rule sets are at **zero**, so there is no floor left to ratchet: a new warning fails CI.

**Always commit + push after completing changes** (user requirement).

---

## Key decisions (do not re-litigate)

- Auth: 8-digit OTP codes, not magic links (Outlook Safe Links breaks magic links)
- No React Router — URL params are sufficient at current scale
- No TypeScript — JSDoc comments if prop shapes need documenting
- All data: Supabase (no local persistence beyond localStorage for UX state)
- Icon library: Tabler Icons (`ti-*`)
- **Exercícios registry is stored alphabetically within each category** (canonical, #55/#87 · C1) — `initRegistry`/`saveDetail` re-sort the touched category on every write. The manual **A→Z button and drag-reorder are retired** (insertion order carried no meaning; the catalog is searched, not hand-ordered). Don't reintroduce drag or an ordering field.
- **Exercícios tab layout is mockup 45** (#55/#87 · plans/38, built) — 3 panes: **Pane 1** categories grouped by family (`FAMILY_GROUPS`) as an **accordion on desktop / flat family-labelled list on mobile** (the whole tab forks on `useIsMobile` into the 3-level drilldown), each category showing a coverage `TallyBar` (% of its exercises with a video URL); **Pane 2** a **card grid** with **variation sub-groups** (`groupByRoot`, singletons under "Avulsos"; Todos shows one section per category, an exercise under each of its categories), sticky search + "+ Adicionar" at the top; **Pane 3** a **2-column detail** (single-column scroll on mobile). Each card + each Pane-3 field label carries the `completeness(ex)` 5-icon indicator (Tabler `ti-*`). **"+ Adicionar" opens a clean blank detail** (no inline name input) with the current category **pre-lit**, footer "Criar exercício", no delete. **Salvar opens a diff modal** (`diffExercise` → Criado/Alterado/Removido per field) instead of a flash. `saveDetail` guards against a create/rename **overwriting an existing name** in a selected category. Not in the component gallery (it's a full tab); mockup 45 in the Cone Design System is the design record.
- Product name: CONE. Gym name from `settings.value.gymName`.
- `session.public === false` = hidden; `undefined` or `true` = public — all **5** session-rendering public pages filter on this (Index, Schedule, Results, Me, Leaderboard; verified 2026-07-16). It was 6 before `athletes.html` retired in #52. `timer.html` reads no sessions; `tv.html` deliberately doesn't filter (next line).
- TvController ignores session visibility — coach always sees all sessions
