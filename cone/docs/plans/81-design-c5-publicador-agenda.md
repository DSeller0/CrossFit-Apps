# 81 — #59 · Design pass C5 — Publicador + Agenda

> C5 in the [design-pass program](./16-design-pass-program.md). **The last design-pass session.**
>
> ✅ **Lane B for both surfaces — user-confirmed 2026-08-30.** plans/16 rule 1's 2026-08-29
> correction explicitly deferred this call ("C5 has not been assessed against this yet — do it when
> C5 is planned"). It is argued from **measured evidence** in `### The lane call` below, because
> unlike C3 no user statement existed — and then the user confirmed it outright. **Rule 1's deferred
> assessment is now closed.**
>
> **Four sessions, not one.** 7,674 raw lines is ~4× C3's 1,847, so this plan's second job is the
> split: **Phase 0** (dead code + three one-line correctness bugs; no gate, ships alone) →
> **C5·a Agenda** → **C5·b Publicador** → **C5·c Relatório + #154**. Each of a/b/c is its own
> execution session with its own mockup and its own approval gate.
> ✅ **All four enter Ready at once, in order, and are picked before anything else on the board**
> (user, 2026-08-30 — *"they are big enough to justify being all in ready before any other backlog
> item is tackled"*).
>
> **Rides and closes:** #105 (a) · #106 (a, optional) · #113 (b, decision) · #170 (b, gate
> question) · #154 (c) · #15 (closes with the program). **Explicitly does NOT wait for #102** — see
> decision 1.
>
> **Next after this: #43 (four new themes)** — the program's own terminal row.

## Context

`plans/80` shipped 2026-08-30 and emptied Ready. The board's banner reads *"Next up: C5 · #59 ·
Publicador + Agenda"* (user, 2026-08-29, reconfirmed as *"after C3 closes, including any bugs it
causes"*). C5 is the last of the ten design-pass sessions; #43 is the only program row after it.

Re-measured against the working tree, 2026-08-30. **Every figure the #59 row and plans/16 carry is
pre-`9b82015` and pre-plans/39; use these.**

| file | raw | hex literals | `rgba(` | `style: {` | `createElement` | `--theme-accent` |
|---|---|---|---|---|---|---|
| `tabs/Publicador.jsx` | 2224 | 130 | 8 | 81 | 167 | 29 |
| `publicador/AgendaView.jsx` | 1598 | 77 | 24 | 107 | 145 | 22 |
| `publicador/events.jsx` | 1646 | 71 | 7 | 94 | 107 | 25 |
| `publicador/exportViews.jsx` | 1105 | 70 | 0 | 82 | 105 | 0 |
| `publicador/mobileExportViews.jsx` | 1101 | 61 | 27 | 77 | 82 | 0 |
| **total** | **7,674** | **409** | **66** | **441** | **606** | **76** |

(+ `exportHelpers.js` 122 · `MicButton.jsx` 22 · `billing.js` 63 · `pixQr.js` 14 = **7,895** in the
family. "Hex literals" counts **quoted** `'#rgb'` / `'#rrggbb'` only — a plain `#[0-9a-f]{3}` grep is
inflated by backlog references in comments (`#104`, `#160`), which is part of why the inherited
figures never reconciled.)

**Zero `.module.css` in `publicador/`** — since C3 gave `resultados/` one, this is the **last tab
with none**. **No gallery group** either. **Zero adoption of the C0 primitives**: no `Button`, no
`Card`, no `Input`, no `ConfirmReview`, no `TallyBar`, anywhere in the family. **Zero `aria-label`,
zero `role:`, zero `tabIndex`** across 81 `onClick:` handlers and 31 click-`<div>`s. This is the
only SPA tab that has had no C-session at all.

### The lane call — ✅ **Lane B for both, user-confirmed 2026-08-30**

plans/16 rule 1's test: **Lane A when the surface is used and only its execution is wrong; Lane B
when the surface's own existence or structure is what is in question.** C3 answered it from a user
statement. No such statement exists for C5, so it was answered from the surfaces themselves — and
the answer is the same, for two different reasons. **The user then confirmed it outright ("Lane B
for both", 2026-08-30), which closes rule 1's deferred assessment: plans/16 records C5 as decided,
not inferred.**

**Publicador → Lane B. Three of its outputs have been visibly broken for ~7 weeks and nobody has
reported one.**

1. **Two of the eight export buttons render the identical string.** `APP_CONFIG.mobileWeeklyLabels`
   is `['Mobile Semanal 01', 'Mobile Semanal 02']` (`utils/config.js:30`) — 17 characters each — and
   all four render sites truncate with `.slice(0, 15)` (`Publicador.jsx:985,1004,1193,1206`), which
   cuts **exactly at the disambiguating digit**. Both buttons read `"Mobile Semanal "`. Verified by
   execution, not by eye. The 2026-07-09 benchmark filed this ("Two adjacent buttons are both
   labeled Mobile Semanal — indistinguishable"); it is still live.
2. **The Semanal export still prints an English month.** `exportViews.jsx:409` builds its header with
   `new Date(year, month, 1).toLocaleString('default', { month:'long', year:'numeric' })` —
   `'default'` is the **browser's** locale, not pt-BR — and `.wk-title` (`index.css:264`) uppercases
   it, so the header reads **"GRADE DE TREINOS · JULY 2026"** on an English-locale browser. The same
   file already imports `MONTH_PT` and uses it correctly at `:602` and `:840`; this one site was
   missed.
3. **Apresentar's share link 404s in production.** `PresenterView`'s `_presenterLogUrl` points at
   `log.html`, which is not in `vite.public.config.js`'s 10-page input, and `deploy.yml` ships only
   `public-dist/` (#113, open since 2026-07-27). `CONE_CONTEXT.md:203` states the tab's job as
   *"Publish daily session. Apresentar → PresenterView (TV mode with QR)"* — i.e. Apresentar is one
   of the two things the tab is **for**, and it has been dead on the real site.

Add the shape of the surface: **eight export targets** (Diário · Semanal · Calendário · Mobile 01
"Eagles" · Mobile 02 "MegaMan" · Mobile Semanal 01 · Mobile Semanal 02 · Apresentar) driven by
**64 `useState` calls**, of which **35 are user-configurable colours** (`dvBg`, `dvGymName`,
`dvDate`, `dvZoneType`, `dvBlockLabel`, `dvCap`, `dvRounds`, `dvExName`, `dvIntensity`, `dvNote`,
`dvBlockNotes`, `dvDivider`, `wkBg`, `wkHeader`, `wkDateNum`, `wkBlockType`, `wkExName`, `wkDivider`,
`eaGymName`, `eaDate`, `eaSubtitle`, `eaBlockType`, `eaBlockMeta`, `eaExName`, `eaIntensity`,
`mmGymName`, `mmDate`, `mmSubtitle`, `mmBlockType`, `mmBlockMetaBg`, `mmExName`, `mmIntensity`,
`eaglesBg`, `megaManBg`, `noteColor`) persisted to `settings` behind a 466-line settings drawer —
a second, parallel theming system for exports only, two of whose skins are named after one gym.

🔴 **A label that has been unreadable for two months, in a tab whose documented purpose is one
daily export, is the same class of evidence C3 acted on.** It does not prove the tab is unused; it
proves those buttons are not pressed. The question "which of the eight survive?" is a structure
question, and structure questions are Lane B.

**Agenda → Lane B, on the opposite evidence: a competing surface was built beside it three days
ago.** #162 (plans/78, 2026-08-29) shipped **`MinhaSemanaPane`** — a week grid of the coach's own
`events`, rows = the distinct times that actually occur, colour-resolved per affiliate — in
**Afiliados**, not in Agenda. Agenda is `events`' own tab and offers a month grid plus a day pane
and *no week or list view at all* (#105's second half). Building a second calendar over the same
blob in a different tab rather than adding a view to this one is a statement about this one. The
same session also added **`AffiliateSessions`** (that affiliate's month of events) and
**`Fechamento`** (the invoice board over the same events). Agenda is used — but three of its jobs
have quietly migrated out, so what is left, and what shape it should be, is a structure question too.

✅ **Lane B is a decision now, not a reading of the evidence** (user, 2026-08-30). The usage
question — *which of the eight export targets have you actually produced and sent to someone in the
last few months?* — therefore stops being a lane question and becomes a **scoping question inside
C5·b's mockup**: it decides how many export targets the redesign carries forward, not whether the
tab gets redesigned. It stays C5·b's opening question for that reason.

### Three decisions taken *with the user*, 2026-08-30 — do not re-litigate

1. **Lane B for both surfaces.** Closes plans/16 rule 1's deferred C5 assessment.
2. **The Semanal export's month is fixed, in pt-BR** (`MONTH_PT`) — *"to match the rest of the app's
   interface"* — not struck from the row as stale. Phase 0 step 3.
3. **All four sessions enter Ready in order and outrank every other board item** until the block is
   done.

### Six decisions taken while planning — do not re-litigate

1. 🔴 **#59 does NOT wait for #102. C5·a phases around it by reserving a slot and freezing
   `evStatus`'s semantics.** #102's row says #59 *"rewrites AgendaView's markup and must inherit this
   rather than re-derive it"*, which reads as a gate. It is not one, for four measured reasons:
   - **(a)** #102 is an unplanned **M–L Opus** row that absorbs #71, needs a **prod migration**
     (`0010` — its row says `0008`, which #71 took, and `0009` #150 took), and requires a
     `dbLoadExecutionsRange` that **does not exist**. `AgendaView` today imports no Supabase client
     at all, directly or transitively, so #102 gives the file its first async read. Putting that in
     front of the last design pass stalls the program on a schema change.
   - **(b)** What #102 asks to inherit is **markup**, and a reserved slot buys markup cheaply — the
     exact device `atletas/Ficha.jsx` already uses twice (`:167-170` for #39, `:179-181` for
     plans/22), both honoured by C2 and C3.
   - **(c)** The expensive thing to redo is **status semantics**, not pixels. So C5·a must not build
     any affordance that *depends* on `status` being a manual toggle — `evStatus`
     (`AgendaView.jsx:48-50`) is carried across **verbatim**, and #102 replaces it.
   - **(d)** The durable half of #102 is the **honesty rule**, and that is already shipped and
     commented in-code (`MinhaSemanaPane.jsx:15`, `TvController.jsx:142`,
     `gallery/groups/afiliados.jsx:1013`): never claim attendance from `events`. C5·a inherits the
     rule without the join.

   **Recorded for #102's own plan:** the reserved slot in the event card / day pane is yours; do not
   redesign the surface around it.
2. **#170 is a one-line question on C5·b's mockup, not a build.** Its row says *"do not build this
   pre-emptively — wait for the user to ask"*. C5·b is redesigning the export list anyway, so
   "should a Leaderboard image be one of the exports?" costs nothing to ask at exactly the moment it
   is cheap. The whole path (`LB_IMG` + `doExport` + the 1080px target, ≈200 lines) is recoverable
   from `4772250^`, and the 1080px `html2canvas` machinery it needs is **already in this tab**
   (`Publicador.jsx:305,382,433`). Build it only if the user says yes; close #170 either way, with
   the reason.
3. **#113 is decided in C5·b, not deferred again.** Apresentar is one of the tab's two documented
   jobs and its share link is dead. The mockup must show Apresentar either **with a working share
   target** (add `log.html` to `vite.public.config.js`'s input — it becomes page 11) or **without
   the share affordance at all**. "Intent is genuinely unclear" (the #113 row) stops being true the
   moment someone designs the screen.
4. **The exemption is "export artifact", not "jsPDF".** The #59 row and plans/16 both say *"classify
   jsPDF hex as exempt-from-#15 (PDF has no CSS vars)"*. **That task is a no-op as written**: jsPDF
   lives only in `events.jsx:703-706` (the Relatório), and every colour it is given is an **RGB
   integer triple** — `doc.setTextColor(30,30,30)`, `headStyles:{fillColor:[30,30,30]}` — so **not
   one of the 409 hex literals is jsPDF's**. The claim was true when `Publicador.jsx` was 2125 lines
   and contained the Relatório; plans/39 moved that code out and nothing re-attributed the figure.
   The real three-way classification is:
   - **Tokenize (screen chrome).** `AgendaView.jsx` (77) + `events.jsx`'s form/modal chrome + the
     `Publicador.jsx` toolbar. These are a **frozen totk-dark palette** — `#d8a840`=`--gold`,
     `#c8b090`=`--sub`, `#554a3a`=`--dim`, `#806850`=`--muted`, and `#0d0b08`, which is `--bg`
     `#0d0b09` **off by one digit**, i.e. hand-copied. Agenda renders wrong in 3 of the 4 themes —
     the same bug C1 killed in `Exercicios.jsx` and C2 in `Atletas.jsx`.
   - **Exempt (export artifact).** `exportViews.jsx` (70) + `mobileExportViews.jsx` (61) + the
     1080px render targets. A PNG the coach sends to WhatsApp must not change colour when he
     switches theme; `index.css:3` already declares `--export-font:'Arial Black'` on the same logic.
     Record the exemption **in the files**, next to the palette, the way `SCALE_COL` does.
   - **Data (a persisted user choice).** The 35 colour `useState` defaults — they are seeds for
     values the user sets and that get baked into an image. Tokenizing them would be wrong.

   ⚠️ `#00b8d4` appears **17 times** in `Publicador.jsx` and 8 in `mobileExportViews.jsx`. That is
   the cyan #51 removed from the leaderboard; it is in no theme. Classify it deliberately.
5. **`BLOCK_C` stays, and its comment is rewritten to be true.** `AgendaView.jsx:25-36` is now the
   **last** divergent block-family taxonomy in the repo — `public/index/rail.jsx:5,142` imports
   canonical `blkColor`, so #53 closed the fifth fork and this is the sixth and final one. Its
   premise (a per-*type* rainbow for dense chips, not the 4-family hue grouping) is sound and is
   preserved. But three things about it are wrong, and C5 fixes them:
   - Its comment says *"for the mini-calendar dots below"*. **There are no dots.** Its only two
     consumers (`:603-605`, `:858-860`) tint **block chips** in the day pane and the mobile day
     detail.
   - It is **not actually per-type**: `For Time`, `AMRAP` and `WOD` are all `#e87820`.
   - The two consumers **disagree**: `:603` falls back `BLOCK_C[lbl] || BLOCK_C[bl.type] || '#555'`,
     `:858` only `BLOCK_C[lbl] || '#555'`. A block with a custom label renders one colour in the day
     pane and grey in the day detail. Same block, two colours — fix in Phase 0.
6. ⚠️ **CORRECTED 2026-08-31 by C5·a's exit grep — re-read this decision before deleting anything.**
   Its central claim is half wrong, and acting on it as written would break Criador:
   - 🔴 **`.fg` and `.lbl` are NOT Publicador-only.** Measured on `c04dfce`, counting real
     `className` literals rather than substrings: `.fg` = `IntensityInput.jsx` 3 · `ExerciseRow.jsx`
     2 · `Publicador.jsx` 7; `.lbl` = `IntensityInput.jsx` 4 · `ExerciseRow.jsx` 8 ·
     `Publicador.jsx` 8. **Deleting them with the zoo would unstyle Criador's intensity inputs.**
     They are Criador's (`#58`), not #59's — retag, do not remove.
   - **`.bp` and `.bfull` already have ZERO consumers** and can be deleted now, independent of the
     redesign. `.pvt` IS live but only via a template literal (`` `pvt ${…}` ``), which is why a
     plain `className="pvt"` grep misses it — the same blind spot that hid this whole family from
     C3.
   - Still true: `.b` (28) · `.bsec` (4) · `.bd` (2) · `.bsm` (23) · `.pvt` (4) · `.pub-controls`
     are `Publicador.jsx`-only, and both `.pub-pane` wrappers are `App.jsx:269,287`.

6. **The `.b*` zoo dies here, and `Publicador.jsx` is provably its last consumer.** Repo-wide, the
   only file using `.b`/`.bp`/`.bsec`/`.bd`/`.bsm`/`.bfull` is `Publicador.jsx` (28 usages), plus one
   in `events.jsx`; `.fg` (7) and `.lbl` (8) likewise. C3 left them standing because
   `React.createElement('button', { className: 'b bsec' })` is invisible to a `className="b ` grep —
   that is now measured, not assumed. **12 rules** (`index.css:43,44,54-63`) plus the 4 `.pub-pane`
   rules (`:33-36`) and both `App.jsx` wrappers (`:269,287`) go with C5·b.

   ⚠️ Note `.bp` and `.bsec` have **identical declarations** and differ only on hover — `#e8e8e8`
   vs `#c86010`, both hardcoded, neither theme-aware. Two "primary" buttons that are the same button.

### Corrections to the board, plans/16 and CLAUDE.md — verified 2026-08-30

Recorded so no execution session re-derives them, in the spirit of plans/80's finding 3.

1. ✅ **"45 `rgba()` in `Publicador.jsx`" is stale** (#59 row) — it is **8** occurrences today, **66**
   across the family (`AgendaView` 24, `mobileExportViews` 27, `events` 7, `exportViews` 0). The 45
   predates plans/39. Strike it; the census above replaces it.
2. 🔴 **"fix JULY 2026 English month" is NOT stale — the bug is live**, at `exportViews.jsx:409`.
   It survives a grep for English month literals and for `'en-US'` because the locale is **not
   hardcoded to English** — it is **unspecified** (`'default'`), so it renders `julho` on a pt-BR
   browser and `July` on an English one. The check that finds it is a grep for
   `toLocale\w*String\('default'`, not for month names.
   ✅ **User decision 2026-08-30: keep the item and fix it in pt-BR, "to match the rest of the app's
   interface."** It is a Phase 0 one-liner — see Phase 0 step 3.
3. ✅ **"classify jsPDF hex as exempt" is a no-op as written** — see decision 4. Replace the task.
4. ✅ **"dedupe the two Mobile Semanal labels" is live and root-caused** — `.slice(0, 15)` at four
   sites; the labels themselves are already distinct in `config.js:30`.
5. 🔴 **CLAUDE.md's #45 claim is stale.** It says `publicador/exportHelpers.js`'s
   `buildProgressionLines()` *"still hand-rolls the same grouping independently"*. It does not —
   `exportHelpers.js:2,23` imports and calls canonical `groupProgressionSteps`, and only re-derives
   each group's **unit** on top, with a comment explaining why (`groupProgressionSteps` doesn't carry
   unit). #45's grouping half is closed; update CLAUDE.md.
6. ✅ **#105's `events.jsx:175-190` is stale** — `filteredEvents` is `:626-649`.
7. ✅ **#106's "nothing ever reads `recurrenceGroup` again" is imprecise** — `AgendaView.jsx:752-757`
   reads it to render a `ti-refresh` icon with a `title`. The series is **marked but not operable**,
   which is the row's real point.
8. ✅ **#154's named files no longer exist.** `Servicos.jsx` was absorbed by #161. `saveLoc` →
   `afiliados/Afiliados.jsx:149-158`; `startEdit` → `:133-145`; `rateLabel` →
   `afiliados/affiliateHelpers.js:18-25` (pure, already tested). And `billing.js` now has **nine**
   importers, not one.
9. ✅ **#102's migration number is wrong** — `0008` is #71's and `0009` is #150's; #102's is `0010`.
10. 🔴 **CLAUDE.md gets `MONTH_PT`'s casing wrong, in the very sentence warning about casing.** It
    says *"`DAY_PT`/`MONTH_PT` are UPPERCASE/full-name"* — correct for `DAY_PT` (`week.js:29`,
    `['DOM','SEG',…]`) and **wrong for `MONTH_PT`** (`week.js:3`, `['Janeiro','Fevereiro',…]`), which
    is full-name but **Titlecase**. The same sentence adds *"not drop-in for each other, see #16's
    casing-hazard note"* — and misstates one of the two constants it is warning about. Found while
    writing Phase 0 step 3, which is exactly the kind of task that reads that line first. Fix
    CLAUDE.md in Phase 0.

### Eight things found while planning that no doc records

1. 🔴 **`MicButton` is dead code, and it is the sole reason `exportHelpers.js` cannot be tested.**
   Nothing in `src/` imports `MicButton` — the only references are a comment (`index.css:282`) and
   `legacy/*.html`, which is never built. `CONE_CONTEXT.md:335` says it outright: *"Voice command
   (MicButton) removed — proved to have no purpose."* The component, its `useSpeech` hook
   (`exportHelpers.js:80-121`), its `alert()`, and the module-scope
   `const SpeechRecognition = window.SpeechRecognition || …` (`exportHelpers.js:6`) were all left
   behind. **That line 6 is what throws in vitest** (`environment:'node'`, no jsdom, no
   `setupFiles`) — it is the documented reason #149 put `calcTotal` in a new `billing.js` instead.
   Deleting ~62 dead lines unlocks **six pure functions** (`buildProgressionLines`, `exLine`,
   `complexLine`, `getWeeksOfMonth`, `buildMobileSession`, `mfs`) for their first tests.
   `getWeeksOfMonth` alone feeds AgendaView's entire month grid and both export view families.
2. 🔴 **All six export views are mounted, always, off-screen.** `Publicador.jsx:2049` opens an
   ungated `<div style={{position:'fixed', left:'-9999px', top:'-9999px'}}>` holding
   `DailyExportView`, `WeeklyExportView`, `WeeklyCalendarExportView`, `CalendarExportView`,
   `MobileEaglesExportView`, `MobileMegaManExportView` (+ a second `WeeklyExportView`), each with its
   own `ref`, so `html2canvas` can rasterise them on demand. Every keystroke in the settings drawer
   re-renders all of them. This is the structural constraint on any "render only the selected
   export" redesign — and the reason the export views are needed eagerly rather than lazily.
3. ⚠️ **`Publicador.jsx` is one component with a 1,675-line `return`.** Body is `:26-548`
   (523 lines of state and handlers); `:549-2224` is a single `React.createElement` expression with
   six top-level regions: PresenterView overlay (`:552`) · header (`:553`) · toolbar (`:576`,
   ~438 lines) · preview modal (`:1014`, ~569) · settings drawer (`:1583`, ~466) · the off-screen
   render farm (`:2049`, ~175). **The JSX conversion and the decomposition are the same edit** —
   which is exactly why the #74 watch has no separate decomposition row for this file.
4. ⚠️ **`AgendaView` defines two large components inside its own body** — `CellDay` (`:158-371`,
   214 lines) and `DayPane` (`:372-1097`, **726 lines**). `events.jsx:9` records that this pattern
   already cost them once: *"EventFormInner — standalone so inputs don't lose focus"*. `DayPane`
   holds no `useState` today, which is why lint passes; **any state added to it will remount on
   every parent render.** Hoist both in C5·a before adding anything.
5. ⚠️ **`--theme-accent` is used 76 times in the three screen files, and it is not a theme token.**
   It is a `:root` alias declared in `src/index.css:3`, which `gallery.html` does not load. Every
   component C5 extracts into a gallery group must use `var(--accent)` / `var(--accent-text)` or it
   renders unstyled in the gallery and in the design cards. C3's acceptance already made this rule;
   C5 has 76 sites of it.
6. ⚠️ **`AgendaView.jsx:104-109` hand-rolls `uid2()` and `toISO2()`** — local copies of `uid`
   (`lib/wod.js`) and of a date formatter `toISO` already covers. `uid2` returns a *different shape*
   from canonical `uid()`, which is the #110 session-id type-mismatch family one door down; these
   ids go into the `events` blob and are what `recurrenceGroup` points at.
7. ⚠️ **Two native dialogs remain**: `AgendaView.jsx:967` `window.confirm('Remover este evento?')`
   (destructive, no `ConfirmReview`) and `Publicador.jsx:2025`
   `window.prompt('Nome do arquivo (sem extensão):', 'config')` — a filename prompt for a config
   export, the same "Salvar config.json" family C1 removed from Configurações.
8. ⚠️ **`index.css` is ~39% Publicador/Agenda-owned, and C5 is what empties it.** Of 625 raw lines,
   the sections tagged `TAB-OWNED → Publicador/Agenda #59` are `:24-36` (`.pub-pane`, 4 rules) ·
   `:180-226` (publisher controls, 30) · `:227-259` (daily/Eagles export, 29) · `:260-350` (weekly
   export, 57) · `:576-595` (the 7 `rp-*` + pseudo/media, 11) · `:597-624` (Publicador mobile, 16) —
   **147 selector lines / ~232 raw** — plus the 12 `.b*`/`.fg`/`.lbl` rules C5·b inherits as last
   consumer. Prefix → owner: `dv-*` (29 rules) → `exportViews` 37 uses + `Publicador` 13;
   `wk-*` (14) → `exportViews` 10 + `Publicador` 7; `pub-*` (16) and `agenda-*` (10) → `AgendaView`;
   `rp-*` (7) → `AgendaView` only, at `:1117-1145` and `:1324`.

### What the redesign has to answer — the Lane-B brief

Not designed here. This is the problem list each mockup is judged against.

**C5·a — Agenda (structure)**
- **What is Agenda for, now that `MinhaSemanaPane` shows the week, `AffiliateSessions` shows the
  affiliate's month, and `Fechamento` bills it?** The honest answers range from "it is the only place
  events are *created*, so it is the editor" to "it absorbs the week view and the other panes link
  into it". The mockup picks one and says why.
- **One tri-state filter vs. five.** `AgendaView.jsx:13` offers all/scheduled/completed;
  `ReportModal.filteredEvents` (`events.jsx:626-649`) already implements period + type + status +
  services + athletes. #105 says lift, don't copy — and the lifted component is a **superset of
  both**, because the two are not the same filter: ReportModal's status only ever narrows to
  `completed` (no scheduled-only branch), and its athlete filter applies **only to
  `ev.type === 'personal'`**, never to a class. `groupByLocation` (`:651-670`) re-applies the same
  athlete predicate a second time to fan personal events out per athlete, so filter and grouping are
  coupled — decide that boundary before extracting.
- **No week or list view** (#105's second half) — a month grid plus a day pane, and no way to read a
  run of days.
- **A recurring series is marked but not operable** (#106) — `:752` renders a `ti-refresh` icon;
  deleting ~13 generated rows is 13 separate deletes.
- **Event chips are "tiny low-contrast teal slivers"** (2026-07-09 benchmark) — still inline-styled
  `rgba(74,200,192,.1)` on a frozen dark ground.
- **Two hand-styled copies of the same filter row** (desktop `:1174-1195`, mobile `:1469-1485`),
  with **two different border colours for the same control** (`#2a231c` vs `#2a2318`) and a
  `className` on one of them only.
- **The reserved attendance slot** (decision 1) — where does #102's real roster land, and what does
  the empty state say that does not claim attendance?
- **The stats row** — `totalAulas`/`totalPersonal`/`completed*` computed at `:67-87` from a manual
  toggle. Same honesty rule as #162: "marcados", never "presentes".

**C5·b — Publicador (structure)**
- **Which of the eight export targets survive, and what are the survivors called?** Two currently
  render the same string; two are named after one gym.
- **Is the 35-colour export theming drawer a feature or an accident?** If it stays, it needs to be a
  designed surface rather than a 466-line stack of `<input type="color">`. If it goes, the persisted
  `settings.value.colors` keys must still load — people have set them, and `migEa`
  (`Publicador.jsx:59`) already exists to migrate old defaults.
- **Apresentar: working share target, or no share affordance** (decision 3, #113).
- **A Leaderboard image export — yes or no** (decision 2, #170).
- **The preview grid overflows the viewport with no inner horizontal scroll** (2026-07-09 benchmark;
  the only `overflowX:'auto'` in the file is `:2207`, inside the off-screen farm).
- **The whole legacy button zoo is this tab's** — the redesign is what replaces 28 `.b`/`.bsec`
  usages with `ui/Button`, and it is what finally lets `index.css` drop them.

**C5·c — Relatório + rates**
- One PDF path, **two** rate resolutions (`billing.js`'s `calcTotal` and `events.jsx:830`'s
  per-event "Valor" cell). #104(b)'s original failure mode was exactly two independent money paths.
- #154's versioned rate history, and what it does to #162's freeze (see C5·c below).

## Acceptance

**Phase 0 (no gate)**
- `MicButton.jsx` deleted; `useSpeech` + the module-scope `SpeechRecognition` deleted from
  `exportHelpers.js`; `@keyframes mic-pulse` (`index.css:293`) and its comment reference (`:282`)
  deleted; nothing imports any of them; `npm run build:all` still produces the same **10** public pages.
- `publicador/exportHelpers.test.js` exists and covers the five genuinely local exports;
  **`monthGridCells` gains direct tests in `week.test.js`**, where it belongs — it is canonical, has
  three consumers, and is currently only exercised indirectly (see Phase 0 step 2).
- `exportViews.jsx:409` uses `MONTH_PT`; a repo-wide grep for `toLocale\w*String\('default'`
  returns **zero**.
- The four `.slice(0, 15)` truncations no longer collapse the two Mobile Semanal labels.
- `BLOCK_C`'s two consumers use the **same** fallback chain; its comment describes its real use.
- `npm test` green · `npm run lint` at `--max-warnings 0` · `npm run format:check` ·
  `npm run build:all` clean.

**C5·a — Agenda**
- `publicador/Agenda.module.css` exists. Zero non-data hex, zero `rgba()` scrims outside it, zero
  frozen-totk-dark literals, zero non-circle `border-radius` literals in the Agenda files.
- The **7 `rp-*` rules** and the `pub-*` / `agenda-*` sections move out of `index.css` into that
  module and are deleted from `index.css`. ⚠️ `.rp-sticktop` keeps `top: var(--spa-sticky-top)` —
  do **not** re-hardcode `88px`.
- `AgendaView.jsx` is a container over `publicador/agenda/`; `CellDay` and `DayPane` are hoisted out
  of the render body; the file is under the #74 800-line line.
- **One** filter component, a superset of both existing sets, used by the Agenda surface **and** by
  `ReportModal` — **closes #105**. No second copy exists.
- `evStatus` carried across verbatim; a reserved, empty attendance slot exists and is commented with
  `#102`; no UI claims attendance from `events`.
- `window.confirm` count in the Agenda files = **0**; deletes go through `ConfirmReview`.
- `uid2` / `toISO2` deleted in favour of `uid` / `toISO` from `public/lib/`.
- Every icon-only control has an accessible name; every click-`<div>` is a real control
  (role + tabIndex + Enter/Space); the surface has a real heading.
- `var(--accent)`, never `var(--theme-accent)`, in anything the gallery renders.
- New gallery group **`Agenda`** covering the state axes; `npm run design:cards` regenerated + synced.
- Correct at **1280×800 and 390×844 under all 4 themes** — the frozen-palette bug is the point.

**C5·b — Publicador**
- `publicador/Publicador.module.css` exists. `Publicador.jsx` is a container over
  `publicador/publisher/` and is under 800 lines.
- **Zero** `.b` / `.bp` / `.bsec` / `.bd` / `.bsm` / `.bfull` / `.fg` / `.lbl` / `.pvt` /
  `.pub-pane` usages repo-wide; those **16 rules deleted from `index.css`** (`:33-36`, `:43-44`,
  `:54-63`) and both `App.jsx` wrappers (`:269,287`) removed. `index.css` ends the session with **no
  `TAB-OWNED` tag left** — verify by grep, and update the file's own triage header.
- The export-artifact palettes are **kept and documented in-file as exempt** (decision 4); the
  screen chrome is tokenized. `#00b8d4` is classified deliberately, not swept.
- The whole family is JSX; `createElement` count across `Publicador.jsx` +
  `src/components/tabs/publicador/` = **0**.
- Apresentar ships with a working share target or without the affordance — **closes #113**.
- **#170 answered**: built, or closed with the user's reason recorded.
- `window.prompt` count = 0.
- Same a11y, theme, gallery (`Publicador` group) and design-card bars as C5·a.

**C5·c — Relatório + #154**
- `rateAsOf(loc, isoDate)` lives in `billing.js` — the only dependency-free module all nine
  consumers already import — with unit tests; `calcTotal`'s precedence becomes
  `ev.rateSnapshot ?? rateAsOf(loc, ev.date) ?? loc`.
- `events.jsx:830`'s per-event "Valor" cell resolves through the **same** function — one rate path,
  not two.
- `afiliados/Afiliados.jsx`'s `saveLoc` **appends a version** instead of overwriting `rate`, and does
  so **from the mutator** — no `useEffect` on `locs` (CLAUDE.md's "a load/read path never writes").
- The #162 freeze still holds: `sent` / `paid` read `stamp.total`; only `open` / `draft` move.
- `ReportModal` adopts the C0 primitives and the shared filter; jsPDF colour calls untouched.
- **Closes #154.**

**Program**
- **#15 closes with C5·b** — its row says "close this row when the program ends".
- plans/16's table marks C5 ✅ and #43 becomes the resume point.

## Files

**Deleted (Phase 0)**
- `src/components/tabs/publicador/MicButton.jsx` (22).
- `exportHelpers.js:6` + `:80-121` (`SpeechRecognition`, `useSpeech`) and its now-unused React
  imports.
- `src/index.css` — `@keyframes mic-pulse` (`:293`) and the comment naming it (`:282`).
  ⚠️ There is **no `.mic-btn` rule** in `index.css` — `MicButton.jsx:11` sets that class and
  nothing styles it, which is one more sign the component was orphaned rather than retired.

**Deleted (C5·a / C5·b)**
- `src/index.css` ≈ 232 raw lines / 147 selectors across the six `#59`-tagged sections, plus the
  12 `.b*` / `.fg` / `.lbl` rules and the 4 `.pub-pane` rules — see finding 8.
- `src/App.jsx:269,287` — the two `.pub-pane` wrappers.

**New**
- `src/components/tabs/publicador/exportHelpers.test.js` (Phase 0). ⚠️ `monthGridCells`'s tests go
  in the **existing** `src/public/lib/week.test.js`, not here — see Phase 0 step 2.
- `src/components/tabs/publicador/Agenda.module.css` + `publicador/agenda/` components — shape
  follows the approved mockup; expect roughly `MonthGrid` · `CellDay` · `DayPane` · `EventCard` ·
  `EventFilters` (the shared one) · `AgendaStats` · `WeekList`.
- `src/components/tabs/publicador/Publicador.module.css` + `publicador/publisher/` components —
  expect roughly `ExportToolbar` · `ExportPreview` · `ExportSettingsPanel` · `PresenterLauncher`.
- `src/public/gallery/groups/agenda.jsx` and `.../publicador.jsx` + their `GROUPS` entries in
  `gallery/Gallery.jsx`.
- `cone/design/mockups/62-agenda-c5.html` and `63-publicador-c5.html` (61 is C3's).

**Modified**
- `src/components/tabs/Publicador.jsx` ·
  `publicador/{AgendaView,events,exportViews,mobileExportViews}.jsx` — JSX conversion +
  decomposition + tokens.
- `src/components/tabs/publicador/billing.js` + `billing.test.js` — `rateAsOf` (C5·c).
- `src/components/tabs/afiliados/{Afiliados.jsx,affiliateHelpers.js}` + tests — rate versions (C5·c).
- `src/index.css` — the deletions and the triage-header update.
- `src/utils/config.js` — only if the mockup renames the export targets.
- `vite.public.config.js` — only if #113 resolves toward keeping `log.html` (10 → 11 pages).

**Read-only reuse — do not reimplement any of these**
`src/components/ui/{Button,Input,Card}.jsx` ·
`src/public/shared/{ConfirmReview,TallyBar,MaskedTimeInput,ExerciseList}.jsx` ·
`public/lib/wod.js` (`uid`, `blkColor`, `blkMeta`, `isWodBlock`, `exVolStr`, `groupProgressionSteps`) ·
`public/lib/week.js` (`MONTH_PT`, `MONTH_PT_SHORT`, `DAY_PT_TITLE`, `toISO`, `monthGridCells`, `getWeek`) ·
`public/lib/sessions.js` (`sessName`, `getTargets`, `matchesAthlete`) ·
`publicador/billing.js` (`calcTotal`, `sumByCurrency`, `fmtMoney`, `fmtDur`, `fmtDateNum`) ·
`publicador/pixQr.js` (`qrToBase64`) · `utils/pix.js` (`buildPixPayload`) ·
`afiliados/affiliateHelpers.js` (`resolveEventLoc`, `monthBounds`, `eventsForAffiliate`, `rateLabel`) ·
`hooks/useIsMobile` — Agenda's `800` matches `resultados/RegistroView.jsx:61`, so it is an
established pane-width breakpoint now, **not** a rogue value; leave it.

## Approach

### Phase 0 — dead code + three one-line bugs (no gate; ships alone) · Sonnet · XS–S

> ✅ Done 2026-08-30 · `d649f65` + `da5a148` — see BACKLOG.md's Done entry for the full account. All 5
> steps shipped: `MicButton`/`useSpeech` deleted, `monthGridCells` + `exportHelpers.js`'s six pure
> functions got their first tests (22 new, 936 total), `exportViews.jsx`'s locale bug fixed to
> pt-BR, both `Mobile Semanal` labels un-truncated, `BLOCK_C`'s two consumers unified on the same
> fallback chain. C5·a/b/c are unaffected and stay Ready.

The warm-up commit, independent of every design question. Nothing here can be invalidated by a
mockup: two of the three bugs are in code that would be wrong under any design, and the third is a
deletion of code that is already not rendered.

1. **Delete `MicButton` and `useSpeech`** (finding 1). Remove `MicButton.jsx`, `exportHelpers.js:6`
   and `:80-121`, the now-unused `useState`/`useRef`/`useCallback`/`useEffect` imports, and the
   `mic-pulse` keyframes + its comment (`index.css:282,293`). ⚠️ Do **not** touch `legacy/*.html` — it is kept deliberately as the
   `exerciseRows` reference (plans/48) and is never built.
2. **Add the tests step 1 unlocks — but split them by ownership, not by file.** 🔑
   `getWeeksOfMonth` is a **three-line wrapper over canonical `monthGridCells`** (`week.js:99`), and
   *that* is the function actually worth pinning: it has **three consumers** (`exportHelpers`,
   `resultados/resultadosHelpers.js:24`, and Agenda through the first) and **no direct test** —
   C3's `resultadosHelpers.test.js:19-21` only asserts *against* it, so a bug in it moves the
   assertion and the expectation together.
   - → **`week.test.js`**: direct `monthGridCells` cases — a month starting Sunday, one starting
     Saturday, a 28-day February, a 6-row month, and `inMonth` correctness on the leading/trailing
     padding days. This is canonical-utility coverage that outlives C5.
   - → **new `publicador/exportHelpers.test.js`**: the genuinely local logic —
     `buildProgressionLines` (**the highest-value target**: its per-group unit re-derivation is the
     half #45 deliberately kept local), `exLine`, `complexLine`, `buildMobileSession` (⚠️ its
     fallback loop is `for (let i = 1; i <= 5; i++)` over a **Sunday-start** week, i.e. Mon–Fri —
     assert that Saturday and Sunday are really skipped rather than off-by-one), `mfs`, and one thin
     case for `getWeeksOfMonth` proving it unwraps `monthGridCells` to bare `Date`s.
3. **Fix `exportViews.jsx:409` → pt-BR** (user decision, correction 2). Replace the
   `toLocaleString('default')` call with `MONTH_PT[month] + ' ' + year` — the **exact expression
   `:602` already uses** in the same file. The rendered header keeps its current look and only
   changes language: **"GRADE DE TREINOS · AGOSTO 2026"**. The toolbar driving the export already
   reads "Agosto 2026" from the same constant (`Publicador.jsx:11`), so export and control finally
   agree.
   ⚠️ **`MONTH_PT` is Titlecase (`'Janeiro'`), NOT uppercase** — CLAUDE.md says otherwise; see
   correction 10. `.wk-title` supplies `text-transform:uppercase`, so do **not** pre-uppercase it,
   and do not reach for `MONTH_PT_SHORT`/`DAY_PT_TITLE` unless a mockup later asks.
4. **Fix the Mobile Semanal labels** — the minimal correct fix is to stop truncating at a width that
   cuts the disambiguator. Prefer removing `.slice(0, 15)` and letting CSS handle overflow at all
   four sites (`Publicador.jsx:985,1004,1193,1206`); if a hard cap is genuinely needed, it must
   exceed the label length (17). C5·b may rename these buttons entirely — that is fine; a label
   nobody can read should not survive until then.
5. **Fix `BLOCK_C`'s consumer disagreement** — give `:858-860` the same
   `BLOCK_C[lbl] || BLOCK_C[bl.type] || '#555'` chain as `:603-605`, and rewrite the comment at
   `:22-24` to describe block chips rather than non-existent dots, keeping the "do not collapse into
   `blkColor`" instruction and adding *why* (per-type distinctness at chip size, not the 4-family
   hue grouping).

Ship. No gate, no mockup.

### C5·a — Agenda · Lane B · Opus (design) → Sonnet (build)

> ✅ **Done 2026-08-30** · mockup `2e363c0` (approved by the user) → build `62f6d8e` (hoist) ·
> `e77bb72` (filter, closes #105) · `c402e12` (module CSS + structure) · `214cdef` (primitives,
> a11y, #102 slot, uid, #106) · gallery + cards `435fc39`. See BACKLOG.md's Done entry.
> **The mockup's structural answer: AGENDA IS THE EDITOR** — the three surfaces #162 built over the
> same `events` blob are read-projections by money, and Agenda is the only one that writes it, and
> the only one where `events` meets `sessions`. Both gate questions went the recommended way: the
> **Lista** view shipped (#105's second half, promoted out of the `isMobile` fork rather than
> written new) and **#106** shipped (three scopes inside the ConfirmReview step (d) had to build
> anyway). Closes **#105** and **#106**.
>
> 🔴 **One finding here corrects finding 5 below and changes C5·b's scope** — see the note at the
> end of this section.


1. **ASCII sketch** answering the Lane-B brief's Agenda block — above all, what Agenda is for now
   that three of its jobs live in Afiliados.
2. **Mockup card** in `cone/design/mockups/62-agenda-c5.html`, covering the state axes: empty month ·
   a dense day (3+ events) · aula vs personal · completed vs scheduled · a recurring series · an
   event with no affiliate · the filter row in each of its states · the reserved attendance slot ·
   1280 and 390 · all 4 themes.
3. **DesignSync.** 🔴 **Stop. Hand back.** The user reviews and approves — do not self-certify the
   mockup and do not start building.
4. **Build (post-approval)**, in this order so each step is independently verifiable:
   a. Hoist `CellDay` and `DayPane` out of the component body **as a pure move** — no styling
      changes in the same commit, so the remount fix is reviewable on its own.
   b. Extract the shared filter. Design its API against **both** call sites at once (superset —
      see the brief), wire `ReportModal` to it in the same commit, and delete
      `AgendaView.jsx:13`'s local `filter`. Closes #105.
   c. `Agenda.module.css`: move `rp-*`, `pub-*`, `agenda-*` out of `index.css`, tokenizing as they
      move. ⚠️ `--spa-sticky-top`, not `88px`.
   d. C0 primitives + `ConfirmReview` + the a11y slice.
   e. The reserved `#102` slot and the comment recording decision 1.
   f. `uid2`/`toISO2` → canonical.
   g. **Optional, gate's call:** #106 — operable recurring series. It is UI over data that already
      exists (`recurrenceGroup` is written and read), and C5·a is rewriting the event form and day
      pane anyway. Drop it without argument if the mockup does not need it.
5. **Gate:** gallery walk (4 themes × 2 widths) → `npm run design:cards` → DesignSync → **stop**.

#### 🔴 Correction to finding 5 — `--theme-accent` is not an alias, it is a hardcoded cyan

Finding 5 says `--theme-accent` is *"a `:root` alias declared in `src/index.css`, which
`gallery.html` does not load"*. That is only half of it, and the missing half is the part that
matters. `src/index.css:15` does declare `--theme-accent: var(--accent, #4ac8c0)` — but
**`App.jsx:61` then sets it as an INLINE STYLE on `<html>`** from `APP_CONFIG.themeAccent`
(`utils/config.js:26`), whose default is **`#00b8d4`**. An inline style on the root element beats
every `html.theme-*` class, so that fallback never resolves: measured live under
`theme-totk-light`, `--theme-accent` is `#00b8d4` while `--accent` is `#1c6860`.

Three consequences:
1. **All 76 sites render one cyan in all four themes**, not "the accent". The problem is not only
   that the gallery can't see the token — it is that the *app* is theme-blind wherever it is used.
2. **This is where decision 4's unexplained `#00b8d4` comes from** — the 17 in `Publicador.jsx` and
   8 in `mobileExportViews.jsx` are the same colour as this variable, hand-copied. Classify them
   together.
3. **C5·b must decide what `APP_CONFIG.themeAccent` is for.** It is a *persisted user setting*
   (`Configurações` writes it), so it cannot simply be deleted — but as long as it is applied to
   `--theme-accent` on the root, it overrides the theme system for every consumer. C5·a took the
   Agenda files off the token entirely (`var(--accent)`), and tokenized `EventFormInner`'s own 9
   sites + 39 frozen hex, because otherwise "Agenda renders correctly in all 4 themes" would have
   been false. The remaining sites are C5·b's.

### C5·b — Publicador · Lane B · Opus (design) → Sonnet (build)

1. **Open with the usage question** (the lane call's last paragraph). The answer sets this session's
   size: "most of them" → a restyle; "one or two" → a deletion pass with a redesign around the
   survivors.
2. **ASCII sketch + mockup** in `63-publicador-c5.html`, answering the brief's Publicador block and
   carrying **two explicit gate questions** — #170 (a Leaderboard image export?) and #113 (Apresentar
   with a working share target, or without the share affordance?).
3. **DesignSync. 🔴 Stop. Hand back.**
4. **Build (post-approval):**
   a. **JSX conversion first, as a pure mechanical commit** — `Publicador.jsx` +
      `exportViews.jsx` + `mobileExportViews.jsx`, no behaviour change, so the diff that follows is
      readable. plans/39 deliberately left this so #59's rewrite is the **first** JSX pass over this
      markup, not a second one.
   b. Decompose into `publicador/publisher/` along the six render regions (finding 3).
   c. `Publicador.module.css` + the `index.css` deletions, applying decision 4's three-way
      classification and documenting the exempt palettes in-file.
   d. Delete the `.b*` zoo, `.fg`, `.lbl`, `.pvt`, `.pub-pane` and both `App.jsx` wrappers — verify
      by grep that `Publicador.jsx` really was the last consumer before deleting the rules.
   e. C0 primitives, `ConfirmReview` for the config-file action, the a11y slice, preview-grid inner
      scroll.
   f. Whatever the gate decided for #170 and #113.

### C5·c — Relatório + #154 · Sonnet · M

Runs **last**, and only on top of `billing.js`'s existing tests — that sequencing is #149's whole
point and #154's row repeats it.

1. `rateAsOf(loc, isoDate)` + tests in `billing.js`.
2. `calcTotal` gains the middle precedence tier. ⚠️ **This changes its contract**: it takes
   `(evs, loc)` and does not need a date today; `ev.date` is stamped by `filteredEvents` (`:645`)
   but is not part of the signature's guarantee. Nine importers — check each passes dated events.
3. `events.jsx:830` resolves through `rateAsOf` too. One rate path.
4. `afiliados/Afiliados.jsx`'s `saveLoc` appends a version; `startEdit` reads the head;
   `affiliateHelpers.js`'s `rateLabel` takes an as-of date. All from mutators, no effect on `locs`.
5. `ReportModal` adopts the primitives + the shared filter from C5·a.

### Constraints that bite

- 🔴 **`.rp-sticktop` reads `var(--spa-sticky-top)` today. Do not re-hardcode `88px`** — that figure
  was topbar + tab bar and has been wrong since #95 collapsed the chrome to one 49px row.
- 🔴 **`--theme-accent` does not exist in `themes.css`.** Any extracted component must use
  `var(--accent)` or it renders unstyled in the gallery and in the design cards. 76 sites.
- 🔴 **Do not tokenize the export views.** A rasterised PNG must not change colour with the theme
  (decision 4). Equally, **do not skip tokenizing the screen chrome** because it sits in the same
  file family.
- 🔴 **Do not touch `evStatus`, and do not build any affordance that assumes `status` is manual**
  (decision 1). #102 replaces it.
- 🔴 **`Publicador.jsx` is the last consumer of the `.b*` zoo — confirm by grep at execution time
  before deleting the rules**, since C5·a and C5·b ship separately and the tree moves in between.
- ⚠️ **`DayPane` currently holds no state; that is what keeps lint green.** Hoist it before adding
  any (finding 4).
- ⚠️ **All six export views are always mounted off-screen** (finding 2). A redesign that renders
  only the selected one must keep a mounted, measurable target for `html2canvas`.
- ⚠️ **The design cards cannot load the `ti` webfont** (CSP). Agenda uses `ti-refresh` and friends,
  so its cards will show blank icon gaps — expected; note it on the card, as `results`/`schedule`
  already do.
- ⚠️ **`settings.value.colors` holds real user data.** Removing an export skin must not orphan the
  keys people have set; `migEa` (`Publicador.jsx:59`) is the existing precedent for handling that.
- ⚠️ **jsPDF's colour calls in `events.jsx` are RGB triples and must stay literal** — they are the
  one genuine print-target exemption, and they are not hex.

## Verification

1. **The four gates, every session:** `npm test` · `npm run lint` (`--max-warnings 0`) ·
   `npm run format:check` · `npm run build:all`. A new lint warning fails CI, same as a test failure.
2. **`npm run dev` at 1280×800 and 390×844 under all 4 themes.** ⚠️ Check the service worker first
   if edits do not appear — `sw.js` registers at `/CrossFit-Apps/` and can serve production assets
   over the dev server with **no console error**. Named click-paths:
   - **Agenda:** create an aula and a personal event on the same day → filter by each status →
     toggle one completed → delete one (must go through `ConfirmReview`, not `window.confirm`) →
     create a recurring series and confirm the marker renders → open the day pane on a day with a
     gym session and confirm block chips get the **same** colour in the day pane and the mobile day
     detail (decision 5).
   - **Publicador:** produce each surviving export end to end and open the PNG — the Semanal header
     must read a pt-BR month **with the browser language set to English** (that is the only setting
     that reproduces bug 2). Two Mobile Semanal buttons must read differently.
   - **Apresentar:** open it and follow the share URL to whatever #113 decided.
   - **Relatório:** a two-currency month → the on-screen grand total and the PDF footer must agree
     (that is #104(b)'s regression); after C5·c, an event booked before `rateSnapshot` existed must
     price at its own date's rate, and a `sent` invoice must **not** move.
   - **Public pages, unchanged:** `index.html` / `schedule.html` / `results.html` still render — C5
     touches `index.css`, which every SPA page loads.
   - **Keyboard only:** tab to every control on both surfaces; no focus trap, no unreachable action.
3. **Regressions this pass could cause — check explicitly:**
   - Deleting `.b*` from `index.css` while another tab still uses it (grep first).
   - `--spa-sticky-top` regressing to a hardcoded offset in the module move.
   - `html2canvas` failing because a render target stopped being mounted or measurable.
   - `ReportModal` breaking when it adopts the shared filter — its athlete predicate is coupled to
     `groupByLocation`.
4. **Greps that must return zero when the program closes:**
   `toLocale\w*String\('default'` · `className: *'[^']*\bb(sec|p|d|sm|full)?\b` ·
   `pub-pane` · `theme-accent` (in gallery-rendered components) · `window\.(confirm|prompt|alert)`
   (in the publicador family) · `createElement` (in the publicador family) · `TAB-OWNED`
   (in `index.css`).
5. **Gallery + cards:** every new component in its group across the state axes, `npm run design:cards`
   regenerated, DesignSync'd — then **stop at the approval gate**.
6. `/verify` before committing; `/code-review` before pushing (M/L sessions).
7. **Docs are part of Done:** BACKLOG rows #59, #105, #106, #113, #154, #170, #15 (and the #74 watch
   figures) · plans/16's C5 row and rule 1's correction (record that C5 was assessed and came out
   Lane B) · CLAUDE.md's Publicador/Agenda section, its `index.css` triage paragraph, the gallery
   `GROUPS` count, the test count, and the stale #45 claim (correction 5) ·
   `node scripts/audit-backlog-markers.mjs`.

## Notes

**Why four sessions.** 7,674 raw lines across five files, none decomposed, none tokenized, none
tested, none in the gallery, plus a `createElement` → JSX conversion of all of it. C3 was 1,847 lines
and ran as three phases. Splitting on the tab boundary is the natural seam — Agenda and Publicador
share `index.css` sections and `exportHelpers.js` but no components — and Phase 0 exists because five
concrete, uncontested fixes were found that no mockup can invalidate.

**Phase independence.** Phase 0 ships alone and blocks nothing. C5·a and C5·b are independent of each
other and can run in either order; **C5·c runs last** because it consumes C5·a's shared filter. The
one cross-session hazard is the `.b*` deletion (see Constraints).

**Deliberately not in scope:**
- **#14**'s site-wide `<main>` / landmark / heading architecture — its own session, post-C5, per
  plans/16 rule 5. The per-surface mechanical a11y slice **is** in scope, as rule 2 requires.
- **#102** — decision 1; C5·a reserves its slot.
- **#107** (membership plans / quotas) — blocked on #102, not on this.
- **plans/22** (athlete attributes) and **#39** (limitações) — Atletas' reserved slots, untouched.
- **#93** (`block.duration` as bare minutes) — a data migration that touches Publicador as a reader,
  not a design row.
- **#43** — the four new themes, which this session is the last prerequisite for.

**One thing this plan asserts that the board does not:** that `Publicador.jsx` is the **last**
consumer of the `.b*` zoo and `AgendaView.jsx:25` the **last** divergent block-family taxonomy. Both
were verified by repo-wide grep on 2026-08-30, and both are the kind of claim that goes stale — check
them again at execution rather than trusting these sentences.

Model: Opus (plan) · Sonnet (Phase 0) · Opus (C5·a design — "what is Agenda for" is a product
question) · Sonnet (C5·a build) · Opus (C5·b design — which exports survive is a product question) ·
Sonnet (C5·b build) · Sonnet (C5·c) · Size: L (four sessions)
