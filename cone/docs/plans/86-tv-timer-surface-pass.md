# 86 — TvController + Timer surface pass (#174 · carries #182's worst half)

> ✅ Done: #174 · #178 · #188 — `2d75135`+`a2ced34`+`a2c9d17`+`ca61b95`+`ead88c2`+`8ff63e2`+`8781ec0`
> +`1618fe6` · 2026-09-06 (code-review pass 2026-09-13) — see BACKLOG.md.
>
> **Two rows close only PARTLY, and the board rows were narrowed rather than deleted.** **#182** —
> `tvController.module.css` is now 0 `outline:none` and every interactive class carries the canonical
> ring, and `Timer.module.css:189` split `:focus` out of its `:hover`; the other **10** of that row's
> 12 selectors (`Schedule.module.css`, `Me.module.css`, `index.css`) and the missing global
> `:focus-visible` are untouched. **#184** — 37 of its 54 dead classes went (TV 24 + Timer 13); the
> remaining 17 across 7 module files plus the 11 `index.css` selectors stay open.
>
> **One item did not survive contact: Approach 5's `confirm()` conversion.** The plan asserted
> `Timer.jsx:456` "gates a destructive mid-class action". It does not, and never did — `goBack` has
> exactly one call site, the FECHAR button on the `status === 'finished'` screen, where `statusRef`
> is 'finished' by construction, so the `=== 'running'` branch was **already unreachable before the
> conversion** (`git show a2ced34^`). Pass 4 faithfully converted a guard that had never once fired,
> producing a `ConfirmReview` that could not open; `/code-review` caught it and the dead branch,
> state, handler and dialog were deleted instead. The running screen's lack of an exit is deliberate,
> not an oversight — every other screen owns its own exit (getready → its own back button; finished →
> DESCARTAR/FECHAR) and a live WOD is left by pressing FIM. The acceptance that actually mattered,
> `confirm(`/`alert(` repo-wide → 0, holds. Two more review findings fixed in the same pass:
> `Results.jsx`'s `submitError` is keyed by `sessionId:blockId` with no athlete, so a failed save
> followed the coach onto the next athlete's form until `changeAth` was made to clear it; and the new
> `--green` comment in `themes.css` carried a double-encoded em dash that `design:cards` had inlined
> verbatim into all 16 cards.
>
> **⚠️ #188 changes the gym wall and was NOT confirmed with the user before the commit landed** (the
> plan's Approach 9 asked for that). It is unpushed as of this marker — `tv.html` now follows
> `settings.theme`, so a box on a light theme gets a light wall the next time the display loads.
>
> **#171's boundary, settled as the plan required.** This pass owns the **controller**
> (`tv/tvController.module.css`, `TvController.jsx`, `ClassPanel`/`GroupsPanel`/`DatePicker`) and
> `timer/`. **#171 owns `public/tv/TV.jsx`'s wall layout** and inherits it clean: `TV.module.css` was
> touched for dead-class deletion only and `TV.jsx` for #188's single `syncTheme` call, so no layout
> decision was pre-empted. 🔴 **#171 must not inherit the fixed-canvas/crop model** C5·b2 built for
> Publicador — a wall display crops nothing and has no page size to fit. The four wall slides are now
> gallery-rendered at a pinned 1920×1080 / 0.32 scale, which is the surface #171 starts from.
>
> **Verification gap to close before the gym sees this:** the plan's 🔴 live walk (start a class, run
> a full timer cycle with a rotation and a rest, register/edit/delete a result, end the class), the
> keyboard-only walk and the 390px check were **not** performed — every pass verified by measurement,
> greps, the gallery and the four CI gates instead. `npm test` 1076/31 · lint · `format:check` ·
> `build:all` all green; `design:cards` 16 cards, zero skips.

> The two surfaces the C0–C5 design program never reached. [plans/16](./16-design-pass-program.md)'s
> table has **no C-session for `TvController`**, and B4 covered `tv.html`/`timer.html` before the C0
> primitives existed. **Runs before [plans/87](./87-new-themes.md)** — user decision 2026-09-05.

> 🔁 **Re-measured 2026-09-06 before execution.** Nine figures in the first draft were wrong,
> unsourced, or stale, and one statement about another plan was simply false. Everything below is
> measured against `e882c56`. Four decisions the draft never named are settled in **Decisions**. The
> draft's `M–L` is now **L** — three adjacent rows folded in.

## Context

This started as token-and-a11y cleanup and the [2026-09-05 pass](../reviews/2026-09-05.md) turned it
into a correctness fix: **`Quadro ao Vivo` is illegible on both light themes** (#174). On a light
theme `--cream` is the near-black *text* colour (`#1c1508` totk-light, `#1a0828` sb-light), and
`tvController.module.css` paints it onto a hardcoded `background: #111` — measured **1.04:1** and
**1.00:1**. The Configurações theme picker offers all four themes, so this is one click from a
coach's normal state, on the tab used to run a live class.

Everything else here is the debt that produced it:

| | Measured 2026-09-06 |
|---|---|
| Tokens | `tv/tvController.module.css`: **37 hex in real declarations** (12 unique, 28 lines — 2 of the 39 raw matches sit in comments) **plus 4 `rgba()` literals a hex grep misses** (`:38, :69, :70, :113`) = **41 literals**. `#48b860` is a green in **no** theme; `#c84038` is **3.97:1** at 11px on `#0d0b09`; `#0d0b09` is used as a *foreground* 7 times |
| Tokens — scope | 🔑 **`tvController.module.css` is the ONLY file needing token work.** `Timer.module.css` = **0 hex**; `Timer.jsx` = **0 colour literals** (its ring is already `var(--green)/--gold/--red`); `TV.module.css`'s 4 are `#000` "screen off", the documented `--rest-blue`, one inside a comment and one issue ref. This is exactly what [plans/87](./87-new-themes.md) asserts |
| a11y | 21 buttons / **0** `aria-label` / **0** `onKeyDown` / **0** `role` / **0** `tabIndex` — the worst ratio in the app. ⚠️ **FIVE click-`<div>`s, not one**: `TvController.jsx:74` (date-picker day), `:331` (session chip), `:463` + `:474` (block chips), `ClassPanel.jsx:159` (accordion). **The entire date picker and session selector is keyboard-unreachable.** Unnamed icon-only: `TvController.jsx:63`, `:84` (week arrows) and `ClassPanel.jsx:81` — a **destructive delete** |
| Focus | `tvController.module.css:8,12` strip the outline; that file has **zero** `:focus`, `:focus-visible`, `:hover` and `:active` rules. ⚠️ A **13th** site the draft missed: `timer/Timer.module.css:189` — styled but *indistinguishable from hover* (review §7 H1), in a file this pass already opens |
| Dead CSS | `public/timer/Timer.module.css` **13/107** (`:137-165`, the whole `bm*` picker that moved to `BlockTypePicker.jsx`, plus `.splitLbl:62` and `.cfgSel:123-124`); `public/tv/TV.module.css` **24/99** (the pre-`ExerciseList` rows — the review's "/100" denominator was off by one) |
| Popups | `Timer.jsx:456` — the app's last `confirm()`. ⚠️ But **5 `alert()` survive** (`Results.jsx:306,311,382` · `useSessionEditor.js:157` · `BlockEditor.jsx:134`), three of them on public pages, so "zero `window.*` popups" was never true. Folded in |
| Overlays | `timer/BlockTypePicker.jsx:55` — `position:fixed`, no `role="dialog"`, no `aria-modal`, no Escape, no focus trap, no focus restore; dismissal is mouse-only |
| Live regions | the timer clock (`Timer.jsx:672`, 250 ms), round counters (`:644,654,664`), the 3-2-1 countdown (`:732`) and the ClassPanel roster (`ClassPanel.jsx:184,195`, 20 s) have **no** `aria-live`. `role="timer"` has **zero** occurrences in `src/` |
| Persisted bug | `Timer.jsx:350` stamps history with `new Date().toISOString().slice(0,10)`. ❌ **The draft said plans/84 fixed this. It did not** — #178 is an open P1 row (`BACKLOG.md:52`); plans/84 shipped #172/#173/#175/#176/#179 only. **Folded in here** |

## Lane — decided, not assumed

[plans/16](./16-design-pass-program.md) rule 1's corrected test: *"Lane A when the surface is used
and only its execution is wrong; Lane B when the surface's own existence or structure is in
question."* TV and Timer are used at the gym **every day**, so → **Lane A, gallery-first, no static
mockup.**

⚠️ **Reconciling the C5 addendum**, which cuts the other way: *"a defect that would be obvious on
first use, left unreported for weeks, is evidence about usage, not just about quality."* B1 was
unreported for weeks. It still resolves to Lane A, and the reason is specific: **the box runs a dark
theme**, so the illegibility lives only on a theme nobody at the gym selects. The surface itself is
in constant use and only its execution is wrong. That is the test, satisfied.

🔴 **Split the scope, and do not smuggle the rewrite in.** `Timer.jsx:139-152` documents its own
architectural defect — *"The real fix is to pick ONE source of truth for the clock … Filed, not
done."* — and `Timer.jsx` is **1129 lines with 9 eslint disables** (5 `react-hooks/purity`,
4 `react-hooks/refs`) **and zero tests**; none of its logic is extracted into `public/lib/`, where
every tested helper in this repo lives. That is a state-model rewrite, not a design pass. **This plan
takes tokens + a11y + the popups + the dead CSS. The clock rewrite and the decomposition belong to
[#191](../BACKLOG.md).**

⚠️ **`#171` (TV as a customisable display) targets the same directory.** Settle the interaction in
this plan's Done marker — one paragraph. This pass owns `tv/tvController.module.css` +
`TvController.jsx` + `ClassPanel.jsx`/`GroupsPanel.jsx` + `timer/`; **#171 owns `public/tv/TV.jsx`'s
wall layout.** This pass touches `TV.module.css` for dead-class deletion only and `TV.jsx` for
#188's single call.

⚠️ **Two program-doc loose ends**, one sentence each at close:
[plans/16](./16-design-pass-program.md)'s session table has **no row for this session** and still
calls #43 the only remaining item (add one — the program never having a TvController session *is*
the finding); and its **rule 5** excludes live-region a11y from surface sessions while this plan
absorbs it (`role="timer"`). Defensible; state it rather than leaving the contradiction.

## Decisions (settled 2026-09-06, before execution)

1. **All four adjacent rows fold in** — #178 (`Timer.jsx:350`, one line, same file), the 5 surviving
   `alert()`s, #188 (`tv.html` boots the wrong theme forever), and extracting `DatePicker` out of
   `TvController.jsx:27-89` (a pure move that makes the worst keyboard gap galleriable).
2. **sb-light's `--green` is nudged in `themes.css`**, not worked around — see Approach 3.
3. **`ui/Modal` is promoted to `src/public/shared/Modal.jsx`**, joining `ConfirmReview` and
   `MaskedTimeInput` as a cross-surface primitive, rather than `BlockTypePicker` hand-rolling a
   fourth focus trap or a public page importing across the `src/components/` boundary.
4. **The gallery covers the client-free components, not "both surfaces"** — the containers can't
   render there, and saying otherwise made the acceptance unmeetable.

## Acceptance

- 🔴 **`Quadro ao Vivo` and `timer.html` are legible and correct in all four themes**, verified by
  measuring — not eyeballing — the pairs that failed: `--cream`/`--sub`/`--teal` on their real
  surfaces, and `#c84038`'s replacement at its real 11px size. **Bare hex AND bare `rgba()` in
  `tv/tvController.module.css` → 0** (data colours and the deliberate `.previewBlank` black excepted,
  each commented).
- 🔴 **`--accent-text` on `--green` clears 4.5:1 in all four themes** — today spirit-blossom-light
  measures **3.33:1** and is the one cell substitution cannot fix.
- Zero unnamed icon-only buttons in `tv/`; **all five click-`<div>`s** are keyboard-operable; every
  control keyboard-reachable with a visible focus state that clears 3:1.
- `Timer.jsx:456`'s `confirm()` is a `ConfirmReview`. **`window.confirm` repo-wide → 0, and
  `alert(` → 0.**
- `timer/BlockTypePicker.jsx` uses the promoted `shared/Modal` (`role="dialog"`, `aria-modal`,
  Escape, focus trap) with no regression to its 3-level drilldown.
- The timer announces on **state transitions** via `role="timer"` — start / pause / round advance /
  finish — **not** a per-second live region. The ClassPanel roster gets `aria-live="polite"`.
- The 37 dead classes in `Timer.module.css` + `TV.module.css` are gone.
- **`ClassPanel` · `GroupsPanel` · `BlockTypePicker` · `slides.jsx`'s four slides · the extracted
  `DatePicker`** render every state in the gallery across **4 themes × 390/1280**. (The three
  containers import a Supabase client and cannot — saying "both surfaces" made this unmeetable.)
- **All four CI gates green:** `npm test` (≥1075) · `npm run lint` · **`npm run format:check`** ·
  `npm run build:all`. `npm run design:cards` re-run + committed.

## Files

- `src/components/tabs/tv/tvController.module.css` · `tv/ClassPanel.jsx` · `tv/GroupsPanel.jsx` ·
  `src/components/tabs/TvController.jsx` · **`tv/DatePicker.jsx` (new — extracted from `:27-89`)**
- `src/public/timer/Timer.jsx` (tokens · `confirm()` · `role="timer"` · #178) ·
  `timer/Timer.module.css` (focus `:189` · 13 dead) · `timer/BlockTypePicker.jsx` + `.module.css`
- `src/public/tv/TV.module.css` (dead-class deletion only — the layout is #171's) ·
  `src/public/tv/TV.jsx` (#188's one `syncTheme` call only)
- **Promotion:** `src/components/ui/Modal.jsx` + `Modal.module.css` → `src/public/shared/` · **7
  import sites** (`afiliados/AffiliateFormModal`, `afiliados/BoxQrModal`, `atletas/AddResultModal`,
  `atletas/AthleteProfileModal`, `atletas/PrModal`, `tabs/Atletas.jsx`, `publicador/events.jsx`) ·
  2 CSS comments (`Atletas.module.css:325`, `Publicador.module.css:450,560`)
- **Popup fold-in:** `src/public/results/Results.jsx` · `criador/useSessionEditor.js` ·
  `criador/BlockEditor.jsx`
- `CrossFit-Apps/themes.css` — one token, one theme (sb-light `--green`)
- `src/public/shared/ConfirmReview.jsx` (consumer, no change expected)
- `src/public/gallery/groups/tv.jsx` + `timer.jsx` (new) · `gallery/Gallery.jsx`
- Close: `docs/BACKLOG.md` · `docs/plans/16-design-pass-program.md` · `CLAUDE.md`

## Approach

🔴 **Stop at every pass boundary** — the model changes between them (see the table at the end).

1. **Tokens — `tvController.module.css`.** 🔴 **Fix the *pair*, never just the foreground**: a
   hardcoded dark `background` under a themed `color` is what produces 1.00:1.
   - Dark backgrounds (`:6, 8, 12, 45, 64, 81, 107, 143, 160, 161, 169, 170`): `#111` →
     `var(--stone)`, `#1a1a1a` → `var(--stone2)`, `#3a3a3a` → `var(--border)`, `#1a1a1a`-as-border
     (`:154`) → `var(--divider)`. `.card:6` alone freezes the whole tab dark.
   - Tinted selections — `#0d1a1a`(:45) · `#0d1a10`(:12,:161) · `#1a120a`(:81,:170) and the 4
     `rgba()` (`:38,:69,:70,:113`) are all "10–15% of a token over the surface" →
     `color-mix(in srgb, var(--teal) 10%, transparent)` (and `--gold`/`--muted`/`--green`).
   - The 7 `color: #0d0b09` ink sites (`:27,65,89,90,106,135,168`) → **`var(--accent-text)`**,
     measured: on `--teal` **10.31 / 6.57 / 9.51 / 5.63**; on `--gold` **9.59 / 4.64 / 5.57 / 5.11**.
   - The 3 `#c84038` sites are **byte-identical** (`border-color` + `color`, transparent fill) →
     **one `.dangerBtn`** on `var(--red)` (5.05–5.40, passes at 11px).
   - `.previewBlank:98-99` simulates a switched-off TV: keep `#000` and **comment it deliberate**, as
     `TV.module.css:13` already does. But `#222` on `#000` is **1.32:1** — `#808080` is **5.32:1**
     and stays theme-independent.
2. **`#48b860` becomes `var(--green)`**, which exists in all four themes — the draft's "no token"
   framing was about the literal, not the role.
3. **The sb-light `--green` cell — `CrossFit-Apps/themes.css`.** `--green` resolves three themes and
   fails the fourth: sb-light's `#28a064` is **3.33:1** both as ink-on-fill and as `.hdrLive` text on
   `--stone` (2.93 on `--bg`). Apply **the plans/65 method — an exact per-channel ×0.75, hue
   untouched: `#28a064` → `#1e784b`** (**5.46** vs `#fff` · **4.81** vs `--bg` · **4.58** vs
   `--stone2`). ⚠️ `--green` is used app-wide, so re-sweep the sb-light gallery for it. ⚠️ Token
   count per theme must stay **29** — this replaces a value, adds nothing.
4. **a11y — nine sites.** `TvController.jsx:74,331,463,474` → real `<button type="button">` (nothing
   is nested inside them). ⚠️ **`ClassPanel.jsx:159` CANNOT be a `<button>`** — its header contains a
   nested `<button>` (Encerrar, `:160-170`). Use the app's own canonical contract,
   `AccordionCard.jsx:29-35`: `role="button" tabIndex={0} aria-expanded onKeyDown={onKey(onToggle)}`.
   🔑 **Reuse `onKey(fn)` — `src/public/schedule/scheduleHelpers.js:98`** (Enter + Space with
   `preventDefault`/`stopPropagation`); do not hand-roll a key handler. `aria-label` on
   `TvController.jsx:63`, `:84`, `ClassPanel.jsx:81`. Then the focus states: delete `outline:none` at
   `:8,12`, add the canonical ring `outline:2px solid var(--accent); outline-offset:2px` (measured on
   `--bg`: **9.65 / 5.37 / 9.51 / 4.95**) to every interactive class — `.btn .dpArrow .dpDay
   .sessChip .qrToggle .blkChip .blkChipCustom .classHead .assignBtn .input` — plus
   `Timer.module.css:189`.
5. **`Timer.jsx:456` → `ConfirmReview`**, and the 5 `alert()`s. The confirm gates a destructive
   mid-class action, so the copy must say what happens: it **pauses and leaves**, it does not discard
   (`doDiscard:450` is the un-gated sibling). 🔑 **All 5 `alert()`s are `alert(); return` validation
   guards — none needs a dialog.** The established replacement is inline text (#157/plans/80: *"the
   save gate names what is missing"*; C5·c: a PDF failure *"renders as inline text instead of
   blocking"*). `Results.jsx:306,311` → inline at the Registrar control before `setConfirmPending`;
   `Results.jsx:382` → **`ConfirmReview`'s existing `error` prop**, zero new UI;
   `useSessionEditor.js:157` → return the reason, let `SessionEditor` render it (mirror `saveGate`'s
   pure-predicate shape); `BlockEditor.jsx:134` → inline in the block editor.
6. **Promote `ui/Modal` → `src/public/shared/Modal.jsx`**, then adopt it in `BlockTypePicker`.
   `Modal.module.css` uses only tokens defined in `themes.css` (the `:root` geometry block exists
   precisely so `public/shared` primitives inherit `--sp-*`/`--radius-*`), so the move is clean.
   ⚠️ **Two real behaviour changes — verify on a phone, not just at 1280:** (a)
   `BlockTypePicker.module.css:1-9` is a **bottom sheet** (`align-items:flex-end`, `z-index:80`) and
   `Modal` **centres** (`z-index:500`), on a page used at the gym on a phone; (b) the picker is a
   **3-level drilldown** with its own `←` back button (`:59`) and no title, while `Modal`'s header is
   title + ✕ — the back control moves into the body and the title changes per level. **This is a
   rewrite of its shell, not a swap.** If the sheet placement proves load-bearing, keep the promotion
   (it is the right home regardless) and give `Modal` a `placement` prop rather than reverting.
7. **`role="timer"` + transition announcements.** 🔴 The clock must **not** be a live region —
   `Timer.jsx:672` ticks at 250 ms. Announce on start / pause / round advance / finish. For the
   ClassPanel roster reuse **`RankList.jsx:36-45`**, the repo's only live *data* region: the polite
   attribute sits on the **same container in both the empty and populated branches**, so the region
   survives the empty↔populated transition.
8. **#178** — `Timer.jsx:350` → `todayISO()` (`Timer.jsx:8` already imports from `../lib/week.js`).
   One line. (`recover/Recover.jsx:82` is the display-only twin — out of scope, note it.)
9. **#188** — `tv.html` boots `totk-dark` forever. 🔴 **CLAUDE.md and `plans/67:129-130` say tv.html
   is "deliberately excluded" from theming — that exclusion is about `?box=` SCOPE, not about theming
   at all** (*"the gym wall has no box scope, is driven by TvController rather than a `?box=` link"*).
   `syncTheme(settings, null)` needs no box scope: it falls through to `resolveTheme({settings})`,
   the coach's own gym theme. `TV.jsx:19` already fetches settings, so it is one call. ⚠️
   **Consequence: the gym wall changes appearance** — if the box's theme is a light one, the wall
   goes light for the first time. Confirm with the user before pushing. Then correct CLAUDE.md's
   theme.js paragraph ("**6** public pages; tv.html deliberately excluded" → 7) and plans/67's note.
10. **Delete the 37 dead classes.** No dynamic class construction in either surface (checked for
    bracket-indexed and computed class keys), so a grep scoped to the importing file is safe. ⚠️
    **Two documented false negatives:** `bmList` — `BlockTypePicker.jsx:52` has a JS variable of that
    name; `complexBlock` — `ExerciseList.module.css` defines a class of the same name, and module
    scoping is what makes it dead in `TV.module.css`. ⚠️ Do **not** touch
    `.bmPrompt`/`.bmPromptHint`/`.bmPromptBtn` (`:193-196`) — live at `Timer.jsx:774,775,778`.
11. **Gallery.** New `tv` and `timer` groups covering `ClassPanel`, `GroupsPanel`, the extracted
    `DatePicker`, `BlockTypePicker` and `slides.jsx`'s four slides — all client-free and props-in
    today. ⚠️ `GroupsPanel` early-returns `null` without `activeClass`, so the fixture must supply
    one. ⚠️ **A group's name becomes `design/components/<lowercase>.html`** (`Gallery.jsx:34-36`), so
    keep it one clean ASCII token. ⚠️ `build-design-cards.mjs:228` **silently skips** a group whose
    `render()` throws — check its `skipped[]` output. `id` must be unique across **all** groups
    (flat lookup, `Gallery.jsx:54,71`); `tema.jsx` (55 lines) is the cleanest template.

## Verification

- 🔴 **Drive the wall display live against the local stack** — start a class, run the timer through
  a full cycle including a rotation and a rest, register an athlete, edit a result, delete one, end
  the class. This surface is used at the gym daily, so a regression is visible immediately and a
  screenshot is not enough. ⚠️ **There is no `/verify` skill** — use the `run` skill or Playwright
  MCP.
- **Keyboard-only walk** of TvController and Timer: every control reachable, named and visibly
  focused. Check the accordion with Enter *and* Space. **Start with the date picker and session
  chips** — previously unreachable entirely.
- Re-measure the failing pairs in DevTools under all four themes, including `--accent-text` on
  `--green` after the themes.css nudge.
- ⚠️ **`color-mix()` caution:** plans/84's Done marker records a live html2canvas/`color-mix()`
  incompatibility (#195) breaking Publicador's mobile rasterisation. TvController is never rasterised
  so it is safe here — **do not carry the idiom into an export view.**
- **390px.** `tvController.module.css` has breakpoints at 1100/820 only, yet `Quadro ao Vivo` is
  reachable from the mobile chrome strip (`chrome/tabs.js:17`, `short: 'Quadro'`), where `.dpDays`'
  7-column grid and `.rightGrid`'s 320px column overflow. **Scope: make 390px usable and unbroken;
  no mobile redesign** — that is its own row.
- `grep -rn "window.confirm" src/` and a bare-`confirm(` grep → 0 (excluding comments); `alert(` → 0.
- Gallery: every state, 4 themes × 390/1280. `npm run design:cards` (⚠️ it inlines `themes.css`,
  which Approach 3 changes — **every card will differ**), check `skipped[]`, commit the regenerated
  cards.
- **All four CI gates:** `npm test` · `npm run lint` · `npm run format:check` · `npm run build:all`.
  Then `/code-review` (L) before pushing.
- Close the ritual: Done row in `BACKLOG.md`, `> ✅ Done: #174 — <commit> · <date> — see BACKLOG.md`
  here, then `node scripts/audit-backlog-markers.mjs`.

## Passes — stop at every boundary

| Pass | Deliverable | Model |
|---|---|---|
| 0 | This re-measurement (done) | Opus |
| 1 | Approach 1–2 · tokens in `tvController.module.css` | **Opus** — every substitution is a measured contrast decision |
| 2 | Approach 3 · the sb-light `--green` nudge | **Opus** — edits `themes.css` |
| 3 | Approach 4 · a11y, focus rings | **Opus** for the ClassPanel nested-button call; Sonnet for the mechanical edits |
| 4 | Approach 5 · `ConfirmReview` + the 5 `alert()`s | **Sonnet** |
| 5 | Approach 6 · Modal promotion + `BlockTypePicker` | **Opus** — the shell rewrite is a UX change |
| 6 | Approach 7 · `role="timer"` + roster live region | **Opus** — the announcement contract is judgement |
| 7 | Approach 8–9 · #178 + #188 | Sonnet for #178; **Opus** for #188 (contradicts a recorded decision, changes the wall) |
| 8 | Approach 10 · dead CSS | **Sonnet** |
| 9 | Approach 11 · gallery + `design:cards` | **Sonnet** |
| 10 | Board row, plan marker, CLAUDE.md, `/code-review` | **Opus** |

Model: **Opus** (lane, token and contract decisions; the mechanical edits are Sonnet) · Size: **L**
