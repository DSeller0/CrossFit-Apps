# Cone — Product Definition (draft)

First-draft product doc: who Cone serves, what services it bundles, and a **non-binding** sketch of future use tiers. Horizon at writing (2026-07-09): **single coach, single box for at least ~6 months** — nothing here is scheduled work; it exists so feature-gating decisions later start from an agreed map instead of a blank page. Feature-level detail lives in [FEATURES.md](./FEATURES.md).

## Personas

- **Coach (solo)** — today's only paying-equivalent user; owns everything: programs sessions (Criador), runs classes live (Quadro ao Vivo + TV), registers/reviews results, manages athletes/PRs/goals, exports grades (Publicador), tracks his coaching business (Afiliados: locations + hourly rates + Pix; Agenda: class/personal calendar + completion + Relatório). Authenticated (OTP + allowlist).
- **Athlete** — a regular at the coach's classes. No login today (identity = coach-registered record + device-local selection; changes with #30/#31). Consumes schedule/today hub, self-logs results, tracks PRs/goals/profile, appears on leaderboards, checks in to classes.
- **Guest / drop-in** — walks in, scans the TV QR, checks in by typed name, gets day-scoped results (`anon_results`) — deliberately not durable. Conversion path: coach registers them as an athlete.
- **Box (owner/multi-coach)** — future. What changes vs. solo coach: multiple coach seats, athlete identity + booking (#40), per-box branding (Configurações identity + the #43 "Common" theme is the box-friendly neutral skin), possibly per-location separation (Afiliados' `locations` already models this).

## Services (what the product bundles today)

1. **Programming** — structured session building: 12 block types, stations, complexes, per-gender/pct/progression intensity, registry with defaults. The data model is the moat (market apps use free text — see the 2026-07-04 feature-ideas market read).
2. **Publishing** — public pages (athlete-facing web) + printable/exportable grades (Publicador) + visibility control.
3. **Live class operations** — check-in (QR), roster, live registration, TV wall display with timer/leaderboard/rotation. This is Cone's SugarWOD-whiteboard equivalent.
4. **Performance tracking** — results, PRs, goals, RX rates, leaderboards, per-athlete profiles; (future: adaptations #39, progression charts).
5. **Coaching business** — locations + rates, Pix, class/personal calendar, completion reporting. (PushPress-lite; invisible to athletes.)

## Tier sketch (non-binding)

Lever candidates, from the gating column in FEATURES.md:

| | **Free coach** | **Pro coach** | **Box** (future) |
|---|---|---|---|
| Programming + publishing + timer + basic results/leaderboard | ✔ | ✔ | ✔ |
| TV live system (tv.html + Quadro ao Vivo + realtime) | — | ✔ | ✔ |
| Exports (Publicador PDF/img suite) | limited | ✔ | ✔ |
| Templates, RM/goals tooling, KPIs, adaptations (#39), body metrics (#19) | — | ✔ | ✔ |
| Business tabs (Afiliados/Agenda) | — | ✔ | ✔ |
| Coach seats | 1 | 1 | N |
| Athlete identity + booking (#40) | — | — | ✔ |
| Themes | 2 | all | all + branding |

Principles: the free tier must remain a genuinely usable solo-coach tool (programming + publishing + logging are `core`, never gated); gates sit on *operational leverage* (TV, exports, business, analytics), not on athletes' access to their own data.

## Gating implications (technical, when the time comes)

- **Identity first.** Per-feature gating for athletes is meaningless before #30/#31 (athlete identity/auth). Coach-side gating only needs a plan flag on the coach account.
- **Cheapest first step:** a `plan` field in the `settings` blob (or `coach_profile`) read by the SPA to show/hide tabs & features — honor-system gating, fine for early tiers since all coach writes already require `is_allowed_user()`.
- **Real enforcement** (RLS-level, e.g. TV realtime or RPCs refusing by plan) needs an `entitlements` concept server-side — design alongside #30/#31, not before.
- Keep FEATURES.md's Gate? column current as features ship; it is the tier design's source of truth.
