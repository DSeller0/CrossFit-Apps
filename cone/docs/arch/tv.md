# TV system

> Split out of `cone/CLAUDE.md` by [plans/95](../plans/95-claude-md-split.md) (#224, 2026-09-20) — the text is unchanged, only its location.
> The wall display, TvController, `tv_state`, and the C6 surface pass (#174 / plans/86).
> ↩ back to [CLAUDE.md](../../CLAUDE.md)

---
## TV system

**Files:** `src/components/tabs/TvController.jsx` (SPA controller, desktop layout: full-width Sessão date-picker + two-pane grid — see `src/components/tabs/tv/tvController.module.css`) + `src/public/tv/TV.jsx` (display) + `src/public/tv/TV.module.css`

#### The C6 surface pass (#174 · plans/86, 2026-09-06)

The design program's missing session — see the `src/components/ui/` paragraph for why it was missing.
Rules it established, all of which a future edit here must keep:
- 🔑 **`tv/tvController.module.css` is token-only now** — 41 colour literals (37 hex + 4 `rgba()`) → **0**,
  the sole exceptions being `.previewBlank`'s deliberate `#000`/`#808080`, each commented at the site.
  🔴 **Fix the *pair*, never just the foreground**: the bug that started this was `--cream` (a near-BLACK
  text token on the two light themes) painted onto a hardcoded `background:#111` — **1.04:1** / **1.00:1**,
  i.e. invisible, on the tab used to run a live class. The 7 `color:#0d0b09` ink sites are `var(--accent-text)`;
  tinted selections are `color-mix(in srgb, var(--token) 10-15%, transparent)`. ⚠️ **Do not carry the
  `color-mix()` idiom into an export view** — #195 records a live html2canvas incompatibility; TvController
  is never rasterised, which is the only reason it is safe here.
- **`--green` is the token for "live/go"**, and sb-light's value was the one cell substitution could not
  reach (**3.33:1** as `--accent-text` ink on a `--green` fill). Nudged in `themes.css` by the plans/65
  method — an exact per-channel ×0.75, hue untouched: `#28a064` → `#1e784b`. Re-measured after: `--accent-text`
  on `--green` is **9.72 / 6.85 / 11.03 / 5.46** across the four themes. ⚠️ `--green` is app-wide; **token
  count stays 29 per theme** (a value replaced, nothing added).
- **a11y contract, matching Agenda's:** zero click-`<div>`s, every icon-only control `aria-label`led, every
  interactive class carrying the canonical ring (`outline:2px solid var(--accent); outline-offset:2px` —
  measured **9.65 / 5.37 / 9.51 / 4.95** on `--bg`). ⚠️ **`ClassPanel`'s accordion header CANNOT be a
  `<button>`** — it *contains* one (Encerrar) — so it uses `AccordionCard.jsx`'s canonical
  `role="button" tabIndex={0} aria-expanded onKeyDown`, reusing **`onKey(fn)`** from
  `schedule/scheduleHelpers.js`; never hand-roll a key handler. Its keydown also guards
  `e.target !== e.currentTarget` so Space on the nested button doesn't toggle the accordion.
- 🔴 **The timer clock is NEVER an `aria-live` region** — it ticks at 250 ms, so a live region there is
  continuous speech. `role="timer"` is the correct semantic *because* it is implicitly `aria-live="off"`:
  it names the element without narrating it. Announcements ride a separate `role="status"` element on
  **state transitions only** (start / pause / round advance / finish). The `ClassPanel` roster's
  `aria-live="polite"` sits on the **list itself, in both the empty and populated branches** (the
  `RankList.jsx:36-45` pattern) — on a wrapper that only appears once populated, the region is created
  *with* its first content and the transition is never announced.
- **`tv/DatePicker.jsx`** was extracted from `TvController.jsx:27-89` (4 of the 5 click-`<div>`s lived in
  it). It imports `toISO`/`DAY_PT_TITLE` from `public/lib/week.js`, **not `utils/storage`** — that path
  reaches the SPA Supabase client transitively and would make it ungalleriable (#193's trap).
- ⚠️ **`Timer.jsx`'s running screen has no exit control, and that is deliberate** — every other screen owns
  its own exit (getready → its back button; finished → DESCARTAR/FECHAR) and a live WOD is left by pressing
  FIM. `goBack` therefore has exactly ONE call site and its `statusRef.current === 'running'` branch was
  **dead**; plans/86 pass 4 converted that branch's `confirm()` into a `ConfirmReview` that could never
  open, and the code-review pass deleted the whole thing. Don't re-add a leave-guard for a control that
  does not exist. **`confirm(`/`alert(` are 0 repo-wide** — keep them there; the established replacement
  for an `alert(); return` validation guard is inline text that names what is missing, not a dialog.
- 🔴 **The clock rewrite and the decomposition are #191's, not this section's.** `Timer.jsx:139-152`
  documents its own state-model defect (*"pick ONE source of truth for the clock … Filed, not done"*) and
  the file is **1233 raw lines** with **9** eslint disables (re-measured 2026-11-22; 1237 / 9 on 2026-10-05, 1192 / 9 on 2026-09-06). Its mode precedence, its block → config mapping and its form ↔ config halves have tests (`timerMode.js`, `timerConfigFor`), but the **component** still has none. A design pass does not touch it.
- **A Timer on every block, and one mode function (#228 · plans/99).** `schedule.html` offers a Timer on
  **every** block type (the right-hand actions column, like a WOD block — Leaderboard and the athlete section
  stay WOD-only), and `timerConfigFor(bl)` (`schedule/scheduleHelpers.js`) is the single block → config
  mapping. What runs is decided in ONE place, `timerMode(cfg)` (`timer/timerMode.js`): **`'cycle'`** (Estações,
  or any config with `intervalMode`) **> `'emom'` > `'amrap'` > `'up'`**. ⚠️ **The order is the point** —
  `Timer.jsx` used to dispatch on `cfg.blockType` at ~20 run-time sites with EMOM and AMRAP tried before
  Estações, so an EMOM carrying `A cada 1:30` would have taken the 60-second branches. **Don't add a run-time
  `blockType ===` check — add a mode** (the *setup form's* `form.type` checks are a different thing and stay).
  An interval block reuses the Estações cycle instead of growing a second engine: one pseudo-station named
  after the block, `stationTime = work ‖ every`, `transitionTime = rest ‖ 0`,
  `rounds = Rounds ‖ ⌊Duração ÷ A cada⌋ ‖ null`, and `cycleEnd` null → it runs until FIM. Every other block
  counts up — to its Duração when it has one, as a stopwatch (LAP, until FIM) when it has none. ⚠️ The tick's
  vibration key is `${round}-${idx}-${phase}`: with one station and no rest `idx-phase` never changes, so
  without the round no turnover would ever buzz.
- **What the Timer branches on — the mode, and two flags (#242 · plans/105).** The Timer reads **no**
  `blockType ===` at run time: `timerMode(cfg)` plus the flags below are all it asks. `timerConfigFor` is
  **the one place a block's type is read**, and it writes the answer onto the config:

  | Where | What it decides | Read by |
  |---|---|---|
  | `timerMode(cfg)` | `'cycle'` > `'emom'` > `'amrap'` > `'up'` | everything |
  | `cfg.rotate` | an interval **EMOM** with >1 movement: movement `round % n` is the active one (it wraps) | the running list's highlight (`subExOn`), the screen-reader announcement |
  | `cfg.laps` | an interval **AMRAP**: it counts rounds, so it keeps **LAP** | `showLap`; the finish screen's `N ROUNDS` and REGISTRAR's prefill already read the splits |
  | `cfg.loggable` | the block is a WOD type (`isWodBlock`) | REGISTRAR (below) |

  Both flags exist **only on an interval config** (a plain EMOM/AMRAP has its own mode). A new "this block
  type behaves differently" need is a **new flag decided in `timerConfigFor`**, never a type check in `Timer.jsx`.
  The behaviours the modes drive: `doLap` ends a **count-up** (`'up'`) timer at its last round, whatever the
  block's type (it was time blocks only, so a Força with `3 rounds` ran on to `RD 4/3`) — an AMRAP and a cycle
  end on the clock, because their `rounds` is not a number of LAPs; the clock **warns at 85 % of what ends the
  timer** — `cycleEnd(cfg)` in a cycle (an interval block's Duração is only a tag: `10 rounds · 40" on 20" off`
  ends at 600 s whatever it says), the cap in `'up'`, the last 30 s of a countdown; `cycleEnd` is **`null`
  whenever the product is 0** (a cycle with no stations — an Estações whose movements sit in `bl.exercises` —
  used to finish at 00:00).
- 🔑 **A "legacy" block has no cap (#242).** Before #228 a block had no `interval` field: `A cada 1'30" 3 Sets`
  stayed in its notes and the text parser wrote the **nearest whole minute** into Duração
  (`max(1, round(every / 60))`, `textFormat.js` at `4edc639`) — and #228 made Duração a real cap, so the timer
  stopped such a block after one interval. `timerConfigFor`'s `isLegacyEveryCap`: no valid `interval` ∧ not
  Estações ∧ not an AMRAP ∧ a note/label interval (`noteEverySecs`, `lib/wod.js` — a **mirror** of
  `textFormat.js:223-237`, not an import, since the timer is a public page; `wod.test.js` feeds both readers the
  same 21 spellings, so a grammar change there fails a test here) ∧ **Duração equals that rounded interval** →
  `timeCap: null`, `rounds` stays. ⚠️ **Anything else keeps its cap**: `E2MOM` with Duração 12 and `A cada 3'` ×
  5 rounds with Duração 15 are real totals — and an **AMRAP always keeps its Duração**, because it counts *down*
  from it (no cap is a clock stuck at 00:00 that never ends). A plain EMOM with no cap runs until FIM and shows
  `MIN n` with no total. Running the legacy note as a real interval timer is deliberately not done (it would
  change every old block, and none is current). Prod, 2026-11-22: **10 blocks** (EMOM 5 · LPO 4 · Skill 1).
  `timeCap` keeps **decimals** (`parseFloat`, comma accepted — prod has 2.3); `fit` rounds to whole seconds
  first (`2.3 × 60` is `137.99999999999997`).
- 🔴 **The setup form ↔ config round trip is a contract (#242).** `formFromCfg(cfg)` / `cfgFromForm(form, base)`
  (`timer/timerMode.js`, pure, tested) replaced a seed and a build that disagreed: the seed turned a capless
  config's blank cap into `20` (`?? 20`) and the build dropped `intervalMode`/`loggable`/the flags, so a form
  nobody touched ran a **different timer** than the block's. Now `cfgFromForm(formFromCfg(cfg), cfg)` deep-equals
  `cfg` — blank cap is `''` and builds `null`, `rounds: '3'` stays the string, the session/block ids and the flags
  survive. A field the user didn't change keeps the config's value verbatim; **changing the type or the movements
  rebuilds from the form** (string lines, ids nulled, `loggable` recomputed with `isWodBlock`, no
  `intervalMode`) — "changed" means the trimmed, blank-free lines differ, so a stray space is not an edit. ⚠️ That
  is the plan's rule and a real trade-off: fixing one movement's name on an interval block's setup form turns it
  into a plain timer. The one exception to "blank is no cap": a mode that counts **down** from it (AMRAP, a plain
  EMOM) takes `20` for a blanked cap — decided by the config's **mode**, not its type, so an interval EMOM (a cycle
  whose Duração is only a tag) stays capless. An interval config's form lists its movements, not the pseudo-station's name;
  Estações lists one line per station. `selectBenchmark` keeps `bm.duration || 20` (a benchmark has a real cap).
  `exLabel` moved into `timerMode.js` and renders through `exVolStr` (distance first), and `timerExs` passes
  `dist`/`distUnit` and trims the name — `400m Run` was `Run`, a `'  '` row reached the timer. `timerConfigFor`
  also never lets the `-` placeholder label through (falls back to the type, then `WOD`) and reads Estações'
  rounds as `stationRepeat` first, as `BlockDetail` and `stationsCapMins` do — and **only** Estações: a count-up
  timer ends at its last LAP now, so a stale `stationRepeat` on any other block would be a hidden lap limit.
- ⚠️ **REGISTRAR needs `cfg.loggable !== false`** — on the finished screen and on history rows (`pushHist`
  stores the flag). `timerConfigFor` sets `loggable: isWodBlock(bl)`; REGISTRAR opens `doOpenLog`, which only
  knows WOD blocks, so a Força timer must offer FECHAR. It is `!== false`, **not** truthiness: a config saved
  before the flag existed has none and keeps today's behaviour.

**Data flow:**
1. TvController calls `push(patch)` → upserts `{ id: 1, ...patch, updated_at: Date.now() }` to `tv_state`.
2. TV.html subscribes to `postgres_changes` on `tv_state` → receives delta → re-renders.
3. `push()` is **patch-only**. Never include local-only fields that are not DB columns — they poison the upsert and freeze all subsequent updates.

**Controller class roster (`tv/ClassPanel.jsx`):** every class started today renders as an accordion card (active one auto-expanded, live-updated via `class_executions` realtime subscription already in `useClassTracking`); ended classes render the same roster read-only. Roster rows merge ranking + live registration + editing (`useLiveRegistration.js`) for both real athletes (`results_v2`, keyed by `athlete_id`) and guests (`class_executions.anon_results`, keyed by name — day-scoped only, deliberately not in `results_v2` since guests don't need durable cross-day tracking). "Registrar" captures the live timer elapsed as `perfTime` (mm:ss string, `For Time` blocks only); "Editar" reveals scale + a manual mm:ss field to overwrite (covers both corrections and misclicks).

**tv_state columns (source of truth: `supabase/migrations/0001_init.sql:177-195` — plans/04 landed; the list below matches it):**
```
id                   INTEGER   PRIMARY KEY (always 1)
slide                TEXT      'blank'|'wod'|'timer'|'results'|'qr'
class_id             TEXT
session_id           TEXT
date_key             TEXT
timer_block_id       TEXT      (code reads/writes timer_block_id — NOT block_id)
timer_type           TEXT      'For Time'|'AMRAP'|'EMOM'|'TABATA'|...
timer_cap_secs       INTEGER
timer_paused_elapsed INTEGER
timer_started_at     BIGINT
timer_paused         BOOLEAN   (CONFIRMED unused by code — 0 hits, verified 2026-07-16)
group_positions      JSONB     { [groupId]: blockId }
rotation_block_ids   JSONB     DEFAULT '[]'   (empty = all WOD blocks)
rotation_rest_secs   INTEGER   DEFAULT 0
rotation_rest_until  BIGINT    DEFAULT NULL
show_qr              BOOLEAN   DEFAULT TRUE
updated_at           BIGINT
```

**Block/exercise rendering** — three separate render paths that must always be kept in sync:
1. `TV.jsx` → `BlockCard` (WOD slide)
2. `TV.jsx` → `TimerSlide` right panel
3. `src/public/schedule/Schedule.jsx` → exercise rows
