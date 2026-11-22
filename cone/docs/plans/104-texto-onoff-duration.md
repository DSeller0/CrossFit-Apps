# 104 — #241 · ¶ Texto: a Duração beside a sub-minute work time, and the `/` display form

*Planned 2026-11-22 (Opus) from the [2026-11-22 code review](../reviews/2026-11-22-code-review.md)'s
findings #26 (its one HIGH) and #27. Execution: **Sonnet**. There is no approval gate: it changes no
layout and no data.*

## Context

**#26 (HIGH).** Any Texto round trip silently corrupts a block that has a Duração **and** a
sub-minute work time. Usually there is no warning at all.
- **The trigger.** `serializeBlock` (`textFormat.js:1506-1514`) writes the duration straight
  before the on/off pair.
- **The cause.** `ONOFF_TOK` (`:240`) reuses `DUR_MIN` (`:230`). `DUR_MIN`'s spaced-seconds branch
  (`2' 30"` = 2'30") reads the cap and the work time as **one** token. `parseStructure` probes
  on/off first (`:302`), so the cap is eaten before `RE_CAP` ever sees it.

Measured by the review on both editor paths:
- HIIT `{8 rounds, Cap 10, 01:00/00:40}` → the whole line becomes an exercise named
  `rounds Cap 10' 40" on 20" off`, with 0 warnings.
- AMRAP `12'` + 40/20 → interval 13:00 and work 12:40, and the duration is gone.
- Força and Cardio break the same way. MetCon leaves a stray `Cap` note.

¶ Texto commits **on blur** (`BlockTextEditor.jsx:37,78`), so clicking into a block's text and out
again is enough to corrupt it. Salvar then persists the damage.

**The engine emits the shape too.** `applyParams` keeps a cap of at least interval × rounds, so a
suggested Core block `{3 rounds, 9', 1:00/0:40}` serializes to `3 rounds 9' 40" on 20" off` and
re-parses as `10:00/9:40`, with 0 warnings. `audit-suggest.mjs`'s gate counts warnings only, so it
cannot see this.

**#27 (MEDIUM).** The display form `40" on / 20" off` (`intervalStr`, `wod.js:156-161`) doesn't
parse, because `RE_ONOFF`'s separator class `[-–—:]` has no `/`. `wod.js:120-122` claims the
opposite ("a block re-parses to what it shows"). Text copied from Grade, schedule.html or a block
summary becomes a note or an exercise named `40"`.

**Reach, measured on prod on 2026-11-22 (read-only).** None of the 958 blocks carries a Duração
together with an interval yet. But 37 blocks already have an `interval`, all written since 11/11,
and 21 write on/off in their text. **No block anywhere writes the spaced `1' 30" on` form**, so the
flush-only token below costs nothing on prod today.

## Acceptance

1. A block with any Duração and any on/off pair survives **both** editor paths byte-for-byte in its
   structure fields: `duration`, `rounds`, `interval` and `work` come back exactly, no exercise row
   appears, and nothing is lost to a warning.
   - **The ¶ block path:** `serializeBlock(b, { header: false })` → `parseBlock(text, { knownType })`
     → `applyParsedBlock`.
   - **The session pane path:** `serializeSession` → `parseSession`.
2. `40" on / 20" off` parses as work 40 and rest 20 (#27).
3. A blur in ¶ Texto with **no edit** leaves the block unchanged, exercise ids included.
4. `audit-text-roundtrip.mjs` shows 0 unstable, before and after.
5. `audit-suggest.mjs` counts structure round-trip mismatches beside its parse warnings, and that
   count is 0.

## Must-haves

- **A blur doesn't eat the cap.** [Criador › Detalhado → ¶ Texto → Detalhado, local stack]
  1. Build a HIIT block with `8 rounds`, Duração `10`, A cada `1:00` and Trabalho `0:40`.
  2. Click into its ¶ Texto, change nothing, and click out.
  3. Detalhado still shows 8 rounds, Duração 10, A cada 1:00 and Trabalho 0:40.
  4. After Salvar, the saved session (DevTools › the `sessions` blob) holds `duration:'10'`,
     `interval:'01:00'` and `work:'00:40'`, with no exercise named `rounds…`.
- **The coach's own spelling pastes cleanly.** [Criador › ¶ Texto paste, local stack] Paste
  `AMRAP 12' 40" on / 20" off` followed by two exercise lines. The result:
  - Duração is 12, A cada is 1:00 and Trabalho is 0:40;
  - exactly 2 exercise rows, and **no** row named `40"`;
  - no `unparsed-line` warning.
- **An unedited blur is a no-op.** [Criador › ¶ Texto, local stack] On a Força block with 3
  exercises, note the exercise `id`s (React DevTools, or the saved blob after a first Salvar). Blur
  the ¶ Texto without typing, then Salvar. The ids and every field are identical.
- **The prod round trip stays clean.** [`node scripts/audit-text-roundtrip.mjs`]
  - 0 unstable both before and after the change.
  - Its identical/rewritten counts match the run before, or every changed block is listed and
    explained in the Done marker.
- **The engine's shape re-parses.** [`node scripts/audit-suggest.mjs`, prod scopes + the synthetic
  box]
  - The new round-trip count is 0.
  - A fixture Core suggestion `{3 rounds, 9', 1:00/0:40}` reads back `duration 9`, `interval 01:00`,
    `work 00:40`.

## Files

- `src/components/tabs/criador/textFormat.js`:
  - a flush-only duration token for on/off;
  - `/` in `RE_ONOFF`'s separator class;
  - the comment block at `:222-239`.
- `src/components/tabs/criador/BlockTextEditor.jsx`: commit only when the text changed.
- `src/components/tabs/criador/textFormat.test.js`: the `duration` axis on the `:399` matrix, both
  paths, the `/` form, and the pinned trade-off.
- `scripts/audit-suggest.mjs`: a structure round-trip count beside `parse: N warnings` (`:187`).
- `src/public/lib/wod.js`: the claim at `:120-122` becomes true. Keep it, and add the test that
  proves it (an `intervalStr` output re-parses).
- `docs/arch/criador.md`: the grammar section. Note why on/off's token is flush-only.

## Approach

1. **Prove it first.** Add the failing tests before the fix:
   - the `:399` matrix with a `duration` axis (`''`, `'8'`, `'10'`, `'12'`, and the decimal
     `'2.3'`), crossed with every on/off pair and every interval it already lists, on **both** paths;
   - a CAP type (HIIT/MetCon/For Time, which serialize as `Cap N'`) and a non-cap type (AMRAP/Força/
     Cardio, which serialize as `N'`);
   - `40" on / 20" off`, with and without spaces around the `/`.

   Run them and see them fail the way the review describes.
2. **A flush-only token for on/off.** Define, say, `DUR_FLUSH`: `DUR_MIN` without the spaced-seconds
   branch.
   - It still reads `1'30"`, `1'30`, `1:30`, `3''30"`, `40"` and bare `40`.
   - It no longer joins `10'` and `40"` across a space.

   `ONOFF_TOK` uses it. `RE_EVERY` keeps `DUR_MIN`: `A cada 2' 30"` is anchored by "a cada" and stays
   valid.

   Comment it for **#247** (the interval grammar batch), which will extend the same tokens:
   - the token is flush-only *because* the serializer writes the duration immediately before the pair;
   - a spaced `1' 30" on` now reads as a 1' duration plus `30" on`;
   - prod has 0 occurrences of that spelling (measured 2026-11-22).
3. **Pin the trade-off.** Add a test asserting that `1' 30" on 30" off` parses as `duration 1`,
   work 30, rest 30, so the behaviour is a decision and not an accident.
4. **`/` in the separator class:** `[-–—:/]`. This is #27's one-character fix.
5. **Don't change the serializer order.** With the flush-only token the order no longer matters to
   the parser. Moving the interval first would rewrite every interval block's text, and
   `audit-text-roundtrip` would report it as churn.
6. **Commit on blur only when the text changed** (`BlockTextEditor.jsx`).
   - Keep the last committed text in a local `useRef`, seeded with the initial serialization.
   - On blur, return early when `text === lastRef.current`; otherwise update it and call `onApply`.
   - This is defence in depth. It also stops the new-ids churn the header comment (`:21-23`) is
     wary of.
   - It is a ref inside one component, never passed as a prop, so code-policy's `*Ref` naming rule
     doesn't arise. Write it in the handler, not during render.
7. **The engine.** In `audit-suggest.mjs`, for each suggested block:
   - serialize it with the same path `saveS` uses, then parse it back;
   - compare `duration`/`rounds`/`interval`/`work`;
   - print `round trip: N mismatches` beside the parse line, and include it in the gate.

   If the synthetic box still shows a mismatch after step 2, the token isn't fixed: stop. Don't
   loosen the check.
8. **Run `node scripts/audit-text-roundtrip.mjs`** before step 2 and after step 6. Record both runs.

## Verification

- `npm test` · `npm run lint` · `npm run format:check`. ⚠️ Run vitest from `C:\…`, not `c:\…`.
- The two audits above, before and after.
- Drive the Must-haves on the local stack: `supabase start`, then `npm run dev`. Reload before you
  trust a pixel (`sw.js`).
- `/code-review` before pushing. It is S, but the review found a HIGH here, so give it a second
  look.

Model: Sonnet · Size: S
