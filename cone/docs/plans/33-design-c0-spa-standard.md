# 33 — #54 · Design pass C0 — the SPA design standard (starts the C-program)

> ✅ Done: Phase 1 (mockup synced) `728a501` · Phase 2 (built) `96e48f3` · 2026-07-19 — see BACKLOG.md. The standard + the 5 primitives (`Button`/`Input`/`Card` in `src/components/ui/`, `ConfirmReview`/`MaskedTimeInput` in `src/public/shared/`) are built and gallery-covered; **C1–C5 (#55–#59) adopt them page-by-page**.

## Context
The public-page design program (B1–B4, #50–#53) is done: public hex ≈ 0, radius 0,
FOUC 0/9. The debt has **migrated into the SPA** (`src/components/**`) and is
*growing* — `Criador.jsx` 84→102 hex, `Servicos.jsx` 64→75 (2026-07-18 review). The
SPA has a **button zoo** (45 uses of global `b`/`bsm`/`tb-btn`/`btn` classes across
5 files, no component behind them), **three divergent confirm blocks** (public
`Results.jsx` "Confirmar registro"/"Cancelar"/"Confirmar"; `Schedule.jsx` DeskRegPane
"Revisar registro"/"← Editar"/"Registrar ✓"; LogPane "Confirmar ✓"), no shared input
or masked-time component, and no card/spacing standard.

**C0 defines that standard once so C1–C5 (#55–#59) apply it** instead of re-inventing
a button style per page. This plan also answers the question — **how to properly
start the SPA design pass.**

## How to start the SPA design pass (the recommendation)
1. **C0 first, standalone. Do not touch a single tab until the standard exists.**
   Starting with a page (C1) before C0 just reproduces the zoo per-page.
2. **C0 is the program's only mockup-first item** (plans/16 rule 1: "Only C0 and #43
   are Lane B"). So it runs in **two phases**:
   - **Phase 1 — ideation (this session's execution):** inventory the SPA's current
     button/input/card/modal variants → define the token-based standard → ASCII
     sketch → self-contained preview cards in `cone/design/` (inline CSS, first line
     `<!-- @dsCard group="…" -->`) → **DesignSync** → **STOP at the approval gate.**
     Do not build components, do not touch tabs, do not self-certify "approved."
   - **Phase 2 — build (a later session, after the user approves the mockup):** build
     the primitives, add them to the gallery, `npm run design:cards`, ship C0.
3. **Then C1→C5, in order, each Lane A (gallery-first):** C1 (#55 Exercícios/Config/
   Agenda) · C2 (#56 Atletas/Serviços) · C3 (#57 Resultados) · C4 (#58 — **#26 Criador
   decomposition first**) · C5 (#59 — **#25 Publicador decomposition first**). Each
   folds in its page's hex→token / radius / mechanical-a11y slice (plans/16 rule 2).
4. **After C5:** #43 (themes) needs a token-clean codebase; then **#14's site-wide
   a11y residue** (landmarks/heading architecture, live regions, contrast roles) —
   the pieces no single page owns. Keeping #14 here (not folded into C0) is the user's
   call and matches plans/16 rule 5.

## Acceptance (Phase 1 — ideation, this item)
1. A written SPA design standard covering: **button hierarchy** (primary / secondary /
   destructive / ghost), **input**, **card**, **spacing scale**, and **confirm-modal
   policy** — every value a `themes.css` token, zero hardcoded hex.
2. Preview cards in `cone/design/` for the net-new primitives (Button set, Input +
   MaskedTime, ConfirmReview, Card), rendering their states across **4 themes**,
   synced to the Cone Design System.
3. The **primitive-location + gallery decision** recorded (see Approach §4).
4. Run **stops at the approval gate** with the mockup synced — no primitives built,
   no tab touched.

## Files (Phase 1 — mostly reading + `cone/design/` cards)
- Read to inventory: `src/components/tabs/*.jsx` (button/input classes), the three
  confirm blocks (`src/public/results/LogForm.jsx` or `Results.jsx`,
  `src/public/schedule/DeskRegPane.jsx` + `LogPane.jsx`), `src/index.css` /
  `App.css` global `.b`/`.tb-btn` rules, `themes.css` (token inventory).
- Write: preview cards in `cone/design/` + this plan + BACKLOG note.
- **No `src/**` component files in Phase 1.**

## Approach
1. **Inventory the zoo (concrete census).** Enumerate every button variant (`b`,
   `bsm`, `tb-btn`, `tb-save`, `tb-load`, inline-styled buttons), input pattern
   (placeholder-only vs `<label>`, the `ex-input` class, masked vs raw time), card
   surfaces, and the 3 confirm blocks with their exact labels/casing. This census is
   the standard's evidence base and seeds C1–C5's per-page work.
2. **Define the standard from tokens.** Button hierarchy → primary (`--gold`/accent),
   secondary (outline `--border`), destructive (`--red`-family, currently the
   ad-hoc `#6a1a1a`/`#d05050` in `App.jsx:337`), ghost (text-only). Input: real
   `<label htmlFor>`, token borders, focus-visible ring. Card: `--stone`/`--stone2`
   surface, `--border`/`--divider`, **minimal radius** (SPA rule) — no pills. Spacing:
   a small token scale. **Confirm-modal policy:** one `ConfirmReview` shell + one set
   of canonical pt-BR labels (recommend "Revisar" / "Editar" / "Confirmar", settle
   in-session) replacing all three forks.
3. **Bake accessibility into the primitives** (this is what makes deferring #14 safe):
   an icon-only `Button` **requires** an accessible label prop; `ConfirmReview` traps
   focus + closes on Escape; `Input`/`MaskedTime` render a real `<label htmlFor>`.
   Every C1–C5 page that adopts a primitive then inherits its a11y for free — so
   #14's remaining scope shrinks to the genuinely site-wide residue.
4. **Primitive location + gallery decision (record it).** The gallery
   (`src/public/gallery/`) imports only `src/public/**` and runs on the **public** dev
   server, so any primitive it renders must be **client-free** (no `src/utils/
   supabase.js` import) or it breaches the dual-client rule. **Recommendation:**
   - Cross-surface primitives (`ConfirmReview`, `MaskedTimeInput` — both have public
     consumers too: the confirm forks are on public pages, #35 rolls masked-time out
     to public timer/schedule inputs) → **`src/public/shared/`** (client-free by rule,
     already the gallery's turf; plans/20 explicitly parked `ConfirmReview` for C0).
   - SPA-chrome primitives (`Button`, `Input`, `Card`) → new **`src/components/ui/`**,
     kept client-free, added to the gallery as a new **"SPA / UI"** group (verify the
     import chain pulls in no client — open `gallery.html` after, since no CI gate
     catches a broken/heavy gallery import).
5. **Absorb #35** — the masked mm:ss input is the `MaskedTimeInput` primitive here;
   its *rollout* to every time input rides C1–C5 + the B sessions per #35's row.
6. **Sketch → cards → sync → STOP.** ASCII first, then the `cone/design/` cards,
   then DesignSync, then hand back. Phase 2 (build) is a separate promoted session.

## Decisions to settle in-session (recommendations noted)
- Confirm-modal canonical labels/casing (rec. "Revisar"/"Editar"/"Confirmar").
- Button hierarchy names + which tokens map to destructive (define a `--danger` role,
  or reuse an existing red-family value — record it, since themes.css has no explicit
  danger token today).
- Does `Button` **wrap** the global `.b`/`.tb-btn` classes (migrate incrementally) or
  **replace** them (C1–C5 delete the classes as they adopt)? Rec. replace, page-by-page.
- Primitive locations per §4.

## Out of scope
- Applying the standard to any tab (C1–C5 own that).
- `#26`/`#25` decomposition (ride C4/C5).
- `#14` site-wide a11y residue (own post-C5 session, per the user).
- Building the primitives (Phase 2 — after approval).

## Verification (Phase 1)
- Preview cards render in `cone/design/` across all 4 themes (open them; the `ti`
  webfont won't load in a card — expected, note it on the card).
- DesignSync succeeds; the Cone Design System shows the new cards.
- **Stop.** The acceptance test for Phase 1 is "states synced, handed back" — not a
  build or a test run (no code changed yet).

Model: Opus · Size: M (Phase 1 ideation; Phase 2 build is a follow-up promotion)

---

## Phase 1 deliverable — the standard (for review · 2026-07-19)

> **Status: synced, awaiting approval.** Mockup card:
> `cone/design/mockups/28-spa-standard-c0.html` (4-theme switcher, verified
> rendering across TotK dark/light + Spirit Blossom dark/light). **No primitives
> built, no tab touched.** Phase 2 (build) is a separate promotion.

### The zoo, as counted (evidence base for C1–C5)

- **Buttons.** Global `.b` base + modifiers `.bp` (primary/accent), `.bsec`
  (misnamed — it's a *second* accent-fill primary with a stale `#c86010` orange
  hover), `.bd` (destructive, hardcoded `#d05050`/`#2e1a1a`/`#1a0a0a`), `.bsm`
  (size), `.bfull`. A separate `.tb-btn` toolbar family (`.tb-load` blue,
  `.tb-save` green, `.tb-sync-warn` amber — all hardcoded). Plus bespoke per-file
  classes (`.collapse-btn`, `.blk-type-btn`, `.cr-athletes-btn`, `.insert-blk-btn`,
  `.add-blk-btn`, `.rp-nav-btn`, `.rp-add-btn`, `.login-btn`) and **dozens of
  inline-`style` overrides** doing two jobs at the call site: micro-sizing
  (`minHeight:22/24/26`) and semantic recolor via raw hex (teal go-to-publish,
  purple template, green confirm, orange "Hoje"). Three axes hand-managed
  everywhere: **size · hierarchy/color · icon-only-vs-label**.
- **`.bp:hover{background:#e8e8e8}`** washes the primary to grey on hover in every
  theme; `App.jsx:337` sets a destructive toolbar button with inline
  `#6a1a1a`/`#d05050`.
- **Inputs.** ~14 divergent field treatments (`.fg input`, `.ex-input`,
  `.login-input`, `.login-otp-input`, `.ql-perf-input`, `.cfg-input`,
  `.blk-name-input`, `.blk-meta-field input`, `.ex-qty-input`, `.ex-complex-name`,
  `.sheet-qty-input`, `.color-input`, `.prog-table input`, `.blk-mini-input`),
  each hand-rolling a `:focus{border-color:…}` in a *different* token
  (`--sub`/`--dim`/`--accent`/`--gold`) or raw hex (`#4ac8c0`/`#00b8d4`). **No
  `:focus-visible` ring anywhere.** 95 `placeholder=` uses across 7 tabs, many
  placeholder-as-label. **No mm:ss masking exists** — every time field is raw
  `type="text" inputMode="numeric"` with a `12:34` placeholder → `MaskedTime` is
  genuinely net-new (#35).
- **Confirm blocks — 3 forks.** Public `Results.jsx` (title "Confirmar registro" /
  "Confirmar alteração"; buttons "Cancelar" + "Confirmar"; own CSS `confirm*`).
  `DeskRegPane.jsx` (title "Revisar registro"; "← Editar" + "Registrar ✓"; CSS
  `deskConfirm*`). `LogPane.jsx` (title "Revisar registro" + clipboard icon;
  "← Editar" + "Confirmar ✓"; reuses `deskConfirm*`). 2 CSS implementations, 3
  label sets, none with `role="dialog"`/focus-trap/Escape.
- **Modals.** `.confirm-overlay`, `.settings-overlay`+`.settings-modal`,
  `.btp-backdrop`+`.btp-modal`, `.ex-sheet-backdrop` — backdrop opacity spread
  `.5/.7/.72/.78/.82`, radii `12/14/16px`, ad-hoc z-indexes; no dialog semantics.
- **`Atletas.jsx:14-20`** freezes the totk-dark palette as JS consts
  (`BG/STONE/DIV/CREAM/SUB/MUTED/DIM`) → wrong in 3 of 4 themes (already #56's fix;
  same class as the retired `athletes.html`). Tokenized primitives kill it.

### The correction that reshapes the plan

`themes.css` **already defines `--red` and `--err` in all 4 themes** (verified) —
the plan's "themes.css has no explicit danger token today" premise was wrong.
**No new danger token is needed.** Destructive maps to `--red`; keep `--err`
named for validation/error *messages* (same value today, distinct role).

### Button hierarchy (replaces `.b`/`.bsec`/`.bd`/`.tb-btn` families)

| Variant | Fill | Text | Border | Hover | Use |
|---|---|---|---|---|---|
| **primary** | `--accent` | `--accent-text` | `--accent` | `filter:brightness(1.08)` | the one main action (Salvar, Confirmar, Registrar) |
| **secondary** | transparent | `--sub` | `--border` | bg `--stone` · border `--dim` · text `--cream` | neutral (Cancelar, toolbar, nav) |
| **destructive** | transparent | `--red` | `color-mix(--red 45%, --border)` | bg `color-mix(--red 12%, transparent)` | delete / remove / clear |
| **ghost** | transparent | `--muted` | none | bg `--stone` · text `--cream` | tertiary, dense-row icon-only |

- **Sizes** `md` (40px / 13px / pad 0×14) · `sm` (32 / 12 / 0×10) · `xs` (24 / 11 /
  0×8) — replaces `.bsm` **and** the inline `minHeight:22/24/26` micro-sizes.
- **Icon-only** is a variant of any hierarchy; the component **requires an
  `aria-label` prop** (this is the a11y that lets #14 shrink to site-wide residue).
- Hover/active are `filter:brightness()` (filled) or a token `color-mix()` wash
  (outline) — **never a baked hex**, so all 4 themes respond. Focus-visible =
  `outline:2px solid var(--accent)` + offset.

### Input + MaskedTime

- Real `<label htmlFor>` (or wrapping `<label>`); label style = existing `.lbl`
  (10px uppercase `--muted`). Field: bg `--bg`, border `--divider`, text `--text`,
  **`font-size:16px`** (no iOS zoom), `--radius-sm`.
- **One** `:focus-visible` ring (`outline:2px solid --accent` + border `--sub`)
  replaces the ~14 divergent focus rules. Error: border `--err` + `--err` helper
  text. Disabled: `opacity:.5`.
- **`MaskedTimeInput`** (net-new, #35): auto-inserts the colon, `inputMode=numeric`,
  placeholder `12:34`, value in `--font-mono`. Becomes the one mm:ss field the
  confirm forks + public timer/schedule adopt (rollout rides C1–C5 + B sessions).

### Card / surface

- Card = `--stone` + `--border` + `--radius-md`, padded on the spacing scale.
  Nested content steps to `--stone2`/`--divider`. Section titles reuse `.lbl`.
- Replaces `.sc-card`/`.ex-card`/the modal shells that each pick their own radius
  (6–16px) and padding.

### Spacing + radius (theme-invariant geometry)

- **Spacing** `--sp-1..--sp-5` = **4 / 8 / 12 / 16 / 24** (4px base).
- **Radius** `--radius-sm:4px` (buttons, inputs) · `--radius-md:6px` (cards,
  modals). "Minimal" per the SPA rule — not the public-page zero. Circles (`50%`)
  stay exempt.
- These are **not colors and not per-theme** → add them to the **`:root` fallback
  block in `themes.css`** (which every page loads, precedent: `--font-mono`), so
  the `src/public/shared/` primitives inherit them too. Do **not** put them only in
  the SPA-only `src/index.css`, or public/shared components can't use them.

### Confirm-modal policy → `ConfirmReview`

One `role="dialog" aria-modal="true"` shell: **focus-trap · Escape → back to the
form · one backdrop opacity (`rgba(0,0,0,.7)`)**. Body = labeled read-back rows
(the `deskConfirmRow` shape) + optional `ExerciseList`. **Canonical labels:**

- Title: **"Revisar registro"** / **"Revisar alteração"** (edit mode).
- Secondary button: **"Editar"** — *not* "Cancelar": the back button returns to
  the form **without discarding**, so "Editar" is accurate.
- Primary button: **"Confirmar"** (→ "Enviando…" while submitting).

Kills the "Confirmar registro" title and the "Registrar ✓" / "Confirmar ✓" /
"Confirmar" button divergence across the 3 forks.

### Decisions settled (the plan's open questions)

1. **Confirm labels** → "Revisar registro"/"Revisar alteração" · "Editar" ·
   "Confirmar" (drop the `←`/`✓` glyphs; the button hierarchy carries the
   affordance).
2. **Destructive token** → `--red` (exists in all 4 themes; no new token).
3. **Wrap vs replace** → **replace, page-by-page.** The `Button` component fully
   supersedes `.b`/`.bp`/`.bsec`/`.bd`/`.bsm`/`.bfull` + the `.tb-btn` family; each
   C1–C5 page deletes the global rules it used as it migrates (a wrapper would
   perpetuate the hardcoded hex).
4. **Primitive locations** →
   - `ConfirmReview`, `MaskedTimeInput` → **`src/public/shared/`** (cross-surface —
     the confirm forks + #35 have public consumers; client-free by the shared/
     rule; already the gallery's turf).
   - `Button`, `Input`, `Card` → new **`src/components/ui/`**, added to the gallery
     as a new **"SPA / UI"** group. **Hard constraint:** these must import **no**
     Supabase client (directly or transitively) or they breach the dual-client
     rule *and* break the public-server gallery build — and **no CI gate catches a
     heavy/broken gallery import**, so open `gallery.html` after wiring it.

### Phase 2 build order (when approved)

Add `--sp-*`/`--radius-*` to `themes.css :root` → build `Button` + `Input` +
`Card` in `src/components/ui/` → `ConfirmReview` + `MaskedTimeInput` in
`src/public/shared/` → gallery "SPA / UI" group + open `gallery.html` to verify
the import chain → `npm run design:cards` → sync → ship C0. Then C1→C5 adopt +
delete the global classes page-by-page.
