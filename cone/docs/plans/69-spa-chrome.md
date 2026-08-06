# 69 — #95 · The SPA chrome becomes one 49px row, extracted as a real component

> ✅ Done: `9a24ee8` · 2026-08-06 — see BACKLOG.md
>
> Two defects surfaced live in the gallery review that the plan didn't anticipate — the
> `FixedFrame`/`ScrollFrame` containment reserved no lane for `AppChrome`'s fixed sidebar (it
> rendered on top of the bar, hiding Início) and the two `ui/Button` icon controls stretched to
> ~47px against Início's fixed 40px for lack of `align-self:center`. Both user-caught during
> review, both fixed. Everything else shipped as planned, including the "Open at the approval
> gate" item below (left as the deliberate cosmetic step it was flagged as).

*Planned 2026-08-05 alongside plans/70 and plans/71 — the first Tier 4 refill after the housekeeping
program closed. **Not executed in that session** — its own session. **Sonnet · M · Lane A
(gallery-first).** Tier 4 rank 3; ranks 1–2 (#147, #150) shipped 2026-08-05.*

## Context

The SPA topbar renders **226px tall at 390×844** — 27% of the viewport before any tab content — and
`document.scrollWidth` (387) exceeds `clientWidth`, so the page also scrolls sideways and the account
email is clipped mid-word.

The mechanism, verified 2026-08-05: `.topbar-right` (`index.css:18`) is `flex-wrap: wrap` holding six
`white-space: nowrap` children (email · Sair · Sincronizar · Limpar estado · Carregar estado · Salvar
estado), and **there is no mobile media query for `.topbar` anywhere in `index.css`** — the only chrome
media block is the `@media(min-width:768px)` switch at `:792-800`. At 390px the six nowrap children
have nowhere to go but down, so they stack into ~6 rows.

This is SPA **chrome**, not a tab, so no C-session in the design-pass program owns it and **every
mobile tab pays for it**. It is the design program's first pick for that reason.

⚠️ **The 226px/387px figures predate [plans/67](./67-per-box-theme.md)'s Config changes.** Step 0
re-measures. Do not quote 226 in the commit message unmeasured — this board's standing rule.

## Design already settled (coach decisions, 2026-07-26 — build to these, do not re-litigate)

1. **`Sincronizar` stays in the bar as an icon-only button** — it carries a live conflict state and
   must remain one tap away. **`Salvar estado` / `Carregar estado` / `Limpar estado` move into a new
   "Dados" section in Configurações.** Nothing is deleted; `FEATURES.md:53` lists them as **core**, so
   this is a relocation, not a cull.
2. **Mobile is ONE row, title dropped:** `[🏠 Início] [ nav, horizontal scroll ] [🔄 sync] [⏻ Sair]`.
   The active tab is already underlined in the nav, so it **is** the title; a separate title line is
   redundant. This merges `.topbar` + `.tab-bar` into a single sticky row.
3. **Scope is both widths.** Desktop keeps its 220px sidebar for nav, so there the bar only loses the
   state buttons and gains icon-only Início/Sair.
4. The raw `window.confirm` on "Limpar estado" becomes a **`ConfirmReview`** and moves to Config with
   the button.
5. **`--spa-sticky-top` is updated to the new single-row height.**

## Decisions taken while planning (2026-08-05 — likewise settled)

6. **The chrome is extracted into a real component with a gallery case** (user) — making this a
   **Lane A** change per [WORKFLOW.md](../WORKFLOW.md). Today it is ~130 lines of inline JSX in
   `App.jsx` styled by global `index.css` classes and appears in **no** gallery group, so there is
   nothing to design against.
7. **One icon-only Início, in the bar, at both widths** (user) — the sidebar footer link
   (`.spa-sb-extra` / `.spa-sb-link`, `App.jsx:357-362` + `index.css:788-791`) is **deleted outright**.
   Keeping it on desktop would leave two nodes toggled by CSS, i.e. exactly the duplicate this
   decision exists to remove. One-line revert if the coach misses it.
8. **#95 and #144 do NOT collide over `--spa-sticky-top`**, contrary to what
   [reviews/2026-08-05-full-pass.md](../reviews/2026-08-05-full-pass.md) told both rows. The token is
   **SPA-chrome-only** — zero public-page consumers, confirmed repo-wide — and public pages have no top
   chrome at all; `schedule.html`'s #147 fix (`2b0a387`) correctly uses `top: 0` on a `.stickyHead`
   wrapper. **#95 owns the token; #144 copies `top: 0`.** Nothing to coordinate.

## Corrections to the row, measured 2026-08-05 (do not re-derive)

- 🔴 **All 16 chrome class names have exactly ONE consumer, `App.jsx`** — `.topbar*`, `.saved-badge`,
  `.tb-btn` (+ `.tb-load`/`.tb-save`/`.tb-inicio`/`.tb-sync-warn`), `#state-file-input`, `.tab-bar`,
  `.tab3`, `.sync-conflict-banner`/`-btn`, `.spa-sidebar`, `.spa-sb-*`. Grepped across `src/` and the
  root `*.html`. **The whole block is safely movable.**
- 🔴 **`.tab-bar`'s base rule DOES hardcode `top: 44px`** (`index.css:28`). The full pass's correction
  — that the coupling lives on `.sync-conflict-banner`/`.rp-sticktop` (`:798-799`) and *not* on
  `.tab-bar` — is half right: those two are the ≥768px *overrides*. **Four mutually inconsistent
  chrome heights are in play**: `44` (`.tab-bar:28`), `88` (`.sync-conflict-banner:506`,
  `.rp-sticktop:696`, `criador.module.css:26`'s fallback), `93` (`--spa-sticky-top:37`), and a desktop
  pair that disagrees with itself by 5px — `49` (`:793`) vs `44` (`:798-799`).
- 🔴 **`.rp-sticktop` is NOT single-tab-owned.** `index.css:33`'s comment says "Resultados'", but it
  has **four consumers in two tabs**: `resultados/RegistroView.jsx:271,390,521` (#57) **and**
  `publicador/AgendaView.jsx:1117` (#59). Its `TAB-OWNED → #57` tag is stale — fix it here.
- 🔴 **`--spa-sticky-top` has a second consumer the row never listed:** `Criador.jsx:97` reads it in
  **JS** (`getComputedStyle(document.documentElement).getPropertyValue(…)`) with a `|| 88` fallback,
  inside `scrollToEditor`. That fallback and `criador.module.css:26`'s are **live code, not dead
  defaults** — they fire in the gallery and in the design-cards SSR, where no `:root` token exists.
- ⚠️ **The row's "the last `window.confirm` in the app" is FALSE.** Live sites remain:
  `Atletas.jsx:630,648,993,1069`, `publicador/AgendaView.jsx:967`, `public/timer/Timer.jsx:456`. It is
  the last one **in the chrome**. Do not scope-creep into the others.
- 🔴 **"Limpar estado" reaches the server, and clears less than it says.** `saveLS`
  (`utils/storage.js:124-128`) calls `dbSaveSessions`, so `setSessions({})` propagates through
  `SyncContext`'s auto-save; and it clears **only sessions**, not athletes/results/registry. Today's
  copy — *"todos os dados… não pode ser desfeita"* — is wrong on **both** counts. Fix the copy while
  replacing the dialog.
- **After the three state buttons leave, `showToast`/`toast` have zero callers in `App.jsx`** (only
  `:266`, `:306`, `:308`, `:463`, all moving). The toast block (`:80`, `:227-230`, `:374-401`) becomes
  dead — an inline-styled `#3a1010`/`#102010` overlay that is wrong in both light themes. **Delete it.**
- **`AuthContext` exports no `signOut`** — `App.jsx:421`'s direct `supabase.auth.signOut()` stays in
  `App.jsx` and is passed down as a prop. Not this item's business to change.

## Scope

**New:** `src/components/chrome/AppChrome.jsx` · `AppChrome.module.css` · `tabs.js`;
`src/components/tabs/config/stateBackup.js` + `stateBackup.test.js`.

**Changed:** `src/App.jsx` (chrome at `:339-363` sidebar · `:365-372` file input · `:374-401` toast ·
`:403-533` topbar · `:535-544` banner · `:546-558` tab bar) · `src/index.css` (chrome `:15-41`, sync
`:500-514`, `.rp-sticktop` `:696`, sidebar `:773-791`, the ≥768 block `:792-800`) ·
`src/components/tabs/Config.jsx` + `Config.module.css` · `criador/criador.module.css:26` ·
`Criador.jsx:97-99` · `src/public/gallery/groups/spa.jsx` · `src/public/gallery/harness.jsx`.

## Approach

### 0. Re-measure before touching anything

Playwright MCP against the local stack (`supabase start`; `npm run dev`) at **390×844** and **1280**:
`.topbar` rendered height, `document.scrollWidth` vs `clientWidth`. Screenshot both. This is the
before-baseline and it replaces the stale 226px figure.

### 1. `AppChrome` lives in `src/components/chrome/`, and is fully props-in

Not `src/components/ui/` — that folder is documented as **primitives, client-free by rule**, and
AppChrome is one composed surface, not a primitive. But it **inherits the same client-free
constraint**, because the gallery renders it: no `utils/supabase`, `utils/storage`, `SyncContext` or
`AuthContext` import, direct or transitive. **Every handler arrives as a prop.** That is not a
workaround for the rule — it is what makes a gallery case possible at all, and it is the one thing
that distinguishes this from `SessionEditor`/`CriadorConfirms`, which CLAUDE.md deliberately keeps as
container-private surfaces *because they have no second consumer*. AppChrome has one: the gallery.

`src/public/shared/` is wrong — that is for cross-surface components with public-page consumers.

```jsx
export default function AppChrome({
  tab,                       // string — active tab id
  onTabChange,               // (id) => void
  tabs = TABS,               // [{ id, icon, label, short? }] — from ./tabs.js
  gymName = '',              // sidebar brand subtitle
  userEmail = '',            // ≥768 account chip
  syncState = 'idle',        // 'idle' | 'syncing' | 'synced' | 'conflict'
  onSync,                    // () => void
  onSignOut,                 // () => void
  autoSaved = false,         // the "Salvo automaticamente" badge (≥768 only)
  homeHref = '../index.html',
})
```

No `children`. The toast, the hidden file input and `.pane` are **not** chrome. `App.jsx` forwards
`handleSync` from `useSync()` (`SyncContext.jsx:102-119`, fully portable) and
`() => supabase.auth.signOut()`.

🔴 **It returns a FRAGMENT, not a wrapper div.** `position: sticky` is clipped by its parent's box —
inside a wrapper holding only the 49px bar, the bar could travel 49px and stop sticking. This is the
exact trap CLAUDE.md records for Criador's `WeekGrid`.

### 2. The CSS moves to a `.module.css` — forced, not stylistic

`index.css` has **exactly one importer**, `src/main.jsx:3`, and `scripts/build-design-cards.mjs`
inlines only the CSS asset emitted by the SSR build of the *gallery* graph; `gallery.html` loads
`themes.css` + tabler-icons and nothing else. **Chrome left in `index.css` would render completely
unstyled in the gallery and in the generated card** — the Lane-A gate could not be met.
`AppChrome.module.css` is the only option.

🔴 **`#root{margin-left:220px}` must STAY in `index.css`.** CSS Modules localizes **id selectors as
well as class selectors**, so it would become `#AppChrome__root` and silently stop matching.
`:global(#root)` would work but is wrong anyway — the gallery has no `#root` to offset, so a 220px
margin would shove every card sideways.

Global `.spin` / `@keyframes spin` (`index.css:490-491`) **stays** (`App.jsx:328`,
`LoginScreen.jsx:119,175`); AppChrome declares its **own local `s.spin`**, the established pattern
(`LogForm.jsx:26`, `Results.jsx:698`, `Schedule.jsx:990`, `TV.jsx:189`), so the syncing spinner
animates in the gallery too.

**Disposition of every existing rule:**

| `index.css` | Disposition |
|---|---|
| `:16-19` `.topbar` / `.topbar-title` / `.topbar-right` / `.saved-badge` | **moved + renamed** → `.bar` / `.title` / `.right` / `.saved` |
| `:20-26` `.tb-btn` + `:hover`/`:active`/`.tb-load`/`.tb-save` | **deleted** — `gallery/groups/spa.jsx:113` already names `.tb-btn` as the zoo `ui/Button` replaces |
| `:27` `#state-file-input` | **deleted** — the input moves to Config and already carries `style={{display:'none'}}` |
| `:28` `.tab-bar` (incl. `top:44px`) | **deleted** — the element is gone |
| `:29-36` the token comment | **rewritten** (two layouts → one) |
| `:37` `:root{--spa-sticky-top:93px}` | **stays in `index.css`**, value → `49px` |
| `:38-40` `.tab3` ×3 | **moved + renamed** → `.navBtn` |
| `:41` `.pane` | stays — App still renders it; not chrome |
| `:500-501` `.tb-sync-warn` + `@keyframes sync-pulse` | **moved** → `.syncConflict` + local keyframes |
| `:502-514` `.sync-conflict-banner` / `-btn` / `:hover` | **moved + tokenized** (see step 5) |
| `:773-791` `.spa-sidebar` + `.spa-sb-*` | **moved verbatim** (already var()-based) minus `.spa-sb-extra`/`.spa-sb-link`, **deleted** per decision 7 |
| `:792-800` the `@media(min-width:768px)` block | **collapses to `#root{margin-left:220px;margin-right:0;max-width:none}`** — everything else in it dies or moves into the module |

### 3. One row, one breakpoint, CSS-only fork

```
mobile  <768   [🏠 40] [ nav ← scroll → flex:1 ]                    [🔄 40] [⏻ 40]
desktop ≥768   [🏠 40] [ h1 título          flex:1 ] [email] [💾] [🔄 40] [⏻ 40]
               └ sidebar 220px fixed carries the nav ───────────────────────────┘
```

- **No `useIsMobile` in chrome** — `build-design-cards.mjs` SSRs it in Node; a CSS-only fork keeps the
  card deterministic and avoids a hydration branch.
- `.bar`: `display:flex; align-items:stretch; min-height:48px; padding:0 var(--sp-3);
  border-bottom:1px` → **49px occupied**. `align-items:stretch` (not `center`) so `.navBtn` runs the
  full 48px and its active `border-bottom:2px` lands on the bar's own bottom edge — that is what makes
  it read as a tab. The three icon controls get `align-self:center`.
- 🔴 **`.bar` has NO `flex-wrap`.** That single removal is the bug fix; everything else is layout.
- **Nav strip:** `flex:1; min-width:0; overflow-x:auto; scrollbar-width:none;
  scroll-snap-type:x proximity` + `mask-image: linear-gradient(to right, #000 calc(100% - 20px),
  transparent)` as the "more to the right" affordance. Precedent for hiding the bar: `.rp-weeks`
  (`index.css:701-702`). ⚠️ Wrapping — the solution CLAUDE.md records for Criador's box tabs, for
  exactly this "no hint there's more" reason — **is unavailable here: wrapping IS the bug.** The edge
  mask plus the auto-scroll below are the substitutes; judge them at 390 in the gallery.
- 🔴 **Auto-scroll the active tab into view** — `useEffect` on `[tab]` →
  `activeRef.current?.scrollIntoView({ inline:'center', block:'nearest' })`. `?tab=config` is the 9th
  of 9; without this the underline is off-screen on arrival. **`block:'nearest'` is load-bearing** —
  `'start'` scrolls the page, not the strip.
- **`tabs.js` gains a `short` label per tab** — `{ id, icon, label, short? }`: `'Criador de Treinos'`
  → `'Criador'`, `'Publicador de Grade'` → `'Publicador'`, `'Quadro ao Vivo'` → `'Quadro'`,
  `'Configurações'` → `'Config'`. The nav renders `short ?? label`; the sidebar and the `<h1>` render
  `label`. CSS cannot truncate to a *different word*, so this is the only way more than two tabs fit
  at 390.
- **`.account`** gets `max-width` + `overflow:hidden` + `text-overflow:ellipsis` — that is what stops
  the email from ever driving `scrollWidth` again, the second half of the bug.

### 4. `ui/Button` for the two icon controls; Início stays a link

Sync and Sair become `<Button variant="secondary" size="md" iconOnly aria-label="…">`. `md` is
**40×40** (`Button.module.css:46,53`); `sm` is 32 and misses the touch guideline in a 48px row. Three
40px controls + gaps ≈ 130px, leaving ~250px of nav at 390. `Button.jsx:26-30` enforces the
`aria-label` requirement in DEV, so #14's a11y is inherited rather than re-argued. `.tb-btn` dies with
this.

**Início stays a real `<a href>`**, hand-styled by the module (`.home`, matching Button's `iconOnly md`
40×40 geometry) — a link must survive middle-click and announce as a link. Worth a future Icebox row:
`Button as="a"`.

### 5. The conflict state moves onto `--red`, not amber

Today it is hardcoded `#e87820` / `#1a0e04` / `#7a4a10` / `#e8a060` — frozen to the dark palette and
wrong in both light themes. This block is **GLOBAL** chrome, so #99's triage rule says tokenize it in
this pass.

There is **no `--warn`/`--amber` token in `themes.css`**, and adding one is a four-theme change that
re-opens #14's contrast table and breaks CLAUDE.md's verified "29 tokens × 4 themes". `--gold` exists
but is recorded as failing contrast on both light themes and reserved for #14.

So: sync-in-conflict = `variant="destructive"` + `className={s.syncConflict}` (pulse only); banner =
`background: color-mix(in srgb, var(--red) 10%, var(--stone))`, `border-bottom: 1px solid
color-mix(in srgb, var(--red) 45%, var(--border))`, `color: var(--red)`, action =
`<Button variant="destructive" size="sm">`. `--red` is a **measured** pairing since
[plans/65](./65-border-divider-tokens.md) (4.58–5.40:1 on the darks, passing on the lights).
**Record the "no new token" call in the commit so it isn't re-litigated.** Add
`@media (prefers-reduced-motion: reduce){ .syncConflict, .spin { animation: none } }` — the current
pulse has no such guard.

### 6. One height, 49px, at both widths — and the four literals collapse

48px content + 1px border. **Deliberately equal to today's desktop value**, so the desktop Criador
offset is byte-unchanged and the regression surface at 1280 is zero. `--spa-sticky-top` becomes **one
value with no media override**.

| Site | Today | After |
|---|---|---|
| `index.css:37` `:root{--spa-sticky-top}` | `93px` | **`49px`** |
| `index.css:793` same, @≥768 | `49px` | **deleted** — one layout now |
| `index.css:28` `.tab-bar{top:44px}` | 44 | **deleted** — element gone |
| `index.css:506` `.sync-conflict-banner{top:88px}` | 88 | **→ `var(--spa-sticky-top,49px)`** in the module |
| `index.css:798` same, @≥768 | 44 | **deleted** |
| `criador.module.css:26` `top:var(--spa-sticky-top, 88px)` | 88 fallback | **`49px`** |
| `Criador.jsx:99` `\|\| 88` | 88 | **`\|\| 49`** |
| `index.css:696` `.rp-sticktop{top:88px}` | 88 | **→ `var(--spa-sticky-top)`** 🟡 |
| `index.css:799` same, @≥768 | 44 | **deleted** |

🟡 **Deliberate deviation from the TAB-OWNED rule for `.rp-sticktop`.** That rule ("leave it; the
tab's own pass deletes it") exists so we don't tokenize work that gets thrown away. It does not apply
here, for two reasons: **(a)** its correctness is a *function of the chrome this item changes* —
deleting the `@media` block without touching it silently reintroduces the exact 39px overshoot
`index.css:29-36` documents, on top of content, in **both** Resultados and Agenda; **(b)** it is not
single-tab-owned (four consumers, two tabs — see Corrections). Changing it to the token and deleting
the override *removes* two literals and leaves both #57 and #59 strictly less work. **Write that
reason into the CSS comment, and fix `:33`'s stale "Resultados' `.rp-sticktop`" attribution while
there.**

*Considered and rejected:* having AppChrome measure itself with a `ResizeObserver` and write the token
on `documentElement`. Self-correcting, but it adds a first-paint-wrong frame to fix a height that is
now fixed **by construction** (`min-height:48px`, no wrap, no content-derived growth). Noted here as
the escape hatch if the row ever becomes content-sized.

### 7. The three state buttons → a "Dados" section in Configurações

**New `src/components/tabs/config/stateBackup.js`** (+ `stateBackup.test.js`) — keeps `Config.jsx`
near its current 197 lines instead of adding ~110 of file I/O, and converts an entirely untested path
into a tested one:

```js
buildSnapshot(sessions)                 // pure — the version-2 object
stateFileName(customName, gymName)      // pure — slug + fallback + date. TESTABLE.
parseStateFile(text)                    // pure — v2 unwrap + normaliseType/normaliseZone. TESTABLE.
downloadSnapshot(snapshot, filename)    // Blob + <a>.click()
applyState(parsed, { setSessions, setEvents }) → { needsReload }
```

🔑 **`applyState` returns `{ needsReload }` rather than calling `window.location.reload()`** — the
same "the reader returns a flag, the caller decides" shape CLAUDE.md makes canonical for
`initRegistry`'s `{registry, needsSave}`.

**`Config.jsx`:**
1. `useSync()` for `sessions`/`setSessions`/`setEvents` — Config renders inside `SyncProvider`.
2. `saveFileName`/`showSaveName` move **wholesale** as Config-local state (they exist only for the
   filename prompt); `fileInputRef` + the hidden `<input>` move with them. **Drop
   `id="state-file-input"`** — nothing selects it now.
3. **`showToast` does NOT move.** Config answers in place with a `dataMsg` state rendered *inside* the
   Dados section, matching its existing `flash` idiom. Two new classes in `Config.module.css`:
   `.dataRow` and `.dataErr`. The App-level fixed toast dies with it (see Corrections).
4. 🔴 **The Dados section goes AFTER `.saveRow`**, not among the three form sections. `save()`
   persists gym+theme only, so a section placed above the footer reads as part of that form. Add
   `<p className={s.hint}>Backup em arquivo .json. Não depende do Salvar acima.</p>` **and** a code
   comment saying so.
5. The inline filename `<input>` (`App.jsx:479-501`, 10 lines of inline hex) becomes `ui/Input`; the
   three buttons become `ui/Button` (`secondary` / `secondary` / `destructive`).
6. **Limpar estado → `ConfirmReview`**, modelled on `Exercicios.jsx:909-924`
   (`editLabel="Cancelar"`, a plain JSX body). Copy must state what actually happens:

   > Apaga **todos os treinos** salvos. A mudança **sincroniza para o servidor** e vale para todos os
   > aparelhos. Atletas, resultados e o catálogo de exercícios não são afetados.

**`App.jsx` import diff:** drop `loadAthletes, saveAthletes, saveResults, loadGoalsData,
saveGoalsData, loadRegistry, saveRegistry, loadEvents, loadLocations, saveLocations, loadCoach,
saveCoach, toISO, normaliseType, normaliseZone`. **Keep** `loadSettings` (`:192,:335`), `saveSettings`
(`:207`), `loadResults` (`:578`), `loadAthletes` (`:602`), `loadLS`, `APP_CONFIG`/`GF`, `supabase`
(signOut only). ⚠️ This moves ~16 storage imports out of the entry chunk into the lazy Config chunk —
a win, but confirm against `npm run build`'s chunk list.

⚠️ **Known, pre-existing, do NOT fix here:** an imported file *without* a `settings` key does not
reload, so Config's own fields still show stale values; and when it *does* reload, the success message
is wiped. Both are true today.

### 8. Accessibility contract

- **`<header>`** for the bar (banner landmark). Sidebar `<nav aria-label="Seções">`; the mobile strip
  is a second one. **Two navs is correct** — they are `display:none`-exclusive and `display:none`
  removes a subtree from the accessibility tree, so exactly one is ever exposed. This is *not* the
  duplicate-Início situation (that was one control rendered twice as two different affordances); here
  they are structurally different containers rendered from one internal `TabList` sub-component.
- **`aria-current="page"`** on the active button in **both** navs — the sidebar never had it.
- **One `<h1>{activeLabel}</h1>`**, `srOnly` below 768 and painted above it, so dropping the visible
  title does not drop the view's accessible name. Idiom already in the repo (`Leaderboard.jsx:243`,
  `Results.jsx:651`, `Me.module.css:22`).
- **Not `role="tablist"`.** The full pattern needs roving `tabindex`, arrow keys, `role="tabpanel"`
  and `aria-controls` — and the panes are `React.lazy` behind `Suspense fallback={null}`, so
  `aria-controls` would point at nothing while a chunk loads. The repo has no roving-tabindex
  precedent. `<nav>` + `aria-current` is honest and correct.
- **Icon-only controls:** `aria-label` on all three — `"Início"`, `"Sair da conta"`, `"Sincronizar"`
  (fixed, **not** state-dependent); `title` mirrors it for hover. Icons `aria-hidden`.
- **Sync state announcement:** a separate `<span role="status">` (srOnly) carrying
  `'' | 'Sincronizando…' | 'Sincronizado' | 'Conflito de sincronização'`. Split from the button label
  on purpose — mutating an `aria-label` under focus is announced inconsistently across screen readers.
- **Touch targets:** nav buttons 48px tall; the three icon controls 40×40.

### 9. Gallery (Lane A)

Stay in the **existing `SPA` group** — `build-design-cards.mjs` derives the card filename from
`group.toLowerCase()`, `spa.html` already exists, and this *is* the SPA's chrome. New item
`{ id: 'spa-chrome', label: 'AppChrome' }` after `ui-confirmreview`.

**New harness shell `ScrollFrame`** in `gallery/harness.jsx` — `ModalBox`'s `transform:translateZ(0)`
containment (for the `fixed` sidebar) plus `height:420px; overflow:auto` and tall filler (for the
`sticky` bar and banner, which need a real scrollport to demonstrate). Co-located `ChromeDemo` wrapper
holding `useState` so the nav is interactive, same shape as the existing `MaskedTimeDemo`.

| # | Case | Axis covered |
|---|---|---|
| 1 | Padrão · `idle` (interactive) | default · selected/active · hover · focus-visible |
| 2 | Sincronizando | `syncing` — spinner + disabled |
| 3 | Sincronizado | `synced` |
| 4 | Conflito + faixa | `conflict` — destructive button, pulse, **and the sticky banner** |
| 5 | Salvo automaticamente | the `autoSaved` badge (≥768-only element) |
| 6 | Overflow — email e academia longos | truncation; proves the email can no longer widen the page |
| 7 | Fixa na rolagem (`ScrollFrame` + filler) | the 49px pin |

Responsive + theme axes are the gallery's **own** toggles. ⚠️ Do **not** build a 390 iframe inside a
Case — `MobileFrame` already does that, and only in `w === 'mobile'` mode, because a `max-width`
container does not retrigger `@media`. Review all 7 at 390 and Full × 4 themes = the WORKFLOW bar.
Note the two card caveats in the section `sub`: the `ti` webfont is blank in a generated card, and a
card SSRs at no viewport so it shows the ≥768 branch.

### 10. Order of execution

`tabs.js` → `AppChrome.module.css` → `AppChrome.jsx` → `index.css` → `criador.module.css` +
`Criador.jsx` → `App.jsx` → `stateBackup.js` + test → `Config.jsx`/`Config.module.css` →
`harness.jsx` → `groups/spa.jsx` → **gallery review = the approval gate** → `design:cards` → docs.

## Acceptance

- Chrome occupies **≤49px** before tab content at 390×844 **and** 1280; `document.scrollWidth ===
  clientWidth` (the sideways scroll is gone); the account email truncates with an ellipsis.
- All 9 tabs reachable by scrolling the strip; landing on `?tab=config` auto-scrolls its button into
  view.
- Exactly **one** Início node in the DOM at both widths.
- `--spa-sticky-top` is a **single** `49px` declaration with no media override, and `.tab-bar`'s
  `44px`, both `88px` sticky offsets and both `44px` overrides no longer exist.
- Criador's `cr.stickyHead` pins directly under the bar at both widths and `scrollToEditor` still
  lands right; `.rp-sticktop` pins at 49 in Resultados **and** Agenda mobile.
- Salvar / Carregar / Limpar estado all work from Configurações; Limpar goes through `ConfirmReview`
  (cancel *and* confirm) and its copy states the server + scope truth.
- `AppChrome` renders in the gallery in all 7 states × 4 themes × both widths, and
  `design/components/spa.html` regenerates with it.
- `npm test` green · `npm run lint` **clean at `--max-warnings 0`** · `npm run build` clean.

## Verification

Drive the real app (Playwright MCP, local stack) at **390×844 and 1280** — measurements above, plus:

- **Criador is the load-bearing tab** — it is the only `--spa-sticky-top` consumer. Open it, scroll,
  confirm the pinned block sits directly under the bar; open a session and confirm `scrollToEditor`
  lands correctly.
- **Resultados + Agenda mobile** — `.rp-sticktop` at 49, not 88, at both widths.
- Force `syncState:'conflict'` (mutate `sessions.updated_at` in Studio, or wait out the poll) →
  banner pins under the bar and "Sincronizar agora" works.
- Config → Dados: save with a custom name *and* the default; a load round-trip; clear via
  `ConfirmReview`, cancelling and confirming; each with its in-section message.

Then `npm test` (748 baseline + `stateBackup`), `npm run lint`, `npm run format:check`, `npm run
build` (confirm the entry chunk shrank), `npm run design:cards` + **commit** the regenerated
`design/components/spa.html`, and **open `gallery.html` on `npm run dev:public`** — it is dev-only and
**no CI gate catches a broken import there**.

⚠️ `AppChrome.jsx` must export **only** the component — `TABS` lives in `tabs.js` precisely to avoid a
sixth `react-refresh/only-export-components` carve-out. Watch `react-hooks/refs` on the
scroll-into-view effect: the ref must be `*Ref`-suffixed.

## Risks and traps

1. 🔴 **Fragment, not wrapper div** — a wrapper clips `position:sticky` to its own box.
2. 🔴 **CSS Modules localizes `#id` selectors** — `#root` must stay in `index.css`.
3. 🔴 **`index.css` never reaches the gallery** (one importer, `main.jsx`) — anything left there is
   unstyled in the gallery *and* the card, and the Lane-A gate cannot be met.
4. 🔴 **Deleting the `@media(min-width:768px)` block silently regresses `.rp-sticktop` to 88px on
   desktop** in two tabs. Handled by step 6; do not skip it.
5. 🟠 **`criador.module.css`'s `88px` fallback and `Criador.jsx`'s `|| 88` are live**, not dead
   defaults — they fire in the gallery and the SSR, where no `:root` token exists.
6. 🟠 **`.spin` is global** — use a local `s.spin` or the gallery's syncing case shows a frozen icon.
7. 🟠 **No `window.innerWidth`/`useIsMobile` in AppChrome** — it is SSR'd by `design:cards` in Node.
8. 🟠 **Config's `save()` must not swallow the Dados section** — placement after `.saveRow`, plus the
   hint and the comment.
9. 🟡 **A hidden scrollbar gives no overflow hint** — the edge mask + auto-scroll are the substitutes
   for the wrapping this layout cannot use. Judge at 390 in the gallery.
10. 🟡 **Service-worker / cross-port cache poisoning** — if the chrome change "doesn't appear", check
    the SW **first**; it has bitten this repo with no console error at all.

## Open at the approval gate

- **`.spa-sb-brand{min-height:52px}` vs the new 48px bar** — the sidebar header and the bar no longer
  align at the top edge on desktop. Cosmetic: drop the brand to 48px, or keep the deliberate step.

## Docs (part of Done)

`CLAUDE.md` — the SPA section gains the chrome component + the single 49px contract; the gallery
group's membership changes; the `88px` reference at `:88` is now wrong. `BACKLOG.md` — row → Done,
plus the Corrections above folded into their rows. `FEATURES.md:53` — "header" → "Configurações →
Dados". This file gets its `> ✅ Done: <commit> · <date>` marker.

Model: **Sonnet** · Size: **M**
