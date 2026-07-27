# 47 — #111 · Load-path write-back (completes #109's bug class)

> ✅ Done: `a3a0a1d` — 2026-07-27. Not picked from the ranked list — fired live: a session
> created 2026-07-25/26 was visible on two devices, then gone from prod Monday morning. Diagnosed to
> `SyncContext.jsx:30`'s mount-firing `saveLS(sessions)` POSTing a stale local snapshot over the
> server before the pull could correct it. Fixed exactly as scoped below (cache-only writers +
> mount/pull-suppression guards, extended to `handleSync` too). Live-verified against the seeded
> local stack: 0 POSTs on cold load (was ≥9), `updated_at` unchanged across reloads, exactly 1 POST
> on a genuine edit, and a direct repro (poisoned localStorage missing the current day) confirmed
> the fix stops the write rather than just reducing its frequency. See BACKLOG.md Done for the full
> writeup.

> Planned 2026-07-26 from the housekeeping ranking pass. Run order:
> [46 session-id identity](./46-session-id-identity.md) → **47 (this)** →
> [48 dead-weight sweep](./48-dead-weight-sweep.md).
> **Third instance of the same class.** #76 fixed it for `results_v2`; [plans/45](./45-effect-write-sweep.md)
> (#109) fixed it for `Servicos.jsx` + `initRegistry`. This is the largest one and the one that was
> *hiding* the others — the `locations`/`coach_profile` POSTs that kept appearing in plans/45's network
> trace after that fix landed were coming from here, not from the tab.

## Context

CLAUDE.md now carries the rule this violates: **a load/read path never writes.** `SyncContext.jsx:21-27`
calls `syncFromSupabase()` once per authenticated SPA mount; `storage.js:148-183` pulls every blob and
then calls each table's *normal* `save*` on what it just pulled — and every `save*` also calls the
matching `dbSave*`, stamping a fresh `updated_at`.

**Measured live (Playwright network log, seeded local stack, one page load, no tab opened): 13 POSTs.**

| Source | Writes |
|---|---|
| `SyncContext.jsx:30-31` effects firing **on mount** (state seeded from `useState(loadLS)`) | `sessions`, `events` |
| `syncFromSupabase` writing back what it just read (`storage.js:159-176`) | `sessions`, `athletes`, `events`, `locations`, `coach_profile`, `settings`, `exercise_registry`, `goals_data`, `templates` — **9** *(10 on prod; `lb_colors` was skipped only because the local seed left it empty)* |
| The same two effects **re-firing** after the pull's `setSessions`/`setEvents` | `sessions`, `events` |

So `sessions` and `events` are each written **three times per page load**. `results_v2` is the only table
already exempt — `cacheResultsLS` (#76). That exemption is the template for this whole plan.

The cost isn't just amplification: #76 established that a read-that-writes **destroys `updated_at` as a
provenance signal**, which is why migration `0007` had to add a real `created_at` to recover it. Every
table above currently has the same worthless `updated_at`.

## Approach

### 1. Cache-only writers for the pull (`storage.js`)
`cacheResultsLS` already shows the shape: split each `save*` into a localStorage-only half and a
`save* = cache* + dbSave*` composition, then have `syncFromSupabase` call the **cache-only** half.
Prefer a small generic (`cacheLS(key, data)`) over ten near-identical one-liners.

### 2. Stop the `SyncContext` effects from writing on mount and on pull (the delicate half)
`SyncContext.jsx:30-31`:
```js
useEffect(() => { saveLS(sessions); },   [sessions]);
useEffect(() => { saveEvents(events); }, [events]);
```
⚠️ **These cannot be moved to mutators the way plans/45 moved `Servicos.jsx`'s.** There, the mutators were
local to the tab. Here `setSessions` comes out of `useSync()` and is called from Criador and others — this
effect *is* the whole app's session persistence. Two guards are needed instead:
- **Skip the mount run** (the `useRef` first-run flag, same as plans/45's `CoachProfileForm`).
- **Suppress the write triggered by the pull's own `setSessions`/`setEvents`.** Set a ref immediately
  before those setters in the `.then()` at `:23-26`, and have the effect consume-and-clear it. Without
  this, fixing only `storage.js` still leaves 2 of the 13 writes.

A genuine user edit must still persist exactly as before — that is the acceptance test, not an aside.

### 3. Conflict detection — verify, don't assume
`saveLS` calls `markSessionsSaved()`, which sets `_sessionsTs` to **now + 6s**. `storage.js:178-180`'s
comment explicitly depends on ordering: *"Record the Supabase timestamp AFTER saveLS (which sets a
provisional value)."* Removing the pull's `saveLS` removes that provisional write.

This looks like an **improvement** — `_sessionsTs` then comes from the real remote `sessionsTs` (`:180`)
rather than a local guess — but the 30s conflict poller (`SyncContext.jsx:34-47`) compares against it, so
a false "conflict" banner is the failure mode. **Re-read that comment and re-verify the poller before
declaring done**; update the comment to match whatever the new ordering actually is.

## Files

| File | Change |
|---|---|
| `src/utils/storage.js` | cache-only writers; `syncFromSupabase` uses them; fix the `:178-180` comment |
| `src/context/SyncContext.jsx` | mount guard + pull-suppression ref on both effects |
| `src/utils/storage.test.js` | extend — it already exists **for exactly this bug** (#76) |
| `CLAUDE.md` | note this third instance under the existing rule |

## Tests

`storage.test.js` was written for #76 and already mocks every `dbSave*` — extend it rather than starting over.

- `syncFromSupabase` on a full payload → **zero** `dbSave*` calls of any kind, while every
  `localStorage` key is still populated (the pull must still prime the cache).
- Each table individually: pulled value lands in localStorage, no `dbSave*`.
- A real save (`saveLS`, `saveSettings`, …) still calls its `dbSave*` — the fix must not disable writing.
- Malformed/`null` payloads still skip cleanly (the existing type guards at `:159-176`).

## Verification

- `npm test` → 551 + new. `npm run lint` → still **84 (0 err)**; CI fails at 85.
- **Live, the measurement that defines done** — `supabase start` → `seed-dev.mjs` → `npm run dev`, open
  DevTools Network filtered to `rest/v1`, load the SPA logged in:
  - **Expect 0 POSTs on a cold page load.** Today it is 13.
  - Note `updated_at` on `sessions` + `settings` in Studio (`127.0.0.1:54333`) before and after a load →
    **unchanged**.
  - Then **edit a session in Criador** → exactly one `sessions` POST, `updated_at` moves, and the change
    survives a reload. Same for an Agenda event.
  - Leave the tab open >30s → **no false conflict banner** from the poller.
- ⚠️ Service-worker poisoning first if anything looks stale (CLAUDE.md).

## Out of scope

The remaining `save*`-on-every-`setState` couplings in individual tabs — plans/45 swept the two known
live ones. Not dropping `lb_colors`/v1 `results` from the pull; that is [plans/48](./48-dead-weight-sweep.md)
(#60), and doing it here would blur a behavior fix with a deletion.

Model: Sonnet · Size: M
