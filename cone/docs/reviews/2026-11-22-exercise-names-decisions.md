# 2026-11-22 · Exercise names: your decision pass (#211)

> ✅ **Answered and applied 2026-11-22** (SQL on prod, then code at `e9a03e7`). How your answers were read, the four follow-up calls, and the text for
> the entries they created (Batch E) are in [*Resolved*](#resolved-how-your-answers-were-read-2026-11-22)
> at the end. The apply is [plans/103](../plans/103-registry-names-apply.md).

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

> **[Comment]** --Maintain all three as recommended.

| Typed | ×N | Recommendation |
|---|---|---|
| `WB` | 3 | alias → **Wall Ball** |
| `T2R` | 2 | alias → **Toes to Ring** |
| `BJO` | 1 | alias → **Box Jump Over** |

### A2 · Presses

> **[Comment]** --For exercises with 8/8, or some variant, it is to be considered single-arm, as you correclty asumed. We do need to create DB Militar Press and KB Militar Press.

| Typed | ×N | Recommendation |
|---|---|---|
| `Shoulder Press` | 11 | alias → **Strict Press**. Your round-2 call already sends `Shoulders Press` there. If these are dumbbell presses, say so, and it becomes a new entry **DB Shoulder Press** instead. |
| `Military Press` · `Militar Press` | 3 + 2 | alias → **Strict Press**. ⚠️ Two are written `8/8 Military Press`: 8 per side, which reads as single-arm (DB/KB). |
| `KB Military Press` | 1 | **new entry "KB Strict Press"** (Força), by your loaded-variant rule. |

### A3 · Ambiguous movements

> **[Comment]** --Russian for the default KB Swing. LOW SQUAT is related to the position of the bar in the beginning of the movement (basically the bar sits a somewhere between a hang and a normal exercise, which starts with the barbell in the ground), so it can be either for a snatch or a clean.

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

> **[Comment]** --It is a 'Kang Squat' not 'Kangoo Squat'. 

| Typed | ×N | Block | My best guess |
|---|---|---|---|
| `Kangoo Squat` | 1 | Aquecimento | ? Equipment, or a name your box uses? |
> **[Comment]** --It is a 'Kang Squat' not 'Kangoo Squat'. 
| `Deslocamento com Apoio` | 1 | Skill | ? |
> **[Comment]** --Skip.
| `Entrada solo Argola` · `B entrada com auxílio` · `C entrada con band` | 3 | Skill | A ring-entry progression (from the floor · assisted · banded). One new entry, "Ring Entry"? |
> **[Comment]** --Skip
| `Saltos na anilha` | 1 | Aquecimento | Jumps over a plate. New entry "Plate Jump"? |
> **[Comment]** --New entry.
| `Cycling Barbell` | 1 | LPO | A barbell-cycling drill: a new entry, or a note (no entry)? |
> **[Comment]** --Probably a note. Skip.
| `HWS com obstáculos` | 1 | — | alias → **Handstand Walk** (the obstacles are the prescription). |
> **[Comment]** --Correct.
| `Banded Joint Mobilizations for Stiff Ankles` | 1 | Aquecimento | alias → **Ankle Dorsiflexion** (exists, never prescribed). |
> **[Comment]** --Skip

### A5 · Complex fragments

> **[Comment]** --Correct. These lack correction after input. No issues.

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
> **[Comment]** --The rule itself needs changing. I assumed snatch means the full motion, but it does not. When the coach wants a squat he will deliberatly write it in the prescription.
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
> **[Comment]** --Missing a 't', should revolse to 'Strict Toes to Bar'.
| `Strict Toes to Bar` | Toes to Bar (as `strict t2b` already does) | 1 |
> **[Comment]** --When 'Strict' is spelled out we map to the Strict entry, not the general one. Toes to bar plain, as I observe, is used in WODs to mean the athlete can go for any form of it, be it strict, swing. Same would apply to Pull-ups.
| `Remada Curcada` | Barbell Row | 1 |
| `Defict Deadlift` | Deadlift (as `deficit deadlift` already does) | 1 |
> **[Comment]** --It should become a new entry.
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
> **[Comment]** --Map to 'Plate Front Raise', Let me know if I need to create.
| `Dip paralela` | Bar Dip | 1 |
| `Remada curvada pegada supinada` | Barbell Row | 1 |
> **[Comment]** --Variants should become their own exercises. This one changes the grip so it must map to the correct one.
| `Remada unil` | Dumbbell Row | 2 |
| `Isometria em posição cadeirinha` | Wall Sit | 2 |
| `Dead March 2 DB` | Dead March | 1 |
> **[Comment]** --'Dual DB Dead March'
| `Double KB Front Rack Carry` | Dual KB Front Rack Carry | 1 |
| `Dual KB Front Rack` | Dual KB Front Rack Carry | 1 |
| `Dual Kettlebell Front Rack Walking Lunges` | Dual KB Lunge | 2 |
> **[Comment]** --'Dual KB Front Rack Walking Lunge'. There are variants where you do it in place or, in this case, you do it by walking.
| `KB Goblet Reverse Lunge` | KB Back Lunge | 1 |
> **[Comment]** --'KB Goblet Reverse Lunge'
| `Single Arm Dumbbell Overhead Walking Lunge` | DB OH Lunge | 1 |
> **[Comment]** --'DB OH Walking Lunge'
| `Sandbag Walking Lunge` | Sandbag Lunge | 2 |
> **[Comment]** --'Sandbag Walking Lunge'
| `Dual Db Box Step Over` | DB Step Box Up | 2 |
> **[Comment]** --'Dual DB Box Step Over'
| `Box Step over` | Step-up | 1 |
> **[Comment]** --'Box Step Over'
| `Box Step Up over` | Step-up | 1 |
> **[Comment]** --'Box Step-up Over'
| `Box jump Desce step Down` | Box Jump Over (as `box jump step down` already does) | 2 |
> **[Comment]** --'Box Jump Step Down'
| `Box jump over step down` | Box Jump Over | 2 |
> **[Comment]** --'Box Jump Step Down'
| `BURPEES Target` | Burpee | 3 |
> **[Comment]** --'Burpee to Target'
| `Burpee to Target` | Burpee | 1 |
> **[Comment]** --'Burpee to Target'
| `Back Thruster` | Thruster | 1 |
> **[Comment]** --'Back Thruster'
| `Floor Power Clean` | Power Clean | 1 |
> **[Comment]** --'Floor Power Clean'
| `Floor Squat Snatch` | Snatch | 1 |
> **[Comment]** --'Floor Squat Snatch'
| `High Hang Squat Snatch` | Hang Snatch | 1 |
> **[Comment]** --'High Hang Squat Snatch'
| `Low Power Clean` | Power Clean | 1 |
> **[Comment]** --'Low Hang Power Clean'
| `High Hang power Clean` | Hang Power Clean | 1 |
> **[Comment]** --'High Hang Power Clean'
| `POSITION POWER SNATCH` | Power Snatch | 1 |
> **[Comment]** --'Position Power Snatch'
| `Power Snatch saída do bloco` | Power Snatch | 1 |
> **[Comment]** --'Block Power Snatch'
| `Deadlift pegada de Snatch` | Snatch Deadlift | 1 |
| `Defict Strict HSPU` | Strict HSPU | 1 |
> **[Comment]** --'Deficit Strict HSPU'
| `Eccentric HSPU déficit` | Strict HSPU | 1 |
> **[Comment]** --'Eccentric Deficit HSPU'
| `Strict pull supinada` | Strict Pull-up | 1 |
> **[Comment]** --'Supinated Strict Pull-up'
| `Strict Pull Up Pronado` | Strict Pull-up | 1 |
> **[Comment]** --'Pronated Strict Pull-up'
| `Strict Pull Up com carga` | Weighted Pull-up | 1 |
| `Strict Pull Up supinado com carga` | Weighted Pull-up | 1 |
> **[Comment]** --'Supinated Loaded Strict Pull-up'
| `Strict Handstand Push-Ups` | Strict HSPU | 1 |
| `Shoulders Press sentado` | Strict Press | 1 |
> **[Comment]** --'Seated Strict Pull-up'
| `ab anilha` | Plate Sit-up (as `abs anilha` already does) | 2 |
| `Ab KB unilateral` | Abs KB Unilateral | 1 |
| `6/6 Wind Mill` | KB Windmill | 3 |
| `Plank drag slide` | Plank Drag | 2 |
| `Dual DB Devil press` | Devil Press (a Devil Press is two DBs by definition) | 2 |
> **[Comment]** --I did not know a Devil Press is two DBs. In my box when 'Devil Press' is prescribed it means only one dumbbell.
| `Hip Extension` | GHD Hip Extension | 1 |
> **[Comment]** --Another variant.
| `Superman` | Arch Hold (Superman) | 3 |
| `Superman Hold` | Arch Hold (Superman) | 1 |
| `GDH` | GHD Sit-up | 2 |
| `KB Step` | KB Step-up | 1 |
| `KB OH walking 2Kb` | DUal KB Overhead Walking | 1 |
> **[Comment]** --'Dual KB Overhead Walking'
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
> **[Comment]** --Hang should be its own entry.
| `KB SDHP` ×2 (+ `SDHP KB`, `KB Sumo Deadlift High Pull`) | 4 | **new entry "KB Sumo Deadlift High Pull (SDHP)"**. ⚠️ September proposed aliasing these to *KB Deadlift*; a high pull is a different movement. |
| `Hallo KB` · `halo` | 2 | **new entry "KB Halo"** (Aquecimento). |
| `Dual DB Row` ×2 · `Dual Dumbbell Row` | 3 | **new entry "Dual DB Row"** (loaded-variant rule; *Dumbbell Row* is single-arm). |
| `Prancha lateral dinâmica` (D/E, 4 spellings) | 4 | **new entry "Prancha Lateral Dinâmica"** (Core); the side (D/E) is the prescription. Alternative: alias → *Prancha Dinâmica*. |
| `Burpees Step Up` ×2 (+ `Burpees box step up`) | 4 | **new entry "Burpee Box Step-up"** (Cardio). ⚠️ September put `burpee box step up` in the *Burpee Over the Bar (BOB)* family, but it isn't "over" anything. |
| `KB OH Walking 1 KB` | 1 | Single-KB overhead walk. Recommendation: leave it unresolved until it recurs. |
| `Dual KB Walking` | 1 | Unclear: front rack, overhead or farmer? Leave it unresolved. |
> **[Comment]** --This one is farmer.
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

## Resolved: how your answers were read (2026-11-22)

After the slots above, four follow-up calls were made in the session:

- **Plain `HSPU`** gets a new general entry, **Handstand Push-up (HSPU)**, meaning any form, the
  way Pull-up works.
- The single-arm presses are **DB Strict Press** and **KB Strict Press**. They match *Strict Press*
  and *Dual DB Strict Press*, and the coach already types `DB Strict Press`.
- The incline dumbbell press gets its own entry, **DB Incline Press**.
- `Box Step over` and `Box Step Up over` are **one** entry, **Box Step Over**.

### The rules your answers set

They override the #94 defaults where the two disagree.

1. **A variant is its own entry.** A variant can be:
   - the **position**: floor, hang, high hang, low hang or block;
   - the **grip**: supinated or pronated;
   - the **receive**: squat, or the plain lift;
   - **deficit** or **seated**;
   - **walking** rather than in place;
   - **step-over** or **step-down**;
   - **dual** rather than single;
   - a **target**.

   A spelling, a language or an implied implement is *not* a variant. For example,
   `Elevação lateral 2 DB` stays *DB Lateral Raise*.
2. **A plain name means any form, and a spelled-out "Strict" means the strict entry.** Toes to Bar,
   Pull-up and now HSPU each have a general entry beside the strict one.
3. **"Squat" is not the plain lift.** When the coach wants the squat, the coach writes it, so
   *Squat Clean* and *Squat Snatch* are their own entries. This retires #94's rule that "a squat
   clean or snatch IS the full lift" (`registry.js:142-143`).
4. **"Low" means low hang:** the bar starts between the hang and the floor.
   - September's *Low Snatch* becomes **Low Hang Snatch**. Its drafted description ("received
     directly in the deep squat") was wrong, so it is replaced in Batch E.
   - A bare `LOW SQUAT` stays unresolved: it names a position, and the lift comes from the context.
5. **In this box, Devil Press means one dumbbell.** Three changes follow:
   - the entry's description now says one dumbbell;
   - **Dual DB Devil Press** is its own entry;
   - the comment at `registry.js:168-169`, which says the opposite, is corrected.
6. **`8/8` before a press means per side, so single-arm.** `8/8 Military Press` → *DB Strict
   Press*.

Four answers were read rather than copied:
- `Shoulders Press sentado` → **Seated Strict Press**. The note said "Pull-up", but the row is a
  press.
- `Elevação Frontal plate` → **Front Plate Raise**. It already exists, so you don't need to create
  anything.
- The `KB Swing` family → **Russian KB Swing**, which also already exists.
- `Low Squat Snatch` → **Low Hang Squat Snatch**, by rules 3 and 4.

*DUal KB Overhead Walking* is renamed **Dual KB Overhead Walking**.

### What it adds up to

Measured on prod (read-only, 3 085 prescriptions):

| | Unresolved (the honest rate) |
|---|---|
| Today | 25.6% (790) |
| **After this pass** | **12.9%** (397) |
| Sessions since 09-19 | 34.9% → 18.0% |

- **92 new entries:** September's 29, B2's 12 and the 51 in Batch E. Together they cover 293
  prescriptions.
- **Aliases:** 126 today, 297 after. 183 are new, 20 change target and 12 are removed. Every one
  is listed in [plans/103](../plans/103-registry-names-apply.md).
- **27 September aliases are held back**, as the next table explains. Shipping them would read
  11.7%, but they would point at the wrong entry.

### Earlier calls your rules reopen

These aliases are already in `registry.js`. Each one contradicts rule 1, 2 or 3, so #211 changes it
along with everything else.

| Alias today | → After | Prescriptions it moves |
|---|---|---|
| `squat clean`, `squat celan` → Clean | Squat Clean | 10 |
| `hang squat clean`, `hang squat celan` → Hang Clean | Hang Squat Clean | 21 |
| `squat snatch` → Snatch | Squat Snatch | 14 |
| `hang squat snatch` → Hang Snatch | Hang Squat Snatch | 6 |
| `floor squat clean`, `low squat clean`, `high squat clean`, `high hang squat clean` | Floor / Low Hang / High Hang Squat Clean | 3 |
| `low hang clean` → Hang Clean | Low Hang Clean | 1 |
| `strict t2b`, `s t2b` → Toes to Bar | Strict Toes to Bar | 9 |
| `strict pull up supinado` / `supinada` (4 spellings) → Strict Pull-up | Supinated Strict Pull-up | 12 |
| `strict pull up argola` → Strict Pull-up | Ring Strict Pull-up | 2 |
| `deficit deadlift`, `deadlift deficit` → Deadlift | Deficit Deadlift | 4 |
| `strict press sentado` → Strict Press | Seated Strict Press | 1 |
| `hspu` → Strict HSPU · `handstand push up` → Kipping HSPU | Handstand Push-up (HSPU) | 19 + 1 |
| `du crossover` → Double Under | Double Under Crossover | 1 |
| `box jump step down` → Box Jump Over | Box Jump Step Down | 1 |
| `bbjo step down` → Box Jump Over (this dropped the burpee) | Burpee Box Jump Over | 1 |
| `db bench press inclinado` → DB Bench Press | DB Incline Press | 2 |
| `remada curvada peg supinada` → Barbell Row | Supinated Barbell Row | 0 |

`21-15-9 S Hspu` stays *Strict HSPU*: it is "S" for strict, which the resolver currently reads as
a seconds unit. plans/103 fixes that reading rather than leaving the prescription on the new
general entry by accident.

Your rules also change 17 targets in September's table. For example, `walking lunge` now goes to
**Walking Lunge**, not *Lunge*, and `hang muscle clean` to **Hang Muscle Clean**. They are marked in
bold in plans/103.

### Held back for a later pass (#250)

These September aliases send a variant to its base entry, or to the wrong movement entirely. By the
rules above, each one needs its own entry, or at least a name from you. Until then they stay
unresolved, as they are today: no detail page is better than the wrong one. They are 27 aliases
covering 36 prescriptions.

| Typed | September sent it to | ×N |
|---|---|---|
| `Plate Overhead Lunge` | DB OH Lunge | 1 |
| `Plate Overhead Squat` | Overhead Squat | 1 |
| `Plate bom dia` | PVC Good Morning | 1 |
| `Dual KB Deadlift` | KB Deadlift | 1 |
| `Dead Bug com plate` | Dead Bug | 1 |
| `DB Stiff unilateral` | Stiff Dual DB/KB | 1 |
| `Dual DB Squat` | Dual DB Squat Clean | 2 |
| `Banded Deadlift` · `Deadlift banded` | Deadlift | 4 |
| `Jumping Pull Up` | Pull-up | 1 |
| `Push Up Close Grip` | Push-up | 1 |
| `Single Leg Glute Bridge` | Glute Bridge (*Ponte Unipodal* exists) | 1 |
| `Farm carry unilateral` | Farmer's Carry | 1 |
| `Ring Row unilateral` | Ring Row | 2 |
| `Hip trhust unilateral DB` | DB Hip Thruster | 1 |
| `wall facing Hspu` | Strict HSPU | 1 |
| `Half kneeling Plate Twist` | Russian Twist | 1 |
| `OHS Saindo do bloco` | Overhead Squat | 1 |
| `BURPEE BMU` | Bar Muscle-up | 1 |
| `Scap Push-Up` | Push-up | 1 |
| `Push Up dog Down` · `Push-Up to Down Dog` | Push-up | 5 |
| `Front plank Band Row` | Ring Row | 1 |
| `Med Ball Slam` | Abs Med Ball | 1 |
| `Front Lunge` | Front Rack Lunge | 3 |
| `Lateral Box Step Down` | KB Step Down | 1 |
| `Single Leg Balance` | Ponte Unipodal | 1 |

`pause bench press` → *Bench Press* goes to #250 as well. Your answers never touched it.

### Batch E · the text for the entries your answers created

This is what athletes will read on each exercise's detail page. Edit it in place or comment.
**A blank slot means approve.** This table feeds the SQL in plans/103, so read it before you run
that SQL.

> **[Comment]** --

| Entrada | Categoria | ×N | Descrição | Músculos |
|---|---|---|---|---|
| DB Strict Press | Força | 4 | Desenvolvimento estrito com um halter, da altura do ombro até acima da cabeça, sem impulso das pernas. | Ombros, tríceps, core. |
| Deficit Deadlift | Força | 5 | Levantamento terra em pé sobre uma anilha ou plataforma, aumentando a amplitude da puxada. | Glúteos, isquiotibiais, eretores da espinha, quadríceps. |
| Supinated Barbell Row | Força | 2 | Remada curvada com barra e pegada supinada (palmas para cima), tronco inclinado e coluna neutra. | Dorsais, romboides, bíceps. |
| Back Thruster | Força | 1 | Thruster com a barra apoiada nas costas: agachamento seguido de push press por trás da cabeça, em um movimento contínuo. | Quadríceps, glúteos, ombros, tríceps. |
| Supinated Loaded Strict Pull-up | Força | 1 | Barra fixa sem impulso, pegada supinada, com carga adicional no cinto ou colete. | Dorsais, bíceps, romboides. |
| Seated Strict Press | Força | 3 | Desenvolvimento estrito com barra, sentado, sem impulso das pernas. | Ombros, tríceps, trapézio superior. |
| Block Deadlift | Força | 1 | Levantamento terra com as anilhas apoiadas em blocos, começando acima do solo — amplitude reduzida. | Glúteos, isquiotibiais, eretores da espinha, trapézio. |
| Dual DB Dead March | Acessórios | 2 | Caminhada com dois halteres acima da cabeça ou no rack, tronco rígido. | Core, ombros, pernas. |
| Dual KB Front Rack Walking Lunge | Acessórios | 2 | Afundo caminhando com dois kettlebells na posição de front rack, tronco ereto. | Quadríceps, glúteos, core, parte superior das costas. |
| KB Goblet Reverse Lunge | Acessórios | 1 | Afundo para trás segurando um kettlebell junto ao peito (posição goblet). | Glúteos, quadríceps, core. |
| DB OH Walking Lunge | Acessórios | 1 | Afundo caminhando com um halter sustentado acima da cabeça, braço estendido. | Quadríceps, glúteos, ombros, core. |
| Sandbag Walking Lunge | Acessórios | 2 | Afundo caminhando com o sandbag no ombro ou abraçado ao peito. | Quadríceps, glúteos, core. |
| Walking Lunge | Acessórios | 4 | Afundo à frente caminhando, alternando as pernas a cada passada. | Quadríceps, glúteos, isquiotibiais. |
| Dual DB Walking Lunge | Acessórios | 3 | Afundo caminhando segurando dois halteres. | Quadríceps, glúteos, core. |
| Box Step Over | Acessórios | 3 | Subida na caixa e descida pelo lado oposto, um pé de cada vez. | Quadríceps, glúteos. |
| DB Box Step Over | Acessórios | 1 | Subida na caixa e descida pelo lado oposto segurando um halter. | Quadríceps, glúteos, core. |
| Dual DB Box Step Over | Acessórios | 2 | Subida na caixa e descida pelo lado oposto segurando dois halteres. | Quadríceps, glúteos, core. |
| DB Incline Press | Acessórios | 6 | Supino inclinado com halteres, banco entre 30° e 45°. | Peitoral superior, deltoide anterior, tríceps. |
| Kang Squat | Aquecimento | 1 | Good morning seguido de agachamento: inclinar o tronco à frente com a coluna neutra, descer ao agachamento e voltar pelo mesmo caminho. | Isquiotibiais, glúteos, quadríceps, eretores da espinha. |
| Plate Jump | Aquecimento | 1 | Saltos sobre uma anilha no solo, com aterrissagem leve e controlada. | Panturrilha, quadríceps, glúteos. |
| Burpee to Target | Cardio | 5 | Burpee finalizado com um salto tocando um alvo acima da cabeça. | Corpo todo: pernas, core, ombros. |
| Strict Toes to Bar | Core | 11 | Toes to bar sem balanço: elevar os pés até a barra com o corpo estável, sem kipping. | Flexores do quadril, reto abdominal, dorsais. |
| Hip Extension | Core | 1 | Extensão de quadril a partir do tronco flexionado, coluna neutra — o movimento vem do quadril. | Glúteos, isquiotibiais, eretores da espinha. |
| Squat Clean | LPO | 10 | Clean com recepção no agachamento completo, abaixo da paralela. | Cadeia posterior, quadríceps, trapézio, core. |
| Hang Squat Clean | LPO | 21 | Clean iniciado no hang (barra na coxa), recepção no agachamento completo. | Cadeia posterior, quadríceps, trapézio. |
| Floor Squat Clean | LPO | 1 | Clean iniciado com a barra no solo, recepção no agachamento completo. | Cadeia posterior, quadríceps, trapézio. |
| Low Hang Squat Clean | LPO | 1 | Clean iniciado no low hang (barra abaixo do joelho), recepção no agachamento completo. | Cadeia posterior, quadríceps, trapézio. |
| High Hang Squat Clean | LPO | 1 | Clean iniciado no high hang (barra na altura do quadril), recepção no agachamento completo. | Quadríceps, trapézio, core. |
| Low Hang Clean | LPO | 1 | Clean iniciado no low hang — barra entre o hang e o solo, abaixo do joelho. | Cadeia posterior, trapézio. |
| High Hang Clean | LPO | 1 | Clean iniciado no high hang (barra na altura do quadril). | Trapézio, quadríceps, core. |
| Floor Power Clean | LPO | 2 | Power clean iniciado com a barra no solo, recepção acima da paralela. | Cadeia posterior, trapézio, quadríceps. |
| Low Hang Power Clean | LPO | 1 | Power clean iniciado no low hang — barra entre o hang e o solo, abaixo do joelho. | Cadeia posterior, trapézio. |
| High Hang Power Clean | LPO | 2 | Power clean iniciado no high hang (barra na altura do quadril). | Trapézio, quadríceps, glúteos. |
| Hang Muscle Clean | LPO | 2 | Muscle clean iniciado no hang: a barra sobe até o rack sem flexão de joelhos na recepção. | Trapézio, deltoides, cadeia posterior. |
| Squat Snatch | LPO | 14 | Snatch com recepção no agachamento completo, barra travada acima da cabeça. | Cadeia posterior, ombros, quadríceps, core. |
| Hang Squat Snatch | LPO | 6 | Snatch iniciado no hang (barra na coxa), recepção no agachamento completo. | Cadeia posterior, ombros, quadríceps. |
| Floor Squat Snatch | LPO | 1 | Snatch iniciado com a barra no solo, recepção no agachamento completo. | Cadeia posterior, ombros, quadríceps, core. |
| Low Hang Squat Snatch | LPO | 2 | Snatch iniciado no low hang (barra abaixo do joelho), recepção no agachamento completo. | Cadeia posterior, ombros, quadríceps, core. |
| High Hang Squat Snatch | LPO | 1 | Snatch iniciado no high hang (barra na altura do quadril), recepção no agachamento completo. | Ombros, quadríceps, trapézio, core. |
| Position Power Snatch | LPO | 1 | Power snatch iniciado em uma posição definida no treino (high hang, hang ou low hang), com uma pausa na posição antes da puxada. | Cadeia posterior, ombros, trapézio. |
| Block Power Snatch | LPO | 1 | Power snatch iniciado com a barra apoiada em blocos. | Cadeia posterior, ombros, trapézio. |
| Block Snatch High Pull | LPO | 1 | Puxada alta com pegada de snatch, iniciada com a barra apoiada em blocos. | Trapézio, deltoides, cadeia posterior. |
| Low Hang High Pull | LPO | 3 | Puxada alta iniciada no low hang (barra abaixo do joelho), cotovelos conduzindo acima da linha da barra. | Trapézio, deltoides, cadeia posterior. |
| DB Hang Clean & Jerk | LPO | 3 | Clean do halter a partir do hang até o ombro, seguido de jerk até acima da cabeça. | Cadeia posterior, ombros, tríceps, quadríceps. |
| Handstand Push-up (HSPU) | Skill | 21 | Flexão de braço invertida na parede — variação livre: strict ou kipping. | Deltoides, tríceps, trapézio, core. |
| Deficit Strict HSPU | Skill | 1 | Strict HSPU com as mãos elevadas sobre anilhas ou paralelas, aumentando a amplitude. | Deltoides, tríceps, trapézio. |
| Eccentric Deficit HSPU | Skill | 1 | Descida lenta e controlada do HSPU com as mãos elevadas — só a fase excêntrica. | Deltoides, tríceps, trapézio. |
| Supinated Strict Pull-up | Skill | 13 | Barra fixa sem impulso, pegada supinada (palmas voltadas para o corpo). | Dorsais, bíceps, romboides. |
| Pronated Strict Pull-up | Skill | 1 | Barra fixa sem impulso, pegada pronada (palmas voltadas para a frente). | Dorsais, bíceps, romboides. |
| Box Jump Step Down | Skill | 5 | Salto em cima da caixa e descida com passada, sem saltar para baixo. | Quadríceps, glúteos, panturrilha. |
| Dual DB Devil Press | Skill | 4 | Burpee com dois halteres seguido da elevação dos dois halteres acima da cabeça, em um único movimento. | Ombros, peitoral, posterior de coxa, core. |

**Changes to existing or September entries:**

| Entrada | Mudança |
|---|---|
| Low Snatch → **Low Hang Snatch** (September, LPO) | New name. Descrição: *Snatch iniciado no low hang — barra entre o hang e o solo, abaixo do joelho.* Músculos unchanged. |
| **Devil Press** (Skill, on prod) | Descrição: *Burpee com um halter seguido da elevação do halter acima da cabeça, em um único movimento.* (Today it says *halteres*, plural.) |
| DUal KB Overhead Walking → **Dual KB Overhead Walking** (Core, on prod) | Spelling only. |

---

<sub>Method: a read-only refresh of the 09-20 cross-reference against prod (`sessions` +
`exercise_registry`, anon key). It walks every exercise exactly as `scripts/audit-session-registry.mjs`
does and buckets misses with that script's taxonomy (copied verbatim, diffed against the source).
September's entries, aliases and BOB family are applied virtually, and this doc's recommendations
are applied on top. The scripts live in the session scratchpad and are not committed, as on 09-20.
The September subset reproduces the audit: 20.7% → 11.8% here, against its 20.3% → 10.9%.</sub>
