# Feature-ideas analysis — 2026-07-04 (loads × distance, registry defaults, athlete adaptations, turma agenda)

Planning session over five coach-drafted ideas, analyzed implementation-wise (against the real code paths) and market-wise (against Wodify / SugarWOD / PushPress / Glofox / BTWB). Outcome: five Icebox rows (**#36–#40**) with the recommended approach baked in. No plan docs yet — items get a `plans/NN-*.md` when picked, per [WORKFLOW.md](../WORKFLOW.md). Terminology note: "WOD block" throughout means `isWodBlock()` / `WOD_TYPES` (`src/public/lib/wod.js:3-4`) — For Time, AMRAP, EMOM, MetCon, HIIT, WOD, Benchmark, Estações.

## Verdicts at a glance

| # | Idea | Market read | Verdict |
|---|------|-------------|---------|
| #36 | Remove "—" intensity tab | — (UX hygiene) | Do it; trivial |
| #37 | Load × distance exercises | Exceeds market — competitors model movements as free text | Do it; foundational for #38/#39 |
| #38 | Registry default loads (ghost values) | Not standard in market apps; solo-coach time-saver | Do it after #37 |
| #39 | Athlete adaptations | **Differentiator** — group-class apps don't do per-athlete substitution/injury profiles | Do it; keep phase 1 lean |
| #40 | Turma agenda + pre-check-in | **Table stakes** (booking is the core of Wodify/PushPress/Glofox) | Icebox, blocked on #30/#31 |

Dependency chain: **#36 → #37 → #38** (each reshapes what the next builds on); **#39** independent; **#40** strictly after #30/#31.

## #36 — Remove the "—" intensity tab

The `none` tab in `IntensityInput` (`Criador.jsx:99-200`) is dead weight: `emptyEx()` already defaults `intensity: null`, so the tab only exists as a clear affordance. Design: drop `['none','—']` from the tab array; clicking the **active** tab clears back to `null` (the exact code path the tab used), with a small ✕ hint on the active tab. Only defensive `mode==='none'` checks exist downstream (`Criador.jsx:402, 445`) — harmless. Size S.

## #37 — Distance/calories as exercise-level volume

**Gap:** a loaded carry ("Farmer's Carry 2×100m @ M/F 20/12 kg") is unrepresentable. `intensity.mode` is one-of, and cardio mode hijacks the volume slot — `exVolStr` (`wod.js:20-28`) returns the distance and ignores sets/reps, while the load modes have no distance. Today the workaround is stuffing half the prescription into the note.

**Market:** SugarWOD/Wodify render movements as free-text lines, so structured load×distance would exceed, not chase, the market standard. Loaded carries, sled work, and vest runs are ubiquitous in CrossFit programming.

**Design:** `dist` / `distUnit ('m'|'cal')` become siblings of `sets`/`reps` on the exercise object (additive; old data unaffected). The builder's volume input switches between Sets×Reps and Distância/Calorias driven by the exercise's registry categories — name present in `registry['Cardio']` → distance input. Multi-category already exists, so the primary path for a carry is adding Cardio to its categories in Exercícios; a manual toggle remains only as fallback for free-typed names. Intensity stays orthogonal — any load mode combines with distance. The Cardio intensity tab is removed; legacy `mode:'cardio'` data renders forever via an `exVolStr` fallback and lazy-normalizes to `dist` when a session is edited. Render rule: dist occupies the volume slot (`2×100m`), intensity pill unchanged.

**Folds in the formatter half of #17** — extending four diverged copies separately would be madness: canonical `fmtIntensity`/`exVolStr` in `wod.js`, delete the copies in `Schedule.jsx:14-30` (identical), `Publicador.jsx:14-35` (diverged cardio branch; rewrite `exLine`), and `Resultados.jsx:23` (`exVolStr` copy). TV/ExerciseList already use the canonical. Size M.

## #38 — Registry default loads as ghost values

**Gap:** picking an exercise in the builder fills only the name (`ExerciseCombobox`, `Criador.jsx:255`); the coach re-types the same box-standard loads daily. The registry entry (`{name, videoUrl?, description?, muscles?, notes?}`) has no defaults concept.

**Design:** registry entry gains `defaults: { sets?, reps?, dist?, distUnit?, intensity? }` — one default per exercise *name* (the registry write model replicates one object across categories; per-block defaults aren't viable and fill-only-when-empty makes them unnecessary). In the builder, defaults appear as **placeholder/ghost values**: visible, but the input operates normally; do nothing → the defaults ARE the values used; typing overwrites. Ghosts keep "box standard" vs "coach-specified today" visually distinct while authoring — better than hard prefill, which erases that distinction on fill.

**Semantics:** ghost placeholders in the builder + **materialize empty fields from defaults on session save**, keeping sessions self-contained. Render-time fallback was rejected: editing a registry default would retroactively rewrite past WODs' displayed loads, and TV/Publicador would need a registry fetch.

**Design caveats for the plan doc:** (1) intensity has a *mode* and a tab can't be a placeholder — when intensity is untouched and a default exists, show the default mode's tab in a distinct "suggested/ghost" state with placeholder values inside; any interaction makes it real, its ✕ dismisses. (2) Explicit opt-out ("no load today"): a dismissed ghost doesn't materialize on save; in-session dismissal state suffices, optional `defaultsOff` marker only if the re-edit case proves annoying. **Traps:** `saveDetail` (`Exercicios.jsx:129-139`) rebuilds entries from scratch and would silently drop `defaults` on every save; `IntensityInput` must be extracted to a shared component (down-payment on #26) so Exercícios can edit default intensities. Requires #37 so defaults can carry `dist`. Size M.

## #39 — Athlete adaptations (per-athlete loads + substitutions)

**Gap:** an athlete who step-ups instead of box-jumps, uses a band on pull-ups, and carries 16 kg has no representation — the coach keeps it in their head. Per-result `scale` tags are retrospective; the block-level M/F·RX/Inter/SC prescription is identical for everyone.

**Market:** this is the differentiator of the five. Mainstream group-class apps don't do per-athlete substitution/injury profiles (BTWB suggests scaling by fitness level; Wodify tracks history) — coaches everywhere hold this in spreadsheets or memory.

**Design (phase 1):** `goals_data.adaptations[athleteId][exerciseNameLower] = { substitute?, load?, loadUnit?, note? }` — same blob and name-keying precedent as PRs + `autofillRm` (`Schedule.jsx:61-77`), and schedule.html already fetches `goals_data` (zero new fetch). Coach edits in an "Adaptações" card in the Atletas detail (plain input + registry `<datalist>`). Display: schedule.html annotates exercise rows when an athlete is selected (existing `cone_athlete_filter` localStorage) — the annotation **never replaces** the coach's prescription, so the athlete always sees what the class is doing. Public-page visual → mockup card required when planned.

**Coach-workload mitigation (the coach's own concern):** sparse by design — only exceptions ever get a row (~3–5 per affected athlete, once). Phase 2: PR-derived load suggestions à la `autofillRm` + me.html display. Phase 3: athlete self-service via a SECURITY DEFINER RPC patching only their own key — blocked on #30/#31. Size M (phase 1).

## #40 — Turma agenda + pre-class check-in

**Gap vs market:** class booking/attendance is the *core* of commercial gym platforms (Wodify, PushPress, Glofox, TeamUp) — the biggest functional gap Cone has. Today check-in is live-only (TV QR → `schedule.html?checkin=` → `class_checkin` RPC), classes exist only as ad-hoc coach-started `class_executions` rows, and sessions have no time-of-day.

**Sketch (non-binding, for the future planning session):** weekly slot template in the `settings` blob (`classSchedule: [{id, dow, time, label, durationMin?}]` — anon-readable for public pages, coach-writable, no migration); pre-check-ins in a new `class_bookings` table (`id, date_key, slot_id, athlete_id, created_at, cancelled_at`) + `class_book`/`class_unbook` SECURITY DEFINER RPCs mirroring the `0003` pattern. Rejected homes: `events` blob (coach-private billing calendar, per-date not recurring); extending `class_executions` (rows are born when the coach starts a class — bookings exist before any class row does). Merge point: `startClass()`/ClassPanel shows the slot's bookings as "Esperados", one-tap-confirms into `athlete_ids`; live QR check-in unchanged.

**Explicitly out of v1:** capacity limits/waitlists, cancellation windows/penalties, notifications/reminders, per-date schedule exceptions beyond a simple cancel-this-date flag, multi-coach.

**Blocked:** without athlete identity (#30, realistically #31), pre-check-in is honor-system name-picking. Do not plan before those ship. Size L.
