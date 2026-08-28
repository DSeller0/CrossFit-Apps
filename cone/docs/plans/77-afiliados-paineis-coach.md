# 77 — #161 · Afiliados → painéis do coach: Meus afiliados + Meu perfil (mockup 60)

> Follows [plans/75](./75-design-c2-atletas-servicos.md) (C2/#56), which renames the tab and
> ships the two panes this plan re-lays-out. Design record: **mockup 60 · Afiliados
> completo**, approved 2026-08-28. Siblings: [76](./76-atletas-fichas.md) ·
> [78](./78-fechamento-semana.md), which adds the other two coach panels.
> Direction record: [plans/42](./42-afiliados-direction.md).

## Context

Mockup 60 draws eight panels behind a `Sou coach / Sou dono do box` role switch. **Four of
them are dropped and the switch with them**, because the app has no role model to switch
between: identity is a single-row `allowed_emails` allowlist with one seeded address
(`supabase/migrations/0001_init.sql:12-36`), every blob table is `id = 1` with no owner
column, and every write policy is the same `is_allowed_user()` boolean. A second allowlisted
address would read everything, including the Pix key. plans/42 puts real tenancy dead last in
its sequencing (`#82 → #30/#31`) and says plainly that nothing before that row enforces
anything.

| dropped panel | needs |
|---|---|
| Coaches | a coach entity — #103, and it is a *label*, not an identity |
| Turmas | a class catalog — #40's `settings.classSchedule` |
| Contas a pagar | a second tenant — #31 |
| Vínculos | the attendance join — #102 |

⚠️ **What is NOT dropped, because none of it is box-owner functionality:** assigning athletes
to a box (`locations[].athleteIds`), per-box sessions (Criador's `locationIds` + `?box=`
scope), and the box QR (`boxLink()` → `index.html?box=<id>`). All three are coach-side and
all three live inside `Meus afiliados`.

This plan therefore takes C2's two shipped panes to mockup 60's layout: a **vertical rail**
replacing the horizontal `PaneTabs` on desktop, and the three-column `Meus afiliados`.
`PaneTabs` was built array-driven for exactly this, so [78](./78-fechamento-semana.md) adds
its two panels as two array rows.

**Zero data change.** `locations[]`'s shape is read by `Config.jsx:41`, `Criador.jsx:57`,
`AgendaView.jsx:42,659`, `events.jsx:13,604`, `billing.js:45-46` and `stateBackup.js:39`.
Nothing in the blob moves, is renamed, or is added.

## Acceptance

- The rail is vertical at ≥768px, horizontal strip on mobile, and takes its items as an
  array — adding a pane is one row.
- `Meus afiliados` is three columns: affiliate list · detail · `A receber` summary.
- The detail carries the **two-direction pair**, the month's sessions, the athlete
  assignment and the QR.
- `Meu perfil` carries Recebimento (Pix) + a read-only Taxas por afiliado summary.
  **`Quem vê o quê` is not built** (see Approach 4).
- Every existing consumer still works: Agenda resolves a rate, the Relatório bills and
  stamps Pix, Criador's box picker and Configurações' box list populate, the QR opens a
  scoped index.
- Zero non-data hex, zero non-circle radius literals, zero `--theme-accent`, zero
  `window.confirm`, zero unnamed icon-only buttons — C2's acceptance, held.
- Correct under **all 4 themes** at **1280×800 and 390×844**.
- `npm test` · `npm run build:all` · `npm run lint --max-warnings 0` all clean.

## Files

- `src/components/tabs/afiliados/Afiliados.jsx` — rail + stage router.
- **new** `afiliados/AffiliateRail.jsx` · `DirectionPair.jsx` · `AffiliateSessions.jsx` ·
  `ReceivableRail.jsx`
- **kept from C2** `AffiliateRow` · `AffiliateFormModal` · `AthleteAssignment` ·
  `BoxQrModal` · `CurrencyInput` · `affiliateHelpers.js` · `Afiliados.module.css` ·
  `PaneTabs` (gains the vertical variant)
- **renamed** `MeuNegocioPane.jsx` → `MeuPerfilPane.jsx`
- `src/public/gallery/groups/afiliados.jsx` — extended

**Read-only reuse:** `ui/{Button,Input,Card,ColorField,EmptyState,Modal}` ·
`publicador/billing.js` (`calcTotal`, `sumByCurrency`, `fmtDur`) · `utils/pix.js`.

## Approach

### 1 — The rail

```
+--------------+------------------------------------------------+
| RAIL  214px  |  STAGE                                         |
|              |                                                |
| PAINEIS      |                                                |
| >Meus afiliados     <- this plan                              |
|  Fechamento         <- plans/78                               |
|  Minha semana       <- plans/78                               |
| CONTA        |                                                |
|  Meu perfil         <- this plan                              |
|                                                               |
| X "Sou dono do box" + 4 panels — dropped, no role model       |
+--------------+------------------------------------------------+
```

The rail renders `PaneTabs`' array vertically with an optional `group` label and an optional
`count` per row. Below 768px it falls back to the existing horizontal strip — a 214px rail
on a 390px screen leaves nothing for the stage.

### 2 — Meus afiliados

```
+- 232px ---------+- detail ----------------------+- 262px ------------+
| ONDE EU TRABALHO| (EA) Eagles    [Editar] [QR]  | A RECEBER · agosto |
|  Eagles         |      Box · R$ 40/hora         |   R$ 4.060,00      |
|    Box R$40/h   +-------------------------------+   3 afiliados      |
|  Garra          | +- O BOX PAGA VOCE ---------+ | +----------------+ |
|    Box R$45/h   | | taxa    R$ 40,00 / hora   | | | Eagles   1.480 | |
|  Personal manha | | agosto  R$ 1.480,00       | | | Garra      900 | |
|    R$120/sessao | |   -> billing.calcTotal    | | | Personal 1.680 | |
|  Novo box       | +---------------------------+ | +----------------+ |
|    sem taxa     | +- VOCE COBRA O ATLETA -----+ |                    |
|                 | | Pix   joao@cone.fit       | |  per-location sum  |
| [+ Novo]        | |   so entra em personal    | |  of calcTotal      |
|                 | +---------------------------+ |                    |
|                 | SESSOES DE AGOSTO   37h / 24  |                    |
|                 |  28/08 WOD 18h 1h30 14  60,00 |                    |
|                 |   -> events[] filtered by loc |                    |
|                 | ATLETAS NO BOX   [x][ ][x][x] |                    |
|                 |   -> locations[].athleteIds   |                    |
|                 | QR   index.html?box=<id>      |                    |
+-----------------+-------------------------------+--------------------+
```

🔑 **The two-direction pair is the mockup's best idea and it costs nothing.** It states on
screen which way money flows: `locations[].rate` is *what the box pays the coach*, while the
Pix key is *what the coach charges an athlete*. plans/42 decision 2 exists precisely because
one field name plus one Pix identity plus two directions is how a wrong invoice gets
generated silently. Building the explainer is the cheapest available guard against that, and
it needs no new data — the second box reads `coach_profile.pixKey` and says where it applies.

The month total is `calcTotal` over the location's events for the period; the `A receber`
rail is the same call summed per location, through `sumByCurrency` (which exists because a
group can span currencies — do not flatten it to a number).

⚠️ **Keep the existing sentence at `Servicos.jsx:506-511`.** The athlete checkbox list is
*not* the box's real roster — group-class athletes also arrive through results — and the copy
already says so. Losing it in the move would make the list look authoritative.

⚠️ `AthleteAssignment`'s `athleteIds` can hold a deleted athlete's id: no database can
enforce integrity inside a JSONB array (plans/42 decision 7). Render unknown ids as a
removable "atleta removido" row rather than silently dropping them.

### 3 — Meu perfil

```
+- detail ------------------------------+- 282px --------------+
| +- RECEBIMENTO -------------------+   | X QUEM VE O QUE      |
| | Chave Pix     joao@cone.fit     |   |   not built - see 4  |
| | Nome          Joao Marcelo F.   |   |                      |
| | Cidade        Recife            |   | CONTA                |
| | pixEnabled / pixTestCap         |   |   e-mail . desde     |
| +---------------------------------+   |   afiliados ativos   |
| +- TAXAS POR AFILIADO ------------+   |                      |
| | Eagles           R$ 40,00/h     |   |                      |
| | Garra            R$ 45,00/h     |   |                      |
| | Novo box         definir        |   |                      |
| +---------------------------------+   |                      |
| [ ] COBRANCAS EMITIDAS ... plans/78   |                      |
+---------------------------------------+----------------------+
```

`Taxas por afiliado` is read-only and links to the affiliate — the rate is edited where it
belongs, on the affiliate record. `Cobranças emitidas` needs the status stamp and is
therefore absent until plans/78, not placeholdered.

⚠️ The debounced coach-profile save (`Servicos.jsx:707-714`, plans/45's fix) must survive the
move to its own pane — it skips its first run deliberately, and re-adding a naive
`useEffect(() => save(x), [x])` reintroduces the #109 write-on-mount bug.

### 4 — Why `Quem vê o quê` is dropped

🔴 The panel describes per-affiliate visibility — "the box sees your invoice total and your
Pix key, but not your other affiliates' rates". **No layer of the app implements any part of
that.** Shipping it would assert isolation the app does not have, to the one person best
placed to rely on it. plans/42's sequencing note is explicit that this must be said plainly
rather than implied away. When #31 lands, the panel becomes true and can be built then.

### 5 — Gallery group `Afiliados`, extended

Client-free items only. New cases: `AffiliateRail` desktop / mobile / with counts ·
`DirectionPair` box (pays you) / personal (you charge) / no rate configured ·
`AffiliateSessions` empty / few / a cancelled row · `ReceivableRail` single currency /
mixed currencies / zero.

## Verification

1. `npm test` · `npm run build:all` · `npm run lint --max-warnings 0`.
2. `npm run dev` at 1280×800 and 390×844 under **all 4 themes**. ⚠️ If a change does not
   appear, unregister the service worker first (`cone-v*` poisoning).
3. Add / edit / delete an affiliate (the `ConfirmReview` states the consequence); toggle
   athletes; open the QR and copy the link; on `Meu perfil` edit the Pix fields, set the test
   cap, **reload and confirm it persisted**.
4. 🔴 **Regression the restructure could break — check each explicitly:** Agenda's event form
   still resolves a service rate; the **Relatório** still bills and still stamps Pix
   (`events.jsx` + `billing.js` read `locations[]` directly, and a shape change there is the
   failure mode this plan forbids); Criador's box picker populates; Configurações' box list
   populates; `index.html?box=<id>` still scopes.
5. Confirm the left column is the affiliate list — the C2 overflow fix (coach profile no
   longer stacked above it) must hold.
6. `gallery.html` — **open it, no CI gate** — then `npm run design:cards` + DesignSync →
   stop at the approval gate.
7. `/verify` before committing; `/code-review` before pushing (M).
8. **Docs are part of Done:** #161 → Done in `BACKLOG.md`; update `CLAUDE.md`'s Afiliados
   section (the rail, the pane list, the gallery item count, the test count).

Model: Sonnet   ·   Size: M
