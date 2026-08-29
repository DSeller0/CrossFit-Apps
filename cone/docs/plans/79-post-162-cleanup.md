# 79 — Post-#162 cleanup batch (#163 · #165 · #166 · #167 · #168)

## Context

The [2026-08-29 full pass](../reviews/2026-08-29.md) reviewed the four surfaces #160/#161/#162
shipped and found seven rows. Five of them are small, and four sit in the same tab — this plan closes
those five in one session, on the plans/68 precedent (five S rows batched safely because none blocked
another). The two it deliberately leaves out are **#164** (needs a data-model decision, Opus) and
**#57 / C3**, which is the next session after this one.

The row that makes this urgent is **#163**: mark an invoice paid in Fechamento and the "A receber"
rail in the neighbouring pane still counts the money as owed. It shipped two days ago and it
misreports money, which is the board's own "found-in-live-use and small-and-visible first" case — the
same ground on which #147 and #150 jumped the design program.

**None of these five blocks another; they share files, not logic.** Ship as one commit or five, but
verify #163 and #165 together — both change what the Fechamento → Meus afiliados round trip does.

## Acceptance

1. **#163** — an invoice stamped `paid` no longer contributes to "A receber": not to the affiliate's
   own row, not to the grand total, not to the `N afiliados` count. A **`sent`** invoice still does
   (it is still owed). Verified by driving `open → draft → sent → paid` and watching the rail change
   only on the last step.
2. **#165(a)** — a `paid` (and a `sent`) invoice offers a way back, behind `ConfirmReview`, whose
   copy states that the frozen total is discarded. **(b)** the Pix QR is gone once `paid`.
3. **#166** — exactly one `fmtMoney` exists in `src/`, exported from `publicador/billing.js`; the
   three local copies are deleted. `billing.js`'s `fmtDate` is renamed so it no longer collides with
   `public/lib/week.js`'s.
4. **#167** — presence cells cap at a heatmap scale (~14–18px) instead of stretching to 68.6px.
5. **#168** — the mobile Fechamento column strip wraps instead of side-scrolling, with no clipped
   label.
6. `npm test` / `npm run lint` / `npm run format:check` / `npm run build` all clean; new unit tests
   for the `#163` filter and the `#165` revert in `billingState.test.js`.

## Files

- `src/components/tabs/afiliados/Afiliados.jsx` — thread `billing` down (#163)
- `src/components/tabs/afiliados/AffiliatesPane.jsx` — accept + forward `billing` (#163)
- `src/components/tabs/afiliados/ReceivableRail.jsx` — skip paid periods (#163)
- `src/components/tabs/afiliados/InvoiceDetail.jsx` — revert action + QR gate (#165), drop `fmtMoney` (#166)
- `src/components/tabs/afiliados/InvoiceCard.jsx`, `MeuPerfilPane.jsx` — drop `fmtMoney` (#166)
- `src/components/tabs/publicador/billing.js` — export `fmtMoney`, rename `fmtDate` (#166)
- `src/components/tabs/afiliados/Afiliados.module.css` — `.pgCell` cap is in Atletas', see below; `.fechColTabs` (#168)
- `src/components/tabs/atletas/Atletas.module.css:374-376` — `.pgCell` (#167)
- `src/components/tabs/afiliados/billingState.test.js` — new cases
- `src/public/gallery/groups/afiliados.jsx` — the `ReceivableRail` / `InvoiceDetail` cases gain a paid fixture

## Approach

### #163 — a paid invoice is not money owed

`ReceivableRail` currently resolves every affiliate's month itself and never sees a stamp
(`AffiliatesPane.jsx:199-207` passes `locs`/`events`/`from`/`to` only). `Afiliados.jsx` already holds
`coach.billing` and already imports `stampFor` for `advanceInvoice`, so this is prop threading plus a
one-line skip.

- Pass `billing={coach.billing}` from `Afiliados.jsx:231` → `AffiliatesPane` → `ReceivableRail`.
- In `ReceivableRail`, derive the period once with **`periodKey(from)`** (`billingState.js`) — the
  rail always shows a single month, so one period key covers every row. Reuse `stampFor`; it is pure,
  so the component stays client-free.
- A row whose stamp is `paid` contributes **0** to `grand` and is excluded from `activeCount`.

🔑 **Keep the row visible, don't blank it.** Rendering `—` would lose the fact that the month had
earnings at all. Render the row with its amount **muted plus a "paga" marker**, and leave it out of
the total — the rail then reads as "here is the month, here is what is still coming". Blanking it
also makes #163 indistinguishable from an affiliate with no sessions, which is a different state.

⚠️ **Only `paid` is excluded.** `sent` means invoiced-and-waiting, which is exactly what "a receber"
describes; excluding it would be a second bug in the other direction.

### #165 — the paid state is a dead end, and still shows a QR

`InvoiceDetail.jsx:183-203` renders an action for `open`/`draft`/`sent` and **nothing** for `paid`.

- Add a **"Reabrir"** action (secondary, not primary) for `sent` and `paid`, calling the existing
  `onAdvance('draft')` path — no new plumbing: `advance(stamp, 'draft')` already returns
  `{status:'draft'}` and `advanceInvoice` already handles any target.
- Add its `CONFIRM_COPY.draft`-equivalent entry. ⚠️ **Reopening discards the frozen `total`,
  `currency`, `sentAt` and `paidAt`** — that is the whole #162 correctness argument running backwards,
  so the copy must say it, e.g. *"O valor volta a ser calculado ao vivo — o total congelado de
  {X} é descartado."* Follow the existing lazy-function shape in `CONFIRM_COPY` (its comment explains
  why: an eager body reads `stamp.total` in states where `stamp` is null).
- Gate the QR: `{!mixedCurrency && amount > 0 && status !== 'paid' && <PixBlock … />}`
  (`InvoiceDetail.jsx:178`).

⚠️ Reverting to `draft` rather than `open` is deliberate — `open` is the *absence* of a stamp, and
`columnOf` enumerates `open` from the current period only, so a reopened July invoice would vanish
from the board entirely. `draft` is enumerated across all periods and shows a live total again.

### #166 — one `fmtMoney`, and a `fmtDate` that stops colliding

- Move the identical body from `InvoiceCard.jsx:22` / `InvoiceDetail.jsx:10` / `MeuPerfilPane.jsx:13`
  into `publicador/billing.js` as an export; delete all three copies. All three files already import
  from that module, so this adds no new dependency edge and it stays the one place money is formatted
  (the #104 lesson).
- Rename `billing.js:8`'s `fmtDate` → **`fmtDateNum`** (it returns `dd/mm/yy`), so it no longer
  shadows `public/lib/week.js:51`'s `"Dom 5 Jul"`. Update its call sites (`InvoiceDetail.jsx`,
  `AffiliateSessions.jsx`, and anything else `grep -rn "from '.*billing"` turns up).
  ⚠️ **Do not import `week.js` into `billing.js` to dedupe them** — that module deliberately imports
  nothing so it stays loadable under vitest's `environment: 'node'` (the #149 constraint, recorded in
  its own header).

### #167 — cap the presence cell

`Atletas.module.css:374-376`: `.pgRow{grid-template-columns:repeat(7,1fr)}` + `.pgCell{aspect-ratio:1}`
with no cap, so in the ~530px ficha pane each cell computes to 68.6px. Give the row a
`max-width` (7 cells + 6 gaps at the target size) or the cells a `max-width` with the row
`justify-content:start` — either way the grid reads as a compact calendar next to its 9px day letters.
Check it against the mobile ficha too, where the pane is narrower and the current rule happens to look
right.

### #168 — wrap the mobile column strip

`Afiliados.module.css:592-600`'s `.fechColTabs` is `display:flex; overflow-x:auto`. The precedent, and
its written rationale, is `criador.module.css:35-44` — copy that shape:
`flex-wrap:wrap; overflow-x:visible` + `flex:1 1 calc(25% - 5px)` on the chip.

🔴 **The trap: a naive copy clips the labels.** `.fechColTab` is `white-space:nowrap` + uppercase, and
`COLUMNS[0].label` is **"Sessões abertas"** — at 25% of a 370px strip (~88px) it will not fit, where
Criador's box names did. Either shorten the compact labels (e.g. "Abertas"), let the chip wrap to two
lines, or go 2×2 instead of 4-up. Decide it looking at the real thing at 390, not from the CSS.

## Verification

Local stack + `npm run dev` (the seed is already loaded; `node scripts/seed-dev.mjs` resets it —
worth doing first, since the review left Eagles' August stamped `paid`).

1. **#163 + #165 together, one pass at 1280:** Afiliados → Fechamento → Eagles → `Iniciar rascunho` →
   `Enviar fatura`. Switch to *Meus afiliados*: the rail **still** counts it. Back to Fechamento →
   `Marcar como paga` → the rail now **excludes** it and the grand total drops by that amount. Confirm
   the paid detail shows **no Pix QR** and offers **Reabrir**; take it, confirm the copy names the
   discarded total, and check the card returns to Rascunho with a live total.
2. **#167** at 1280 and 390: measure a cell with
   `getComputedStyle(document.querySelector('[class*=pgCell]')).width` — expect ~14–18px, not 68.6.
3. **#168** at 390: `el.scrollWidth <= el.clientWidth` on `.fechColTabs`, and every one of the four
   labels fully readable.
4. **#166**: `grep -rn "function fmtMoney" src/` returns exactly one hit, in `billing.js`.
5. Gallery (`npm run dev:public` → `/CrossFit-Apps/gallery.html`): the Afiliados group's
   `ReceivableRail` and `InvoiceDetail` cases render, including a new **paid** fixture; check all 4
   themes at both widths.
6. `npm test` (new `billingState.test.js` cases: a `paid` stamp is excluded from a receivable sum; a
   `sent` one is not; `advance(sentStamp,'draft')` drops `total`/`currency`/`sentAt`) ·
   `npm run lint` · `npm run format:check` · `npm run build:all`.
7. `npm run design:cards` — this touches components the gallery renders, so the cards are part of
   Done (WORKFLOW's "Build artifacts are part of Done too").

Model: Sonnet · Size: S–M
