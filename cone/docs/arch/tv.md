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
  the file is **1192 raw lines** with **9** eslint disables and **zero** tests (re-measured 2026-09-06). A design pass does not touch it.

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
