# TotalPass + Wellhub integration — proposal (pending gym-owner discussion)

> **Status: PROPOSAL — not adopted.** Nothing from this doc is on the backlog board. Before anything moves: (1) discuss with the gym owner, (2) answer the open-questions checklist below (starting with T0 — whether the box even has direct portal access). Placeholder items P0–P5 get real backlog numbers only if/when adopted into BACKLOG.md. Hard prerequisite for most of it: per-athlete identity (**#30/#31**) and the turma schedule (**#40**).

## Context

The box accepts members through **TotalPass** and **Wellhub (ex-Gympass)** — corporate-wellness aggregators that pay the gym **per validated visit**. Today those check-ins are validated through **Tecnofit** ("Technofit"), a paid gym-management SaaS officially integrated with both aggregators. The question analyzed here: how could CONE itself integrate with TotalPass and Wellhub — either alongside Tecnofit (informational) or eventually replacing it (payout-critical). End-state deliberately **undecided**; both paths are covered.

How the money works, for grounding: the athlete checks in via the aggregator's own app (geofenced; TotalPass ~150 m, check-in expires ~90 min), the gym's integrated system receives/validates it, and that validated visit is what the aggregator pays the box for. Booking (classes visible in the aggregator's app) never replaces check-in — it only adds discoverability and pre-class headcount.

## Verified facts (researched 2026-07-04)

### TotalPass — accessible: public developer portal

[dev.totalpass.com](https://dev.totalpass.com) documents the full partner API (even exposes an `llms.txt`):

- **Auth:** `POST /partner/auth` → JWT (24 h renewal); check-in endpoints use an `x-api-key` header.
- **Check-in validation:** `POST https://api.totalpass.com/service/v1/track_usages` with `service_provider_code` (gym id) — **204 = valid visit** (release the turnstile), 401 = auth failure, 422 = token invalid / check-in expired / wrong gym / plan doesn't cover the gym ([reference](https://dev.totalpass.com/reference/post_track-usages)). Also `POST /track-usages/validate` (check-only, faster, doesn't consume) and `POST /track-usages/beneficiaries/code`.
- **Booking/classes:** full events CRUD (`GET/POST/PUT/DELETE /partner/events` + event-occurrence endpoints), slot management (`GET /partner/slot`, `PUT /partner/slot/confirmslot/{slotId}`), `GET /partner/plans` (link classes to TotalPass products/prices).
- **Webhooks:** `POST /partner/webhook/create` etc. — TotalPass **pushes check-in events** to a registered URL.
- **Identity:** the user's TotalPass token is typically their **CPF** (per [Software Pilates' integration docs](https://softwarepilates.freshdesk.com/support/solutions/articles/154000093537-totalpass-como-integrar-e-como-funciona-checkin-e-booking); integrated ERPs store it on the student record).
- **Credentials:** the gym owner generates an **API Key + integration code** in the [Portal de Academias when enabling ERP integration](https://ajuda.totalpass.com.br/hc/pt-br/articles/19099708739611-Como-habilitar-a-integra%C3%A7%C3%A3o-com-meu-ERP). The portal flow asks *which ERP* — whether a custom/proprietary system can be registered is open question **T1**.

### Wellhub — partnership-gated

[developers.wellhub.com](https://developers.wellhub.com) documents an **Access Control API** and a **Booking API**, but access requires onboarding by Wellhub's team ([integration request form](https://wellhub.com/en-us/partners/integrate-with-wellhub/)); they normally onboard *platforms* (Mindbody, ClubReady, Eversports — "50+ booking systems"), not single gyms. Expect a slow lane, measured in months, with possible "why not use a supported platform?" pushback.

- **Access Control API:** `POST https://api.partners.gympass.com/access/v1/validate` with the user's `gympass_id` — confirms a check-in the user made in the Wellhub app; check-ins have an expiration window. Sandbox: `apitesting.partners.gympass.com/access/v1`. One API token covers both APIs.
- **Booking API:** required for the gym's classes to be listed/bookable in the Wellhub app. Per [Tecnofit's own docs](https://ajuda.tecnofit.com.br/pt-BR/support/solutions/articles/67000705030-como-integrar-com-a-wellhub-): the student record carries a linked **"Wellhub ID (Gym ID)"**, and Wellhub **Product IDs** map passes to bookable classes and affect payout — a commercial configuration, not just code.
- **Manual fallback (permanent plan B):** partners can always validate check-ins by hand in the Wellhub Partners portal — so a failed/slow Wellhub integration never blocks anything; it just costs a daily manual chore.

## Recommended architecture

**Keep CONE's client purely static; put every credential and aggregator call in Supabase Edge Functions; land every inbound event in an append-only ledger; let attendance semantics resolve from the ledger, coach-correctable.**

1. **Server-side home = Supabase Edge Functions** (`supabase/functions/` — greenfield, but the CLI + linked-prod workflow already exists). Non-negotiable: every `VITE_*` var ships publicly in the client bundle, so partner API keys can never live client-side. Secrets via `supabase secrets set` (local mirror in a gitignored `.env` consumed by `supabase functions serve --env-file`). Deployment stays manual CLI (`supabase functions deploy`), matching the `db push` posture.
2. **Protected identity map — new `athlete_private` table** (`athlete_id, cpf, gympass_id`): TotalPass identifies by CPF, Wellhub by gympass_id — PII that must **not** enter the anon-readable `athletes` blob. RLS default-deny (the `allowed_emails` posture), single `is_allowed_user()` policy so the coach's SPA can CRUD it directly; edge functions use the service role. Watch out: `0001_init.sql`'s `ALTER DEFAULT PRIVILEGES` auto-grants table privileges to anon — RLS is the real gate, but add an explicit revoke for intent.
3. **Append-only ledger — new `partner_checkins` table** (`provider, provider_event_id, athlete_id, status: received|matched|unmatched|validated|failed, class_execution_id, date_key, raw, timestamps`, `unique(provider, provider_event_id)` for idempotent webhook retries). Webhooks **never** write directly into `class_executions` or `results_v2`: check-ins arrive before the coach starts the class (no class row exists yet), CPF matching can fail, and payout depends on never dropping an event. `raw` holds the payload (contains CPF) — as protected as `athlete_private`. Unmatched rows park for coach resolution instead of vanishing.
4. **Roster surfacing:** matched check-ins appear in TvController's ClassPanel as "Esperados/Chegou" chips — the exact merge point #40 defines for bookings — and confirm into `class_executions.athlete_ids` via the existing `class_checkin` append semantics (service-role call). Conservative rule: auto-append only when exactly one class is live; otherwise one-tap coach confirm. `results_v2` is never touched by the integration (a validated visit is attendance, not a logged result).

### Cross-cutting

- **Webhook auth is the top security risk:** an unauthenticated "mark present" endpoint is a payout-fraud vector. The webhook function runs with `verify_jwt = false` (TotalPass won't send a Supabase JWT) and must authenticate the caller via the provider's mechanism — HMAC signature if offered, else a high-entropy secret in the registered URL. Confirm the mechanism (**T2**) before going live. Client-triggered functions (validate) keep `verify_jwt = true` + app-level checks (coach via `allowed_emails`; athlete via #31's JWT↔athlete mapping).
- **Monitoring = the ledger:** events are never dropped, only parked. Layer 1: red-badge counter on `unmatched`/`failed` rows in the SPA. Layer 2 (at cutover): daily reconciliation view vs the aggregator's own visit report. Layer 3 (cutover prerequisite): uptime ping on the webhook function — a silently dead endpoint produces zero failed rows.
- **LGPD (CPF):** collected only for TotalPass athletes, stored only in `athlete_private` + ledger `raw` (both RLS-sealed), never client-side, masked in logs (`***.***.*12-34`). One consent sentence when collecting ("usado apenas para validar seu check-in TotalPass"). Deleting an athlete must cascade to `athlete_private` and anonymize ledger `raw`. Hashing is not an option — the raw CPF is required to call `track_usages`.

## Phased plan — placeholder items (numbers assigned only if adopted)

| Item | What | Size | Needs |
|---|---|---|---|
| **P0** Membership origin | `plan: 'proprio'\|'totalpass'\|'wellhub'` field on the athlete + origin badge + attendance-by-origin stats. Standalone value **today**: reconcile CONE attendance vs Tecnofit/aggregator payout reports (missed validations = lost money), revenue-mix insight, and the data foundation every later phase needs. | S | nothing |
| **P1** Foundations | Migration (`athlete_private` + `partner_checkins`), "Convênios" card in Atletas detail (masked CPF / gympass_id inputs), coach-facing ledger view, edge-function scaffold + secrets pattern. Defines the server-side pattern for the whole track. | M | — (soft: #30/#31 for athlete-facing surfaces) |
| **P2** TotalPass check-in ingestion | `totalpass-webhook` fn (authenticate → idempotent ledger insert → CPF match) + `partner-validate` fn (`track_usages`, 204/422 → ledger) + Esperados/Chegou roster chips. First real automation. | L | P1 + answers T1–T3 |
| **P3** TotalPass booking mirror | `settings.classSchedule` → `/partner/events` sync (coach-triggered + drift badge); slot reservations → `class_bookings (provider='totalpass')`; `confirmslot` on attendance confirm. | L | **#40** + P2 |
| **P4** Wellhub Access Control | Wellhub branch of `partner-validate` (gympass_id looked up server-side); validate fired at the attendance-confirmation moment (check-ins expire — surface "validar Wellhub" state on the roster chip). | M code | P1 + **Wellhub partnership** (start the conversation during P1; code waits) |
| **P5** Wellhub booking + certification | Class inventory in the Wellhub app; bookings → `class_bookings (provider='wellhub')`; Product-ID/payout mapping; pass their sandbox certification. Contract only knowable post-partnership — build as a thin adapter over #40's model. | L | **#40** + P4 + certification |

**Design coordination note for #40:** when #40 gets planned, `class_bookings` should be born with `provider text default 'cone'` and `provider_booking_id text` columns so P3/P5 don't need a follow-up migration.

**Dependency graph:** #30/#31 → (#40) → P1 → P2 → P3; P4/P5 additionally gated on the Wellhub partnership. P0 is free, anytime. #40 gates only the booking mirrors, not check-in ingestion.

## Tecnofit — coexistence vs replacement (decision deferred)

**Principle if replacement is chosen: Tecnofit stays validator of record per aggregator until that aggregator's cutover checklist passes. Cut over per-aggregator, never big-bang.**

| Stage | TotalPass validation | Wellhub validation | Tecnofit needed? |
|---|---|---|---|
| Today / P0 | Tecnofit | Tecnofit | Yes |
| P2 shadow (if T5 allows parallel registration) | Tecnofit (CONE ingests in parallel) | Tecnofit | Yes |
| TotalPass cutover | **CONE** | Tecnofit | Yes (Wellhub only) |
| Wellhub cutover | CONE | **CONE** (or Partners-portal manual) | Only for non-aggregator features |
| Exit | CONE | CONE | Cancelled |

- **Coexistence end-state:** Tecnofit keeps payout validation forever; CONE's ingestion is informational (rosters/attendance). Zero payout risk; the box keeps paying Tecnofit; hinges on **T5** (can two systems be registered at once?).
- **Cutover checklist (per aggregator):** unmatched-CPF rate < ~2% over 2+ weeks; zero unexplained `failed` ledger rows for 2 weeks; monthly visit count reconciles with the aggregator's report; manual fallback rehearsed; uptime alerting live; rollback path confirmed (Tecnofit paid-but-idle for one cycle). Cut over at the start of a billing cycle, reconcile daily for the full first cycle.
- **Replacement scope honesty (TEC2):** Tecnofit is a full ERP — inventory what else the box uses it for (own-plan billing/contracts, door-access hardware, CRM) before any cancellation decision. Anything CONE doesn't cover needs an explicit "we accept losing this".

## Open questions — the gym-owner discussion agenda

| # | Question | Channel |
|---|---|---|
| **T0** | Does the box have its own logins for the TotalPass Portal de Academias and the Wellhub Partners portal (or does everything run inside Tecnofit)? | gym owner |
| **T1** | Can a custom/proprietary system be registered as the "ERP" in the TotalPass portal, or only listed vendors? | TotalPass support / dev.totalpass.com |
| **T2** | TotalPass webhook auth mechanism (HMAC? URL secret? none?) + exact check-in payload shape | TotalPass |
| **T3** | Is the webhook push authoritative for payout, or must the ERP call `track_usages` (is 204 the payable event)? | TotalPass |
| **T4** | Sandbox/test environment availability | TotalPass |
| **T5** | Can CONE register in parallel while Tecnofit stays active (shadow mode), or one integration per gym? | TotalPass |
| **T6** | Are slot reservations webhook-notified or poll-only? | TotalPass |
| **W1** | Will Wellhub onboard a single-gym proprietary system at all? | Wellhub form |
| **W2** | Booking API contract + certification requirements (visible post-partnership only) | Wellhub |
| **W3** | Sandbox credentials timeline | Wellhub |
| **TEC1** | Does a gym customer get API/CSV access to its own check-in data? (bridge/reconciliation only — no build) | Tecnofit support |
| **TEC2** | What else does the box use Tecnofit for besides aggregator validation? | gym owner |

## Sources

- [TotalPass developer portal — API overview](https://dev.totalpass.com/reference/overview) · [track_usages reference](https://dev.totalpass.com/reference/post_track-usages) · [full surface via llms.txt](https://dev.totalpass.com/llms.txt)
- [TotalPass — habilitar integração com ERP](https://ajuda.totalpass.com.br/hc/pt-br/articles/19099708739611-Como-habilitar-a-integra%C3%A7%C3%A3o-com-meu-ERP)
- [Wellhub developers portal](https://developers.wellhub.com/product/access-control-api/1.0/getting-started) · [Integrate with Wellhub](https://wellhub.com/en-us/partners/integrate-with-wellhub/)
- [Tecnofit × Wellhub integration docs](https://ajuda.tecnofit.com.br/pt-BR/support/solutions/articles/67000705030-como-integrar-com-a-wellhub-) · [Tecnofit × TotalPass](https://ajuda.tecnofit.com.br/pt-BR/support/solutions/articles/67000721045-como-integrar-com-a-totalpass-)
- [Software Pilates — TotalPass check-in/booking mechanics](https://softwarepilates.freshdesk.com/support/solutions/articles/154000093537-totalpass-como-integrar-e-como-funciona-checkin-e-booking)
