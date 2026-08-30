# 80 — #57 · Design pass C3 — Resultados (SPA)

> ✅ Done: #57 · #157 · #169 — 2026-08-30 — see BACKLOG.md
>
> **All three phases shipped.** Phase 0 `4772250`+`77585d4` · Phase 1 `aa8ba87`
> (mockup 61, approved by the user) · Phase 2 (this commit). Closed **#57**, **#157**, **#169**;
> **#170** filed. Outcome: the sub-tab bar did NOT survive — Resultados is one surface. See
> BACKLOG.md's Done entry for the full account, and the "Phase 1 output" section below for the
> design decisions the gate approved.

> C3 in the [design-pass program](./16-design-pass-program.md). ⚠️ **Lane B, not Lane A** — the
> first C-session that is, and plans/16 rule 1 is corrected for it. Two of the three sub-tabs are
> unfound after months of live use, so the tab's own structure is the finding, not its tokens.
>
> **Three phases:** **Phase 0** (delete the Leaderboard sub-tab — no gate, ships alone) →
> **Phase 1** (design the whole tab → **approval gate**) → **Phase 2** (build). Rides **#157** and
> **#169**, both in `RegistroView.jsx`.
>
> **Next after this: C5 · #59 · Publicador + Agenda** (user, 2026-08-29) — program order, confirmed.

## Context

`plans/79` shipped 2026-08-29 and emptied Ready. The board's banner closes with **"Next up:
C3 (#57)"**, and the 2026-08-07 standing instruction is still *"go back to the design pass"*. C3 is
the second of the three remaining C-sessions (C2 shipped 2026-08-28 plus its #160/#161/#162 tail;
C5/#59 is last).

Resultados is the last SPA tab outside the C0 primitives. Re-measured against the working tree
(the board's 2026-08-29 figures agree):

| file | raw lines | hex lines | `style={{` | legacy `.b*` |
|---|---|---|---|---|
| `resultados/RegistroView.jsx` | 814 | 34 | 38 | 11 |
| `resultados/LeaderboardView.jsx` | 493 | 15 (most `LB_IMG`) | 20 | 4 |
| `resultados/HistoryView.jsx` | 339 | 8 | 17 | 3 |
| `resultados/cards.jsx` | 32 | 1 | 1 | 0 |
| `tabs/Resultados.jsx` | 49 | 0 | 0 | 2 |

**No `.module.css` anywhere in `resultados/`** — the shape `Servicos.jsx` was in before C2, which is
the precedent for how this runs. **No Resultados gallery group** either (the `results` group is
public `results.html`'s pieces).

### 🔑 The finding that reshaped this plan

The user, 2026-08-29, on Histórico and Leaderboard: **"after the app running for some time not even
I remember they exist"**, and on Leaderboard specifically: **"the tab itself is dead, it is a copy
of the already existing one in the public facing one. We can drop it."**

So C3 is **not** three restyles. Two of the three sub-tabs are unfound after months of live use, and
the tab's own structure is the finding. This pass asks what Resultados is *for* and lets the answer
delete things.

### Four decisions taken with the user, 2026-08-29 — do not re-litigate

1. **C3 is next**, not #164. #164 (three of the Atletas grade's four signals dead on real data)
   keeps its own planning session; it needs a data-contract decision first.
2. **The whole tab is Lane B, and cross-tab moves are allowed.** One design pass over Resultados as
   a whole — the mockup may merge, relocate or drop sub-tabs, including moving athlete history into
   the Atletas ficha. ASCII sketch → design card → DesignSync → **approval gate** → build. This
   resizes #57 **M → L**.
3. **The Leaderboard sub-tab is deleted.** It is a second copy of `leaderboard.html`.
4. **#157 ships as an explicit per-block "não fez" toggle**, adding `skipped` to
   `ATHLETE_KEY_DEFAULTS` — not as a relaxed disable. Absence and a zero score must stay
   distinguishable in `results_v2`.

⚠️ **One consequence of decision 3, recorded rather than argued:** the 1080px "Gerar imagem do
leaderboard" PNG dies with the sub-tab, and **no public page can export one** — that image is the
only thing this surface does that `leaderboard.html` cannot. The plan deletes it as instructed and
files **#170** so the capability is recoverable from git and lands with Publicador's other exports
(**#59**) if the user misses it. `html2canvas` stays in the bundle regardless — `Publicador.jsx` is
its other consumer.

### The overlap map — what actually dies, moves, or stays

Measured against what `atletas/Ficha.jsx` (#160, shipped 2026-08-28) and the Atletas grade already
render, and against the public pages.

| surface | unique today? | disposition |
|---|---|---|
| **Por atleta** · Frequência (`calcKPIs.freq`) | No — the grade shows aderência, the ficha shows *Presença · 4 semanas* | **drop.** ⚠️ Its denominator is result rows that exist — the #164 family. Do not carry the bug across. |
| **Por atleta** · RPE médio + 8-session sparkline | **Yes** | → Atletas ficha, its **own** Card |
| **Por atleta** · Taxa RX | **Yes** | → Atletas ficha, same Card |
| **Por atleta** · Evolução de carga (`loadTrend`) | **Yes** | → Atletas ficha, same Card |
| **Por atleta** · chronological logged-result list | Partly — the ficha's *Últimas sessões* lists **assigned** sessions, not **logged** results | → Atletas ficha (it is the history the ficha lacks) |
| **Por sessão** · RPE médio da turma · Taxa RX · Flags · Distribuição de escala | **Yes** — nothing else reads a class back | → **Registro**, on the session the coach is already looking at |
| **Por sessão** · Resultados da turma list | No — Registro's athlete panel already lists the same rows, live | → merge into Registro's session view |
| **Leaderboard** (ranking) | No — `leaderboard.html` + `results.html` | **deleted** |
| **Leaderboard** · 1080px PNG export | **Yes** | dies with it; see the consequence note above (#170) |

**Likely outcome the mockup confirms: the sub-tab bar disappears and Resultados becomes one
surface.** That is a proposal for the gate, not a decision taken here.

⚠️ **Do not consume the ficha's reserved `plans/22` Atributos slot** (`Ficha.jsx:179-181`) for these
KPIs. plans/22 is the Força/Motor/Habilidade/Potência/Consistência attribute bars, a different and
much more careful computation; the three KPIs above get their own Card beside it. The **#39**
Limitações slot (`Ficha.jsx:167-170`) is likewise untouched.

### Twelve things found while planning that the board does not record

1. 🔴 **The SPA is a FOURTH divergent scale palette.** `resultadosHelpers.js:15`'s `SCALE_CLS` plus
   `index.css:388-392` paint **RX green · Inter blue · SC amber · Adaptado grey** against canonical
   `SCALE_COL` (`public/lib/wod.js:57`) **RX teal · Inter orange · SC violet · Adaptado warm-grey**.
   CLAUDE.md records *"All public pages are on it since #52"* — this tab never was, so the same
   logged result shows a different-coloured badge in the SPA than everywhere else. Exactly the bug
   #51/#52 closed, still live.
2. **#157 is the direct cost of #61a, and that is why the fix must not be "pre-select something".**
   `results/resultsHelpers.js:16-19` records that scale/RPE deliberately start **unselected**, with
   submit disabled until both are tapped — a pre-picked `RX @ 7` recorded information nobody
   entered. `results.html` pays nothing for it because `Results.jsx:333` submits **one block at a
   time**; the SPA has **one Salvar for N blocks** (`RegistroView.jsx:753`), so the same rule makes a
   3-WOD session unsaveable unless the coach invents scores. The "não fez" toggle is what makes the
   gate survivable without reintroducing fabricated defaults.
3. **The board's "good warm-up commit" no longer exists.** `getPerformanceStr` was swapped for
   canonical `perfStr` by #115; `resultadosHelpers.js:105-110` is now only the tombstone comment.
   Strike that sentence from the row. (Phase 0 below is the real warm-up commit.)
4. **`RpeRow` already exists, is exported and gallery-covered, and this tab does not use it**
   (`ScoreFields.jsx:68`). `RegistroView` imports only `ScaleRow` + `ScoreInputs` and hand-rolls a
   10-segment bar off an inline `rgb()` ramp (`:252-256`, `:645-672`). The composed default export
   `ScoreFields` is **Escala → RPE → score** — the exact order this view already renders. The
   in-file comment at `:634-643` defers the swap to #57 by name.
5. **`LeaderboardView:138-246` is a duplicate of Publicador's config.json load/save** — ~108 lines
   re-implementing the same 45-key settings merge `Publicador.jsx:1951/:2039` owns, with two
   `alert()`s, a `window.prompt` and a `window.location.reload()`. A leftover from when the retired
   20-slot `lb_colors` picker lived here. It goes with the file.
6. **The scale pills are painted `APP_CONFIG.themeAccent`** (`:295`), default `#00b8d4`
   (`utils/config.js:26`) — a cyan belonging to no theme, the same leftover #51 removed from
   `leaderboard.html`. Goes with the file.
7. **The level-badge palette is a second frozen taxonomy C2 already solved.** `LEVEL_CLS` +
   `.lv-ini/-int/-adv/-comp` (4 rules, 12 hex) vs `atletas/AthleteHeader.jsx:21`, which tints the
   tag with the **athlete's own identity colour** through `color-mix` and needs no level palette.
   Adopt C2's; delete the four rules.
8. ⚠️ **7 `rp-*` rules are shared with AgendaView and must NOT move into a module** — `rp-sticktop`
   · `rp-month-nav` · `rp-nav-btn` · `rp-month-label` · `rp-weeks` · `rp-week-btn` ·
   `rp-mobile-back` (`publicador/AgendaView.jsx:1117-1145,1324`). They stay in `index.css`,
   **retagged `TAB-OWNED → Publicador/Agenda #59`**. The other ~67 rules in that block go.
   `.rp-sticktop` already reads `--spa-sticky-top` (#95) — don't re-hardcode it.
9. **What C3 takes to zero in `index.css`, each verified by a repo-wide grep:** `.res-tabs`/
   `.res-tab`, `.level-badge` + `.lv-*`, `.scale-badge` + `.sc-*`, **both** `.kpi-*` definitions
   (`:302-305` and `:398-408` overlap by cascade — #99 flagged the consolidation as "#57's call"),
   `.presence-dot`/`.pd-*`, `.flag-icon`, `.sparkline`/`.sparkline-bar`, `.history-row`,
   `.empty-state`, `.sc-card`/`.sc-hdr`/`.sc-title`, `.g2`, and the three `.res-pane` selectors at
   `:32-34`. ≈ **140 of index.css's 748 raw lines.**
   ⚠️ **`.b`/`.bp`/`.bsec`/`.bd`/`.bsm` and `.fg`/`.lbl` do NOT reach zero** — `Publicador.jsx`
   builds them with `React.createElement` (`className: 'b bsec'`, `className: 'lbl'`), which a
   `className="b ` grep misses. #59 deletes them; C3 must not.
10. **`App.jsx:259`'s `<div className="res-pane">` exists only** to accent-fill `.b.bp`/`.b.bsec`/
    `.res-tab.on`. Once the tab is on `Button` + its own module it is dead markup — remove the
    wrapper together with the three rules.
11. **#157's extension point already exists.** `ATHLETE_KEY_DEFAULTS` (`public/lib/resultEntry.js:12`)
    is the declared list of per-athlete keys; adding `skipped: null` is the same one-line change
    #112's `finished` and #116's `exerciseRows` each made, and every reset site follows
    automatically through `clearAthleteKeys`.
12. **Both views name sessions by hand instead of using canonical `sessName`.** `HistoryView:139,211`
    reads `sessions[r.date]?.[0]?.mainTraining` — the **first** session of the day regardless of
    which one the result belongs to, blank when the coach used another field. `sessName(sess,
    dateKey)` is canonical in `public/lib/sessions.js` and `RegistroView:6` already imports it.
    Carry the fix into wherever the history list lands.

### What the redesign has to answer (the Lane-B brief)

Not designed here — this is the problem list the mockup is judged against.

**Structure**
- Do the sub-tabs survive at all, or does Resultados become one surface with the class read-back on
  the session and the athlete KPIs in the ficha?
- If anything stays behind a sub-tab, what makes it findable — the failure being fixed is that the
  user forgot two surfaces existed.

**Registro (the surface that *is* used)**
- **Three panes at `260px / 220px / 1fr`**, and the pane holding the actual work (the log form) is a
  single 10–13px column while the athlete list gets a fixed 220px.
- **"Registrar atleta" hides the roster behind a dashed disclosure** — the normal case (nobody
  logged yet) opens with every athlete collapsed out of sight.
- **Logged and unlogged athletes are two different visual languages** (`rp-ath-row` vs
  `rp-add-item`); an athlete jumps between them the moment you save.
- **Nothing shows progress through the class** except a `3/12 reg.` string on the week card.
- **Two inline delete confirms** (`p2Del` in the row, `delConfirm` in the footer) plus a `saveFlash`
  toast — three bespoke feedback mechanisms in one view.
- **Presence · Energia · per-block Escala/RPE/score · Nota · Flag stack flat**; a 3-WOD session is a
  long scroll with no grouping.
- **#157's "não fez" toggle needs a home** in the block card, reading as *absence*, never as zero.
- Mobile is a 3-step drilldown with two differently-worded back links (`‹ Semana`, `‹ Atletas`).
- **Where the class read-back goes** — the four "Por sessão" KPIs plus the class results list, on
  the session the coach just finished logging.

**Atletas ficha (the receiving end)**
- One new Card carrying RPE médio + sparkline · Taxa RX · Evolução de carga · the logged-result
  history — sitting beside the reserved #39 and plans/22 slots without consuming either.

## Acceptance

**Structural**
- `LeaderboardView.jsx` is deleted; nothing imports it; the Resultados chunk no longer pulls
  `html2canvas`; the duplicated config.json load/save is gone.
- Whatever the approved mockup decides about the sub-tab bar is what ships — if it survives, every
  remaining sub-tab is reachable and named; if it does not, `Resultados.jsx` renders one surface.
- The three unique "Por atleta" KPIs + the logged-result history render in the Atletas ficha; the
  four "Por sessão" KPIs render on the session inside Registro. `HistoryView.jsx` is gone.
- `calcKPIs.freq` is **not** carried into the ficha (see the overlap map).

**Design/token (both surfaces C3 touches)**
- `resultados/` has a `Resultados.module.css`; zero non-data hex, zero frozen-palette literals, zero
  non-circle `border-radius` literals in `resultados/*.jsx`.
- Zero `--theme-accent` / `--theme-accent-text` in anything the gallery renders (that alias lives in
  `src/index.css`, which `gallery.html` does not load) — use `var(--accent)`.
- Zero `.b*`, `.fg`/`.lbl`/`.g2`, `.sc-card`/`.sc-hdr`/`.sc-title`, `.res-tab*`, `.kpi-*`,
  `.level-badge`/`.lv-*`, `.scale-badge`/`.sc-*`, `.history-row`, `.presence-dot`, `.sparkline`,
  `.empty-state` **usages in this tab**; those rules deleted from `index.css`; the 7
  AgendaView-shared `rp-*` rules retained and retagged.
- Scale colour comes from canonical `scaleColor()`/`SCALE_COL` everywhere; `SCALE_CLS` deleted.
  Level badges use C2's athlete-colour `color-mix`; `LEVEL_CLS` deleted.
- `window.confirm`/`alert`/`window.prompt` count in `resultados/` = **0**; destructive actions go
  through `ConfirmReview`; both inline delete confirms gone.
- Every icon-only control has an accessible name (**closes #169's two `‹`/`›`**); every
  click-`<div>` is a real control (role + tabIndex + Enter/Space); every section a real `<h2>`.
- Correct under **all 4 themes** at **1280×800 and 390×844** — verified by switching themes, since
  the frozen-totk-dark bug is the point.
- `npm test` green · `npm run lint` at `--max-warnings 0` · `npm run format:check` ·
  `npm run build:all` clean.

**#157**
- `skipped` added to `ATHLETE_KEY_DEFAULTS`; Salvar enables when every WOD block is either complete
  **or** marked "não fez"; a skipped block is written with `skipped: true` and **no fabricated
  scale/RPE**, and is excluded from ranking and from block-level summaries.

**Gallery**
- New client-free group **`Resultados`** covering the extracted components across the state axes.
- `npm run design:cards` regenerated + DesignSync'd, then **stop at the approval gate**.

## Files

**Deleted**
- `src/components/tabs/resultados/LeaderboardView.jsx` (493 lines).
- `src/components/tabs/resultados/HistoryView.jsx` (339) — its content is redistributed, not kept.
- ≈140 lines of `src/index.css` (finding 9).

**New**
- `src/components/tabs/resultados/Resultados.module.css`.
- `src/components/tabs/resultados/` components — shape follows the approved mockup; expect roughly
  `WeekPanel` · `SessionCard` · `AthletePanel` · `AthleteRow` · `LogForm` · `BlockLogCard` ·
  `SessionKpis`.
- `src/components/tabs/atletas/` — one new Card component for the migrated KPIs + history list
  (plus its `atletasHelpers.js` entries and tests).
- `src/public/gallery/groups/resultados.jsx` + the `GROUPS` entry in `gallery/Gallery.jsx`.
- `cone/design/mockups/6N-resultados-c3.html` (next free number — **61+**; 51 and 60 are taken).

**Modified**
- `src/components/tabs/Resultados.jsx` — sub-tab switcher per the approved structure.
- `src/components/tabs/resultados/{RegistroView,cards}.jsx`.
- `src/components/tabs/resultados/resultadosHelpers.js` + `.test.js` — delete `SCALE_CLS`,
  `LEVEL_CLS`, the `getPerformanceStr` tombstone and the now-subjectless
  `"SPA leaderboard renders canonical perfStr"` describe block (its 4 cases only exercise `wod.js`'s
  `perfStr`; delete rather than re-home unless `wod.test.js` lacks the capped case).
  `calcKPIs`/`calcSessionKPIs` move to wherever their consumers land, with their tests.
- `src/components/tabs/atletas/Ficha.jsx` + `Atletas.module.css` — the new Card.
- `src/public/lib/resultEntry.js` — `skipped: null` in `ATHLETE_KEY_DEFAULTS` (#157).
- `src/index.css` — the deletions; retag the 7 surviving `rp-*` rules.
- `src/App.jsx:258-266` — drop the `res-pane` wrapper.

**Read-only reuse — do not reimplement any of these**
`src/components/ui/{Button,Input,Card,EmptyState,Modal}.jsx` ·
`src/public/shared/{ScoreFields,ConfirmReview,TallyBar,MaskedTimeInput}.jsx` ·
`public/lib/wod.js` (`scaleColor`/`SCALE_COL`/`SCALE_SHORT`/`perfStr`/`blkMeta`/`blockExercises`/
`isWodBlock`/`exVolStr`) · `public/lib/sessions.js` (`sessName`) · `public/lib/week.js`
(`MONTH_PT`/`DAY_PT_TITLE`/`toISO`/`monthGridCells`) · `public/lib/resultEntry.js`
(`mergeBlockEntry`/`clearAthleteKeys`) · `atletas/atletasHelpers.js`.

## Approach

### Phase 0 — delete the Leaderboard sub-tab (no gate; ships on its own)

A pure deletion, independent of every design question, and the real warm-up commit the #57 row
wanted. Remove `LeaderboardView.jsx`, its entry in `Resultados.jsx`'s sub-tab array, the
`resultadosHelpers.test.js` describe block that only existed for it, and the `.g2` rule. Confirm the
Resultados chunk no longer pulls `html2canvas` (`npm run build`) and that Publicador's export still
does. File **#170** for the lost PNG export.

### Phase 1 — design the whole tab · Lane B

1. **ASCII sketch first**, against the brief above — structure question first (does the sub-tab bar
   survive?), then Registro's flow, then where the class read-back and the ficha Card sit.
2. Then a self-contained preview card in `cone/design/mockups/` (inline CSS, first line
   `<!-- @dsCard group="…" -->`) covering the state axes: empty week · week with sessions · session
   with 0 logged · partially logged · fully logged · a 3-WOD form · a skipped block · an absent
   athlete · the class read-back with and without data · the ficha Card (with data / no logged
   results) · desktop 1280 + mobile 390.
3. DesignSync it. 🔴 **Stop. Hand back.** The user reviews and approves — do not self-certify the
   mockup, and do not start building.

### Phase 1 output (2026-08-30) — the proposal at the gate

Card: **`cone/design/mockups/61-resultados-c3.html`** (`@dsCard group="Mockups"`), DesignSync'd.
Verified rendering across all 4 themes at 1280 and 390 before syncing.

**Structure — the sub-tab bar does NOT survive.** With Por atleta redistributed to the ficha and Por
sessão redistributed onto the session, `HistoryView` has nothing left; a bar of one tab is not a bar.
Resultados becomes **one surface: a week rail (260px) + THE CLASS (1fr)** — pick a session, log it,
read it back.

**The load-bearing move: the roster IS the form container.** Three panes become two because the
athlete row opens in place (accordion, one at a time) instead of pushing a form into a distant third
pane. That single change answers five of the brief's Registro complaints at once — the 10–13px form
column gets the full width; the dashed "Registrar atleta" disclosure that hid the whole roster in the
normal case ceases to exist; `rp-ath-row`/`rp-add-item`'s two visual languages become one shell with
four states; mobile's 3-step drilldown with two "back" wordings becomes 2 steps + a sheet with one;
and the row collapsing into its logged state replaces the `saveFlash` toast.

**What the mockup adds that the brief did not ask for, and why:**
- **`Salvar e próximo ▸`** — closes this athlete, opens the next *unlogged* one. The logging loop is
  the thing the coach repeats N times per class and the tab has never had it. It is also what makes
  the toast redundant.
- **A `ClassHeader` that grows rather than a KPI grid.** The four Por-sessão KPIs would be four blank
  tiles at exactly the moment (0 logged) the coach wants to start typing. So: one line + a progress
  `TallyBar` with no data → an inline `RPE · RX% · flags` run with data → the full 4-KPI panel under
  a disclosure. This is what covers the "with and without data" axis honestly.
- **Per-session progress in the rail** (`TallyBar` + `5/12` per session card), answering "which of
  this week's classes still needs logging" — today the only progress signal anywhere is a `3/12 reg.`
  string.
- **A one-click `Ausente`** on an unlogged row. Writes immediately; a single reversible field, same
  precedent as C2 removing the confirm from the goal `+1`.
- **The Salvar gate states its reason** (`Faltam: Força · Back Squat`). A disabled Salvar with no
  explanation on a 3-WOD session is #157's user-facing face.

**#157 — "não fez" sits in the block card header**, right-aligned. When on, the fields are
**removed, not disabled** (a greyed "RPE —" still asserts the field was considered) and the card goes
dashed + muted, so it reads as *deliberately empty*, never *not yet filled*. Writes `skipped:true`
with no scale/RPE.

**Ficha Card — "Histórico de resultados", ficha position 4**, directly after *Presença · 4 semanas*:
assigned (Últimas sessões) → showed up (Presença) → actually did (this). Three KPIs (RPE médio +
sparkline · Taxa RX · Evolução de carga) over the logged-result list. Lands nowhere near the #39 or
plans/22 slots. **No Frequência.** Named "Histórico" deliberately: it is the word the user would go
looking for, now a section of the *person* rather than a tab he has to remember exists.

**Two corrections made during the pass, both worth carrying into Phase 2:**
- The scale pill must use canonical **`RankList.module.css`'s `.scale` treatment — no fill, `border:
  1px solid currentColor`**. A `color-mix()` fill washes the label out on both light themes; the
  first draft had one, which would have been a *fifth* divergence while closing the fourth.
- ⚠️ A "skipped" chip built on the shared pressed/`on` style inherits the accent fill and reads as a
  **selected primary control** — precisely the wrong signal. It must reset `background` explicitly.

Open for the user at the gate: the `Salvar e próximo` loop and the one-click `Ausente` are both net-
new behaviour, not restyles; and the `RX` teal pill stays low-contrast on the two light themes
(`SCALE_COL` is an exempt data colour and shipped `RankList` has the same pill — recorded on the
card, left to #14).

### Phase 2 — build (post-approval)

1. **Registro.** Decompose `RegistroView.jsx` into the approved components + the module stylesheet.
   The container keeps `saveLog`, `deleteResult`, the preload effect and the two load effects
   **unchanged in behaviour** — their `eslint-disable` comments at `:51`, `:99-117` and `:119-157`
   document deliberate narrowness (#118/#61c); carry them across verbatim, do not "fix" the dep
   arrays.
2. **Score fields → the shared component.** Replace `ScaleRow` + the hand-rolled RPE bar +
   `ScoreInputs` with the composed default `ScoreFields` (already this order). Delete `rpeColor` and
   the `.rp-rpe-*` rules.
3. **#157.** `skipped: null` into `ATHLETE_KEY_DEFAULTS`; a per-block "não fez" toggle in the block
   card; the Salvar gate becomes *every block complete **or** skipped*. Then follow the field through
   its readers — `rankResults`/`perfStr` (`wod.js`), `blockEntries`/`cardSummary`
   (`public/results/resultsHelpers.js`), `calcBlockStats` (`public/lib/sessions.js`) — so a skipped
   block never ranks and never counts as logged. Unit-test the gate as a pure predicate in
   `resultadosHelpers.js`, not through the component.
4. **The class read-back.** `calcSessionKPIs` (already tested) renders on the session inside
   Registro; its "Resultados da turma" list merges into the athlete panel rather than duplicating it.
5. **The ficha Card.** Move the three unique `calcKPIs` outputs + the logged-result history into
   `atletas/`, with `sessName` (finding 12) and canonical `scaleColor`. Leave `calcKPIs.freq`
   behind. Do **not** touch the #39 or plans/22 slots.
6. **C0 adoption + confirms.** `.b bsm` → `Button size="sm"`; `.b bd bsm` → `Button
   variant="destructive"`; `.b bp` → `Button variant="primary"`; textarea/selects → `Input`. Both
   inline delete confirms → `ConfirmReview`, stating the consequence (the row leaves `results_v2`
   and every ranking).
7. **#14 + #169 fold-ins.** `‹`/`›` get `aria-label` ("Mês anterior"/"Próximo mês"); the
   click-`<div>`s (`rp-sess-card:321`, `rp-ath-row:401`, `rp-add-item:471`) become real controls;
   `.rp-rest-day`'s `#3a3020`-on-`#0d0b09` (≈1.3:1) dies with the tokenisation.
8. **`index.css` sweep** per finding 9, retagging the 7 shared `rp-*` rules; drop the `res-pane`
   wrapper.
9. **Gallery group `Resultados`**, client-free — the views already take everything as props; keep it
   that way (the container owns `loadResults`/`loadAthletes`). Add the new ficha Card to the
   existing `Atletas` group.
10. **Gate:** walk both groups in `gallery.html` across 4 themes × both widths →
    `npm run design:cards` → DesignSync → **stop.**

### Constraints that bite

- 🔴 **Gallery components must be client-free** — no `utils/storage` / `utils/supabase` import,
  direct or transitive. **No CI gate catches a broken gallery import** (C1 left `gallery.html` a hard
  500 until #52 noticed): open the page after wiring.
- 🔴 **`var(--accent)`, never `var(--theme-accent)`** in anything the gallery renders.
- 🔴 **Do not delete `.b*`/`.fg`/`.lbl`** — `Publicador.jsx` builds them via `createElement`.
- 🔴 **Do not move the 7 AgendaView-shared `rp-*` rules** into the module.
- 🔴 **Do not consume the ficha's #39 or plans/22 slots.**
- `<main>` stays absent (plans/16 rule 5 — #14's post-C5 residue, shared by all nine tabs).
- Cinzel 500/800 already loaded (#52) — the font-weight rule is a no-op unless a new weight appears.

## Verification

1. `npm test` green (incl. the migrated `calcKPIs`/`calcSessionKPIs` suites and the new #157 gate
   predicate); `npm run lint` at `--max-warnings 0`; `npm run format:check`; `npm run build:all`.
2. `npm run dev` — Resultados and Atletas at **1280×800** and **390×844** under **all 4 themes**
   (⚠️ if a change does not appear, unregister the service worker first — CLAUDE.md's `cone-v*`
   poisoning note; check that *before* debugging `src/`):
   - **Registro:** pick a week → a session → an athlete; log a 3-WOD session where the athlete did
     **one** WOD → mark the other two "não fez" → Salvar enables and saves; reopen and confirm the
     two come back skipped with no scale/RPE; flip presence to Ausente and back and confirm the
     logged blocks survive (#118's merge); delete a result through `ConfirmReview`.
   - **Class read-back:** the session's KPIs match what "Por sessão" used to show for the same date.
   - **Atletas ficha:** the migrated KPIs render for an athlete with logged results and degrade
     honestly for one with none; the history list names the **right** session on a day with two
     sessions (finding 12).
   - **Public pages, unchanged:** `results.html` still logs (it shares `ScoreFields` and
     `resultEntry.js` — the `skipped` key must not disturb it) and the skipped block does **not**
     appear in `leaderboard.html`'s ranking.
   - Keyboard-only: reach and activate the session card, the athlete row and the month arrows.
3. **Regressions this pass could cause, check explicitly:** **Agenda** still renders its month/week
   nav (the 7 shared `rp-*` rules); `App.jsx`'s pane switching after the `res-pane` wrapper is
   removed; Publicador's own config.json load/save and image export still work.
4. Greps return zero over `resultados/**` for: non-data hex, non-circle radii, `--theme-accent`,
   `.b`/`.fg`/`.lbl`/`.g2`/`.sc-card`/`.kpi-`/`.level-badge`/`.scale-badge`/`.empty-state`,
   `window.confirm`/`alert`/`prompt`, unnamed icon buttons.
5. `npm run dev:public` → `gallery.html`: **open it**, walk the new `Resultados` group and the
   extended `Atletas` group across 4 themes × both widths → `npm run design:cards` → DesignSync →
   **stop at the approval gate.**
6. `/verify` before committing; `/code-review` before pushing (L).
7. **Docs are part of Done:** #57 → Done in `BACKLOG.md`; #157 and #169 marked shipped-inside-#57;
   #170 filed; `plans/16`'s C3 row + RESUME POINT (next is C5/#59); `CLAUDE.md` — the tab's new
   structure and the two deleted views, the new `.module.css`, the `ScoreFields` adoption, the
   `skipped` key in the result-shape section, the `index.css` triage note, the gallery item count
   (92 → new total) and its group list, the test count, and `FEATURES.md`'s "Result registration…;
   Histórico/KPIs; leaderboard" row, which this rewrites. Then
   `node scripts/audit-backlog-markers.mjs`.

## Notes

- **Size L, not M** — a Lane-B round trip over the whole tab, two view deletions, a redistribution
  into another tab, a decomposition, a new module stylesheet, a new gallery group, ~140 lines out of
  `index.css`, plus #157 and #169.
- **Phase 0 ships immediately and independently.** Phases 1 and 2 are separate sessions with the
  approval gate between them.
- **After C3 closes — including any bugs it causes — the next item is C5 · #59 · Publicador +
  Agenda** (user, 2026-08-29). That is also where #170 lands if the leaderboard PNG is missed.
- Deliberately **not** in scope: `calcKPIs.freq`'s denominator (the #164 family), `<main>`/landmarks
  (#14 post-C5), Publicador's own `.b*`/config.json/exports (#59), plans/22's attribute bars, #39's
  Limitações, and #158(b)'s per-station scoring (blocked on #157's shape, which this plan settles).

Model: Opus (plan) · Sonnet (Phase 0) · Opus (Phase 1 — a product-structure question, not a layout
question) · Sonnet (Phase 2) · Size: L
