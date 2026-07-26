# 42 — Afiliados + Agenda: direction of record

> **Not executable. Nothing here is scheduled.** This is a decision record — the same class as
> [16 (design-pass program)](./16-design-pass-program.md) and [22 (capture chain)](./22-athlete-character-stats.md).
> Explored 2026-07-26; the user's call at the end of that session was that **code health precedes any
> new feature, including this one**. Written down so none of it is re-derived, and so the obvious-but-wrong
> shapes don't get re-proposed six weeks from now.
>
> Rows this produced: **#102** · **#103** · **#104** · **#105** · **#106** · **#107**, plus re-scopes of
> **#40**, **#56**, **#59**. See BACKLOG.md.

## Context

The ask was to take **Serviços** and **Agenda** toward a multi-affiliate shape: an "Afiliado" is a coach
or a box that has hired Cone; a Coach affiliate gets a roster and the services he provides; a Box affiliate
gets a roster, classes, coaches assigned to those classes, and membership plans (a number of classes an
athlete may attend). Agenda would gain filters and an admin view. Check-in would be planned alongside.

No data segmentation was intended yet — that was correctly identified as needing the RLS pass.

## What the app actually is today (measured, not assumed)

- **Serviços** is `locations[]`, one array in a single-row JSONB blob:
  `{ id, name, type:'box'|'personal', color, rate, rateUnit, currency, coachName, athleteIds[] }`,
  plus a `coach_profile` singleton (name, contact, phone, Pix key, city, `pixTestCap`).
- **There is no coach entity.** `allowed_emails` (a bare `email` primary key) is the *only* multi-identity
  surface in the schema. `locations[].coachName` is free text, written by `Servicos.jsx:74`, **read by nothing**.
- **An athlete is 7 fields** — `id, name, level, goal, notes, color, since`. No box, no coach, no plan, no
  quota, no credits, no contact. Membership is stored **inverted**, on `locations[].athleteIds`.
- **Agenda** is an `events` blob keyed by date: `{ date, time, type:'aula'|'personal', label, locationId,
  athleteIds[], sessionId?, status, durationMin, recurrenceGroup }`. One filter exists (status tri-state).
- **A "class" exists twice, disjointly** — see the table under decision 5.

## Decisions

### 1. No new affiliate entity — `locations[].type` already is the discriminator

`type:'box'` is a box; `type:'personal'` is a solo coach affiliate. Rename and extend that; do not create
an `affiliates` table with a type flag.

**Why the obvious shape was rejected.** "Afiliado = Coach or Box" collapses three things that behave
differently: the **tenant** (who pays for Cone — a billing concept), the **box** (a place, which already
exists), and the **coach** (a person who logs in, which does not exist at all). Worse, Coach↔Box is
**many-to-many** and the app's *current production data* proves it: one coach, two boxes (Eagles, Garra).
A type-flagged single table duplicates a coach the moment he works at a second box. Modelling coaches as
**staff linked to classes** gets the many-to-many for free.

### 2. No pricing on the affiliate record

**Why.** `locations[].rate` today means **what the coach charges that box** (R$40/hour at Eagles), and
`events.jsx:294-316` stamps **the coach's own Pix key** on the generated invoice. The money flows box → coach.
A Box affiliate with membership plans is the **opposite arrow** — box charging its athletes. One field name,
one Pix identity, two directions is how a wrong invoice gets generated silently.

So: the affiliate record carries identity/roster/structure only. The user's existing rates + Pix stay
exactly as they are, in their own **"Meu negócio"** pane of the same tab. Athlete-facing pricing, if it
ever exists, gets its own field and its own payee.

Four real bugs found in that money code while establishing this → **#104**.

### 3. Coach is a label, and must be labelled as one

`settings.value.coaches = [{ id, name, color?, contact? }]`. No login, no permissions, no scoping.

**Why the warning matters.** `locations[].coachName` was added in #80 as "groundwork" and is dead data.
A coach record that isn't an auth identity is that same field with more ceremony. Real multi-coach means
an `allowed_emails` row + a profile + per-coach policies — that is **#31**, and it is not cheap. Build the
label if it's useful (it is: showing who teaches a class), but say on screen that it's a label. → **#103**

### 4. Class/coach data lives on `settings`, never on `locations`

`locations` is **anon-locked** since `0006`/#81 (it held the Pix key and service rates). Public pages —
check-in on `schedule.html`, "who's teaching" on the schedule — must read the class schedule, so it cannot
live there. `settings` is anon-readable and already carries `boxWarnings` for exactly this reason (#53).

**#40 already specifies this** (`settings.classSchedule:[{id,dow,time,label}]`), reached independently
before this session. Extend that key with `boxId`/`coachId`; do not invent a parallel `turmas` key.

### 5. Attendance is the keystone — it is what everything else waits on

Two class systems exist and never meet:

| | `events` blob (Agenda) | `class_executions` (TV) |
|---|---|---|
| what it is | planned / billing record | live execution record |
| storage | single-row JSONB, keyed by date | real relational table, one row per class |
| attendance | `athleteIds[]` — manual checkboxes | `athlete_ids[]` + `anon_names[]` via QR check-in |
| completed? | `status`, a **manual toggle** | derived from `reset_at` |
| created by | the user, in advance, with a recurrence generator | the user, live, one tap on the TV controller |
| **link between them** | **none — no field on either side references the other** | |

Both independently generate a label like "Turma 07:00". **"How many classes did this athlete attend?" is
currently unanswerable**, which is why membership quotas (#107) are blocked on this and on nothing else.

**Two further findings, neither previously recorded anywhere:**
- **`tv_state` is a single row (`id=1`).** Exactly one class can be active app-wide, and check-in only
  exists while a TV is rendering its QR. Multi-box with two 07:00 classes is impossible today. The fix
  needs **no schema change** — redefine `tv_state.class_id` as *"the class the TV is displaying"* and
  derive `activeClass` from `reset_at IS NULL`.
- Check-in is reachable **by URL param only** (`schedule.html?checkin=<execId>`); the only things that
  generate that link are the two TV QR components.

→ **#102** (absorbs **#71**), then **#40**'s catalog half, then **#107**.

### 6. Agenda's problem is not filters

Filters were the ask; the defect is that `status` is self-reported while `class_executions` knows the truth.
Filters over that are polish on a fiction — so **#102 comes before #105**. An "admin view seeing everything"
is also a no-op while there is one tenant: Agenda already shows everything.

The filter work itself is a **deduplication**, not new code: `ReportModal.filteredEvents`
(`events.jsx:175-190`) already implements period/type/status/services/athletes. → **#105**

### 7. IDs stay as they are

`uid()` = `Date.now().toString(36) + Math.random().toString(36).slice(2)` (`public/lib/wod.js:1`) — a
time-prefixed base36 **string**, not a number, not a UUID. Keep it: collision risk is negligible at any
plausible scale, and the time prefix makes ids roughly sortable by creation.

**Dangling ids are a missing-foreign-key problem, not an ID-format problem.** `locations[].athleteIds`
can reference a deleted athlete because no database can enforce integrity *inside a JSONB array* — not
because the id is the wrong shape. That becomes enforceable only once tables normalize (**#82**), at which
point the same strings become `text` primary keys with **zero data migration**. Adopting UUIDs now would
rewrite every existing id and fix nothing.

## Sequencing

```
#102 attendance join  ──►  #40 turmas catalog  ──►  #107 plans / quotas
   (absorbs #71)            #103 coaches[]
                            #56  Serviços → Afiliados (+ C2 design pass)
                            #104 billing correctness
                                    │
                            #59  Agenda C5 design pass
                            #105 filters + views     #106 series editing
                                    │
                            #82 ──► #30/#31 ──► real tenancy + RLS
```

**Nothing before the last row enforces anything.** Sessions, athletes, results and events remain
anon-readable; a `?box=` link is a view filter, not access control (#80). Say so plainly whenever this
direction is discussed, so "multi-tenant" is never mistaken for "isolated".

## What is deliberately NOT decided here

- Whether a Box affiliate ever bills its own athletes through Cone (decision 2 keeps the door open without
  building it).
- Capacity, waitlists, no-shows, cancellation windows — all excluded from #40 v1 and still excluded.
- Any tab rename schedule. **#56** owns that when it runs.
