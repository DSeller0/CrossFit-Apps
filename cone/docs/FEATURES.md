# Cone — Feature Catalog

Living inventory of every user-facing capability: where it lives, who consumes it, what data it touches, and whether it's a future gating candidate. Harvested from the 2026-07-09 design-benchmark walk (all 18 surfaces driven live); update when features ship or move. Companion docs: [PRODUCT.md](./PRODUCT.md) (personas, services, tier sketch) · [MOBILE.md](./MOBILE.md).

**Roles:** `guest` (no identity, name-typed) · `athlete` (registered by coach, no login — identity via picker/localStorage until #30/#31) · `coach` (OTP-authenticated, `is_allowed_user()`).
**Gate?** = candidate for per-feature/tier gating once entitlements exist (see PRODUCT.md). `core` = never gate (the free product must keep it).

## Public pages (anon-readable, athlete-facing)

| Feature | Surface | Role | Data surface | Writes via | Gate? |
|---|---|---|---|---|---|
| Today/yesterday/tomorrow session hub | index.html | athlete/guest | `sessions` blob | — | core |
| PWA install banner (A2HS) | index.html (`beforeinstallprompt`) | all | — | — | core |
| Week schedule + block/exercise detail | schedule.html | athlete/guest | `sessions`, `exercise_registry`, `goals_data` (PRs for RM chips) | — | core |
| Exercise check-off + progress (per device) | schedule.html | athlete | localStorage | — | core |
| RM chip + calculator (PR-derived autofill) | schedule.html | athlete | `goals_data` | — | Gate: Pro |
| Demo video links | schedule.html | all | `exercise_registry` | — | core |
| Class check-in — listed athlete | schedule.html `?checkin=` | athlete | `class_executions` | `class_checkin` RPC | core |
| Class check-in — guest | schedule.html `?checkin=` | guest | `class_executions.anon_names` | `class_checkin` RPC | core |
| Athlete self-log (from block card) | schedule.html | athlete | `results_v2` | `log_result` RPC | core |
| Desktop registration (roster sheet) | schedule.html (desktop) | athlete/coach | `results_v2` | `log_result` RPC | core |
| Launch timer pre-configured from block | schedule.html → timer.html | all | localStorage handoff | — | core |
| Week results browse + self-log w/ confirm modal | results.html | athlete | `results_v2`, `sessions` | `log_result` RPC | core |
| Per-WOD leaderboard (from results page) | results.html | all | `results_v2` | — | core |
| Athlete profile: stat tiles, streak, RX rate | me.html | athlete | `results_v2`, `athletes`, `goals_data` | — | core |
| PR log (submit/clear) + per-category progress | me.html | athlete | `goals_data` | `submit_pr` / `clear_pr` RPCs | core |
| Goals display + progress % | me.html | athlete | `goals_data` | — | Gate: Pro |
| Body metrics UI (save is a no-op — #19) | me.html | athlete | — (pending table) | — | Gate: Pro |
| All-time rankings + scale filters | leaderboard.html | all | `results_v2`, `lb_colors` | — | core |
| ~~Athlete goal lookup (legacy design)~~ | ~~athletes.html~~ | — | — | — | **RETIRED (#52)** — redirects to me.html; its one unique idea (character-stat bars) became [plans/22](./plans/22-athlete-character-stats.md) |
| Standalone WOD timer (all types) | timer.html | all | localStorage | — | core |
| TV wall display: WOD/timer/results/QR slides | tv.html | all (display) | `tv_state`, `class_executions`, `results_v2` realtime | — | Gate: Pro (TV system) |
| localStorage data recovery | recover.html | all | localStorage | — | core |

## Coach SPA (`cone/`, OTP + allowlist)

| Feature | Tab | Data surface | Gate? |
|---|---|---|---|
| Session builder (12 block types, stations, complexes, intensity modes, ghost defaults #38) | Criador | `sessions`, `exercise_registry`, `templates` | core |
| Templates save/apply | Criador | `templates` | Gate: Pro |
| Publish/visibility (`session.public`), per-athlete sessions (`mainTraining`) | Criador | `sessions` | core / personal-training = Pro |
| Athlete CRUD, levels, colors, PR/goal editing | Atletas | `athletes`, `goals_data` | core |
| Ficha "Histórico de resultados" — RPE médio + sparkline · Taxa RX · Evolução de carga · the logged-result list (migrated out of Resultados' retired Histórico sub-tab, #57) | Atletas | `results_v2` | Pro |
| (#39 planned: per-athlete adaptations) | Atletas | `goals_data.adaptations` | Gate: Pro |
| Exercise registry CRUD (**248** entries after #94's two rounds of prod additions — measured live 2026-07-26, see #96; the old "146" predated them: categories, video, defaults) | Exercícios | `exercise_registry` | core |
| Coach profile + Pix payment config | Afiliados · Meu perfil | `coach_profile` | Gate: business |
| Locations ("boxes") w/ hourly rates + per-local athletes | Afiliados · Meus afiliados | `locations` | Gate: business |
| **Versioned rate history** — a rate change appends a version instead of overwriting, so a past event keeps the price it was booked at (#154) | Afiliados | `locations[].rateHistory` | Gate: business |
| **Two-direction pair** — what the box pays the coach vs. what the coach charges the athlete, same field, opposite arrows by `loc.type` (#161) | Afiliados · Meus afiliados | `locations` | Gate: business |
| **Fechamento** — the invoice board (Sessões abertas → Rascunho → Enviada → Paga). A status **stamp**, not an invoice entity; `sent`/`paid` freeze their total (#162) | Afiliados · Fechamento | `coach_profile.value.billing` | **Gate: business — the most gateable surface in the app** |
| **Minha semana** — the coach's own week as a time grid over `events`; no new data (#162) | Afiliados · Minha semana | `events` | Gate: business |
| **A receber** — outstanding-by-affiliate rail; a `paid` period drops out, a `sent` one still counts (#163) | Afiliados · Meus afiliados | `events` + `billing` | Gate: business |
| Log a whole class: pick the session, log each athlete in place, read the class back (RPE médio · Taxa RX · Flags · Distribuição). Per-block **"não fez"** (#157) keeps absence distinct from a zero score | Resultados | `results_v2` | core / class read-back = Pro |
| Coach calendar: classes + personal sessions, completion stats, Relatório | Agenda | `events` blob | Gate: business |
| Grade exports: Diário/Semanal/Calendário/Mobile ×2/Mobile Semanal ×2 + Apresentar (PDF/img) | Publicador | `sessions` + jsPDF | Gate: Pro |
| Live class ops: start/end class, roster, live registration, guest results | Quadro ao Vivo | `class_executions`, `results_v2`, `tv_state` | Gate: Pro (TV system) |
| TV slide control + timer push + group rotation | Quadro ao Vivo | `tv_state` | Gate: Pro (TV system) |
| Gym identity (name/modalidade/logo) + theme selection (4 themes; #43 adds 2 more themes = 4 more `html.theme-*` classes) | Configurações | `settings` | core / themes = Pro candidate |
| State backup/restore (Salvar/Carregar/Limpar estado, Sincronizar) | Configurações → Dados | all blobs | core |

## Infrastructure capabilities (invisible but gateable)

| Capability | Mechanism | Gate? |
|---|---|---|
| Realtime TV/leaderboard updates | `supabase_realtime` on `tv_state`/`results_v2`/`class_executions` | rides with TV system |
| Anon write hardening | `class_checkin`/`log_result` SECURITY DEFINER RPCs (#7) | — (security, never gate) |
| PWA installability | `manifest.json` (all public pages) + Index.jsx banner | core |
| OTP auth + coach allowlist | GoTrue + `allowed_emails`/`is_allowed_user()` | seat count = tier lever |

## Known feature gaps vs market (tracked)

- Booking/turmas + pre-check-in — #40, blocked on #30/#31 (table stakes at Wodify/PushPress/Glofox).
- Athlete identity/login — #30/#31 (prerequisite for gating, booking, self-service).
- Per-movement progression charts (BTWB's core) — untracked idea; data already exists in `results_v2`/`goals_data`; pairs with #21.
- Community loop (fist-bumps/comments) — deliberately out while identity-less.
- Body-metrics persistence — #19.
- Result splits — #20.
