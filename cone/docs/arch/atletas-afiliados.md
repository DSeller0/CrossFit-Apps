# Atletas + Afiliados

> Split out of `cone/CLAUDE.md` by [plans/95](../plans/95-claude-md-split.md) (#224, 2026-09-20) — the text is unchanged, only its location.
> The C2 decomposition (plans/75), the grade/ficha rebuild (#160 / plans/76), and the coach's panels (#161 / plans/77, #162 / plans/78).
> ↩ back to [CLAUDE.md](../../CLAUDE.md)

---
#### Atletas + Afiliados (C2)

**Atletas + Afiliados (#56 · C2 · plans/75, shipped 2026-08-28)** — the old
`Atletas.jsx` (1795 lines, 7 frozen totk-dark palette consts) and `Servicos.jsx` (1199
lines, inline styles only, no `.module.css`) are now both containers over decomposed,
token-only components: `src/components/tabs/atletas/` (originally `AthleteList`/
`AthleteDetail` — both superseded by #160's grade/ficha rebuild below —
`AthleteHeader`/`SessionStrip`/`PrRow`/`GoalBar`/`GoalConfigPanel` + the 3 modals +
`atletasHelpers.js` + `Atletas.module.css`) and `src/components/tabs/afiliados/`
(`Afiliados.jsx` is the new container, replacing `Servicos.jsx` entirely —
`AffiliatesPane`/`AffiliateRow`/`AthleteAssignment`/`MeuNegocioPane` (was
`CoachProfileForm`; renamed `MeuPerfilPane` by #161 below) + the 2 modals +
`affiliateHelpers.js` + `Afiliados.module.css`).
**Tab label is "Afiliados"; `id:'locations'` and the `locations` blob are unchanged**
(plans/42 decision 1 — `type` is already the discriminator, no new entity). Every new
component is client-free and gallery-covered (`Atletas`/`Afiliados` gallery groups).
Both hand-rolled 10-block PR/goal bars are gone in favour of the one `TallyBar`
primitive; both tabs' delete/remove actions go through `ConfirmReview` instead of
`window.confirm`, except the goal `+1` (was a confirm on a reversible single
increment — removed, not converted). **`ExerciseCombobox` moved from
`criador/ExerciseCombobox.jsx` to `src/components/shared/ExerciseCombobox.jsx`**
(gained an `excludeNames` prop for the PR-name case) — Atletas' own private fork is
deleted, so there is exactly one implementation now, reused by Criador's
`ExerciseRow.jsx`. It still reads the registry itself via `loadRegistry()`, so like
`shared/IntensityInput.jsx` it is **not** client-free and does not render in the
gallery — callers needing it in a client-free component (`atletas/PrModal.jsx`) take
it as a wired node prop instead of importing it. `.ex-input`/`.ex-input:focus`/
`.ex-input::placeholder` are deleted from `index.css` (zero consumers once Atletas
adopted `ui/Input`); `.ex-suggestion` stays, since the moved combobox still uses it.

#### Atletas — Fichas

**Atletas → Fichas (#160 · mockup 51 · plans/76, shipped 2026-08-28)** — `Atletas.jsx`'s
composition changed from a 220px alphabetical list + detail pane to a **grade** ordered by
each athlete's next session and a **ficha** that is 1:1 preparation, not a roster entry.
`AthleteList`/`AthleteDetail` are gone; `atletas/` gained `AthleteGrid`/`AthleteCard`/
`DayGroupHeader` (the grade) and `Ficha`/`SinceLastOneOnOne`/`PresenceGrid`/`CoachNotePanel`
(the ficha) — `AthleteHeader`/`SessionStrip`/`PrRow`/`GoalBar`/`GoalConfigPanel` and the 3
modals are unchanged. Grade cards group under **Hoje → Amanhã → `<Dia dd/mm>` → Sem sessão
marcada** (`nextSessionGroups`, a time appended only when an `events[date]` row links the
session by `sessionId`) and carry 4 signals — últ. sessão · aderência (+ trend arrow, "% of
prescribed WOD blocks logged", **not** `calcKPIs.freq`, whose denominator is result rows that
exist) · sem feedback · objetivo (nearest OPEN goal, or "parado há N sem" once its newest hit
milestone is > 21 days old) — over a full-width `TallyBar` with its label on the line below,
never sharing the row (the same % renders a different length card-to-card otherwise, and the
grade is a 2-up grid of many). Mobile collapses the date grouping into a 3-bucket signal list
(**Precisa de atenção / Próxima / Em dia**) computed in the container, fed through the same
`AthleteGrid`. The ficha adds **Desde o último 1:1** (anchored on the newest coach note,
listing PR improvements/milestones hit/unlogged prescribed sessions since), **Presença · 4
semanas** (`presenceGrid`, Sunday-start, `sem registro` — never `faltou`, since a missing
`results_v2` row means unknown, not absent, until #102) and **Nota do coach**
(`CoachNotePanel`, mounted `key={athlete.id}` so a draft can't leak across athletes) around
the still-reserved #39 (Limitações) and plans/22 (Atributos) slots, which render nothing on
purpose. **One new capture:** `goals_data.coachNotes[athleteId] = [{id,date,text}]` (same blob,
same athlete-id keying as `prs`/`athleteGoals`; `storage.js`'s `loadGoalsData` now defaults it
to `{}`) — written straight from `Atletas.jsx`'s `saveNote` mutator, never a mount effect (the
#76/#109/#111 bug class). `calcBlockStats` **promoted** from `public/me/meHelpers.js` to
`public/lib/sessions.js` (the #70 move, repeated) and re-exported from `meHelpers` for its
existing `me.html` call sites — it's session-domain and now has two consumers. Its trailing
argument is an options object since #164: **`{ box }`** (me.html — the viewer's `?box=` narrows
the list through `inBoxScope` first, `null` being the Sem box view) or **`{ scopes }`** (Atletas —
the athlete's own scope Set replaces that filter). ⚠️ Before #164 `adherence` passed nothing,
i.e. `box = null`, i.e. **Sem box sessions only** — a second, independent reason every Eagles
member read `—`. All 6 new pure
helpers (`nextSessionGroups`/`adherence`/`daysSinceNote`/`goalSignal`/`presenceGrid`/
`sinceLastNote`, plus the shared `agoLabel`/`lastSessionSignal`) live in `atletasHelpers.js`,
`todayKey`-injected like `sessionStrip`.
🔑 **"Prescribed" means `matchesAthlete` with the athlete's SCOPES (#164/plans/91).** `sessionStrip`/
`adherence`/`presenceGrid`/`sinceLastNote` take that athlete's scope Set and `nextSessionGroups` a
`scopesById` Map — built by **one** `useMemo` in `Atletas.jsx` (from a **fresh** `loadLocations()`,
never App's once-read `locations` state, which goes stale after an Afiliados roster edit) so the grade
and the ficha cannot disagree. A helper called without scopes treats the athlete as `{SEM_BOX}`, never
as "every scope". Before #164 all four signals matched by name only, and 146 of 152 prod sessions carry
no names — they were dead on real data. ⚠️ **Expected, not a bug: nearly everyone groups under Hoje**
(every scope runs a session nearly every day — measured 23/23 on 2026-09-18). That is what the rule
says; don't bend the predicate to spread the grade out — if the ordering axis reads badly, that is a
row about the grade.

#### Afiliados — painéis do coach

**Afiliados → painéis do coach (#161 · mockup 60 · plans/77, shipped 2026-08-29)** —
`Afiliados.jsx`'s composition changed from a horizontal `PaneTabs` strip + two panes to a
**vertical rail** (`AffiliateRail.jsx`, 214px, grouped "Painéis"/"Conta", falls back to the
existing horizontal strip below 768px — a SEPARATE `PaneTabs` render branch
(`orientation='vertical'`), not a CSS reflow of the same markup, since `role="tablist"`/`"tab"`
needs the tab as a direct child) over **two panes, renamed to match the mockup: "Meus
afiliados" and "Meu perfil"** (was "Afiliados"/"Meu negócio"; `MeuNegocioPane.jsx` renamed
`MeuPerfilPane.jsx`). `PANES` is still array-driven (`{id,label,group,count}`) — plans/78 appends
Fechamento + Minha semana as two more "Painéis" rows. Mockup 60's `Sou coach / Sou dono do box`
role switch and its four box-owner panels (Coaches · Turmas · Contas a pagar · Vínculos) are
**dropped outright**, not placeholdered — the app has no role model to switch on (plans/42).
**"Meus afiliados" is three columns** (`AffiliatesPane.jsx`): the list ("Onde eu trabalho",
232px) · the selected affiliate's detail · **`ReceivableRail.jsx`** ("A receber", 262px, hidden
below 960px — list+detail+receivable doesn't fit a tablet width). The detail gained the
**two-direction pair** (`DirectionPair.jsx`) — `locations[].rate` is what the BOX pays the coach,
the coach's Pix key is what the COACH charges the athlete; same field, same Pix identity,
opposite arrows depending on `loc.type` (plans/42 decision 2) — and **`AffiliateSessions.jsx`**,
the month's events for that affiliate. Both new components and `ReceivableRail` take already
date-ranged data and reuse `publicador/billing.js`'s `calcTotal`/`sumByCurrency` directly (both
pure, so this is fine in client-free components) — `affiliateHelpers.js` gained
**`monthBounds`** and **`eventsForAffiliate`** (a box event matches on `locationId`; a personal
one never carries one — the coach picks an athlete instead — so it matches on a shared id with
`loc.athleteIds`). `Afiliados.jsx` now takes **`events`** as a prop (`App.jsx`, from
`useSync()`, read-only — the same pattern `AtletasTab` already used). **`AthleteAssignment.jsx`**
renders an `athleteIds` entry pointing at a deleted athlete (no DB can enforce integrity inside a
JSONB array, plans/42 decision 7) as a removable "Atleta removido" row instead of silently
dropping it. **`MeuPerfilPane.jsx`** gained a read-only **"Taxas por afiliado"** card (click a
row to jump to that affiliate in "Meus afiliados"); mockup 60's **"Quem vê o quê" is deliberately
NOT built** — it would describe per-affiliate visibility no layer of the app implements,
asserting an isolation guarantee that does not exist (plans/42's tenancy sequencing puts real
isolation dead last; the panel becomes buildable once #31 lands). **Zero change to the
`locations[]` shape** — every existing reader (`Config.jsx`, `Criador.jsx`, `AgendaView.jsx`,
`events.jsx`, `billing.js`, `stateBackup.js`) is unaffected.

#### Afiliados — Fechamento + Minha semana

**Fechamento + Minha semana (#162 · mockup 60 · plans/78, shipped 2026-08-29)** — the rail's
last two "Painéis" rows. `Fechamento` (`FechamentoPane.jsx`) is the invoice board — **Sessões
abertas → Rascunho → Enviada → Paga** — bought with the smallest possible persistence: **a
status stamp, not an invoice entity**. Line items stay computed on the fly by `publicador/
billing.js`'s `calcTotal`; only the *state* is stored, at
**`coach_profile.value.billing[affiliateId][period] = {status, sentAt?, paidAt?, total?,
currency?}`** (`period` a `'YYYY-MM'` key) — on `coach_profile` because it's already
anon-locked by `0006` for this class of data (it holds the Pix key too), not `settings`
(anon-readable, why `boxWarnings` lives there) and not `locations`. **No migration** — a new
key inside an existing JSONB blob; `storage.js`'s `loadCoach` defaults it to `{}` for a
brand-new profile, every reader still treats it as optional. 🔴 **The freeze is the whole
correctness argument, and it's enforced by which data source each consumer reads, not by
anything in the reducer:** `billingState.js`'s pure `periodKey`/`periodBounds`/`periodLabel`/
`stampFor`/`allStamps`/`setStamp`/`singleTotal`/`advance`/`columnOf` (unit-tested,
`billingState.test.js`) never touch `events` for `sent`/`paid` — `InvoiceCard`/`InvoiceDetail`
read `stamp.total`/`stamp.currency` (frozen the moment `advance(stamp,'sent',computed)` runs)
for those two statuses and `calcTotal(events, loc)` (LIVE) for `open`/`draft` — so editing a
past event moves a draft's number and can never move a sent one. `FechamentoPane`'s board
enumerates `open` from the CURRENT period only (a fresh invoice always starts from this
month's unbilled sessions) but `draft`/`sent`/`paid` from every stamped period at once — a July
"Paga" and an August "Enviada" sit side by side, matching the mockup. Every advance
(`Afiliados.jsx`'s `advanceInvoice` mutator, direct-save like `saveLoc`/`toggleAthlete` — #109's
shape, not the debounced coach-profile effect) is behind a `ConfirmReview`; `Enviar fatura`'s
copy is the one that states the freeze explicitly. The Pix QR is the Relatório's own code, not
a second copy: **`publicador/pixQr.js`'s `qrToBase64`** was extracted from `events.jsx`'s
`ReportModal` (a second hand-rolled EMV/QR path is how the four money bugs in #104 happened) and
both now call the same `buildPixPayload` (`utils/pix.js`), honouring `pixTestCap` identically.
`Minha semana` (`MinhaSemanaPane.jsx` + `WeekEventGrid.jsx`) needed no new data at all —
`events` already carry `time`/`durationMin`/`locationId`/`athleteIds`. The grid's rows are every
DISTINCT time that actually occurs that week (not a fixed 24h scale), columns are the 7 days
Sunday-start (`week.js`'s `getWeek`); a cell's colour resolves via **`affiliateHelpers.js`'s new
`resolveEventLoc`** (a personal event carries no `locationId` of its own — same reverse lookup
`events.jsx`'s `EventFormInner` already does at booking time). ⚠️ **No stat here may claim
attendance** — `events[].status` is a manual `scheduled`/`completed` toggle and `athleteIds` is a
checkbox list the coach ticks; `class_executions` is what actually knows who checked in and has
no join key to either (#102). So the stats strip says "atletas **marcados**", never "presentes",
and "a lançar" counts events not yet toggled `completed` rather than claiming to know who
showed up — same honesty rule `AffiliateSessions.jsx`'s "Agendada" badge already follows (no
`cancelled` status exists in the schema either). **`MeuPerfilPane.jsx`** gained **"Cobranças
emitidas"** — the stamp history (`billingState.js`'s `allStamps`), `sent`/`paid` rows only (a
`draft` hasn't actually been "emitida" yet), each row jumping back into `Fechamento` at that
exact invoice (`onSelectInvoice`, mirroring `onSelectAffiliate`). "Ver na fatura →" (Minha
semana's event detail) is the same cross-pane link in the other direction — together they're why
the two panels are worth more built than either alone.


#### Atletas — Histórico de resultados

**Atletas ficha → "Histórico de resultados" (#57)** — one new Card at **position 4**, right after
*Presença · 4 semanas*, so the three attendance-shaped Cards read in sequence: what was **assigned**
(Últimas sessões) → whether they **showed up** (Presença) → what they actually **did** (this).
`atletas/ResultHistoryCard.jsx` + `atletasHelpers.js`'s `resultKpis`/`resultHistory`.
⚠️ **`calcKPIs.freq` did NOT come across** — its denominator was result rows that exist, so one
logged session scored 100% (the #164 family). It was **dropped, not migrated**, and `resultKpis` has
no such output at all. ⚠️ **`resultHistory` takes `sessName` INJECTED** (keeps `atletasHelpers` free
of a `sessions.js` import) and matches on **`r.sessionId`** — the old Histórico read
`sessions[r.date][0].mainTraining`, i.e. the day's FIRST session regardless of which one the result
belonged to. ⚠️ **The reserved #39 and plans/22 slots are untouched.**

---
