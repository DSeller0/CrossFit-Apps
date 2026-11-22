# 2026-11-22 · Exercise names: your decision pass (#211)

This is the pass started on 2026-09-20 and never finished, refreshed on today's prod data. **You
make the calls; nothing is written until you do.** The evidence is in
[2026-09-20-exercises.md](./2026-09-20-exercises.md) and the drafted entries are in
[2026-09-20-registry-additions.sql](./2026-09-20-registry-additions.sql).

## How to answer

- Write under any `> **[Comment]** --`. **A blank slot means "go with the recommendation".**
- For an item, `ok`, `no` or a correction is enough. You can also edit Batch B's pt-BR text in
  place inside its table.
- When you're done, say **"done"** in the session. Part 2 turns your answers into `plans/103`,
  and a Sonnet session then applies them in two parts:
  - **the entries** become a titled, re-runnable SQL that you run in the Supabase SQL editor;
  - **the aliases and repoints** become a code change in `src/public/lib/registry.js`,
    re-measured on prod.

## Why now: the numbers

Measured on prod, read-only:

| | Unresolved prescriptions* |
|---|---|
| Today | **25.5%** (782 of 3 071) |
| + September's proposal (29 entries · 115 aliases · the BOB family) | 16.8% |
| + **every recommendation in this doc** | **11.8%** |

\* The 09-20 audit's "honest" rate, which excludes noise lines and the pasted rest-day article
(#210). Counting everything, today is 32.6%.

- **The catalog hasn't changed since September** (254 names, 126 aliases, 0 dangling), so every
  September item still applies.
- **Sessions since 09-19 resolve worse:** 34.6% unresolved, against 20.7% before. That comes from
  140 new names, plus goal and structure lines saved as exercise rows (see *Not naming* at the end).
- **Most of what's left after 11.8% is resolver-rule material.** Examples: `RMU / 12 Pull Up`,
  `Thruster 60/45`, `Hummer Curl 3 x 10`. That is code and needs no decision (see *Already
  settled*).

Your rules from #94 are the defaults below:
- **a loaded variant is its own entry** (the Lunge decision);
- **an entry carries its shorthand after the name** (`Single Under (SU)`);
- **typed shorthand resolves through an alias**, never by rewriting what was typed.

---

## Batch A · the 20 open calls

This is September's list, with counts refreshed on today's data.

### A1 · Shorthand → alias

> **[Comment]** --

| Typed | ×N | Recommendation |
|---|---|---|
| `WB` | 3 | alias → **Wall Ball** |
| `T2R` | 2 | alias → **Toes to Ring** |
| `BJO` | 1 | alias → **Box Jump Over** |

### A2 · Presses

> **[Comment]** --

| Typed | ×N | Recommendation |
|---|---|---|
| `Shoulder Press` | 11 | alias → **Strict Press**. Your round-2 call already sends `Shoulders Press` there. If these are dumbbell presses, say so, and it becomes a new entry **DB Shoulder Press** instead. |
| `Military Press` · `Militar Press` | 3 + 2 | alias → **Strict Press**. ⚠️ Two are written `8/8 Military Press`: 8 per side, which reads as single-arm (DB/KB). |
| `KB Military Press` | 1 | **new entry "KB Strict Press"** (Força), by your loaded-variant rule. |

### A3 · Ambiguous movements

> **[Comment]** --

| Typed | ×N | Recommendation |
|---|---|---|
| `Kipping` | 7 | **new entry "Kipping Swing"** (Aquecimento). All 7 are in Aquecimento blocks, so this reads as the kip drill on the bar. Alternative: alias → *Hip Hop Kipping Swing* (exists, never prescribed). |
| `KB Swing` · `Kettlebell Swing` · `KB Swing alternado` | 3 | alias → **American KB Swing**, CrossFit's default when the swing is unqualified. Say "Russian" if that's your box's default. |
| `LOW SQUAT` | 4 | **you tell me.** All 4 are in LPO blocks, two of them inside a complex (`2 SNATCH HIGH PULL + 2 LOW SQUAT`, `Low Squat + 2 Hang power`). Is it a squat snatch (alias → **Snatch**), a squat clean (alias → **Clean**), or the position only (no entry)? |
| `Pike Up` | 1 | alias → **Pike up Row**, unless it's a separate core movement (a hanging or ball pike). |
| `Power Balance` | 2 | **new entry "Power Snatch Balance"** (LPO). Your catalog keeps power variants apart (*Power Clean* ≠ *Clean*). |
| `SU Crossover` (+ `DU/SU Crossover`, `30 SU Crossover`, …) | 5 | **new entry "Single Under Crossover"** (Skill), by the same logic as your DU call below. |
| `DU Crossover` · `Double Under Crossover` | 2 | ✅ **Decided 2026-11-22: new entry "Double Under Crossover"** (Skill). Today `DU Crossover` resolves to *Double Under* through an old alias (`registry.js:113`), which gets repointed (Batch D). |

### A4 · Ones I can't map without you

Give the movement a name (it becomes a new entry or an alias), or write "skip".

> **[Comment]** --

| Typed | ×N | Block | My best guess |
|---|---|---|---|
| `Kangoo Squat` | 1 | Aquecimento | ? Equipment, or a name your box uses? |
| `Deslocamento com Apoio` | 1 | Skill | ? |
| `Entrada solo Argola` · `B entrada com auxílio` · `C entrada con band` | 3 | Skill | A ring-entry progression (from the floor · assisted · banded). One new entry, "Ring Entry"? |
| `Saltos na anilha` | 1 | Aquecimento | Jumps over a plate. New entry "Plate Jump"? |
| `Cycling Barbell` | 1 | LPO | A barbell-cycling drill: a new entry, or a note (no entry)? |
| `HWS com obstáculos` | 1 | — | alias → **Handstand Walk** (the obstacles are the prescription). |
| `Banded Joint Mobilizations for Stiff Ankles` | 1 | Aquecimento | alias → **Ankle Dorsiflexion** (exists, never prescribed). |

### A5 · Complex fragments

> **[Comment]** --

`Hang Squat` ×2 · `HANG POWER` ×2 · `HANG PULL` ×2 · `Jerk` ×3 · `Hang Muscle` · `Muscle` · `Press` ·
`Hang Power Squat`. Each is one movement of a complex written one per row
(`1 HANG POWER + 1 LOW POWER`). **Recommendation: complex notation, not entries. No change.**

---

## Batch B · the pt-BR text athletes will see

Each row becomes the text on that exercise's detail page. Edit it in place, or comment. ×N is the
number of prescriptions that resolve to the entry once this pass lands.

### B1 · September's 29 entries

> **[Comment]** --

**Acessórios**

| Entrada | ×N | Descrição | Músculos |
|---|---|---|---|
| Reverse Nordic | 1 | Ajoelhado, inclinar o tronco para trás mantendo o quadril estendido e retornar. | Quadríceps, flexores do quadril. |
| Triceps Pushdown | 1 | Extensão de cotovelos na polia alta, cotovelos fixos ao lado do tronco. | Tríceps. |
| Crucifixo | 2 | Abertura dos braços em arco com halteres, deitado no banco, cotovelos levemente flexionados. | Peitoral, deltoide anterior. |
| Tríceps no Banco | 1 | Mergulho com as mãos apoiadas no banco atrás do corpo, podendo receber carga sobre as pernas. | Tríceps, deltoide anterior. |
| Sandbag Lunge | 3 | Afundo carregando o sandbag no ombro ou abraçado ao peito. | Quadríceps, glúteos, core. |

**Aquecimento**

| Entrada | ×N | Descrição | Músculos |
|---|---|---|---|
| A-Skip | 1 | Skip com elevação de joelho e apoio ativo do antepé, alternando as pernas. | Flexores do quadril, panturrilha. |
| C-Skip | 1 | Skip com abertura circular do quadril a cada passada. | Abdutores, flexores do quadril. |
| Standing Banded Hip Adduction | 1 | Em pé, aduzir a perna contra a resistência do elástico, quadril estável. | Adutores. |

**Cardio**

| Entrada | ×N | Descrição | Músculos |
|---|---|---|---|
| Sandbag Carry | 0 | Deslocamento carregando o sandbag abraçado ao peito ou sobre o ombro. | Core, trapézio, pernas. |
| Dual KB Front Rack Carry | 2 | Deslocamento com dois kettlebells na posição de front rack, tronco ereto. | Core, trapézio, ombros, pernas. |

**Core**

| Entrada | ×N | Descrição | Músculos |
|---|---|---|---|
| Copenhagen Plank | 2 | Prancha lateral com a perna de cima apoiada no banco, sustentando o quadril elevado. | Adutores, oblíquos, core. |
| Arch Hold (Superman) | 5 | Sustentação em decúbito ventral com braços e pernas elevados, corpo em arco. | Eretores da espinha, glúteos, posteriores de coxa. |
| KB Windmill | 7 | Com o kettlebell sustentado acima da cabeça, flexão lateral do tronco até tocar o solo. | Oblíquos, ombros, isquiotibiais. |
| GHD Hip Extension | 3 | Extensão de quadril no GHD mantendo a coluna neutra — o movimento vem do quadril, não da lombar. | Glúteos, isquiotibiais. |
| Plank Drag | 2 | Em prancha alta, arrastar o peso de um lado ao outro sem rotação do quadril. | Core, oblíquos, ombros. |

**Força**

| Entrada | ×N | Descrição | Músculos |
|---|---|---|---|
| Dual DB Thruster | 11 | Agachamento frontal com dois halteres no ombro seguido de passagem acima da cabeça, em um movimento único. | Quadríceps, glúteos, ombros, tríceps. |
| DB Push Press | 3 | Passagem do halter acima da cabeça usando impulso de pernas, com um halter por vez. | Ombros, tríceps, quadríceps, core. |
| Z Press | 6 | Desenvolvimento acima da cabeça sentado no solo com pernas estendidas, sem apoio de tronco. | Ombros, tríceps, core, eretores da espinha. |
| Dual DB Cluster | 1 | Clean dos dois halteres do solo até o ombro seguido de thruster, sem pausa entre as fases. | Cadeia posterior, quadríceps, ombros, tríceps. |

**LPO**

| Entrada | ×N | Descrição | Músculos |
|---|---|---|---|
| Hang High Pull | 4 | Puxada alta a partir do hang, cotovelos conduzindo acima da linha da barra. | Trapézio, deltoides, cadeia posterior. |
| Tall Clean | 1 | Clean iniciado com a barra na altura do quadril e pernas estendidas, sem puxada — só a passagem por baixo. | Trapézio, deltoides, quadríceps. |
| Low Snatch | 1 | Snatch recebido direto no agachamento profundo, sem fase de puxada alta. | Cadeia posterior, ombros, quadríceps. |

**Mobilidade**

| Entrada | ×N | Descrição | Músculos |
|---|---|---|---|
| Front Rack Stretch | 1 | Alongamento da posição de front rack para punho, tríceps e região torácica. | Punho, tríceps, torácica. |

**Skill**

| Entrada | ×N | Descrição | Músculos |
|---|---|---|---|
| Jump Squat | 6 | Agachamento seguido de salto vertical, aterrissando com joelhos alinhados e absorvendo o impacto. | Quadríceps, glúteos, panturrilha. |
| Hurdle Jump | 1 | Salto com os dois pés sobre uma barreira baixa, com aterrissagem controlada. | Quadríceps, glúteos, panturrilha. |
| Ring Support Hold | 1 | Sustentação estática acima das argolas com cotovelos estendidos e ombros deprimidos. | Ombros, tríceps, core. |
| Back Lever | 1 | Sustentação invertida nas argolas com o corpo horizontal e voltado para baixo. | Dorsais, peitoral, core, bíceps. |
| Forward Roll to Support | 1 | Rolamento à frente nas argolas terminando em sustentação acima delas. | Ombros, tríceps, core. |
| L-Sit (parallettes) | 0 | L-sit executado em parallettes, pernas estendidas e paralelas ao solo. | Core, flexores do quadril, tríceps, ombros. |

⚠️ Notes on three of them:
- **L-Sit (parallettes)** is ×0 because today's two parallette L-sits go to plain *L-Sit*
  through two of September's own aliases, `l sit pararelo` and `lsit parelete`.
  **Recommendation:** point both at this entry instead, as `lsit argola` → *L-sit (rings)* already
  does.
- **Arch Hold (Superman)** picks up `Superman` ×3 and `Superman Hold` only with an alias.
  "(Superman)" isn't an all-caps shorthand, so the resolver doesn't derive it. The aliases are in C1.
- **Sandbag Carry** is ×0 because its one prescription is an either/or
  (`Sandbag Carry/Farm carry Heavy`). It resolves once the `A / B` rule lands (*Already settled*).

### B2 · New entries this pass proposes

Each applies only if you accept the call it comes from.

> **[Comment]** --

| Entrada | From | Categoria | ×N | Descrição | Músculos |
|---|---|---|---|---|---|
| Double Under Crossover | A3 ✅ | Skill | 2 | Double under em que os braços cruzam à frente do corpo em uma das duas passagens da corda. | Panturrilha, ombros, antebraços. |
| Single Under Crossover | A3 | Skill | 5 | Pular corda alternando passagens com os braços abertos e cruzados à frente do corpo. | Panturrilha, ombros, antebraços. |
| KB Strict Press | A2 | Força | 1 | Desenvolvimento do kettlebell da posição de rack até acima da cabeça, sem impulso das pernas. | Ombros, tríceps, core. |
| Kipping Swing | A3 | Aquecimento | 7 | Balanço na barra alternando as posições arqueada e oca (arch e hollow), braços estendidos — a base do kipping. | Dorsais, core, ombros. |
| Power Snatch Balance | A3 | LPO | 2 | Snatch balance recebido em power, acima da paralela, com a barra travada acima da cabeça. | Ombros, quadríceps, core. |
| Mountain Climber | C2 | Aquecimento | 1 | Em prancha alta, levar os joelhos alternadamente em direção ao peito, em ritmo constante. | Core, flexores do quadril, ombros. |
| DB Clean & Jerk | C2 | LPO | 5 | Clean do halter até o ombro seguido de jerk até acima da cabeça. | Cadeia posterior, quadríceps, ombros, tríceps. |
| KB Sumo Deadlift High Pull (SDHP) | C2 | Força | 4 | Levantamento do kettlebell com base sumô até a altura do queixo, cotovelos acima das mãos. | Cadeia posterior, trapézio, deltoides. |
| KB Halo | C2 | Aquecimento | 2 | Circundar a cabeça com o kettlebell segurado pelos chifres, tronco estável e cotovelos próximos. | Ombros, core, parte superior das costas. |
| Dual DB Row | C2 | Acessórios | 3 | Remada curvada com dois halteres, tronco inclinado e coluna neutra. | Dorsais, romboides, bíceps. |
| Prancha Lateral Dinâmica | C2 | Core | 4 | Prancha lateral descendo e elevando o quadril de forma controlada, um lado de cada vez. | Oblíquos, glúteo médio, core. |
| Burpee Box Step-up | C2 | Cardio | 4 | Burpee seguido de subida no caixote, descendo com controle. | Quadríceps, glúteos, peitoral, core. |

---

## Batch C · new since 09-19

### C1 · Alias candidates: skim, comment only on a wrong row

These are spellings, typos and pt-BR names of entries that already exist, or that Batch B adds.
Each row was checked on prod: the target exists, and the alias isn't redundant.

> **[Comment]** --

| Typed (a real spelling) | → resolves to | ×N |
|---|---|---|
| `Low Squat Snatch` | Snatch (your #94 rule: a squat snatch IS the full lift) | 2 |
| `Cruxifico` | Crucifixo | 1 |
| `Glute brigde` | Glute Bridge | 1 |
| `Burpess to plate` | Burpee to Plate | 1 |
| `Russain Twist` | Russian Twist | 1 |
| `Touch Hell` | Touch Heel | 1 |
| `Rind Dips` | Ring Dip | 1 |
| `L Sir Barra` | L-Sit Barra | 1 |
| `Pike op Row` | Pike up Row | 1 |
| `forward rools to suport` | Forward Roll to Support | 1 |
| `Stric T2B` | Toes to Bar | 1 |
| `Strict Toes to Bar` | Toes to Bar (as `strict t2b` already does) | 1 |
| `Remada Curcada` | Barbell Row | 1 |
| `Defict Deadlift` | Deadlift (as `deficit deadlift` already does) | 1 |
| `Ru` | Run | 1 |
| `Farm` | Farmer's Carry | 1 |
| `DUMBBELL SNATCHES` | DB Snatch | 1 |
| `SNATCHES` | Snatch | 1 |
| `Dumbbell Thrusters` | DB Thruster | 1 |
| `Dumbbell Hip Thrust` | DB Hip Thruster | 1 |
| `DUMBBELL REVERSE LUNGES` | DB Back Lunge | 1 |
| `DB Elevação Lat` | DB Lateral Raise | 1 |
| `Elevação lateral 2 DB` | DB Lateral Raise | 1 |
| `Elevação Frontal plate` | Front Raise | 1 |
| `Dip paralela` | Bar Dip | 1 |
| `Remada curvada pegada supinada` | Barbell Row | 1 |
| `Remada unil` | Dumbbell Row | 2 |
| `Isometria em posição cadeirinha` | Wall Sit | 2 |
| `Dead March 2 DB` | Dead March | 1 |
| `Double KB Front Rack Carry` | Dual KB Front Rack Carry | 1 |
| `Dual KB Front Rack` | Dual KB Front Rack Carry | 1 |
| `Dual Kettlebell Front Rack Walking Lunges` | Dual KB Lunge | 2 |
| `KB Goblet Reverse Lunge` | KB Back Lunge | 1 |
| `Single Arm Dumbbell Overhead Walking Lunge` | DB OH Lunge | 1 |
| `Sandbag Walking Lunge` | Sandbag Lunge | 2 |
| `Dual Db Box Step Over` | DB Step Box Up | 2 |
| `Box Step over` | Step-up | 1 |
| `Box Step Up over` | Step-up | 1 |
| `Box jump Desce step Down` | Box Jump Over (as `box jump step down` already does) | 2 |
| `Box jump over step down` | Box Jump Over | 2 |
| `BURPEES Target` | Burpee | 3 |
| `Burpee to Target` | Burpee | 1 |
| `Back Thruster` | Thruster | 1 |
| `Floor Power Clean` | Power Clean | 1 |
| `Floor Squat Snatch` | Snatch | 1 |
| `High Hang Squat Snatch` | Hang Snatch | 1 |
| `Low Power Clean` | Power Clean | 1 |
| `High Hang power Clean` | Hang Power Clean | 1 |
| `POSITION POWER SNATCH` | Power Snatch | 1 |
| `Power Snatch saída do bloco` | Power Snatch | 1 |
| `Deadlift pegada de Snatch` | Snatch Deadlift | 1 |
| `Defict Strict HSPU` | Strict HSPU | 1 |
| `Eccentric HSPU déficit` | Strict HSPU | 1 |
| `Strict pull supinada` | Strict Pull-up | 1 |
| `Strict Pull Up Pronado` | Strict Pull-up | 1 |
| `Strict Pull Up com carga` | Weighted Pull-up | 1 |
| `Strict Pull Up supinado com carga` | Weighted Pull-up | 1 |
| `Strict Handstand Push-Ups` | Strict HSPU | 1 |
| `Shoulders Press sentado` | Strict Press | 1 |
| `ab anilha` | Plate Sit-up (as `abs anilha` already does) | 2 |
| `Ab KB unilateral` | Abs KB Unilateral | 1 |
| `6/6 Wind Mill` | KB Windmill | 3 |
| `Plank drag slide` | Plank Drag | 2 |
| `Dual DB Devil press` | Devil Press (a Devil Press is two DBs by definition) | 2 |
| `Hip Extension` | GHD Hip Extension | 1 |
| `Superman` | Arch Hold (Superman) | 3 |
| `Superman Hold` | Arch Hold (Superman) | 1 |
| `GDH` | GHD Sit-up | 2 |
| `KB Step` | KB Step-up | 1 |
| `KB OH walking 2Kb` | DUal KB Overhead Walking | 1 |
| `Single Leg KB` | Single Leg RDL | 1 |
| `Sit-up` | AbMat Sit-up | 1 |
| `Back lever on rings` | Back Lever | 1 |
| `Tricipes Banco com carga` | Tríceps no Banco | 1 |

### C2 · New calls

> **[Comment]** --

| Typed | ×N | Recommendation |
|---|---|---|
| `Moutain Climbers` | 1 | **new entry "Mountain Climber"**. The catalog has none. |
| `DB C&J` · `DB C& J` · `DB Hang C&J` · `DB Hang Clean & Jerk` ×2 | 5 | **new entry "DB Clean & Jerk"** (loaded-variant rule), with the hang spellings as aliases. Say if hang should be its own entry, the way *Hang Clean* is. |
| `KB SDHP` ×2 (+ `SDHP KB`, `KB Sumo Deadlift High Pull`) | 4 | **new entry "KB Sumo Deadlift High Pull (SDHP)"**. ⚠️ September proposed aliasing these to *KB Deadlift*; a high pull is a different movement. |
| `Hallo KB` · `halo` | 2 | **new entry "KB Halo"** (Aquecimento). |
| `Dual DB Row` ×2 · `Dual Dumbbell Row` | 3 | **new entry "Dual DB Row"** (loaded-variant rule; *Dumbbell Row* is single-arm). |
| `Prancha lateral dinâmica` (D/E, 4 spellings) | 4 | **new entry "Prancha Lateral Dinâmica"** (Core); the side (D/E) is the prescription. Alternative: alias → *Prancha Dinâmica*. |
| `Burpees Step Up` ×2 (+ `Burpees box step up`) | 4 | **new entry "Burpee Box Step-up"** (Cardio). ⚠️ September put `burpee box step up` in the *Burpee Over the Bar (BOB)* family, but it isn't "over" anything. |
| `KB OH Walking 1 KB` | 1 | Single-KB overhead walk. Recommendation: leave it unresolved until it recurs. |
| `Dual KB Walking` | 1 | Unclear: front rack, overhead or farmer? Leave it unresolved. |
| `Reverse Hyper ou Extensão Lombar` | 1 | An either/or with no *Reverse Hyper* entry. Leave it unresolved. |

---

## Batch D · existing aliases that conflict

These aliases are already in code, and each contradicts a decision or points past an existing
entry.

> **[Comment]** --

| Alias today | Moves | Conflict | Recommendation |
|---|---|---|---|
| `du crossover` → *Double Under* (`registry.js:113`) | 1 | Your DU call (A3). | ✅ Decided: repoint → **Double Under Crossover**. |
| `hspu` → *Strict HSPU* (`registry.js:114`) | **20** | Your round-2 rule at `registry.js:211` says "Bare HSPU means the kipping version", and spelled-out `Handstand Push Up` already goes to *Kipping HSPU*. | **You tell me.** Either repoint `hspu` → **Kipping HSPU** (the rule), or keep it strict and correct the rule's comment. Either way, all 20 prescriptions get one consistent meaning. |
| `strict pull up argola` → *Strict Pull-up* | 2 | *Ring Strict Pull-up* exists. | Repoint → **Ring Strict Pull-up**. |
| `db bench press inclinado` → *DB Bench Press* (round 2) vs September's `db incline press` → *Incline Press* | 2 + 2 | One movement, two targets. | **All → DB Bench Press** (your round-2 call). Drop September's `db incline press` → *Incline Press*. |

Aliases that fold a variant into its base by an earlier call of yours are **not** reopened:
`deficit deadlift`, `pause bench press`, `strict press sentado`, and `squat clean` = *Clean*.

---

## Already settled: skim only

> **[Comment]** --

- **September's 115 aliases.** The table is in
  [2026-09-20-exercises.md](./2026-09-20-exercises.md) §4b, and every target was re-verified on
  prod today. This pass changes four of them:
  - `sdhp kb` / `kb sumo deadlift high pull` → the SDHP entry (C2) instead of *KB Deadlift*;
  - `l sit pararelo` / `lsit parelete` → *L-Sit (parallettes)* (B1 note);
  - `db incline press` → *DB Bench Press* (D).
- **The BOB family.** 11 of September's 13 spellings → *Burpee Over the Bar (BOB)*;
  `burpee box step up` / `burpees box step up` move to *Burpee Box Step-up* (C2).
- **Resolver rules.** These are code, measured in Part 2:
  - the first segment of an `A / B` alternative (`RMU / 12 Pull Up`, `Legless / RC`, `HSW / 5 Wall
    Walk`): about 30 prescriptions now, up from 19;
  - trailing loads and schemes (`Thruster 60/45`, `Back Squat 60% Rm`, `Hummer Curl 3 x 10`,
    `Unbrk`, `leve`);
  - a leading step label (`A Jerk Balance`);
  - a multi-alternative parenthetical.

## Not naming: FYI

These aren't names, so they aren't yours to decide here. They go to the board.

- **Goal and structure lines saved as exercise rows** (athletes see them as movements):
  - `Meta 12'` ×5, `Meta 10'`, …: 22 rows, 10 of them since 09-19;
  - `AMRAP 10'`, `Amrap 4'`, `For Time`: 17 rows, 9 since 09-19;
  - `on 20" off 3 sets`, `A CADA 2' 5 SETS`: 7 rows, 4 since 09-19.

  → new row **#249**, and evidence for #247 and #229.
- **Notes and instructions saved as rows**: `*SCORE: MAX BURPEES BOX JUMP OVER`, `Aguardar
  instruções do Coach.`, `Coach irá passar as progressões…`, the benchmark names `Isabel` and
  `WOD Nancy`, `Core` ×18, `Warm up` ×6, and the zones `Z1`/`z3`.
- **Your Força continuation rows** (`-`, `X 5`, `1X 8`, `5/5`) are notation that ✦ Sugerido reads
  on purpose. No change.

---

<sub>Method: a read-only refresh of the 09-20 cross-reference against prod (`sessions` +
`exercise_registry`, anon key). It walks every exercise exactly as `scripts/audit-session-registry.mjs`
does and buckets misses with that script's taxonomy (copied verbatim, diffed against the source).
September's entries, aliases and BOB family are applied virtually, and this doc's recommendations
are applied on top. The scripts live in the session scratchpad and are not committed, as on 09-20.
The September subset reproduces the audit: 20.7% → 11.8% here, against its 20.3% → 10.9%.</sub>
