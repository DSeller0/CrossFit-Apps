# 36 — #92 · Criador text-entry mode (parse the coach's own week format)

> Second of three sessions in the Criador overhaul (planning session 2026-07-21).
> Run order: [35 decomposition](./35-criador-decomposition.md) → **36 (this)** →
> [37 design C4](./37-design-c4-criador.md). **Depends on 35** — this builds inside
> `src/components/tabs/criador/`.

## Context

The Criador was built to *replace* the coach's free-text weekly training file. It
didn't. What actually happens (coach feedback, 2026-07-21):

1. He writes the **whole week** as free text in a phone notepad — the real artefact is
   committed at `cone/Coach training week example.txt` — and then **re-types it into
   the app**. The app costs him time instead of saving it.
2. There is **no way to compare days**. To adjust Wednesday he needs Monday and
   Tuesday on screen; on desktop that means two windows, on mobile it is impossible.

The fix is not "make the form faster". It is to accept the format he already writes,
parse it into the app's real block model **with code — no LLM**, and give the week a
text projection so days can be read side by side.

This is the feature; [37](./37-design-c4-criador.md) is the design pass around it.

## Acceptance

- Pasting `cone/Coach training week example.txt` into **Importar semana** creates
  **5 sessions** (Seg–Sex) with the right block types, exercises, loads and `Meta:`
  values, and **zero dropped lines**.
- A block or a whole session can be flipped between **Detalhado** and **Texto** in
  both directions with no semantic loss.
- Every unparseable line is preserved verbatim in `block.notes` and surfaced in the
  preview — never silently dropped, never guessed at.
- `textFormat.test.js` covers every grammar rule below plus a round-trip property
  test over a fixture corpus.
- The week toolbar has a read-only **week-as-text** view that shows the visible
  week's sessions serialized side by side.
- Nothing downstream changes: TV, `schedule.html`, `results.html`, Publicador all
  read the same block objects they read today.

## The grammar (v1)

Derived from the real coach file. Design rule: **stay as close to what the coach
already writes as a deterministic parser allows**; where a rule must be tightened,
tighten it in a way that still reads naturally to him.

Three nesting levels, one parser:

```
WEEK          SESSION                    BLOCK
SEGUNDA-FEIRA                            (header line omitted —
              Warm Up         ← header    type already chosen)
              3 rounds        ← structure  3 rounds
              100m Run        ← exercise   100m Run
              10 Shoulder Taps            10 Shoulder Taps
                              ← blank line = block break
              WOD – TC 14'
              5 Rounds For Time
              8 Power Clean 60/45kg – 50/35kg
              Meta: 11-12'    ← goal
TERÇA-FEIRA
              ...
```

### Day header (week level only)

A weekday name, optional parenthetical → session name.
`QUINTA-FEIRA (HYROX)` → Thursday, session named "HYROX".
Accept accented/unaccented and abbreviated forms — reuse `DAY_PT`/`DAY_PT_TITLE`
from `src/public/lib/week.js` plus `normExName`-style folding from
`src/public/lib/registry.js` for the comparison.

### Block header (session level, first line of a group)

`<type> [– <label>] [– <structure>]`, separators `–  —  -  /  :`.

Type resolved against `TYPE_CONFIG`'s keys (now in `criador/blockModel.js`) plus an
alias table: `Warm Up`/`Warmup` → Aquecimento, `Strength`/`Forca` → Força,
`Complex` → LPO, `Emom` → EMOM, and so on. A bare `WOD` resolves from its
**structure line** (`5 Rounds For Time` → For Time, `AMRAP 15'` → AMRAP,
`Emom 12'` → EMOM).

An unresolved header (`Quem já faz tc 15'`) becomes the block **label** with the type
left flagged — the preview renders that type chip as a **button that opens the
existing type picker** (`criador/TypePicker.jsx`). One tap to fix, nothing guessed.

### Structure line (optional, the line right after the header, when it has no exercise shape)

| Written | Parsed |
|---|---|
| `3 rounds` · `5 sets` · `2 voltas` | `rounds` |
| `5 Rounds For Time` | `rounds` + type For Time |
| `AMRAP 15'` · `Emom 12'` | type + `duration` |
| `TC 14'` · `Cap 15'` · `(Cap 15')` | `duration` (time cap) |
| `21-15-9` | `ladderMode: true` + per-exercise reps |
| `3 sets cada letra` | `rounds` + lettered slots expected |
| `A cada 3'` · `A cada 1'20" 5 sets` | EMOM-ish: interval → `duration`, **line kept verbatim in `notes`** |

> **v1 limitation, recorded deliberately:** the block model has no interval field, so
> `A cada 1'20"` cannot round-trip exactly. It parses to the nearest EMOM shape and
> the original line survives in `notes`. Do not invent a schema field here — that is
> a product decision, not a parser decision.

### Exercise line — `[A–Z]? [qty] name [load]`

1. **Slot letter.** A leading single letter + separator (`A `, `B)`, `C -`) is
   stripped; order is preserved and the serializer re-emits letters for
   EMOM/lettered blocks.
2. **Leading quantity:**
   - `100m` / `2km` / `20cal` / `20 cal` → `dist` + `distUnit` (`m`|`cal`; km ×1000)
   - `20"` / `45'` → a hold; kept literal in `reps`
   - `5x5` → `sets` × `reps`
   - `21-15-9` → ladder reps (kept literal)
   - plain `10` → `reps`
   - none → reps empty
3. **Trailing load, scanned right-to-left:**
   - `60/45kg` → `intensity {mode:'gender'}` RX pair (M 60 / F 45)
   - `60/45kg – 50/35kg` → RX + Inter · a third pair → SC
   - `42,5/30kg` decimal comma accepted · unit case-insensitive (`KG`, `kg`, `lb`)
   - `75%` → `{mode:'pct', pct:75}`
4. **Remainder = `name`, verbatim.** Run it through `resolveExercise`
   (`src/public/lib/registry.js`) **for validation only** — per that module's
   match-only rule the coach's text is never rewritten. The preview marks
   unrecognized names so he knows demo videos / PR category tagging won't attach.

### Complex

`+` makes a complex **only when each side carries its own quantity**:

- `1 Hang Squat Snatch + 1 Squat Snatch` → one `isComplex` exercise, two movements.
- `5 Inchworm + Push Up` → **one ordinary exercise** named "Inchworm + Push Up".

One decidable rule; both real cases from the coach's file land correctly. This is the
serializer's canonical output form.

**Two-line assist:** a bare load list following the movement lines
(`70%75%80%82%85%`, the Friday LPO complex) becomes progression steps. Flagged in the
preview as "Complexo detectado" so it can be undone — this is the highest-ambiguity
rule in the grammar and must never apply silently.

### Name-then-prescription

```
Back Squat
5x5 65/70/75/80/85%
```
Merges into one exercise: `sets: 5`, `reps: 5`, `intensity {mode:'progression',
steps:[{reps:5, load:65, unit:'% do RM'}, …]}`. Reuse `groupProgressionSteps`'s shape
conventions from `src/public/lib/wod.js`.

### Rest

`Rest 1'` / `Descanso 1'` → an exercise named `Rest` carrying the duration in `reps`.

### Meta

Prefix `Meta:` / `Alvo:` / `Goal:` →

| Written | Parsed |
|---|---|
| `11-12'` | `{kind:'time', min:'11:00', max:'12:00'}` |
| `5 rounds` | `{kind:'rounds', min:5}` |
| `sub 10'` | `{kind:'time', max:'10:00'}` |
| anything else | `{kind:'text', text:<raw>}` |

Stored on `block.goal`. **This session only parses and serializes it** — the editor
UI and the downstream rendering are [37](./37-design-c4-criador.md)'s slice (#10).
Agree the shape here so 37 doesn't have to change it.

### The contract

**The parser never drops a line.** Anything unclassified is appended verbatim to
`block.notes` and counted in the preview ("⚠ 2 linhas mantidas como nota"). This is
the single property that makes the feature safe to trust with a coach's week.

## Architecture

**Blocks stay canonical — text is an input/output projection, not storage.**
Everything downstream (TV, `schedule.html`, `results.html`, Publicador) keeps reading
the same block objects, untouched. Nothing new is persisted except `block.goal`.

The mode toggle is **editor UI state, never persisted**: detailed→text serializes,
text→detailed parses.

## Files

New in `src/components/tabs/criador/`:

| File | Contents |
|---|---|
| `textFormat.js` | pure, no React, no client — the parser + serializer |
| `textFormat.test.js` | the grammar suite (below) |
| `BlockTextEditor.jsx` | per-block textarea + parse status line |
| `SessionTextPane.jsx` | session textarea + live preview pane |
| `WeekImportModal.jsx` | paste box + per-day detection + create-all |
| `WeekTextView.jsx` | read-only week-as-text (the comparison view) |

Touched: `criador/BlockEditor.jsx` (mode toggle in the block bar),
`criador/WeekGrid.jsx` (toolbar entry points), `Criador.jsx` (mode state, import
wiring), `src/public/gallery/Gallery.jsx` (`GROUPS` entries for the new components).

### `textFormat.js` API

```js
parseWeek(text)                 → [{ dayIndex, sessionName, blocks, warnings }]
parseSession(text)              → { blocks, warnings }
parseBlock(text, knownType)     → { block, warnings }
serializeSession(session)       → string
serializeBlock(block, {header}) → string
```

`warnings` entries carry `{ kind, line, lineNo, message }` so the preview can render
them inline and the tests can assert on them.

The serializer reuses `exVolStr` / `fmtIntensity` / `groupProgressionSteps` from
`src/public/lib/wod.js` where canonical rendering already matches. **The gender-load
form needs its own emitter:** the coach writes `60/45kg – 50/35kg` (RX pair, then
Inter pair — grouped by scale) while canonical `fmtIntensity` renders
`M: 60/50 kg | F: 45/35 kg` (grouped by gender). Different axis order, both correct
for their surface — do not "fix" `fmtIntensity`, and record the divergence in a
comment at the emitter.

## UI

### Session text mode — global toggle beside Recolher/Expandir

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3 BLOCOS      Modo: ( ▤ Detalhado )(¶ Texto)    ⓘ Formato    [Aplicar]       │
├────────────────────────────────────────────┬─────────────────────────────────┤
│ Warm Up                                    │  PRÉ-VISUALIZAÇÃO               │
│ 3 rounds                                   │  ┌───────────────────────────┐  │
│ 100m Run                                   │  │ ☀ Aquecimento · 3×        │  │
│ 10 Shoulder Taps                           │  │  · 100m Run               │  │
│ 5 Inchworm + Push Up                       │  │  · 10 Shoulder Taps       │  │
│                                            │  │  · 5 Inchworm + Push Up   │  │
│ Skill – Handstand Walk                     │  ├───────────────────────────┤  │
│ 3 sets cada letra                          │  │ ◎ Skill "Handstand Walk"  │  │
│ A 20" Handstand Hold wall                  │  │  · 3×20" Handstand Hold…  │  │
│ B 10 Wall Shoulder Taps                    │  │  · 3×10 Wall Shoulder Taps│  │
│ C Deslocamento com apoio                   │  │  · Deslocamento com apoio │  │
│                                            │  ├───────────────────────────┤  │
│ Quem já faz tc 15'                         │  │ [? escolher tipo] "Quem…" │  │
│ 5 sets                                     │  │  · 5M HSW · 200m Row      │  │
│ 5M HSW                                     │  ├───────────────────────────┤  │
│ 200m Row                                   │  │ ⏱ For Time · CAP 14' · 5× │  │
│ Rest 1'                                    │  │  · 8 Power Clean          │  │
│                                            │  │    M 60/50kg · F 45/35kg  │  │
│ WOD – TC 14'                               │  │  · 10 Toes to Bar         │  │
│ 5 Rounds For Time                          │  │  · 100m Run               │  │
│ 8 Power Clean 60/45kg – 50/35kg            │  │  Meta 11:00–12:00         │  │
│ 10 Toes to Bar                             │  └───────────────────────────┘  │
│ 100m Run                                   │  4 blocos · 11 exercícios       │
│ Meta: 11-12'                               │  ⚠ 1 tipo por definir           │
│                                            │  ⓘ 2 nomes fora do registro     │
└────────────────────────────────────────────┴─────────────────────────────────┘
        mobile: the preview stacks below the textarea
```

### Per-block text mode — same toggle in the block bar, no header line

```
 ⣿ ▾ [⏱ For Time]  [Nome personalizado…]   Modo:(▤)(¶)   [⧉] [🗑]
 │ 5 Rounds For Time
 │ 8 Power Clean 60/45kg – 50/35kg
 │ 10 Toes to Bar
 │ Meta: 11-12'
 └ ✓ 3 exercícios · CAP 14' · Meta 11:00–12:00
```

### Week import — new entry point on the week toolbar

```
┌ IMPORTAR SEMANA ────────────────────────────────────┐
│ Cole o texto da semana:                             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ SEGUNDA-FEIRA                                   │ │
│ │ Warm Up                                         │ │
│ │ 3 rounds …                                      │ │
│ └─────────────────────────────────────────────────┘ │
│ Semana de: ‹ 20/07 – 26/07 ›                        │
│ Detectado:                                          │
│   SEG 20   3 blocos · 9 ex    ✓                     │
│   TER 21   4 blocos · 11 ex   ⚠ 1 linha como nota   │
│   QUA 22   3 blocos · 8 ex    ✓                     │
│   QUI 23   2 blocos · 8 ex    ✓  "HYROX"            │
│   SEX 24   4 blocos · 12 ex   ✓                     │
│ Box: (Sem box)(●Eagles)(●Garra)   Visib.: (Público) │
│                        [Cancelar]  [Criar 5 sessões]│
└─────────────────────────────────────────────────────┘
```

Box + visibility apply to all created sessions; `locationIds` follows the multi-box
array shape (`sessionBoxIds`, `src/public/lib/boxScope.js`) — never the legacy
singular `locationId`. Import **adds** sessions; it never overwrites a day that
already has one.

### Week as text (read-only) — the comparison view

Free once the serializer exists, and the direct answer to "check Monday and Tuesday
to adjust Wednesday": a week-toolbar toggle renders the visible week's sessions
serialized side by side (desktop columns / stacked on mobile) with a copy-all button.

## Tests — `textFormat.test.js`

The real coach file is the fixture (read it from `cone/Coach training week example.txt`
so it can't drift from the artefact).

1. **Per-rule units** for every row of the grammar tables above, including the
   negative cases: `5 Inchworm + Push Up` stays one exercise; a lone `Rest 1'`
   becomes a Rest exercise, not a block; an unresolved header does not guess a type.
2. **Full-file parse:** 5 sessions, expected block types and counts per day,
   `Meta` on the three days that carry one, and — asserted explicitly — **every input
   line accounted for** (parsed into a field or present in a `notes`).
3. **Round-trip:** `parseSession(serializeSession(s)).blocks` deep-equals `s.blocks`
   modulo ids, over a corpus covering standard / dist / progression / complex /
   gender-intensity / ladder / Estações / Benchmark exercises.
4. **Warnings:** each `kind` is produced by at least one fixture and carries a usable
   `lineNo`.

## Gate — Lane B

`SessionTextPane`, `WeekImportModal` and `WeekTextView` are **net-new surfaces**, so
per WORKFLOW "Design work" this is Lane B: the ASCII above is the sketch. Build the
self-contained preview card in `cone/design/` (inline CSS, first line
`<!-- @dsCard group="…" -->`), **DesignSync**, and **stop at the approval gate** —
do not self-certify and continue into implementation. After approval, build the real
components and add them to `gallery.html`'s `GROUPS` (the card is then archived, never
maintained as a mirror).

## Verification

1. `npm test` — green, `textFormat.test.js` included.
2. `npm run build:all` — SPA + public, clean.
3. `npm run dev`, at **1280×800 and 390×844 under all 4 themes**:
   - Paste `cone/Coach training week example.txt` into Importar semana → 5 sessions
     created → open Monday → the detailed view shows Aquecimento 3× / Skill
     "Handstand Walk" / For Time CAP 14' with Meta 11:00–12:00, and `8 Power Clean`
     carrying M 60/50 · F 45/35.
   - Flip that session to text → the text matches what was pasted, semantically.
   - Flip a single block to text, edit it, flip back — nothing lost.
   - Open the week-as-text view with 3+ sessions in the week.
   - Open an existing prod-shaped session (legacy `mainTraining` string, legacy
     cardio exercise, Estações block, Benchmark block) in text mode — the Benchmark
     block is read-only in the detailed view, so confirm text mode doesn't offer to
     rewrite it.
4. `npm run dev:public` → `gallery.html` for the new components across 4 themes and
   both widths; then `npm run design:cards` + DesignSync.
5. `/verify` before committing; `/code-review` before pushing (L).
6. **Docs are part of Done:** record the text format's existence and the
   blocks-are-canonical rule in `CLAUDE.md`, and move #92 to Done in `BACKLOG.md`.

Model: Opus · Size: L
