# 104 — #241 · ¶ Texto: a Duração beside a sub-minute work time, and the `/` display form

> ✅ Done: `0e250e3` · 2026-11-22 — see BACKLOG.md · closes #241. Reproduced first (19 of the new tests
> failed exactly as the review describes), then fixed: all 1586 tests, lint and `format:check` pass.
>
> **Must-haves: 5/5 driven** — (1)–(3) in the real SPA on the local stack, (4)–(5) as audits against prod.
> (1) **A blur doesn't eat the cap.** Built a HIIT block (8 rounds, Duração 10, A cada 1:00, Trabalho 0:40,
> one exercise) in Detalhado; its ¶ Texto read `8 rounds Cap 10' 40" on 20" off` — the exact shape the review
> flagged. Blurred without editing, then blurred again after appending a line (a blur that really goes through
> the parser): Detalhado kept 10 / 8 / 1:00 / 0:40 and gained the exercise, none named `rounds…`. After Salvar
> the `sessions` blob held `duration:'10'`, `rounds:'8'`, `interval:'01:00'`, `work:'00:40'`.
> (2) **The coach's own spelling.** Pasted `AMRAP 12' 40" on / 20" off` + two exercise lines into the session
> pane: the live preview read AMRAP · `40" on / 20" off` · CAP 12' with 2 exercises and no warning line; after
> Aplicar, Detalhado showed Duração 12, A cada 01:00, Trabalho 00:40, exactly 2 rows (none named `40"`), empty notes.
> (3) **An unedited blur is a no-op.** A Força block with 3 exercises: its block JSON was **byte-identical**
> (ids included) after ¶ Texto → focus → blur → Salvar — re-driven on the final code. **The check can fail:**
> with the old `BlockTextEditor` swapped back in (copy, no stash) the same steps re-minted all three ids.
> (4) **The prod round trip.** `audit-text-roundtrip.mjs`: 733/958 identical, 36 rewritten, **0 unstable**,
> before and after, so the counts match. Exactly one line differs, and it is explained: `projection-shift`
> 908 → 909, an Estações (2026-10-01 #1) whose **label** is `Hyrox WOD - 4' ON / 1' OFF`. It used to come back
> as label `Hyrox WOD – 4' ON – 1' OFF`; the pair now parses as structure, so it comes back as label
> `Hyrox WOD` with note `4' on 1' off` (the note an Estações keeps for its interval). A move, not a loss.
> (5) **The engine's shape re-parses.** `audit-suggest.mjs` prints `round trip: N mismatches` (both editor
> paths, in the `✔ checks` line, exit 1 on any): **0** on every prod scope (53 suggested blocks). Prod can't
> exercise it, so on a synthetic box (five Mondays from `testFixtures.js`'s `MONDAY()` with the Core written
> `3 rounds 9' 40" on 20" off`) the engine suggests that very Core and it reads back with 0 mismatches. Under
> the old parser the same run exits 1: `duration 9 → —`, `interval 01:00 → 10:00`, `work 00:40 → 09:40`, with
> 0 parse warnings — the review's numbers to the digit.
>
> **Beyond the plan, one thing.** `HEADER_SPLIT` also cuts a header line on a spaced ` / `, so the one-character
> `/` fix alone left `HIIT – 8 rounds 40" on / 20" off` broken (the Must-haves' own `AMRAP 12' … on / 20" off`
> works without it, via the whole-line probe). `parseHeaderLine` now folds the slash **inside a real
> `RE_ONOFF` match** first. That is what moved the Hyrox block above.
>
> **`/code-review high` found four nits, none a correctness blocker.** Fixed: (a) the guard also keys on
> `block.type` — the type can change from the block bar while ¶ Texto is open, and `knownType` steers the
> parse; (b) the slash fold rides on `RE_ONOFF` instead of a looser regex that would have eaten the slash in
> `Cardio – 3 on / 2 rounds` (pinned by a test); (c) the CLAUDE.md test count. **Left, deliberately:** a spaced
> `1' 30" on 30" off` now reads as a 1' duration plus `30" on`, with no warning — it is step 3's pinned
> trade-off (prod holds none; the serializer never writes it), and #247 owns any change. The type-change path
> was not driven live; it is two lines and not covered by a unit test (`BlockTextEditor` has none, the suite is
> node-only).

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
