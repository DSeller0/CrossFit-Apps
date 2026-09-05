# 78 — #162 · Fechamento + Minha semana + o carimbo de estado da fatura (mockup 60)

> ✅ Done: `ea66e78` · 2026-08-29 — see BACKLOG.md. Closed **#162**. Closes out the #56/C2 scope session’s three-row split (#160/#161/#162) — planned, built, tested and verified live in one session. Bought the invoice board with a status stamp, not an invoice entity.

> Depends on [plans/77](./77-afiliados-paineis-coach.md) for the rail — these are its third
> and fourth panels. Design record: **mockup 60 · Afiliados completo**, approved 2026-08-28.
> Siblings: [76](./76-atletas-fichas.md) · [77](./77-afiliados-paineis-coach.md).
> Direction record: [plans/42](./42-afiliados-direction.md).

## Context

Today the app's entire money surface is `billing.js` (53 lines) plus `ReportModal`, and
**nothing is persisted**: every report recomputes from `events × locations`, prints a PDF,
and throws the result away. There is no invoice, no lifecycle, no payment record, and no
correlation between a generated Pix `txid` and anything that happened afterwards. The coach
cannot answer "did the Eagles pay me for August".

Mockup 60's `Fechamento` is the answer: a four-column board — **Sessões abertas → Rascunho →
Enviada → Paga**. The decision taken 2026-08-28 is to buy that with the smallest possible
persistence: **a status stamp, not an invoice entity.** Line items stay computed on the fly;
only the *state* is stored.

`Minha semana` is the second panel and needs no new data at all — `events` already carry
`time`, `durationMin`, `locationId` and `athleteIds`.

## Acceptance

- A per-(affiliate, period) stamp round-trips through `coach_profile.value.billing` and
  drives which column an affiliate appears in.
- 🔴 Moving an invoice to `sent` **freezes its total**; editing a past event in that period
  must not move a sent number, but must move a draft's.
- `Fechamento`'s right pane renders the Pix QR through the **shared** `buildPixPayload` +
  extracted `qrToBase64`, honouring `pixTestCap` exactly as `ReportModal` does.
- `Minha semana` renders a week grid from `events`, coloured by affiliate, with a stats strip
  and a per-event detail pane.
- Every stat is labelled for what it actually counts — no stat claims attendance (see
  Approach 4).
- `Cobranças emitidas` appears in `Meu perfil`, reading the same stamps.
- Correct under **all 4 themes** at **1280×800 and 390×844**; `npm test` ·
  `npm run build:all` · `npm run lint --max-warnings 0` clean.

## Files

- **new** `afiliados/FechamentoPane.jsx` · `InvoiceCard.jsx` · `InvoiceDetail.jsx` ·
  `MinhaSemanaPane.jsx` · `WeekEventGrid.jsx`
- **new** `afiliados/billingState.js` + `billingState.test.js` — pure: period keys, the
  stamp reducer, the freeze rule, column assignment
- **new** `src/components/tabs/publicador/pixQr.js` — `qrToBase64` extracted from
  `events.jsx:699-706`
- `src/utils/storage.js` — `coach_profile.billing` accessors
- `afiliados/Afiliados.jsx` — two rail rows; `MeuPerfilPane.jsx` — the history table
- `src/public/gallery/groups/afiliados.jsx` — extended

**Read-only reuse:** `publicador/billing.js` (`calcTotal`, `sumByCurrency`, `fmtDate`,
`fmtDur`) · `utils/pix.js` (`buildPixPayload`, `pixClean`) · `ui/*` · `shared/ConfirmReview`.

## Approach

### 1 — The status stamp

```js
// coach_profile.value.billing[affiliateId]['2026-08'] = {
//   status: 'draft' | 'sent' | 'paid',
//   sentAt?: iso, paidAt?: iso,
//   total: number, currency: string,     // frozen when status becomes 'sent'
// }
```

🔴 **On `coach_profile`, not `settings` and not `locations`.** `settings` is
**anon-readable** — that is exactly why `boxWarnings` and #40's `classSchedule` live there —
and billing state is the opposite requirement. `coach_profile` is already anon-locked by
`0006` for this class of data (it holds the Pix key), and it is already a singleton the coach
owns. **No migration**: a new key inside an existing JSONB blob.

The freeze is the whole correctness argument. `billing.js` recomputes from live events, so
without it, editing a July event silently changes an invoice already sent to a box. A draft
stays live (that is what "conferir" means); `sent` and `paid` read their stored `total`.

`billingState.js` owns all of it as pure functions — `periodKey(date)`,
`stampFor(billing, affiliateId, period)`, `advance(stamp, to, computedTotal)`,
`columnOf(affiliate, period, billing, events)` — so the pane stays thin and the freeze rule
is unit-tested rather than hoped.

### 2 — Fechamento

```
+- kanban -------------------------------------------+- 292px ----------+
| SESSOES ABERTAS | RASCUNHO | ENVIADA  | PAGA       | Eagles . agosto  |
|  no stamp yet   |  draft   |  sent    |  paid      |   Rascunho       |
|      71 h       | R$1.480  | R$2.580  | R$2.940    | 37h x R$40,00    |
| +-------------+ |+--------+|+--------+|+---------+ |   = R$ 1.480,00  |
| |Eagles   37h | ||Eagles  |||Garra   |||Eagles jul| | QR PIX EMV       |
| |R$ 1.480,00  | ||ago     |||ago     |||R$1.360   | |  buildPixPayload |
| |24 aulas     | ||conferir|||vence   |||baixa     | |  + pixTestCap    |
| +-------------+ |+--------+|+--------+|+---------+ | TRILHA           |
|                 |                                  |  registradas ->  |
|  ^ the STAMP decides the COLUMN                    |  conferido ->    |
|    billing.js decides the NUMBER                   |  enviada -> baixa|
|                                                    | X "ver como o    |
|                                                    |   box ve" - no box|
+----------------------------------------------------+------------------+
```

`Sessões abertas` = affiliates with events in the period and **no** stamp; the other three
are the stamp's three states. Advancing is a `ConfirmReview` (it is not reversible in the
coach's head even if it is in the data), and `Enviar fatura` is where the total freezes.

The Pix half is entirely existing code, today reachable only from inside `ReportModal`.
**Extract `qrToBase64` rather than copying it** — a second hand-rolled copy of an EMV payload
path is how the four money bugs in #104 happened.

✕ `Ver como o box vê` — there is no box side. Dropped with the box panels in plans/77.

### 3 — Minha semana

```
+- week grid ---------------------------------+- 292px -------------+
| Minha semana . 24 - 29 ago                  | WOD B . seg 24      |
|      seg24 ter25 qua26 qui27 sex28 sab29    |   Eagles . 1h30     |
| 12:00 [Halt] [Halt] [Halt] [Halt]           | X VAGAS - no        |
| 18:00 [WODB] [    ] [WODB] [WODB] [WODB]    |   capacity field    |
| 20:00       [Forca]      [Forca]            | O QUE ESTA AULA     |
|                                             |   GERA              |
|   rows  = distinct ev.time                  |   1h30 x R$40,00    |
|   cells = events[date], coloured by         |   = R$ 60,00        |
|           locations[ev.locationId].color    |   [Ver na fatura ->]|
|   X "sem coach" ghost - no coach entity     | PRESENCA . 14       |
+---------------------------------------------+   ev.athleteIds     |
|  11 aulas | 14 h | 37 atletas | 2 a lancar  |   (checkboxes, not  |
|                    (athleteIds union)       |    check-in)        |
+---------------------------------------------+---------------------+
```

`Ver na fatura →` jumps to `Fechamento` with that affiliate and period selected — the
mockup's cross-panel link, and the thing that makes the two panels worth more than either
alone.

### 4 — What the stats may and may not claim

⚠️ **`events[].status` is self-reported** — a manual two-value toggle (`scheduled` |
`completed`, no `cancelled`) — and **`athleteIds` is a checkbox list the coach ticks.**
`class_executions` is what actually knows who checked in, and the two have **no join key on
either side**. That is #102, and it is the keystone plans/42 says everything waits on.

So: `a lançar` is honest (it counts events not yet toggled). `atletas distintos` must be
labelled as *marcados*, not *presentes*. **No stat on this panel may claim attendance.**
When #102 lands, these become real and the labels change with them.

✕ **Vagas / ocupação** — no capacity field exists on an event or a location, so the mockup's
88% bar has no numerator. Dropped, not faked.
✕ **Coach assignment, "sem coach", the coach legend** — no coach entity (#103).

### 5 — Cobranças emitidas, in Meu perfil

The stamp history as a table: period · quem paga · direção (`box → você` / `você → atleta`,
from `location.type`) · estado · valor. Fills the slot plans/77 deliberately left absent.

### 6 — Gallery, extended

`InvoiceCard` × 4 states + overdue · `InvoiceDetail` draft (live total) / sent (frozen) ·
`WeekEventGrid` empty / full / a cancelled cell · the Pix block with and without
`pixTestCap`.

## Verification

1. `npm test` incl. `billingState.test.js` · `npm run build:all` · `npm run lint
   --max-warnings 0`.
2. `npm run dev` at 1280×800 and 390×844 under **all 4 themes**.
3. 🔴 **The freeze, explicitly:** mark an invoice `sent`; edit a past event inside that
   period; the sent total must **not** move. Repeat on a `draft` — that total **must** move.
4. Advance draft → sent → paid and reload; the stamps persist. Then check `Meu perfil`'s
   history shows the same three rows.
5. Copy the Pix code from `Fechamento` and from `ReportModal` for the same amount — the two
   payloads must be identical (they now share one implementation), and `pixTestCap` must cap
   both.
6. `Ver na fatura →` from a week-grid event lands on the right affiliate and period.
7. Regression: `ReportModal` still generates its PDF after the `qrToBase64` extraction.
8. `gallery.html` — **open it, no CI gate** — then `design:cards` + DesignSync → approval gate.
9. `/verify` before committing; `/code-review` before pushing (L).
10. **Docs are part of Done:** #162 → Done; `CLAUDE.md` gains `coach_profile.billing` under
    the Supabase section (it is the first non-profile key on that blob) and the new panes.

## Notes

- **Size L · Sonnet.** Escalate to Opus only if the freeze semantics turn out to need real
  invoice identity — i.e. if a period's line items must survive an event being *deleted*,
  not just edited. That is the boundary between a stamp and an entity.
- Deliberately **not** here: partial payments, credit notes, multi-currency invoices in one
  stamp, reconciliation against a bank feed, and anything the box side would need.

Model: Sonnet   ·   Size: L
