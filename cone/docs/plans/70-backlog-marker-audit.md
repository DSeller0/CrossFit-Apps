# 70 — #151 · Board/plan marker drift, made mechanical

*Planned 2026-08-05 alongside plans/69 and plans/71. **Not executed in that session** — its own
session. **Sonnet · XS.** Tier 4 rank 4. Independent of 69 and 71 — no gate either way.*

## Context

Marker drift between `BACKLOG.md`'s rows and `plans/NN-*.md`'s Done markers is now a **repeat
failure**, not an accident. It is the third occurrence and the **second review** to spend time
re-deriving it. `BACKLOG.md`'s header warns about it twice; [WORKFLOW.md](../WORKFLOW.md) line 50
records that it once cost a whole session; and WORKFLOW.md's ritual steps 4–5 exist precisely to
prevent it. Discipline has been tried three times and has failed three times — **that is the argument
for this row.** Fixing it by hand a fourth time is not the fix.

Measured by [reviews/2026-08-05-full-pass.md](../reviews/2026-08-05-full-pass.md), **four distinct
drift shapes** — all ten instances corrected inline that day:

1. **`ready-but-shipped`** — six rows still led with `🟢 [→ Ready · plans/NN]` for a plan that had
   already shipped: #119/58 and #124/59 (2 days stale), #98/50, #108/51, #24/49 (9 days), #26/35
   (**15 days**). Each was marked shipped *elsewhere* on the board, so a reader scanning for green
   picks saw **six false ones**.
2. **`bare-but-shipped`** — #134/#135/#136's icebox rows carried no marker at all though
   [plans/66](./66-scorefields-polish-2.md) had shipped them, while #137 immediately below them
   carried its ✅. They were missed as a group.
3. **`plan-missing-done-marker`** — [plans/61](./61-criador-text-roundtrip.md) had **no Done marker at
   all** though 61·A/B/C had all shipped. WORKFLOW.md's rule is literally *"no marker = actionable"*,
   so the plan directory itself was lying.
4. **`partial-marker`** — [plans/52](./52-result-fidelity-chain.md)'s marker read *"Step 1 (#115)
   Done"* while the whole #115 → #118 → #112 → #117 → #116 chain had completed 2026-07-30.

## Scope

**New:** `scripts/audit-backlog-markers.mjs`.
**Changed:** [WORKFLOW.md](../WORKFLOW.md) — add the run to the session ritual (steps 4–5).

## Approach

Copy the existing `audit-*.mjs` shape exactly (`audit-result-notes.mjs` is the smallest at 85 lines
and the closest model): a header comment naming the row and the run command, **read-only**, prints a
table to stdout, exits non-zero only on its own failure.

Unlike its four siblings it needs **no Supabase client and no `.env`** — it reads `docs/BACKLOG.md`
and `docs/plans/*.md` off disk with `node:fs`. That makes it the cheapest script in the folder and the
only one that runs offline.

**Cross-reference three sources per row:**

1. the row's **leading marker** in `BACKLOG.md` — `🟢 [→ Ready · plans/NN]`, `✅ **[shipped … ]**`, or
   bare;
2. the linked plan file's **`> ✅ Done:` marker** — present or absent, and which `#N`s its text names;
3. any **other** `shipped` / `CLOSED` / `✅` mention of the same `#N` elsewhere in `BACKLOG.md`.

**Report each mismatch by the shape name above**, so the output maps onto the four measured failures
rather than being a generic diff:

| Shape | Fires when |
|---|---|
| `ready-but-shipped` | row leads `🟢`/`→ Ready`, but its plan has a Done marker **or** the same `#N` is called shipped elsewhere |
| `bare-but-shipped` | row has no leading marker, but its plan has a Done marker |
| `plan-missing-done-marker` | a `plans/NN-*.md` has no `> ✅ Done:` line while every `#N` it names is called shipped on the board |
| `partial-marker` | a plan's Done marker names **fewer** `#N`s than the rows pointing at it do |

**Parsing notes** (this board is prose-heavy, so be permissive and prefer a false negative to noise):
- A row is a top-level `- ` bullet; `#N` tokens are `#\d+`. A single row can carry several (`#134 +
  #135 + #136`), and several rows can point at one plan (61·A/B/C).
- Plan links are `](./plans/NN-slug.md)` from the board and `](./NN-slug.md)` between plans.
- The board deliberately keeps **historical** rows with struck-through text and *(original row:)*
  blocks. Only the **leading** marker of a row counts; do not read markers out of its body.
- `plans/68` is the precedent for one plan owning five rows — the `partial-marker` check must handle
  a legitimate many-to-one, and only fire when the Done marker's own `#N` set is a **strict subset**.

⚠️ **Not a CI gate** — the row says so explicitly. It runs in the session ritual. Keep it advisory: a
clean table is the success case, and a false positive must never block a commit. That also means it
does **not** belong in `.github/workflows/` or in `package.json`'s test script.

## Acceptance

- `node scripts/audit-backlog-markers.mjs` runs from `cone/` with no arguments, no network and no env
  file, and prints a table.
- Against the current tree it reports **zero** drift — all ten instances were corrected inline
  2026-08-05, so a clean run is the expected baseline and anything else is a parser bug, not a find.
- All four shapes are individually demonstrable (see Verification).
- `WORKFLOW.md`'s ritual names the script at steps 4–5.

## Verification

1. **Baseline:** run it as-is → expect zero drift. Any hit here is a false positive to fix before
   shipping, since the board was hand-corrected on 2026-08-05.
2. **Prove it can still see** — the important half, because a script that reports nothing is
   indistinguishable from a script that checks nothing. In a **scratch copy** (`git stash` or a temp
   file, never a committed edit), reproduce each shape once and confirm the right one fires:
   - flip a shipped row's leading marker back to `🟢 → Ready` → `ready-but-shipped`;
   - strip a shipped row's leading `✅` → `bare-but-shipped`;
   - delete a plan's `> ✅ Done:` line → `plan-missing-done-marker`;
   - trim one `#N` out of a multi-row plan's Done marker → `partial-marker`.
3. Restore the scratch copy and re-run → back to zero.

`npm run lint` clean at `--max-warnings 0` (the script is `src/`-adjacent but `scripts/` is covered by
`eslint.config.js`); `npm run format:check`.

## Docs (part of Done)

`WORKFLOW.md` — add the run to the session ritual. `BACKLOG.md` — row → Done. This file gets its
`> ✅ Done: <commit> · <date>` marker, which the script itself will then be checking.

Model: **Sonnet** · Size: **XS**
