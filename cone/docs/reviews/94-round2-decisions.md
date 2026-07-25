# #94 · Round 2 — decision list

Companion to [`94-session-registry-audit.md`](./94-session-registry-audit.md). Round 1 closed
at **34.8%** unresolved; the round-2 **code** fixes (below, already shipped) took it to
**30.7%**. What's left needs *your* calls, batched so you can answer per batch rather than
per name.

**Comment convention** — same as the audit: a `> **[Comment]** --` blockquote on top of the
batch it refers to.

---

## Already done in code (no decision needed)

Shipped with this round, **34.8% → 30.7%**, movements 102 → 80, prescription 106 → 80:

- **Slot letters** — `A- 3 Snatch Balance`, `B 3 Snatch Balance`, `B- 2 Muscle Snatch` now
  resolve. Only stripped when a number follows, so the interval `A cada 3'` is safe.
- **Trailing tempo/pause notes** — `Bench Press 3" pausa`, `Squat clean 30" entre as reps`,
  `2 split jerk 2" Dip 2" recepção`, `3 Front Squat 5" de pausa em baixo`.
- **Trailing qualifiers in parens** — `Split Jerk (BNK)`, `Row ( forte )`. Safe because a real
  entry whose own name ends in `(…)` — `Hip Distraction (banded)` — matches exactly first.
- **Alternating suffix** — `DB Snatch alt`, `martelo alt`, `Perdigueiro alternando`.
- **Misspellings → existing entries** — `Back squay`→Back Squat · `Hollowrock`→Hollow Rock ·
  `Romenian Deadlift`→Romanian Deadlift · `Hummer Curl`→Hammer Curl · `Nordic Hamstring Curl`
  →Nordic Curl · `Dragon Fly`→Dragon Flag · `Celan`→Clean · `Shoulders Press`→Strict Press ·
  `A Swing`/`Kb American Swing`→American KB Swing · `Vups`→V-up · `Kh oh walking`→Dual KB OH.
- **Audit classifier** — structural labels (`MMII`, `MMSS`, `Buy in/out`, `Mix`, `sets`,
  `Max C&J`, `Row ou 1000m Run`, `60% Rm`, `80/85/90`) no longer sit in the "register me"
  bucket. Noise 9 → 25, and bucket 1 is now honest.

---

## Batch A · Abs / Core (pt-BR) — ~19 occurrences

> **[Comment]** --

The gym's core work is typed in pt-BR and has no registry home. **My reading is that two of
these are existing entries under English names** — confirm or correct:

| Typed | ~Occ | Recommendation |
|---|---|---|
| ABS ANILHA · Abdominal com Anilha | 4 | **alias → `Plate Sit-up`** (existing) |
| Prancha lat E · Prancha lat D | 2 | **alias → `Side Plank`** (E/D = esquerda/direita) |
| ABS INFRA | 5 | **new entry** — "Abs Infra" (Core). Lower-abs leg raise? |
| KB Oblíquo | 2 | **new entry** (Core) |
| ABS KB UNILATERAL | 1 | **new entry** (Core) |
| Abs medball · Abs remador | 2 | **new entries** (Core) |
| Russian Twist KB | 1 | **new entry** (Core) — you have plain `Russian Twist` |
| Elevação de Joelho 2 KB | 1 | **new entry** (Core) |
| Ponte unipodal · Prancha dinâmica | 2 | **new entries** (Core) |

## Batch B · DB / KB load variants — ~44 occurrences · **biggest win**

> **[Comment]** --

Your separate-entry rule (from the Lunge decision) applied to every loaded variant of a lift
you already have. This is the single largest remaining group.

| Base (exists) | New variants to register |
|---|---|
| Bench Press | **DB Bench Press** ×9 (covers "inclinado" and "(Wide)") |
| Deadlift | **KB Deadlift** ×4 · **DB/KB Deadlift** · **Stiff Dual DB/KB** |
| Hang Snatch | **DB Hang Snatch** ×2 |
| Strict Press / Push Press | **Dual DB Strict Press** ×2 · **Dual DB Push Press** |
| Step-up | **DB Step Box Up** ×3 · **KB Step-up** · **KB Box Step** · **Step Box** ×4 · **KB Step Down** ×2 |
| Cossack Squat | **DB Cossack Squat** · **KB Cossack Squat** (×2 total) |
| Hip Thrust | **DB Hip Thruster** |
| Clean | **Dual DB Squat Clean** |
| Snatch | **DB Snatch** ×3 (incl. Dual DB Snatch) |
| Lunge (new in R1) | **DB OH Lunge** · **KB OH Lunge** ×3 |
| — | **KB Over Leg** ×4 (no base — "KB leg over" is the same thing) |
| Lateral Raise | **DB Lateral Raise** |
| Dual KB OH Walking (exists) | **OH Walking 2KB** → alias to it |

## Batch C · Gymnastics / bodyweight — ~45 occurrences

> **[Comment]** --

| Typed | ~Occ | Recommendation |
|---|---|---|
| Push-up · Push up | 3 | **new entry `Push-up`** (you only have `Ring Push-up`) |
| Push-up Hand Release (3 spellings) | 4 | **new entry `Hand Release Push-up`** |
| Burpee Broad Jump | 5 | **new entry** |
| Box Jump Over (+ step down, Bbjo) | 5 | **new entry `Box Jump Over`** |
| Burpee to Plate | 3 | **new entry** |
| High Box Jump | 3 | **new entry** (or alias → `Box Jump`?) |
| Shoulder Taps · Tap Shoulder · Wall Shoulder Taps | 3 | **new entry `Shoulder Tap`** |
| Touch Heel | 2 | **new entry** (Core) |
| Wall Walk / Wall Walking | 3 | **new entry `Wall Walk`** |
| L-Sit argola · L-Sit barra | 4 | you have `L-Sit` + `L-sit (rings)` — **alias, or separate barra entry?** |
| Dip Russo (4 spellings) | 4 | **new entry `Dip Russo`** — pt-BR, no English equivalent in registry |
| Pike up row | 2 | **new entry** |
| Scapular Pull-up · Strict Chest-to-bar · Toes to Ring | 3 | **new entries** |
| Handstand Push Up | 1 | ⚠️ **ambiguous** — Kipping HSPU or Strict HSPU? |
| Handstand Hold Wall · HSW Hold | 2 | alias → `Handstand Hold` / `Handstand Walk` |
| Burpee BMU · Legless (Rope Climb) · Back lever on rings · forward rolls · Deslocamento com Apoio · Kipping uma puxada | 6 | low value — **skip unless you want them** |

## Batch D · Barbell / LPO singles — ~25 occurrences

> **[Comment]** --

Mostly positions in a complex that you also prescribe standalone.

| Typed | ~Occ | Recommendation |
|---|---|---|
| Jerk Balance | 2 | **new entry** (LPO) |
| Snatch High Pull | 2 | **new entry** (LPO) — distinct from `High Pull`/`Snatch Pull` |
| Clean High Pull · Low High Pull · Hang Pull | 3 | **new entries** (LPO) |
| Low Squat (Snatch/Clean) · Hang Power · Hang Muscle | 4 | ⚠️ these look like **truncated complex notation**, not standalone lifts — skip? |
| Cluster | 1 | **new entry** (LPO) |
| Squat Jerk · Snatch Push Press | 2 | **new entries** (LPO) |
| Tall Snatch · Drop Balance · Drop Jerk | 3 | **new entries** (LPO) |
| GTOH (ground to overhead) | 1 | **new entry** |
| Low Hang Clean · High Squat Clean | 2 | alias → `Hang Clean` / `Clean`? |
| C&J unbroken · C&J 60/45 · Cycling Barbell | 3 | **not registry** — prescription notes |

## Batch E · Accessories / pt-BR — ~25 occurrences

> **[Comment]** --

| Typed | ~Occ | Recommendation |
|---|---|---|
| Lenhador (+ caotic) | 6 | **new entry `Lenhador`** (wood chopper) |
| Landmine Press | 2 | **new entry** |
| Gorila Row | 2 | **new entry** |
| Dead March | 2 | **new entry** |
| Arnold Press · Sled Drag · Front Rack Lunge · Wall Sit · Perdigueiro | 5 | **new entries** |
| Upright Row · Front Plate Raise · Dumbbell Lat Pullover · Single Leg Knee Extension · Rower Hamstring Curl | 5 | **new entries** |
| Goblet Squat ("GLOBET") | 1 | **new entry `Goblet Squat`** |
| Remada low curvada · Remada curvada peg supinada | 2 | alias → `Barbell Row`? |
| Búlgaro Squat com anilha · Single Leg · halo | 3 | **your call** |

---

## Decisions taken (2026-07-25) — all batches accepted

| Question | Coach's call |
|---|---|
| Batch B — DB/KB load variants | **Register all of them** as separate entries (same rule as the Lunges) |
| Batch A — Abs family | **ABS ANILHA → alias `Plate Sit-up`**, **Prancha lat E/D → alias `Side Plank`**; the rest become new pt-BR Core entries |
| Bare "Handstand Push Up" | **→ `Kipping HSPU`** (same logic as the bare Pull-up) |
| Batch D — Low Squat / Hang Power / Hang Muscle / Hang Pull | **Skip** — truncated complex notation, not standalone lifts |

Batches C and E followed the recommendations above.

## ⏳ Action for the coach

Run [`94-round2-registry-additions.sql`](./94-round2-registry-additions.sql) —
*"#94 round 2 — add missing exercises to the registry (prod)"*. **71 entries** across 6
categories. Idempotent, alphabetical, dry-run on the local stack (Core 35 · LPO 34 · Força 33
· Acessórios 51 · Skill 41 · Cardio 19, unchanged on a second run).

| | Unresolved |
|---|---|
| Round 1 close | 34.8% |
| Round 2 code fixes | 30.7% |
| Round 2 aliases (shipped) | **28.1%** |
| **After this SQL** | **11.9%** (95 / 795) |

**0 dangling aliases** after the additions. The ~95 that remain are bucket 3 (compound
notation) and bucket 4 (structural noise), which by design never resolve — so 11.9% is
effectively the floor without product changes to how compound lines are entered.
