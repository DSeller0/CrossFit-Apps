# 91 — Untargeted sessions reach their audience (#164)

> ✅ Done: `af88d4b` · 2026-09-18 — see BACKLOG.md · closes #164.
>
> **Real data (prod `results_v2` + the `2026-09-18_16-05-25` backup's sessions/athletes/locations,
> today = 2026-09-18, scratchpad script, not committed).** Scopes: 12 `{Sem box}` · 9 `{Eagles}` ·
> Arthur `{Eagles, Test Box 00, Sem box}` · Rodrigo M `{Test Box 00, Sem box, <a box id no location
> carries>}` (a session tagged with a since-deleted box). **Grade: Hoje = 23 of 23** (every scope runs
> today, as the plan predicted; before: 23 of 23 under *Sem sessão marcada*). **Adherence non-null:
> 23 of 23** (before: 0 of 23), mostly `0%`: prescribed, nothing logged. Arthur's Presença:
> 9 `presente` · 13 `sem registro` · 6 `none`. His "Desde o último 1:1" (anchor 31/08): 22 unlogged
> prescribed sessions, 0 before.
>
> **Live-verified on the local stack** (reseeded from prod; the backup's `locations` upserted with the local
> service-role key): the grade and the Eagles/no-box ADERÊNCIA (Paulo 15%↓, Stefaní 37%↑); Arthur's ficha;
> me.html WOD bars with and without `?box=<eagles>` (Stefaní For Time 5/14); Publicador's filter (Esther,
> Eagles only, gets only Eagles sessions; Stefaní gets only Sem box sessions). schedule.html (mobile day list)
> and results.html (`?id=` lock) on the week of 13/07: the page text hashes to the same value with the old
> forks stashed and with the new code, for an athlete on the named sessions and for one who isn't.
>
> **Code review (medium): one finding, deliberately kept.** An athlete in several scopes is prescribed
> every scope's untargeted class. Someone who attends one class a day scores ~1/N adherence, and
> "Desde o último 1:1" lists the other class as missed. That is rule 3 as settled with the user, so it
> ships as written. On real data it affects 2 of 23 athletes, and it is filed as **#205**.
>
> **Newly visible, filed as #204:** me.html's Distribuição now renders `0/46`-style bars for everyone.
> `results_v2` only ever logs WOD block types (prod: AMRAP/For Time/MetCon/Estações/EMOM/Benchmark), so
> the executed side for Força/LPO/etc. is structurally 0. #164 didn't cause it. It was hidden while
> planned was 0.
>
> **Deviations:** registered scopes count only `type === 'box'` locations. A personal location carries
> `athleteIds` too, but can never tag a session, so counting it would cost a personal client their
> Sem box default. The SessionMetaModal copy names the boxes ("Todos os atletas de Eagles e Garra", "…do Sem box") and
> says "Ninguém enquanto oculta" for a hidden draft, which is rule 5. A gallery case covers the tagged
> variant. Out of scope, as planned: `dupSession`'s `mainTraining: ''`, `executed` not checking
> prescription (folded into #205), and name-keyed `mainTraining` breaking on a rename.
> Also found: `seed-dev.mjs`'s `results_v2` upsert (`onConflict: 'id'`) fails on the
> `(athlete_id, session_id)` key once local and prod ids diverge, which is #190's shape in the script.


> Promoted from Icebox P1 on 2026-09-18, together with [plans/92](./92-publicador-settings-debounce.md)
> and [plans/93](./93-focus-visible.md). A full `/app-review` pass runs once all three ship. The
> consumer map below was re-measured against the tree and the `2026-09-18_16-05-25` backup that day.

## Context

`getTargets` (`public/lib/sessions.js:35-38`) returns `[]` for a session with no `mainTraining`,
so `matchesAthlete` (`:40-42`) is **false** for it. Prod has 152 sessions
(`backups/2026-09-18_16-05-25/sessions.json`):
- **6** have a non-empty `mainTraining`: `["Arthur"]` once, and `["Arthur","Paulo"]` on five July
  test sessions.
- The other 146 carry `[]` or `''`.
- **None** of the last 30 days' 59 sessions is targeted.

So the rule "matches only by name" is dead on real data:
- **Atletas grade ADERÊNCIA** reads `—` on 100% of cards: `adherence` → `calcBlockStats` counts
  `planned = 0`.
- **Presença · 4 semanas** is 28 blank `none` cells for everyone: `presenceCellState` never sees an
  assigned day.
- **Desde o último 1:1** never lists a missed session.
- **The grade** files everyone under *Sem sessão marcada*.
- **me.html's WOD and Distribuição bars** never render (`Me.jsx:407,424`; rows appear only when
  `planned > 0`).

Two public pages already worked around this with forks: `Schedule.jsx:36-46` `filterDaySessions`
and `Results.jsx:48-61` `sessionsForDay`, each with `t.length === 0 || t.includes(name)`.

**Since August the daily pattern is one untagged ("Sem box") program plus one Eagles-tagged
class.** So a bare "untargeted → everyone" would wake the signals and make them wrong. Measured
2026-09-18:
- All 23 athletes would land in *Hoje*.
- Presença would show ~22 `sem registro` days for every athlete, including people who never train
  there.
- On every 2-session day, "Desde o último 1:1" would list the session the athlete didn't do.

### The rule

Decided 2026-09-14, and the box half settled with the user 2026-09-18:

1. **A session with `mainTraining` names keeps name matching**, whatever its box tags. No change.
2. **A session without names is prescribed to the athletes whose *scopes* intersect the session's
   scopes.** A session's scopes are `sessionBoxIds(s)`; an untagged session's scope is the sentinel
   `SEM_BOX`. This is the partition #80/#91 already uses for `?box=` links: a Sem box session goes
   to the no-box audience, and a tagged session goes only to its own boxes.
3. **An athlete's scopes (SPA)** are the union of:
   - every box whose `locations[].athleteIds` contains them (the registered roster), and
   - the scope of every session they have a `Presente` result on. This is the "join via results"
     rule `afiliados/AthleteAssignment.jsx:29` already tells the user ("Atletas de aulas em grupo
     também entram automaticamente pelos resultados de cada aula").

   An athlete with neither is `{SEM_BOX}`. Example: Arthur is registered in Eagles and Test Box 00
   and logs Sem box, so all three scopes are prescribed to him.
4. **me.html cannot read `locations`** (anon-locked by `0006`). It keeps the viewer's `?box=`
   scope, which `calcBlockStats` and the hearts already apply through `inBoxScope` before
   matching. There, untargeted means every athlete in the scope being viewed. No new data is
   exposed.
5. **An untargeted session with `public === false` is prescribed to no one.** It is a draft nobody
   can see. A *named* hidden session still matches its names.

**Expected output, not a bug:** every scope runs a session nearly every day, so most athletes will
group under **Hoje**. That is what the rule says. Record the real distribution in the Done marker,
and don't bend the predicate to spread the grade out. If the grade's ordering axis then reads badly,
that is a separate row about the grade.

## Acceptance

- **`getTargets` is unchanged.** Three consumers depend on it returning `[]` for untargeted:
  - `publicador/AgendaView.jsx:88-90` `dayGymSessions`, where `getTargets(x).length === 0` *is* the
    definition of a gym session
  - `sessName`
  - `criador/useSessionEditor.js:56-62`
- New pure exports in `public/lib/sessions.js` (no React, no client; locations and results are
  passed in):
  - `SEM_BOX`: a sentinel string that can't collide with a base36 `uid()`
  - `sessionScopes(s)` → `sessionBoxIds(s)`, or `[SEM_BOX]` when empty
  - `athleteScopes(athlete, { locations, results, sessions })` → `Set`, rule 3 above
  - `matchesAthlete(s, name, scopes = null)`:
    - false for a null session
    - names match when there are names
    - otherwise `public === false` → false
    - otherwise `scopes === null` → true (the caller has already scoped the list, as public pages do)
    - otherwise `sessionScopes(s)` intersects `scopes`
- **`calcBlockStats`'s trailing `box = null` becomes `{ box = null, scopes = null } = {}`.** When
  `scopes` is given, the scope-aware match replaces the `inBoxScope(s, box)` filter. Update all 3
  call sites: `Me.jsx:407` and `:424` (pass `{ box }`), and `adherence` (pass `{ scopes }`).
  Today `adherence` passes nothing, which means `box = null`, which means **Sem box sessions
  only**. That is a second, separate reason Eagles members read `—`.
- `atletas/atletasHelpers.js`:
  - `sessionStrip`, `adherence`, `presenceGrid` and `sinceLastNote` each take that athlete's
    `scopes`.
  - `nextSessionGroups` takes a `scopesById` `Map`.
  - `todayKey` stays injected, as before.
- `Atletas.jsx` builds `scopesById` in one `useMemo`, from a **fresh** `loadLocations()`. App's
  `locations` state (`App.jsx:60`) is read once and goes stale after an Afiliados edit in the same
  session. The same memo feeds the grade and the ficha.
- **Publicador "Filtrar por atleta"** (`Publicador.jsx:221-228`) uses the same athlete scopes.
  Without them, picking an athlete would include every untargeted session from every box: "Todos"
  with the athlete's name as the title.
- **The two public forks collapse onto `matchesAthlete(s, name)`:** `Schedule.jsx:36-46` and
  `Results.jsx:48-61`. Behaviour is identical: both already treat untargeted as everyone and filter
  `public` themselves.
  ⚠️ **Leave `Schedule.jsx:641-648` `doOpenLog` as it is.** It carries an inline `getTargets` copy,
  and its `assignedAth.length ? assignedAth : aths` fallback (#49) *also* covers a targeted session
  whose names match no known athlete (a renamed or deleted one). A `matchesAthlete` filter would
  drop that case.
- **`criador/SessionMetaModal.jsx:98`**'s empty-state copy, "Nenhum atleta — clique para
  selecionar", is now wrong: nobody picked means the session's whole audience. Reword it, pt-BR, to
  say so (e.g. "Todos os atletas do box — clique para restringir"; a Sem box session reaches the
  athletes outside any box).
- Tests (all pure):
  - `public/lib/sessions.test.js`:
    - `matchesAthlete`: named hit/miss, untargeted with `scopes === null`, untargeted Sem box vs
      tagged against a scope set, untargeted hidden → false, named hidden → true, null → false
    - `sessionScopes`, including a legacy singular `locationId`
    - `athleteScopes`: registered only · trained Sem box · trained box · neither → `{SEM_BOX}` · a
      result whose `sessionId` no longer exists is ignored · a non-`Presente` row adds nothing
  - `public/me/meHelpers.test.js:43`: `matchesAthlete({}, 'Bruna')` flips to true (`{}` is public
    and untargeted, and no scopes are passed). Add the null case beside it.
  - `atletas/atletasHelpers.test.js`: one untargeted-session case per helper. Every existing
    fixture sets `mainTraining`, so the rule has zero coverage today.
- **Real-data check.** A scratchpad script (not committed) runs the helpers over the local stack's
  sessions and results plus the backup's `locations.json`. It reports:
  - the grade's group sizes
  - how many athletes get a non-null adherence
  - one ficha's Presença cell counts

  The numbers go in the Done marker.
- Docs:
  - CLAUDE.md: the `sessions.js` bullet under "Shared utilities" states the rule and that
    `getTargets` still returns `[]`; the Atletas Fichas lines that say "assigned"/"prescribed"; the
    `calcBlockStats` promotion note.
  - `docs/FEATURES.md:41`.
  - `docs/plans/24-spa-canonical-adoption.md:77`'s "Trap" note is marked superseded.
- `npm run design:cards` regenerated (the SessionMetaModal copy is in the Criador card). The four
  CI gates are clean.

## Files

- `src/public/lib/sessions.js` + `sessions.test.js`
- `src/public/me/Me.jsx` (:407, :424) · `src/public/me/meHelpers.test.js` (:43)
- `src/components/tabs/atletas/atletasHelpers.js` + `atletasHelpers.test.js` ·
  `src/components/tabs/Atletas.jsx` (:112-197, the memos)
- `src/components/tabs/Publicador.jsx` (:221-228)
- `src/public/schedule/Schedule.jsx` (:36-46) · `src/public/results/Results.jsx` (:48-61)
- `src/components/tabs/criador/SessionMetaModal.jsx` (:98)
- `CLAUDE.md` · `docs/FEATURES.md` · `docs/plans/24-spa-canonical-adoption.md` · `design/**`
  (regenerated)

Reuse `sessionBoxIds`/`inBoxScope` (`public/lib/boxScope.js`); **never hand-roll a read of a
session's box tags**. Also reuse `loadLocations`/`loadResults` (`utils/storage.js`, container-side
only; the helpers stay pure).

## Approach

1. **Predicate first, TDD.** Write `SEM_BOX`, `sessionScopes`, `athleteScopes` and the new
   `matchesAthlete` in `sessions.js`, with their tests. Compare result `sessionId`s with `String()`
   on both sides (#110).
2. Change `calcBlockStats`' signature and update its 3 call sites. Re-run `meHelpers.test.js`.
3. Thread `scopes` through the 5 Atletas helpers, then build `scopesById` in `Atletas.jsx`.
4. Publicador's athlete filter: compute that athlete's scopes from `loadLocations()`,
   `loadResults()` and `sessions`, in a memo keyed on `filterAthlete`.
5. Collapse the Schedule and Results forks. Leave `doOpenLog` alone.
6. SessionMetaModal copy → docs → `design:cards`.

⚠️ **Deliberately out of scope, note it in the Done marker:**
- `criador/WeekGrid.jsx:141` `dupSession` sets `mainTraining: ''` on the copy, so a duplicated
  personal session now reaches its whole scope. It used to reach no one, so the old behaviour
  wasn't right either.
- `calcBlockStats`' `executed` counts every `Presente` block in the window without checking that
  its session was prescribed. Both `Me.jsx` and `adherence` cap with `Math.min`.
- `mainTraining` matches by **name**, so renaming an athlete breaks every named session.

Each of these is a candidate row, not part of this change.

## Verification

1. `npm test`, `npm run lint`, `npm run format:check`, `npm run build:all`.
2. **Live, on the local stack.** ⚠️ The dev stack has **no `locations`**: `seed-dev.mjs` reads with
   the anon key, which `0006` blocks (#88). Either seed `backups/2026-09-18_16-05-25/locations.json`
   into the local stack with `.env.development`'s local service-role key, or fabricate the response
   with Playwright `context.route` (memory: live-verify recipe; mind the sticky box-scope trap).
3. SPA → Atletas:
   - the grade's groups
   - ADERÊNCIA on a no-box athlete **and** on an Eagles member (both should now read a %)
   - one ficha's Presença (logged days `presente`, prescribed-and-unlogged `sem registro`)
   - Desde o último 1:1 on Arthur (the only athlete with a coach note)
4. `me.html?id=<athlete>` with and without `?box=<eagles id>`: the WOD and Distribuição bars render.
5. `schedule.html`/`results.html` with an athlete selected: the day's sessions are the same as
   before the change.
6. SPA → Publicador → filter by one athlete: only that athlete's scopes' sessions export.
7. `node scripts/audit-backlog-markers.mjs` after the Done marker lands.

Model: Opus   ·   Size: M
