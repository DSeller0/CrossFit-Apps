# 43 — #32-A · Lint floor + CI gate

> ✅ Done: `bc3dcea` · 2026-07-26 — see BACKLOG.md

> Planned 2026-07-26 from the housekeeping pass. Run order: **43 (this)** →
> [44 Resultados decomposition](./44-resultados-decomposition.md) →
> [45 effect-write sweep](./45-effect-write-sweep.md).
> **This one is first on purpose:** it sets the `react-refresh` policy that plans/44 needs *before* 44
> splits another file, and it installs the gate that stops the other two from regressing anything.

## Context

Lint debt is now **growing faster than it is paid down**. Measured 2026-07-26 with
`npx eslint . -f json` (exact rule ids, not log-parsed):

| | Morning of 2026-07-26 | After plans/39–41 | Δ |
|---|---|---|---|
| Total problems | 222 (200 err, 22 warn) | **235 (213 err, 22 warn)** | **+13** |
| Generated bundles | 57 | 57 | — |
| **Real source** | 165 | **178** | **+13** |
| `react-refresh/only-export-components` | 6 | **20** | **+14** |

The `react-refresh` jump is not incidental — it is a **direct, predictable consequence of decomposition**.
Splitting one file into modules that export both components *and* constants trips that rule every time,
and `gallery/groups/*` (plans/41) is most of the +14. plans/44 is about to split another file, so the
policy has to be decided here or the number climbs again.

There is currently **no lint gate**: `.github/workflows/deploy.yml:27-29` runs `npm test` only.

## The exact floor (2026-07-26)

**235 total − 57 generated = 178 source**, in three buckets:

**Bucket 1 — mechanical, zero behavior change (74)**
| Rule | Count |
|---|---|
| `no-unused-vars` | 33 |
| `no-empty` | 26 |
| `no-useless-escape` | 10 |
| unused `eslint-disable` directives | 3 |
| `no-useless-assignment` | 2 |

The 3 unused directives are `Index.jsx:106`, `Timer.jsx:111`, `Timer.jsx:382` — all suppressing
`react-hooks/exhaustive-deps` problems that no longer report. Delete the comments.

**Bucket 2 — one policy decision (20)** · `react-refresh/only-export-components`

**Bucket 3 — out of scope, → #108 (84)** · `set-state-in-effect` 22 · `refs` 20 · `exhaustive-deps` 17 ·
`immutability` 13 · `purity` 8 · `static-components` 4. **These change behavior.** `Schedule.jsx` (26)
and `Timer.jsx` (25) are public pages used live at the gym mid-class.

Worst files overall: `Schedule.jsx` 26 · `Timer.jsx` 25 · `storage.js` 11 · `Publicador.jsx` 9 ·
`pix.js` 8 · `Resultados.jsx` / `TvController.jsx` / `slides.jsx` 7 each.

## Acceptance

- `npx eslint . -f json` reports **0 problems in the two `.design-build*` bundles** (they are ignored).
- Bucket 1 is **0**.
- The `react-refresh` policy is decided, applied, and **written into CLAUDE.md** — not just fixed.
- `npm run lint` runs in CI and **fails the build** above the agreed floor.
- `npm test` still 530/530. No behavior change anywhere.

## Files

| File | Change |
|---|---|
| `eslint.config.js:8` | `globalIgnores(['dist'])` → add `.design-build`, `.design-build-mockup` |
| `.github/workflows/deploy.yml` | new "Run lint" step after "Run tests" (`:27-29`) |
| ~25 source files | bucket-1 removals only |
| `CLAUDE.md` | record the `react-refresh` policy under the design/decisions section |
| `docs/BACKLOG.md` | close #32, update #108 with the residual count |

## Approach

1. **`globalIgnores` first.** One line, −57 problems. These are the SSR entry bundles `design:cards`
   emits; they are gitignored and only exist locally after a `design:cards` run, so CI sees 178 either
   way — but the local number stops drifting for reasons that aren't code.
2. **Re-run the JSON census** and commit the exact rule×file table into the #32 row. This defines the
   floor and must be the number the gate is set at.
3. **Bucket 1 sweep.** Purely mechanical. ⚠️ `no-unused-vars` overlaps **#73** (dead-code sweep) — let the
   linter produce that row's candidate list rather than grepping for it separately, and note in #73 what
   this consumed. ⚠️ `no-empty` is usually an empty `catch {}`; the fix is a comment explaining the
   intentional swallow, **not** deleting the try/catch.
4. **Decide `react-refresh/only-export-components` (20).** Two defensible options — pick one, record why:
   - **(a) Scope the rule off dev-only files.** `src/public/gallery/**` is never built or deployed
     (it is not in `vite.public.config.js`'s input), so Fast Refresh correctness there is worth nothing.
     Cheapest, and honest about what the rule protects.
   - **(b) Split the exports** — components in one module, constants/`GROUPS` in another.
     ⚠️ `scripts/build-design-cards.mjs:200/226` imports `GROUPS` and derives card filenames from
     `g.group.toLowerCase()`; any move must keep `npm run design:cards` producing **no on-disk diff**,
     the same acceptance plans/41 used.

   Whichever wins, **write it in CLAUDE.md** — the next decomposition will re-create these otherwise,
   which is exactly what happened between plans/41 and now.
5. **Gate it.** Add to `deploy.yml` after the tests step:
   ```yaml
   - name: Run lint
     run: npm run lint
     working-directory: cone
   ```
   If bucket 3 is still outstanding (it will be — that's #108), `npm run lint` still exits non-zero, so
   the gate needs a floor. Prefer **`--max-warnings` plus rule-level `warn` downgrades for bucket 3
   only**, with a comment naming #108, over an ignore file — a downgraded rule still prints and still
   ratchets, an ignored one goes silent.

## Explicit non-goals

- **Bucket 3 / #108.** Do not "fix" a `set-state-in-effect` or a `refs` finding here. Each needs
  classifying as real-bug / benign / suppress-with-reason first, and the two worst files are live at the gym.
- **Prettier (#24).** Still needs a policy decision from the user (big-bang reformat vs format-on-touch)
  before it can be planned at all. Not this session.
- Any file split, any behavior change.

## Verification

- `npx eslint . -f json` before/after, and paste both totals into the commit message.
- `npm test` → 530/530.
- `npm run design:cards` → **no on-disk diff** (proves option (b), if chosen, didn't disturb the cards).
- Open `gallery.html` on `npm run dev:public` — the gallery is **never built by CI**, so no gate catches a
  broken import there (#51→#52 shipped a hard 500 exactly this way).
- Push a throwaway branch with a deliberate unused variable and confirm CI **fails**. A gate that has
  never been seen to fail is not known to work.

Model: Sonnet · Size: M
