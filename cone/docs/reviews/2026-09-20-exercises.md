# 2026-09-20 · Exercícios ↔ sessões — referência cruzada

Read-only audit run against the **`2026-09-18_16-05-25` prod backup** — offline, no network, no
clock, deterministic (two consecutive runs are identical). Resolution uses the canonical
`resolveExercise`/`normExName`/`buildRegistryIndex` (`src/public/lib/registry.js`) and
`completeness` (`src/public/lib/exerciseGroups.js`); the miss taxonomy is
`scripts/audit-session-registry.mjs`'s, imported rather than retyped.

⚠️ Supersedes [94-session-registry-audit.md](./94-session-registry-audit.md), whose numbers are from
2026-07 and no longer describe the data.

---

## 1 · The numbers

| | |
|---|---|
| Sessions scanned | **152** |
| Exercise-name occurrences | **2351** |
| Unresolved occurrences | **658 (28%)**, across **485** distinct names |
| Registry unique names | **254** (260 entry-slots across 15 categories) |
| Registry names actually prescribed | **183 of 254** (72%) |
| Never prescribed | **71** |
| Dangling aliases | **0** ✅ |

⚠️ **`CLAUDE.md` disagrees with all of this.** It says the registry holds **157** names (it holds
254) and quotes the unresolved rate as **43.4%** in the `registry.js` section and **11.9%** in #94's
Done row — two different figures, neither matching today's 28%.

### Completeness — and the headline

| Field | Have | Missing |
|---|---|---|
| `description` | 237 | 17 |
| `muscles` | 237 | 17 |
| `videoUrl` **published** | **7** | 247 |
| `videoUrl` present but unpublished | 30 | — |
| `notes` | 75 | 179 |
| `defaults` (cargas padrão) | 1 | 253 |

🔴 **Not one exercise in the catalog has all three of description + muscles + a published video**
(`allThree = 0`). An athlete tapping any movement can see a tutorial for
**7 of 254**.

🔑 **`defaults` has exactly one user.** The #38 "ghost loads" feature (plans/12) shipped and is
unused — a product question, not a bug.

🔑 **7 of the 15 categories are empty**: EMOM · HIIT · AMRAP · MetCon · For Time · Benchmark ·
Estações. These are *block types*, not movement families, so nothing is wrong with the data — but
the Exercícios tab renders them as categories with a 0 count, which is the "empty categories" half
of **#96**, confirmed live.

---

## 2 · Where the 485 unresolved names come from

| Bucket | Distinct | Occurrences | What it is |
|---|---|---|---|
| movement | 309 | 389 | real movement names (see below) |
| prescription | 76 | 85 | a quantity wearing a name (`20–30" handstand hold`) |
| complex | 33 | 34 | compound notation (`1 Muscle + 3 Front 3"`) |
| noise | 67 | 150 | block labels, goal lines, zones |

🔴 **49 of the "movement" names are an article, not exercises.** On **2026-08-27** a rest-day
explainer was pasted into the Criador and each line became an `exercise` — 50 rows with empty
`reps`/`sets` across four `Mobilidade` blocks, while `block.notes` stayed empty on all four.
Identified by provenance (a block whose exercises are ≥80% volume-less and average >25 characters),
not by keyword, and it is exactly one session. It renders to athletes as a WOD with 50 movements.
Filed as its own row — it is a data-integrity defect, not a catalog gap.

**Honest denominator.** Excluding noise + the pasted article: **20.3%** of prescriptions don't
resolve (430 of 2 123), across 349 distinct names.

---

## 3 · Generalising the resolver first (#94's lesson), measured

#94 took the unresolved rate from 58.5% to 43.4% by adding four resolver *rules* rather than
growing `ALIASES`. I re-ran that experiment. **It does not repeat — the general rules are already
harvested.** Measured recovery over the 260 real movement names:

| Candidate rule | Names | Occurrences |
|---|---|---|
| `R2` first segment of a `/` alternative (`C2B /Pull Up`) | 18 | 19 |
| `R3` peel TRAILING prescription noise (`Back Squat 60% Rm`) | 13 | 13 |
| `R5` index a multi-alt parenthetical (`Bike (Assault/Echo)` → `Echo Bike`) | 1 | 4 |
| `R6` the `Burpee Over X` family | 2 | 4 |
| `R4` leading step label (`A Jerk Balance`) | 1 | 1 |
| **all together** | **33** | **39** |

⚠️ Two traps found while measuring, both worth keeping: a naive plural rule cuts `Press` → `Pres`
and *undoes* earlier recoveries (which is why `registry.js`'s own plural fallback is guarded), and
both `node -e` and a quoted heredoc drop a backslash level through this shell, turning `\b` into a
literal backspace — the taxonomy must be **imported**, never retyped.

**Conclusion: the remaining gap is a catalog gap + coach shorthand, not a resolver gap.**

---

## 4 · Proposal

### 4a · 29 new entries → [2026-09-20-registry-additions.sql](./2026-09-20-registry-additions.sql)

pt-BR `description` + `muscles` are **drafted for your approval**, matching the voice of the
existing 237. Nothing has been applied to prod.

**Acessórios** — Reverse Nordic · Triceps Pushdown · Crucifixo (×2) · Tríceps no Banco · Sandbag Lunge

**Aquecimento** — A-Skip · C-Skip · Standing Banded Hip Adduction

**Cardio** — Sandbag Carry · Dual KB Front Rack Carry (×2)

**Core** — Copenhagen Plank (×2) · Arch Hold (Superman) (×3) · KB Windmill · GHD Hip Extension (×2) · Plank Drag

**Força** — Dual DB Thruster (×7) · DB Push Press (×3) · Z Press (×2) · Dual DB Cluster

**LPO** — Hang High Pull (×3) · Tall Clean · Low Snatch

**Mobilidade** — Front Rack Stretch

**Skill** — Jump Squat (×4) · Hurdle Jump · Ring Support Hold · Back Lever · Forward Roll to Support · L-Sit (parallettes) (×2)

### 4b · 115 aliases + the `Burpee Over X` family → a code change, NOT the SQL

These are shorthand, typos and pt-BR names for movements **already in the catalog**. They belong in
`ALIASES` (`src/public/lib/registry.js`), which is match-only and never rewrites what the coach
typed. **All 115 targets verified to be exact existing entry names — 0 dangling.**

<details><summary>The full table (115)</summary>

| coach writes | resolves to |
|---|---|
| `ab infra` | Abs Infra |
| `abs infra banco` | Abs Infra |
| `med ball slam` | Abs Med Ball |
| `remador + vups` | Abs Remador |
| `vups + remador` | Abs Remador |
| `reverse lunge` | Back Lunge |
| `dip pararelo` | Bar Dip |
| `dip paralelo` | Bar Dip |
| `burpee bmu` | Bar Muscle-up |
| `remada curvada supinada` | Barbell Row |
| `remada curvada peg pronada` | Barbell Row |
| `echo bike` | Bike (Assault/Echo) |
| `cal bike` | Bike (Assault/Echo) |
| `bulgarian squat` | Bulgarian Split Squat |
| `burpee target` | Burpee |
| `burppes broad jump` | Burpee Broad Jump |
| `farm carry caitic` | Chaotic Farmer's Carry |
| `chest to bar pull up` | Chest-to-Bar |
| `high pull clean` | Clean High Pull |
| `db incline bench press` | DB Bench Press |
| `hang db snatch alt` | DB Hang Snatch |
| `elevacao pelvica db` | DB Hip Thruster |
| `hip trhust unilateral db` | DB Hip Thruster |
| `db elevacao lateral` | DB Lateral Raise |
| `db overhead lunge` | DB OH Lunge |
| `plate overhead lunge` | DB OH Lunge |
| `db step up over` | DB Step Box Up |
| `db deadlift` | DB/KB Deadlift |
| `dead bug com plate` | Dead Bug |
| `dead march dual db` | Dead March |
| `block deadlift` | Deadlift |
| `banded deadlift` | Deadlift |
| `deadlift banded` | Deadlift |
| `dual devil press` | Devil Press |
| `drop split` | Drop Split Jerk |
| `dual db walking lunge` | Dual DB Lunge |
| `dual db squat` | Dual DB Squat Clean |
| `db strict press` | Dual DB Strict Press |
| `dual kb oh walk` | DUal KB Overhead Walking |
| `kb oh walking` | DUal KB Overhead Walking |
| `double kb oh walking` | DUal KB Overhead Walking |
| `remada unilateral` | Dumbbell Row |
| `farmer carry` | Farmer's Carry |
| `farm carry` | Farmer's Carry |
| `farm cary` | Farmer's Carry |
| `farm carry unilateral` | Farmer's Carry |
| `front lunge` | Front Rack Lunge |
| `back extension` | GHD Back Extension |
| `gluteo brigde` | Glute Bridge |
| `single leg glute bridge` | Glute Bridge |
| `good mornind` | Good Morning |
| `golira row` | Gorila Row |
| `rosca martelo` | Hammer Curl |
| `db hammer curl` | Hammer Curl |
| `push up hr` | Hand Release Push-up |
| `hs hold` | Handstand Hold |
| `hs walking` | Handstand Walk |
| `hsw` | Handstand Walk |
| `high hang clean` | Hang Clean |
| `power clean hang` | Hang Power Clean |
| `power clean high hang` | Hang Power Clean |
| `low high pull` | High Pull |
| `hip to bar end bar turnover` | Hip to bar en bar turnover |
| `hollowrock hold` | Hollow Hold |
| `hollow body rocks` | Hollow Rock |
| `inverted hollow rock` | Hollow Rock |
| `db incline press` | Incline Press |
| `dual kb deadlift` | KB Deadlift |
| `sdhp kb` | KB Deadlift |
| `kb sumo deadlift high pull` | KB Deadlift |
| `kb oblique crunch` | KB Oblíquo |
| `lateral box step down` | KB Step Down |
| `kipping uma puxada` | Kipping Pull-up |
| `l sit pararelo` | L-Sit |
| `lsit parelete` | L-Sit |
| `lsit barra` | L-Sit Barra |
| `walking lunge` | Lunge |
| `walking lunges` | Lunge |
| `muscle celan` | Muscle Clean |
| `hang muscle clean` | Muscle Clean |
| `overhead squat c` | Overhead Squat |
| `plate overhead squat` | Overhead Squat |
| `ohs saindo do bloco` | Overhead Squat |
| `single leg balance` | Ponte Unipodal |
| `power clean floor` | Power Clean |
| `jumping pull up` | Pull-up |
| `scap push-up` | Push-up |
| `push up close grip` | Push-up |
| `push up dog down` | Push-up |
| `push-up to down dog` | Push-up |
| `plate bom dia` | PVC Good Morning |
| `cal row` | Remo (Ergômetro) |
| `db reverse fly` | Reverse Fly |
| `ring row unilateral` | Ring Row |
| `front plank band row` | Ring Row |
| `easy jog` | Run |
| `russian swing` | Russian KB Swing |
| `kb russian swing` | Russian KB Swing |
| `half kneeling plate twist` | Russian Twist |
| `scap pull` | Scapular Pull-up |
| `scap pull up` | Scapular Pull-up |
| `scap pull-up` | Scapular Pull-up |
| `alt single leg good mornings` | Single Leg RDL |
| `skierg` | Ski Erg |
| `calories ski` | Ski Erg |
| `block snatch high-pull` | Snatch High Pull |
| `box step up` | Step-up |
| `box step-up` | Step-up |
| `ball step up` | Step-up |
| `step up over` | Step-up |
| `db stiff unilateral` | Stiff Dual DB/KB |
| `wall facing hspu` | Strict HSPU |
| `triceps band` | Tricep Extension |
| `triceps extension` | Tricep Extension |
| `wall wall` | Wall Walk |

</details>

Plus 13 spellings of one movement → **Burpee Over the Bar (BOB)**:
`burpees over the bar` · `burpees over bar` · `burpee over rower` · `burpees over rower` · `burpees over the db` · `burpee over the db` · `lat burpees over the db` · `burpees over the erg` · `burpees over the row` · `burpee over the line` · `burpees over ball` · `burpee box step up` · `burpees box step up`

### 4c · Measured effect of applying 4a + 4b

| | occurrences | unresolved | rate |
|---|---|---|---|
| today, everything counted | 2 351 | 658 | **28.0%** |
| today, noise + article excluded | 2 123 | 430 | **20.3%** |
| **after the proposal** | 2 123 | 232 | **10.9%** |

A **46% reduction** in unresolved prescriptions. Registry goes 254 → 283 names, 72% → 77% prescribed.

**Live-verified end-to-end, not just simulated.** The SQL was applied to the local stack (never prod): `UPDATE 1`, every category rose by exactly the predicted count (260 → 289 entry-slots), a second run left it at 289 (idempotent, as its header claims), and the alphabetical-within-category invariant holds with the new entries interleaved. Re-resolving the whole corpus against the registry **read back out of the live database** gives **28.0% → 26.2%** — 42 occurrences recovered by the entries alone; the remaining gain to 10.9% is the aliases (a code change) plus excluding noise and the pasted article from the denominator. The local registry was then restored to the prod snapshot, since the entries are not approved yet.

### 4d · 20 that need your call before anything is written

A wrong guess here writes a wrong movement into the catalog, so these are held back:

- **Shoulder Press** (×7) — Barra (= Strict Press, já existe) ou halteres (entrada nova "DB Shoulder Press")? 12 ocorrências somando Military/Militar/Shoulders Press.
- **Military Press** — Mesma pergunta — apelido de Strict Press, ou movimento próprio no seu vocabulário?
- **KB Military Press** — Entrada nova "KB Strict Press", ou apelido de Strict Press?
- **Kipping** (×5) — Aparece sozinho. É Kipping Pull-up, Kipping HSPU, ou o drill de kipping swing?
- **KB Swing** (×2) — American ou Russian? Ambos existem no catálogo; um apelido genérico resolveria para o errado.
- **LOW SQUAT** (×3) — Agachamento profundo como posição, ou Low Squat Snatch abreviado?
- **WB** (×3) — Confirmo WB = Wall Ball? Vira alias.
- **T2R** (×2) — Confirmo T2R = Toes to Ring? Vira alias.
- **BJO** — Confirmo BJO = Box Jump Over? Vira alias.
- **SU Crossover / DU Crossover** (×4) — Crossover de corda — entrada nova "Crossover (Corda)"?
- **Pike Up** — Movimento de core, ou abreviação de Pike up Row (que já existe)?
- **Power Balance** — Snatch Balance com recepção em power? Entrada nova ou alias?
- **Kangoo Squat** — Não reconheci — é equipamento (Kangoo Jumps) ou nome próprio do box?
- **Deslocamento com Apoio** — Qual movimento exatamente? Não consegui mapear.
- **Entrada solo Argola** — Entrada para as argolas a partir do solo — qual o nome que você usa?
- **Saltos na anilha** — Salto sobre a anilha (tipo box jump baixo) — entrada nova?
- **Cycling Barbell** — Drill de ciclagem da barra — entrada nova em Skill?
- **Hang Squat / Hang Power Squat / HANG POWER / HANG PULL / Hang Muscle / Muscle / Jerk / Press** (×12) — Todos parecem fragmentos de complexos ("1 HANG POWER + 1 LOW POWER"). Confirmo que são notação de complexo e não exercícios isolados?
- **HWS com obstáculos** — HSW (handstand walk) com obstáculos — variação nova ou observação da prescrição?
- **Banded Joint Mobilizations for Stiff Ankles** — Alias para Ankle Dorsiflexion, ou entrada própria?

---

## 5 · Tutorials — priority list

7 of 254 movements have a published video. 30 more have a `videoUrl` that is **not
published**, so the URL exists but athletes cannot see it.

The 183 most-prescribed movements that are missing something, worst first — this is the worklist:

| Prescrito ×N | Exercício | Categoria | Falta |
|---|---|---|---|
| 198 | Run | Cardio | vídeo |
| 105 | Remo (Ergômetro) | Cardio | vídeo |
| 52 | Toes to Bar | Core | vídeo |
| 45 | Wall Ball | Cardio | vídeo |
| 43 | Bike (Assault/Echo) | Cardio | vídeo |
| 36 | Deadlift | Força | vídeo (não publicado) |
| 35 | Front Squat | Força | vídeo (não publicado) |
| 30 | Strict Pull-up | Skill | vídeo |
| 29 | Farmer's Carry | Cardio | vídeo |
| 29 | Power Clean | LPO | vídeo (não publicado) |
| 28 | Double Under | Skill | vídeo |
| 27 | Strict HSPU | Skill | vídeo |
| 26 | Bar Muscle-up | Skill | vídeo |
| 25 | Overhead Squat | Força | vídeo (não publicado) |
| 24 | Hang Clean | LPO | vídeo (não publicado) |
| 23 | Chest-to-Bar | Skill | vídeo |
| 23 | Lunge | Acessórios | vídeo |
| 22 | Back Squat | Força | vídeo (não publicado) |
| 21 | Ski Erg | Cardio | vídeo |
| 19 | Burpee Broad Jump | Skill | vídeo |
| 19 | Pull-up | Skill | vídeo |
| 19 | Split Jerk | Força | vídeo (não publicado) |
| 19 | V-up | Core | vídeo |
| 18 | GHD Sit-up | Core | vídeo |
| 17 | Bench Press | Força | vídeo (não publicado) |
| 17 | Power Snatch | LPO | vídeo (não publicado) |
| 15 | Handstand Walk | Skill | vídeo |
| 15 | Thruster | Força | vídeo |
| 14 | DB Bench Press | Força | vídeo |
| 14 | Hang Snatch | LPO | vídeo (não publicado) |
| 13 | Bulgarian Split Squat | Força | vídeo (não publicado) |
| 13 | Burpee Box Jump Over | Skill | vídeo |
| 13 | Sled Pull | Cardio | vídeo |
| 12 | Box Jump Over | Skill | vídeo |
| 12 | Burpee to Plate | Skill | vídeo |
| 12 | Devil Press | Skill | vídeo |
| 12 | Hollow Rock | Core | vídeo |
| 12 | Ring Dip | Skill | vídeo |
| 12 | Rope Climb | Skill | vídeo |
| 12 | Snatch | LPO | vídeo (não publicado) |
| 11 | Barbell Row | Força | vídeo (não publicado) |
| 11 | Clean | LPO | vídeo (não publicado) |
| 11 | GHD Back Extension | Core | vídeo |
| 11 | Legless Rope Climb | Skill | descrição · músculos · vídeo |
| 11 | Plank | Core | vídeo |
| 11 | Push Jerk | Força | vídeo (não publicado) |
| 11 | Push Press | Força | vídeo (não publicado) |
| 11 | Ring Muscle-up | Skill | vídeo |
| 11 | Side Plank | Core | vídeo |
| 11 | Sled Push | Cardio | vídeo |
| 10 | Clean & Jerk | LPO | vídeo (não publicado) |
| 10 | Hip Thrust | Acessórios | vídeo |
| 10 | KB Deadlift | Força | vídeo |
| 10 | Snatch Balance | LPO | vídeo (não publicado) |
| 9 | Box Jump | Skill | vídeo |
| 9 | DB Snatch | LPO | vídeo |
| 9 | Muscle Snatch | LPO | vídeo (não publicado) |
| 9 | Russian Row | Acessórios | descrição · músculos · vídeo |
| 9 | Russian Twist | Core | vídeo |
| 9 | Shoulder to Overhead (S2OH) | Força | vídeo |


_… plus 123 more below 9× prescriptions._


---

## 6 · The other direction — 71 entries never prescribed

Not necessarily dead: a catalog legitimately holds movements not used this period. Listed so the
question can be asked once.

**Acessórios** (17) — Banded Squat Walk · Calf Raise · DB Back Lunge · DB Cossack Squat · Dual DB Back Lunge · Dual DB Lunge · Dual KB Back Lunge · Dual KB Lunge · Dumbbell Row · Face Pull · Glute Bridge · Incline Press · KB Back Lunge · KB Lunge · Seal Row · Skull Crusher · Tricep Extension

**Aquecimento** (14) — Ankle Dorsiflexion · Arm Circle · Banded Distraction · Box Hip Flexor · Cat-Cow · Hip Circle · Leg Swing · PVC Good Morning · Samson Stretch · Shoulder Dislocate · Spiderman Lunge · T-spine Rotation · World's Greatest Stretch · Wrist Circle

**Cardio** (3) — Corda (Jump Rope) · Med Ball Carry · Step-up Cardio

**Core** (7) — Banded Good Morning · Chaotic Farmer's Carry · Dead Bug · Hanging Leg Raise · Hip to bar en bar turnover · Knees to Elbow · Russian KB Swing

**Força** (6) — Box Squat · Pause Squat · Trap Bar Deadlift · Weighted Dip · Weighted Pull-up · Zercher Squat

**LPO** (3) — Clean Deadlift · High Pull · Jerk from Rack

**Mobilidade** (16) — Ankle Stretch · Child's Pose · Downward Dog · Foam Roll · Hamstring Stretch · Hip 90/90 · Hip Distraction (banded) · Hip Flexor Stretch · Lat Stretch (banded) · Low Lunge · Neck Stretch · Piriformis Stretch · Quad Stretch · Shoulder Distraction (banded) · Thoracic Extension · Wrist Stretch

**Skill** (5) — Bar Dip · Hip Hop Kipping Swing · Ring Push-up · Ring Strict Pull-up · Tuck Planche

---

## 7 · Reproducing this

The scripts live in the session scratchpad and are deliberately not committed (the review changes no
code). To re-run: read `backups/<stamp>/{sessions,exercise_registry}.json`, build the index with
`buildRegistryIndex`, walk every block's `exercises[]` + `stations[].exercises[]` +
`complexMovements[]`, resolve with `resolveExercise`, and bucket the misses with
`scripts/audit-session-registry.mjs`'s `NOISE`/`cat` — **imported, not retyped**.
