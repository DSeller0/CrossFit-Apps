# 65 — #137 · `--border` ≢ `--divider`, and `--red` fails contrast on the dark themes

*Planned 2026-08-04 alongside plans/63/64/66. **Not executed in that session** — its own session.
**Opus**: this is a token decision across four palettes, not a swap.*

## Context

Two measured facts about tokens the logging and Criador surfaces depend on.

**(a) `--border` and `--divider` are byte-identical in all four themes** — re-verified 2026-08-04 at
`themes.css:27` (`:root` fallback), `:50` (totk-dark), `:62` (totk-light `#d4cab8`), `:74`
(spirit-blossom `#221638`), `:86` (sb-light `#e2d4f0`). So CLAUDE.md's *"`var(--border)` = stronger
(card outlines); `var(--divider)` = subtle (internal separators)"* **is not true in the code.** Two
tokens exist, one value is used, and every call site that "chose" between them chose nothing.

This is the **direct cause of #134**: `.notesToggle` is a transparent, full-width, left-aligned
rectangle at `1px solid var(--divider)` sitting in a form where every `<input>` is the same rectangle
at `1px solid var(--border)` — measured at 495px wide with an identical computed border colour. The
toggle is indistinguishable from a text field because the design system says they differ and the
code says they don't.

**(b) `--red` as text on `--bg` measures 3.67:1 (totk-dark) and 3.69:1 (spirit-blossom)** — below
4.5:1 — on `SessionTextPane`'s `.warnRow`. That is *the only element telling the coach something
needs attention*, and it is the **least** legible text in a pane whose textarea measures 14.8–16.7:1
and whose `.infoRow` measures 8.8–10.8:1.

## Decision taken (user, 2026-08-04): differentiate the two values

So this is a real token change, not a documentation correction. Give `--border` genuine weight
against `--divider` in **each** of the four themes.

- ⚠️ **The token count stays 29.** Both tokens already exist in every theme; nothing is added,
  nothing is removed. CLAUDE.md tracks that count deliberately (#43 adds four more themes and is
  where it becomes load-bearing) — state in the commit that it is unchanged.
- Two of the four palettes are **light** (totk-light, sb-light), where "stronger" means *darker*, not
  *lighter*. Derive each pair from its own palette rather than applying one delta globally.
- `themes.css` lives at the **repo root**, not in `cone/` — and every page loads it, so this change
  reaches the SPA, all 9 public pages, and the gallery at once.

**Also settle `--red`** in the same pass, since it is the same file and the same question: fix per
theme (raise the two failing values) or introduce a separate text-weight usage. ⚠️ **#14's contrast
table covers `--dim`/`--muted`/`--gold`/`--teal` and never measured `--red`** — add it there so the
next accessibility pass inherits the number instead of re-deriving it.

⚠️ **Fold in the one cell plans/57 deliberately left open.** `.rpeBtn.on` measures **3.80:1** in
spirit-blossom-light — the `--accent-text`-on-`--teal` pressed pairing. plans/57 confirmed the
measurement, recorded it in `ScoreFields.module.css`, and explicitly deferred it **here**, because
`--accent`/`--accent-text` is a wider pairing than one component: `Button`'s primary variant shares
it. Note that a `--gold-text` token would **not** fix this cell — it is the `--teal` pairing that
fails, and gold's own worst cell passes at 4.64:1.

## Scope

`themes.css` (repo root) is the only required edit. Everything else is verification — but the
verification *is* the work, because both tokens are used across the whole surface area.

Enumerate consumers before changing anything (`grep -rn "var(--border)\|var(--divider)" src/ ../*.css`)
and group them: card outlines, internal separators, form controls, and the `ScoreFields` toggles that
#134 is about. A rule using the "wrong" one of the pair is invisible today and becomes visible the
moment they differ — that discovery is expected, and each instance is a judgement call, not
automatically a bug.

## Acceptance

- `--border` and `--divider` hold distinct values in all four themes; the documented "stronger vs
  subtle" rule is true in code.
- Token count still **29 per theme** — verified programmatically, as CLAUDE.md's claim is.
- `--red`'s contrast on `--bg` resolved and recorded; `#14`'s table updated.
- CLAUDE.md's design-system section reflects the real values.
- `npm test` · `npm run lint` · `npm run build:all` · `npm run format`.

## Verification

**All four themes × both widths.** This is the pass where the component gallery earns its keep — it
renders the real components in every state and has the theme switcher and the width toggle built in.
Walk: `Card` outlines, `Input` vs `.notesToggle` (the #134 pair — they must now read as different
things), `RankList` row separators, the Criador block bars, `SessionTextPane`'s `.warnRow`.

Then confirm on two real pages, since the gallery renders components and not layouts: `results.html`
(the logging form) and the Criador (`npm run dev`, block list + text pane).

⚠️ **Finish with `npm run design:cards`.** The cards inline `themes.css` at generation time, so a
token change makes **all nine** stale — WORKFLOW.md's "build artifacts are part of Done", and the
precedent is plans/40, which dropped `--lb-font` and left every card carrying the deleted token.
`tokens/palette.html` is generated from `themes.css` and will pick up the new values automatically.
Ignore pure date-drift diffs in the `WeekImportModal`/`WeekGrid`/`HeroCard` fixtures (that is #114,
still open) — revert those, same precedent as #24 and plans/60.

## Ritual

BACKLOG: Done entry; close #137; note on **#134**'s row that its blocker is answered and with what
value. CLAUDE.md design-system section corrected. Done marker on this plan. Commit + push.
