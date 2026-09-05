# 76 — #160 · Atletas → Fichas (mockup 51)

> ✅ Done: `61380a2` · 2026-08-28 — see BACKLOG.md. Closed **#160**. Same-day follow-on to #56/C2 — planned, built, tested, verified live and shipped in one session. `Atletas.jsx` went from list+detail to the grade (ordered by next session) + the 1:1 ficha.

> Follows [plans/75](./75-design-c2-atletas-servicos.md) (C2/#56), which must land first —
> this plan is built on C0 primitives + `TallyBar` and would otherwise re-derive them.
> Design record: **mockup 51 · Atletas Fichas**, approved 2026-08-28.
> Sibling plans from the same scope session: [77](./77-afiliados-paineis-coach.md) ·
> [78](./78-fechamento-semana.md).

## Context

C2 tokenises Atletas and decomposes it; it does not change what the tab *is*. Mockup 51
does: the 200px flat list + detail becomes a **grade ordered by next session** and a
**ficha that is 1:1 preparation**. The coach's question is not "who is on my roster" —
that list is 12 names he already knows — it is "who do I need to talk to before the 18:00
turma".

**Measured against the code, mockup 51 is ~35% buildable.** The gaps are data gaps, not
layout gaps. This plan builds the sections backed by real data, adds **one** small capture
(the 1:1 note), and leaves the rest as reserved positions that later rows fill:

| ficha section | gated on | on the board |
|---|---|---|
| Limitações | #39 adaptações | yes, Icebox |
| Presença as *fact* (not inference) | #102 attendance join | yes — plans/42's keystone |
| Grade grouped by **horário** | #40 `settings.classSchedule` | yes, catalog half unblocked |
| Atributos + Distribuição do time | [plans/22](./22-athlete-character-stats.md) step 4 | a plan, not a scheduled row |

⚠️ **Sections without data are ABSENT, not placeholdered.** The precedent is
`atletas/AthleteDetail.jsx:145` — C2's reserved #39 slot, a comment-marked position in the
JSX that renders nothing on purpose. The opposite precedent is `locations[].coachName`:
shipped as groundwork, written by a form, read by nothing.

## Acceptance

- `Atletas.jsx` is a container over `atletas/`; the grade replaces `AthleteList`, the ficha
  replaces `AthleteDetail`'s composition. Every other C2 component survives unchanged.
- Grade groups are `Hoje` → `Amanhã` → `<Dia dd/mm>` (≤30 d) → `Sem sessão marcada`,
  A–Z inside a group. A time is appended **only** when an agenda event links the session.
- Each card carries 4 signals + a full-width `TallyBar` with its label on the line below.
- Ficha renders 7 live sections; **Limitações and Atributos render nothing at all.**
- 🔴 The presence grid starts on **Domingo**, and its legend says `sem registro`, never
  `faltou`.
- `goals_data.coachNotes[athleteId]` round-trips; writing a note resets `sem feedback` and
  the note appears as `anterior` on the next open.
- Zero `window.confirm`; zero unnamed icon-only buttons; correct under **all 4 themes** at
  **1280×800 and 390×844**.
- `npm test` green (6 new helper suites) · `npm run build:all` clean · `npm run lint` clean
  at `--max-warnings 0`.
- New gallery cases for every new component, across the state axes.

## Files

- `src/components/tabs/Atletas.jsx` — container: grade/ficha composition, mobile pane
  switch, the data mutators, modal wiring.
- **new** `atletas/AthleteGrid.jsx` · `AthleteCard.jsx` · `DayGroupHeader.jsx` ·
  `Ficha.jsx` · `SinceLastOneOnOne.jsx` · `PresenceGrid.jsx` · `CoachNotePanel.jsx`
- **kept from C2** `PrRow` · `GoalBar` · `SessionStrip` · `GoalConfigPanel` ·
  `PrModal` · `AddResultModal` · `AthleteProfileModal` · `Atletas.module.css` ·
  `atletasHelpers.js` (extended)
- **superseded** `AthleteList.jsx`; `AthleteDetail.jsx`'s composition
- `src/utils/storage.js` — `coachNotes` accessors on the existing `goals_data` blob
- `src/public/lib/sessions.js` — receives `calcBlockStats` (promoted, see Approach 6)
- `src/public/me/meHelpers.js` — re-exports it
- `src/public/gallery/groups/atletas.jsx` — extended

**Read-only reuse:** `ui/{Button,Input,Card}` · `shared/{TallyBar,ConfirmReview}` ·
`public/lib/goals.js` (`prBest`/`prPct`/`prDelta`) · `public/lib/sessions.js`
(`matchesAthlete`) · `public/lib/week.js` (`DAY_PT_TITLE`, `getWeek`, `todayISO`).

## Approach

### 1 — The grade

`nextSessionGroups(sessions, athletes, events, todayKey)`. For each athlete, the earliest
session where `matchesAthlete(s, a.name)` and `date >= todayKey`; athletes with none land in
`Sem sessão marcada`. Group by date, label `Hoje`/`Amanhã`/`<Dia dd/mm>`, sort A–Z inside.

**Time is opportunistic:** `events[date]?.find(e => e.sessionId === s.id)?.time`. A session
record has no time field — `emptyS()` is `{id, date, mainTraining, sessionName, locationIds,
blocks}` — but an agenda event does (`time` + `durationMin`), and `ev.sessionId` is a real
link. When present the header reads `Hoje · 18:00`; when absent, just `Hoje`. It gets better
for free as the coach uses Agenda, and #40 replaces the mechanism later.

### 2 — The card, and its four signals

```
+----------------------------------------+
| (AM)  Ana Medrado         Intermediario|
+----------------------------------------+
| ULT. SESSAO          ADERENCIA         |
|   1 d                  58% v           |
| SEM FEEDBACK         OBJETIVO          |
|   3 sem                parado ha 5 sem |
+----------------------------------------+
| ################...................... |  <- TallyBar, FULL WIDTH
| missao 7/12                            |  <- label BELOW the bar
+----------------------------------------+
```

🔴 **The bar spans the full card width; the label sits on the line below.** A bar sharing a
row with its label gets whatever width the label leaves, and that width changes with the
label's own text — so the same percentage renders at a different length card to card and the
column stops being scannable. This matters here specifically because the grade is a 2-up grid
of many cards. `TallyBar`'s contract is unchanged: always 10 blocks whatever the denominator,
and the literal `7/12` stays the caller's to print.

| signal | derivation |
|---|---|
| `últ. sessão` | newest `results_v2.date` for the athlete → `hoje` / `ontem` / `N d` |
| `aderência` + arrow | `calcBlockStats` over WOD types, last 30 d vs the 30 d before |
| `sem feedback` | days since the newest `coachNotes[athleteId].date` |
| `objetivo` | nearest open goal: `goalPct`, plus **parado** when the newest milestone `hitDate` is > 21 d old |

🔴 **`aderência` is "% of prescribed WOD blocks actually logged", and the caption must say
so** — plans/22's rule is that the caption states what it counted. **Do not reuse
`calcKPIs.freq`** (`resultados/resultadosHelpers.js:33`): its denominator is result rows that
exist, so an athlete who only logs when present scores 100% forever.

⚠️ **A true pace calculation needs a goal start date and goals have none.** Add
`createdAt: todayISO()` to the goal literal (`Atletas.jsx:1003`). Goals created before it fall
back to the milestone-`hitDate` signal above, which **is** already stamped (`:1046`). One
field, no migration, no backfill.

✕ `competição · 14/09 · 42 d` — no entity anywhere; `objetivo` takes the slot.
✕ `N14` numeric level — the app's level is the 4-value enum (`utils/config.js:14`).

### 3 — The ficha, in JSX order

`header` · `Desde o último 1:1` · `Últimas 3 sessões` · `Presença · 4 semanas` ·
`Objetivos abertos` · `1RM` · **▢ Limitações (#39)** · `Nota do coach` ·
**▢ Atributos (plans/22)** · `▸ Missões` fold · footer.

Sections are `Card`s with real `<h2>`s (`AppChrome` already renders the pane `<h1>`).
`Últimas 3 sessões` is C2's `SessionStrip`, already built and tested.

`Desde o último 1:1` anchors on the newest `coachNotes` date and lists what changed since:
PR improvements (`prDelta`), milestones hit (`hitDate`), sessions assigned with no result.
Every row derives from data that already exists — only the anchor is new.

✕ `insígnias` in the fold — no entity. The fold shows the goal tally only.

### 4 — The presence grid

4 weeks × 7 days. 🔴 **Sunday-start (`D S T Q Q S S`).** Mockup 51 draws it Monday-first;
that is wrong for this project and is corrected in the build, not in the mockup.

| cell | meaning |
|---|---|
| `presente` | a `results_v2` row with `presence === 'Presente'` |
| `sem registro` | a session `matchesAthlete` that day, no result row |
| `—` | no session assigned |

⚠️ **The middle state is an inference and the legend must not overstate it.** A missing
`results_v2` row means *unknown*, not *absent* — no row is ever created for a no-show.
#102 is what turns this into a fact.

### 5 — The one new capture

```js
// goals_data.value.coachNotes[athleteId] = [{ id, date, text }]
```

Same blob and the same athlete-id keying as `prs` and `athleteGoals`, and the shape #39
plans to use. **No migration, no new table.** Unlocks three things at once: the `sem
feedback` signal, the `Desde o último 1:1` anchor, and `Nota do coach`'s previous-note pane.

🔴 **Write from the mutator, never a mount effect.** `saveGoalsData` is called by the save
handler directly — the shape `Servicos.jsx`'s `saveLoc`/`toggleAthlete` use. A
`useEffect(() => save(x), [x])` seeded from `useState(load…)` re-persists on mount; that is
the #76/#109/#111 bug class and it has already cost this repo data once.

### 6 — Helpers, all pure and unit-tested in `atletasHelpers.js`

`nextSessionGroups` · `adherence` · `daysSinceNote` · `goalSignal` · `presenceGrid` ·
`sinceLastNote`. `todayKey` is injected rather than read from the clock — the convention
`sessionStrip` already follows, and `new Date()` in a render path is also a
`react-hooks/purity` violation.

🔴 **Promote `calcBlockStats` from `me/meHelpers.js` to `public/lib/sessions.js`** and
re-export it from `meHelpers` — the exact move #70 made for `getTargets`/`matchesAthlete`.
It is session-domain, it now has two consumers, and Atletas is SPA-side while `me/` is a
public page.

### 7 — Mobile 390×844

The grade becomes a signal list (`Precisa de atenção` / `Em dia` / `Próxima`), the ficha is
a pushed pane — the same two-pane push/pop the tab already uses. `Precisa de atenção` =
`aderência` trending down **or** `sem feedback` > 14 d.

### 8 — Gallery group `Atletas`, extended

Client-free items only (no `utils/storage` import, direct or transitive). New cases:
`AthleteCard` × each signal state (never trained / stalled goal / no notes / long name) ·
`DayGroupHeader` with and without a time · `AthleteGrid` empty / one group / many ·
`PresenceGrid` full / sparse / empty · `SinceLastOneOnOne` with and without an anchor ·
`CoachNotePanel` first note / with previous · the ficha's absent sections.

## Verification

1. `npm test` · `npm run build:all` · `npm run lint --max-warnings 0`.
2. `npm run dev` at 1280×800 and 390×844 under **all 4 themes** — C2's palette fix must hold
   in the new layout. ⚠️ If a change does not appear, unregister the service worker first
   (`cone-v*` poisoning) **before** debugging `src/`.
3. An athlete with no sessions lands in `Sem sessão marcada`; one whose session is linked by
   an agenda event shows the time; the rest show the bare day label.
4. Write a coach note → `sem feedback` resets to `hoje`, and on the next open the note is the
   read-only `anterior` with an empty field below it.
5. Confirm the presence grid's first column is **D**, and that its legend reads
   `sem registro`.
6. Keyboard: reach a card and the fold with Enter/Space; every icon-only `Button` names itself.
7. `gallery.html` — **no CI gate catches a broken import here, so open it** — then
   `npm run design:cards` + DesignSync → stop at the approval gate.
8. `/verify` before committing; `/code-review` before pushing (L).
9. **Docs are part of Done:** #160 → Done in `BACKLOG.md`; update `CLAUDE.md` (the tab's new
   structure, `coachNotes`, `calcBlockStats`'s promotion, the gallery item count and group
   list, the test count).

Model: Sonnet   ·   Size: L
