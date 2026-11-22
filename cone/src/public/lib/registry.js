// Registry name resolution (#62) — a coach free-types shorthand and pt-BR names
// ("BMU", "T2B", "HSPU ", "FLEXÃO NÓRDICA ") into session/PR exercise fields while
// exercise_registry entries are English long-form ("Bar Muscle-up", "Toes to Bar").
// Raw exact-lowercase equality at each consumer joined only ~12% of real prod names
// (docs/plans/30-registry-normalization.md). This is the one path every name→registry
// lookup should go through instead of reimplementing the comparison.
//
// Match-only: normExName/resolveExercise never rewrite what the coach typed — only
// the lookup key changes, so prescriptions and display are untouched.

export function normExName(name) {
  return (name || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

// Prescription volume that leaked into the name field — strip it before matching so the
// bare movement name underneath still resolves. #94's prod audit found this is the single
// biggest miss bucket (179 of 453 unresolved occurrences), so this peels far more than the
// original "leading bare count": distances ("800m Run"), durations ("40\" Hollow Hold",
// "1' Prancha"), rep schemes ("21-15-9 C2B", "2-4-6-8… BMU"), UNILATERAL per-side schemes
// ("8/8 Búlgaro Squat" = 8 each leg, "10/10", "20''/20''"), calorie counts ("12 cal row"),
// heart-rate zones ("20' z2 bike", "Run Z1") and the coach's "heavy" qualifier.
//
// A unit letter must not be followed by another letter — otherwise the "s" in "5 Strict
// Pull Up" reads as a seconds unit and the name is mangled to "trict pull up".
const LEADING_VOLUME =
  /^(?:heavy(?![a-z])|z\d+|\d+(?:[.,]\d+)?\s*(?:(?:km|kg|cal|min|k|m|s|x)(?![a-z]))?)\s*['"’”′″]*\s*[-/…,.]*\s*/
// A slot letter from a lettered block ("A- 3 Snatch Balance", "C 3 Squat Jerk"). Only
// stripped when a NUMBER follows, so the interval "A cada 3'" is never mistaken for one.
const SLOT = /^[a-e][-).]?\s+(?=\d)/
// A tempo/pause note glued to the end ("Bench Press 3\" pausa", "Squat clean 30\" entre as
// reps"): everything from the tempo mark on is coaching detail, not the movement.
const TRAILING_NOTE = /\s*\d+\s*['"’”′″].*$/
// A trailing qualifier in parens ("Row ( forte )", "Split Jerk (BNK)", "Box Jump Over
// (Step Down)"). Safe as a FALLBACK only — resolveExercise tries the exact key first, so
// a real entry like "Hip Distraction (banded)" still matches before this ever runs.
const TRAILING_PAREN = /\s*\([^)]*\)\s*$/
// Alternating-sides suffix ("DB Snatch alt", "Perdigueiro alternando", "V ups Alt") and a
// dangling "pausa" left behind once its tempo mark is stripped ("Bench Press pausa 2\" …").
const TRAILING_ALT = /\s+(?:alt|alternad[oa]s?|alternando|pausa|pause)$/

// R7 (#211) — the same stripper, but a ONE-letter unit (k/m/s) is left in place. In the coach's
// shorthand "S" is STRICT ("21-15-9 S Hspu", "5 S Pull Up"), and LEADING_VOLUME reads it as a
// seconds unit and eats it. An "x" is still consumed — it is only ever a multiplier ("3 x 10 S
// Pull Up"). resolveExercise tries this form BEFORE the unit-stripping one, so "s hspu" resolves
// through its alias, while "800m Run" / "30 s Plank" leave "m run" / "s plank", which resolve to
// nothing and fall through to LEADING_VOLUME.
const LEADING_VOLUME_KEEP_UNIT =
  /^(?:heavy(?![a-z])|z\d+|\d+(?:[.,]\d+)?\s*(?:(?:km|kg|cal|min|x)(?![a-z]))?)\s*['"’”′″]*\s*[-/…,.]*\s*/

function stripVolumeNoise(key, leading = LEADING_VOLUME) {
  let out = key.replace(SLOT, '')
  // Iterate: a rep scheme is several volume tokens in a row ("21-15-9 " = 3 passes).
  for (let i = 0; i < 12 && out; i++) {
    const next = out.replace(leading, '')
    if (next === out) break
    out = next
  }
  return out
    .replace(/\s*z\d+$/, '')
    .replace(TRAILING_NOTE, '')
    .replace(TRAILING_PAREN, '')
    .replace(TRAILING_ALT, '')
    .trim()
}

// ── Fallback rules (#211) ─────────────────────────────────────────────────────────────────
// The 2026-09-20 review measured these against the real prod names (§3 of
// docs/reviews/2026-09-20-exercises.md). Each runs ONLY after every form above has missed, so none
// of them can move a name that already resolves, and each result goes through the same hyphen and
// plural variants as the primary forms. They are exported so the tests can pin each one alone.

// R2 — the FIRST alternative of an "A / B" line ("RMU / 12 Pull Up", "Legless / RC", "HSW / 5 Wall
// Walk", "Sandbag Carry/Farm carry Heavy"). A letter is required on BOTH sides of the slash, so a
// per-side scheme ("8/8 Búlgaro") or a load pair ("Thruster 60/45") is never split.
export function firstAlternative(key) {
  const i = String(key).indexOf('/')
  if (i < 1) return null
  const left = key.slice(0, i).trim()
  return /[a-z]/.test(left) && /[a-z]/.test(key.slice(i + 1)) ? left : null
}

// R3 — a PRESCRIPTION glued to the END of the name: a load list ("Thruster 60/45", "Deadlift 100/75
// 90/65", "Snatch 20kg"), a percentage ("Back Squat 60% Rm", "OHS 80% do RM"), a scheme ("Hummer Curl
// 3 x 10") or the coach's "unbrk"/"unbroken"/"leve". The loop peels several in a row.
// Order matters: the scheme and the percentage must be tried before the bare trailing number,
// which would otherwise peel only the "10" of "3 x 10" and leave "3 x" behind.
const TRAILING_PRESCRIPTION = [
  /\s+\d+\s*[x×]\s*\d+(?:[.,]\d+)?$/,
  /\s+\d+(?:[.,]\d+)?\s*%\s*(?:do\s+)?rm$/,
  /\s+\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)*\s*(?:kg|lbs?)?$/,
  /\s+(?:unbrk|unbroken|leve)$/,
]
export function peelTrailing(s) {
  let out = String(s)
  for (let i = 0; i < 6; i++) {
    const re = TRAILING_PRESCRIPTION.find(r => r.test(out))
    if (!re) break
    out = out.replace(re, '')
  }
  return out
}

// R4 — a leading step label with no quantity after it ("A Jerk Balance"). SLOT only strips a letter
// that a NUMBER follows, because the bare form would eat the first word of any name starting with
// a lone a–e; as a fallback it only ever runs on a name that resolves to nothing.
export function dropStepLabel(s) {
  return String(s).replace(/^[a-e][-).]?\s+(?=[a-z])/, '')
}

// The variants every form goes through: the spaced spelling of a hyphenated one, then a plain
// plural last. Shared by the primary pass and every fallback so they cannot drift apart.
function expandForms(bases) {
  const forms = [...bases]
  forms.forEach(k => {
    if (k.includes('-')) forms.push(k.replace(/-/g, ' '))
  })
  // Last resort — a plain plural ("Lunges", "Burpees", "Upright Rows", "V-ups"). The
  // "[^s]s" guard means a word already ending in "ss" is left alone, so "Press" is never
  // mangled into "Pres".
  forms.slice().forEach(k => {
    if (/[^s]s$/.test(k)) forms.push(k.slice(0, -1))
  })
  return forms
}

// A trailing "(…)" in a registry name is either a DISAMBIGUATOR ("Remo (Ergômetro)",
// "L-sit (rings)") or the coach's SHORTHAND ("Single Under (SU)", "Burpee Over the Bar
// (BOB)") — the convention #94 settled on for new entries. Both halves must resolve, so
// an entry is also indexed under its base name and, when the parenthetical looks like a
// shorthand, under the shorthand alone. Shorthand = a short all-caps token, which is what
// separates "(SU)"/"(S2OH)"/"(BOB)" from "(Ergômetro)"/"(banded)"/"(Assault/Echo)" —
// so no per-entry upkeep is needed as the coach adds more.
const PAREN = /^(.*?)\s*\(([^)]+)\)\s*$/
const SHORTHAND = /^[A-Z0-9&/+-]{2,6}$/
function derivedKeys(name) {
  const keys = []
  const add = k => {
    if (k && !keys.includes(k)) keys.push(k)
  }

  const m = String(name).match(PAREN)
  if (m) {
    const [, base, inner] = m
    if (base.trim()) add(normExName(base))
    if (SHORTHAND.test(inner.trim())) add(normExName(inner))
    // R5 (#211) — a multi-alternative parenthetical ("Bike (Assault/Echo)") answers to each
    // alternative in front of the base name: "Assault Bike", "Echo Bike".
    if (inner.includes('/') && !SHORTHAND.test(inner.trim()) && base.trim())
      inner.split('/').forEach(alt => add(normExName(`${alt} ${base}`)))
  }

  // "Strict Pull-up" ↔ "Strict Pull Up". normExName KEEPS hyphens on purpose (exerciseGroups'
  // rootGroup tokenizes on them), but the coach types the spaced spelling about as often, so
  // every hyphenated entry also answers to it — one rule instead of an alias per name.
  ;[normExName(name), ...keys].forEach(k => {
    if (k.includes('-')) add(k.replace(/-/g, ' '))
  })
  return keys
}

// Shorthand / pt-BR variant → canonical registry name. Authored from a real diff of
// prod's 228 session-exercise-name occurrences against exercise_registry
// (docs/plans/30-registry-normalization.md, 2026-07-18) — not guessed. Raised the
// join rate from 12.7% to 51.3% on that sample; the rest of the misses are compound
// prescription notation ("1 MUSCLE + 3 FRONT 3\"", "A- 3 SNATCH BALANCE") that isn't a
// single exercise name and would need real product changes (not aliasing) to capture.
// Extend here as new misses turn up — never at a call site.
//
// ⚠️ Every VALUE must be an EXACT existing registry entry name. A value naming an entry
// that doesn't exist is a dangling pointer that silently resolves to nothing — #94 found
// 'run'/'sprint' both pointing at a "Corrida" entry the registry has never had (the real
// Cardio entry is "Run"), so the coach's actual pt-BR word missed entirely.
export const ALIASES = {
  bmu: 'Bar Muscle-up',
  rmu: 'Ring Muscle-up',
  'ring mu': 'Ring Muscle-up',
  t2b: 'Toes to Bar',
  'strict t2b': 'Strict Toes to Bar',
  c2b: 'Chest-to-Bar',
  du: 'Double Under',
  'du crossover': 'Double Under Crossover',
  ohs: 'Overhead Squat',
  'c&j': 'Clean & Jerk',
  corrida: 'Run',
  row: 'Remo (Ergômetro)',
  remador: 'Remo (Ergômetro)',
  bike: 'Bike (Assault/Echo)',
  ski: 'Ski Erg',
  pistol: 'Pistol Squat',
  pistols: 'Pistol Squat',
  'strict pull up supinado': 'Supinated Strict Pull-up',
  'strict pull-up supinado': 'Supinated Strict Pull-up',
  'strict pull up argola': 'Ring Strict Pull-up',
  hsw: 'Handstand Walk',
  'ring dips': 'Ring Dip',
  prancha: 'Plank',
  'prancha lateral': 'Side Plank',
  'bent over row': 'Barbell Row',
  'rosca direta': 'Bicep Curl',
  'farm carry': "Farmer's Carry",
  'elevacao frontal': 'Front Raise',
  'elevacao lateral': 'Lateral Raise',
  'strict press sentado': 'Seated Strict Press',
  'bulgaro squat': 'Bulgarian Split Squat',
  'hip thruster': 'Hip Thrust',
  'flexao nordica': 'Nordic Curl',

  // #94 batch (2026-07-25). Its rule "a squat clean/snatch IS the full lift" was RETIRED by #211:
  // when the coach wants the squat he writes it, so Squat Clean / Squat Snatch (and their hang,
  // floor, low-hang and high-hang forms) are entries of their own, and "low" means the low hang.
  'low squat clean': 'Low Hang Squat Clean',
  'deadlift deficit': 'Deficit Deadlift',
  bulgaro: 'Bulgarian Split Squat',
  'strict pull up supinada': 'Supinated Strict Pull-up',
  'strict pull-up supinada': 'Supinated Strict Pull-up',
  // Bare "GHD" is the sit-up in this gym's usage; the extension is spelled out.
  ghd: 'GHD Sit-up',
  'ghd hiperextensao': 'GHD Back Extension',
  'ghd hipertensao': 'GHD Back Extension',
  // pt-BR the coach actually types.
  'remada russa': 'Russian Row',
  'remada curvada': 'Barbell Row',
  'prancha ventral': 'Plank',
  'prancha lat': 'Side Plank',
  'bom dia': 'Good Morning',
  martelo: 'Hammer Curl',
  'elevacao lat': 'Lateral Raise',
  // Spellings of the new #94 entries. In this box "Devil Press" means ONE dumbbell (#211), so
  // "DB Devil Press"/"Devil's Press" are spellings of the same exercise, not load variants; the
  // two-dumbbell version is its own entry, "Dual DB Devil Press".
  "devil's press": 'Devil Press',
  'devils press': 'Devil Press',
  'db devil press': 'Devil Press',
  'wal ball': 'Wall Ball',
  // ("burpee over the bar" itself needs no alias — it's the derived base name of the entry.)
  'burpee over bar': 'Burpee Over the Bar (BOB)',
  'bar facing burpee': 'Burpee Over the Bar (BOB)',
  bbjo: 'Burpee Box Jump Over',

  // #94 round 2 — plain misspellings of entries that already exist. Match-only, so the
  // coach's spelling stays on screen; only the lookup key is corrected.
  'back squay': 'Back Squat',
  hollowrock: 'Hollow Rock',
  vup: 'V-up',
  vups: 'V-up', // run-together spellings the hyphen rule can't reach
  'romenian deadlift': 'Romanian Deadlift',
  'hummer curl': 'Hammer Curl',
  'nordic hamstring curl': 'Nordic Curl',
  'dragon fly': 'Dragon Flag',
  celan: 'Clean',
  'squat celan': 'Squat Clean',
  'hang squat celan': 'Hang Squat Clean',
  'shoulders press': 'Strict Press',
  'shoulders pres': 'Strict Press',
  'pause bench press': 'Bench Press',
  'a swing': 'American KB Swing',
  'kb american swing': 'American KB Swing',
  'kh oh walking': 'Dual KB Overhead Walking',
  'dual kb oh walking': 'Dual KB Overhead Walking',
  'oh walking 2kb': 'Dual KB Overhead Walking',

  // #94 round 2 — spellings/variants of entries added by 94-round2-registry-additions.sql,
  // plus the two the coach mapped onto existing English entries instead of registering.
  'abs anilha': 'Plate Sit-up',
  'abdominal com anilha': 'Plate Sit-up',
  'prancha lat e': 'Side Plank',
  'prancha lat d': 'Side Plank',
  'prancha lateral e': 'Side Plank',
  'prancha lateral d': 'Side Plank',
  'abs medball': 'Abs Med Ball',
  'lenhador caotic': 'Lenhador',
  // A bare HSPU is "Handstand Push-up (HSPU)" since #211 — an entry of its own meaning ANY form,
  // the same logic as the bare Pull-up and Toes to Bar — and it resolves through that entry's
  // derived keys (see derivedKeys), so it needs no alias. Strict / Kipping apply only when spelled out.
  'handstand hold wall': 'Handstand Hold',
  'hsw hold': 'Handstand Hold',
  'lsit argola': 'L-sit (rings)',
  'l sit argola': 'L-sit (rings)',
  lsit: 'L-Sit',
  'l sit barra': 'L-Sit Barra',
  'wall walking': 'Wall Walk',
  'tap shoulder': 'Shoulder Tap',
  'wall shoulder taps': 'Shoulder Tap',
  'push up hand release': 'Hand Release Push-up',
  'push-up hand release': 'Hand Release Push-up',
  'burpees box jump over': 'Burpee Box Jump Over',
  'bbjo step down': 'Burpee Box Jump Over',
  'burpees broad jump': 'Burpee Broad Jump',
  'burpees to plate': 'Burpee to Plate',
  'globet squat': 'Goblet Squat',
  'remada low curvada': 'Barbell Row',
  'remada curvada peg supinada': 'Supinated Barbell Row',
  'bulgaro squat com': 'Bulgarian Split Squat',
  legless: 'Legless Rope Climb',
  rc: 'Rope Climb',
  'wall sit hold': 'Wall Sit',
  'db bench press inclinado': 'DB Incline Press',
  'dual step box up': 'DB Step Box Up',
  'step down kb': 'KB Step Down',
  'kb leg over': 'KB Over Leg',
  'over kb leg': 'KB Over Leg',
  'high squat clean': 'High Hang Squat Clean',
  // "S" = strict in the coach's shorthand.
  's pull up': 'Strict Pull-up',
  's pull-up': 'Strict Pull-up',
  's t2b': 'Strict Toes to Bar',
  's hspu': 'Strict HSPU',
  // NOTE: "Pull Up" → "Pull-up" needs no alias — buildRegistryIndex derives the spaced
  // spelling of every hyphenated entry (see derivedKeys), which is self-maintaining.

  // #211 (2026-11-22) — the exercise-names pass: docs/reviews/2026-11-22-exercise-names-decisions.md.
  // The user's rules (see the doc's "Resolved" section): a variant is its own entry (position, grip,
  // receive, deficit, seated, walking, dual, target); a plain name means any form and a spelled-out
  // "Strict" means the strict entry; "squat" is NOT the plain lift; "low" means low hang.
  // — spellings, shorthand and variants, from the answers:
  wb: 'Wall Ball',
  t2r: 'Toes to Ring',
  bjo: 'Box Jump Over',
  'shoulder press': 'Strict Press',
  'military press': 'Strict Press',
  'militar press': 'Strict Press',
  '8/8 military press': 'DB Strict Press',
  'kb military press': 'KB Strict Press',
  'kb militar press': 'KB Strict Press',
  'db military press': 'DB Strict Press',
  'db militar press': 'DB Strict Press',
  kipping: 'Kipping Swing',
  'kb swing': 'Russian KB Swing',
  'kettlebell swing': 'Russian KB Swing',
  'pike up': 'Pike up Row',
  'power balance': 'Power Snatch Balance',
  'su crossover': 'Single Under Crossover',
  'du/su crossover': 'Double Under Crossover',
  'kangoo squat': 'Kang Squat',
  'saltos na anilha': 'Plate Jump',
  'hws com obstaculos': 'Handstand Walk',
  'low squat snatch': 'Low Hang Squat Snatch',
  'low snatch': 'Low Hang Snatch',
  cruxifico: 'Crucifixo',
  'glute brigde': 'Glute Bridge',
  'burpess to plate': 'Burpee to Plate',
  'russain twist': 'Russian Twist',
  'touch hell': 'Touch Heel',
  'rind dips': 'Ring Dip',
  'l sir barra': 'L-Sit Barra',
  'pike op row': 'Pike up Row',
  'forward rools to suport': 'Forward Roll to Support',
  'stric t2b': 'Strict Toes to Bar',
  'remada curcada': 'Barbell Row',
  'defict deadlift': 'Deficit Deadlift',
  ru: 'Run',
  farm: "Farmer's Carry",
  'dumbbell snatches': 'DB Snatch',
  snatches: 'Snatch',
  'dumbbell thruster': 'DB Thruster',
  'dumbbell hip thrust': 'DB Hip Thruster',
  'dumbbell reverse lunge': 'DB Back Lunge',
  'db elevacao lat': 'DB Lateral Raise',
  'elevacao lateral 2 db': 'DB Lateral Raise',
  'elevacao frontal plate': 'Front Plate Raise',
  'dip paralela': 'Bar Dip',
  'remada curvada pegada supinada': 'Supinated Barbell Row',
  'remada unil': 'Dumbbell Row',
  'isometria em posicao cadeirinha': 'Wall Sit',
  'dead march 2 db': 'Dual DB Dead March',
  'double kb front rack carry': 'Dual KB Front Rack Carry',
  'dual kb front rack': 'Dual KB Front Rack Carry',
  'dual kettlebell front rack walking lunge': 'Dual KB Front Rack Walking Lunge',
  'single arm dumbbell overhead walking lunge': 'DB OH Walking Lunge',
  'box step up over': 'Box Step Over',
  'box jump desce step down': 'Box Jump Step Down',
  'box jump over step down': 'Box Jump Step Down',
  'burpees target': 'Burpee to Target',
  'low power clean': 'Low Hang Power Clean',
  'power snatch saida do bloco': 'Block Power Snatch',
  'deadlift pegada de snatch': 'Snatch Deadlift',
  'defict strict hspu': 'Deficit Strict HSPU',
  'eccentric hspu deficit': 'Eccentric Deficit HSPU',
  'strict pull supinada': 'Supinated Strict Pull-up',
  'strict pull up pronado': 'Pronated Strict Pull-up',
  'strict pull up com carga': 'Weighted Pull-up',
  'strict pull up supinado com carga': 'Supinated Loaded Strict Pull-up',
  'strict handstand push-up': 'Strict HSPU',
  'shoulders press sentado': 'Seated Strict Press',
  'ab anilha': 'Plate Sit-up',
  'ab kb unilateral': 'Abs KB Unilateral',
  'wind mill': 'KB Windmill',
  'plank drag slide': 'Plank Drag',
  superman: 'Arch Hold (Superman)',
  'superman hold': 'Arch Hold (Superman)',
  gdh: 'GHD Sit-up',
  'kb step': 'KB Step-up',
  'kb oh walking 2kb': 'Dual KB Overhead Walking',
  'single leg kb': 'Single Leg RDL',
  'sit-up': 'AbMat Sit-up',
  'back lever on rings': 'Back Lever',
  'tricipes banco com carga': 'Tríceps no Banco',
  'moutain climber': 'Mountain Climber',
  'db c&j': 'DB Clean & Jerk',
  'db c& j': 'DB Clean & Jerk',
  'db hang c&j': 'DB Hang Clean & Jerk',
  'kb sdhp': 'KB Sumo Deadlift High Pull (SDHP)',
  'hallo kb': 'KB Halo',
  halo: 'KB Halo',
  'dual dumbbell row': 'Dual DB Row',
  'prancha lat dinamica': 'Prancha Lateral Dinâmica',
  'prancha lat e dinamica': 'Prancha Lateral Dinâmica',
  'prancha lateral dinamica d': 'Prancha Lateral Dinâmica',
  'prancha lateral dinamica e': 'Prancha Lateral Dinâmica',
  'burpees step up': 'Burpee Box Step-up',
  'dual kb walking': "Farmer's Carry",

  // — the 2026-09-20 review's §4b table, as the answers changed it (27 that break the variant rule
  //   are held back: #250):
  'ab infra': 'Abs Infra',
  'abs infra banco': 'Abs Infra',
  'remador + vups': 'Abs Remador',
  'vups + remador': 'Abs Remador',
  'reverse lunge': 'Back Lunge',
  'dip pararelo': 'Bar Dip',
  'dip paralelo': 'Bar Dip',
  'remada curvada supinada': 'Supinated Barbell Row',
  'remada curvada peg pronada': 'Barbell Row',
  'echo bike': 'Bike (Assault/Echo)',
  'cal bike': 'Bike (Assault/Echo)',
  'bulgarian squat': 'Bulgarian Split Squat',
  'burpee target': 'Burpee to Target',
  'burppes broad jump': 'Burpee Broad Jump',
  'farm carry caitic': "Chaotic Farmer's Carry",
  'chest to bar pull up': 'Chest-to-Bar',
  'high pull clean': 'Clean High Pull',
  'db incline bench press': 'DB Incline Press',
  'hang db snatch alt': 'DB Hang Snatch',
  'elevacao pelvica db': 'DB Hip Thruster',
  'db elevacao lateral': 'DB Lateral Raise',
  'db overhead lunge': 'DB OH Lunge',
  'db step up over': 'DB Box Step Over',
  'db deadlift': 'DB/KB Deadlift',
  'dead march dual db': 'Dual DB Dead March',
  'dual devil press': 'Dual DB Devil Press',
  'drop split': 'Drop Split Jerk',
  'dual kb oh walk': 'Dual KB Overhead Walking',
  'kb oh walking': 'Dual KB Overhead Walking',
  'double kb oh walking': 'Dual KB Overhead Walking',
  'remada unilateral': 'Dumbbell Row',
  'farmer carry': "Farmer's Carry",
  'farm cary': "Farmer's Carry",
  'back extension': 'GHD Back Extension',
  'gluteo brigde': 'Glute Bridge',
  'good mornind': 'Good Morning',
  'golira row': 'Gorila Row',
  'rosca martelo': 'Hammer Curl',
  'db hammer curl': 'Hammer Curl',
  'push up hr': 'Hand Release Push-up',
  'hs hold': 'Handstand Hold',
  'hs walking': 'Handstand Walk',
  'power clean hang': 'Hang Power Clean',
  'power clean high hang': 'High Hang Power Clean',
  'low high pull': 'Low Hang High Pull',
  'hip to bar end bar turnover': 'Hip to bar en bar turnover',
  'hollowrock hold': 'Hollow Hold',
  'hollow body rocks': 'Hollow Rock',
  'inverted hollow rock': 'Hollow Rock',
  'sdhp kb': 'KB Sumo Deadlift High Pull (SDHP)',
  'kb oblique crunch': 'KB Oblíquo',
  'kipping uma puxada': 'Kipping Pull-up',
  'l sit pararelo': 'L-Sit (parallettes)',
  'lsit parelete': 'L-Sit (parallettes)',
  'lsit barra': 'L-Sit Barra',
  'muscle celan': 'Muscle Clean',
  'overhead squat c': 'Overhead Squat',
  'power clean floor': 'Floor Power Clean',
  'cal row': 'Remo (Ergômetro)',
  'db reverse fly': 'Reverse Fly',
  'easy jog': 'Run',
  'russian swing': 'Russian KB Swing',
  'kb russian swing': 'Russian KB Swing',
  'scap pull': 'Scapular Pull-up',
  'scap pull up': 'Scapular Pull-up',
  'scap pull-up': 'Scapular Pull-up',
  'alt single leg good mornings': 'Single Leg RDL',
  skierg: 'Ski Erg',
  'calories ski': 'Ski Erg',
  'box step up': 'Step-up',
  'ball step up': 'Step-up',
  'step up over': 'Box Step Over',
  'triceps band': 'Tricep Extension',
  'triceps extension': 'Tricep Extension',
  'wall wall': 'Wall Walk',
  'burpees box step up': 'Burpee Box Step-up',

  // — the Burpee Over the Bar family:
  'burpees over the bar': 'Burpee Over the Bar (BOB)',
  'burpees over bar': 'Burpee Over the Bar (BOB)',
  'burpee over rower': 'Burpee Over the Bar (BOB)',
  'burpees over rower': 'Burpee Over the Bar (BOB)',
  'burpees over the db': 'Burpee Over the Bar (BOB)',
  'burpee over the db': 'Burpee Over the Bar (BOB)',
  'lat burpees over the db': 'Burpee Over the Bar (BOB)',
  'burpees over the erg': 'Burpee Over the Bar (BOB)',
  'burpees over the row': 'Burpee Over the Bar (BOB)',
  'burpee over the line': 'Burpee Over the Bar (BOB)',
  'burpees over ball': 'Burpee Over the Bar (BOB)',
}

// Map<normKey, entry> flattened across every block family — entry gets a `categories`
// array of every family key it was found under (first-seen entry data wins on a
// collision, matching the old per-consumer `demoMap`/`getRegistryDefaults` behavior).
// Build once per registry fetch and reuse across many resolveExercise() calls.
export function buildRegistryIndex(registry) {
  const index = new Map()
  if (!registry || typeof registry !== 'object') return index

  const flat = []
  Object.entries(registry).forEach(([family, list]) => {
    ;(Array.isArray(list) ? list : []).forEach(raw => {
      const name = typeof raw === 'string' ? raw : raw?.name
      if (name) flat.push([family, name, raw])
    })
  })

  // Pass 1 — real entry names. Two passes (not one) so a name DERIVED from one entry can
  // never shadow another entry's actual name: every real name is in the map first.
  flat.forEach(([family, name, raw]) => {
    const key = normExName(name)
    const existing = index.get(key)
    if (existing) {
      if (!existing.categories.includes(family)) existing.categories.push(family)
    } else
      index.set(key, { ...(typeof raw === 'string' ? { name: raw } : raw), categories: [family] })
  })

  // Pass 2 — base-name / shorthand keys point at the SAME entry object (so `categories`
  // stays shared and correct); first one wins, and a real name is never overwritten.
  flat.forEach(([, name]) => {
    const entry = index.get(normExName(name))
    if (!entry) return
    derivedKeys(name).forEach(k => {
      if (!index.has(k)) index.set(k, entry)
    })
  })

  return index
}

function lookup(index, key) {
  if (!key) return null
  if (index.has(key)) return index.get(key)
  const alias = ALIASES[key]
  return alias ? index.get(normExName(alias)) || null : null
}

// Resolves a coach-typed exercise name to its registry entry (with a `categories`
// array attached). `registryOrIndex` accepts either the raw `exercise_registry` blob
// or a `buildRegistryIndex` Map — pass a pre-built Map when resolving many names
// against the same registry (e.g. every exercise row in a session).
export function resolveExercise(name, registryOrIndex) {
  const index =
    registryOrIndex instanceof Map ? registryOrIndex : buildRegistryIndex(registryOrIndex)
  const key = normExName(name)
  if (!key) return null

  const tryForms = bases => {
    for (const form of expandForms(bases)) {
      const hit = lookup(index, form)
      if (hit) return hit
    }
    return null
  }

  // Candidate spellings, strongest signal first — the exact name always wins, and each
  // fallback only runs if everything before it missed. R7 sits between the exact name and the
  // unit-stripping form: "S" before a movement is the coach's STRICT, not seconds.
  const stripped = stripVolumeNoise(key)
  const primary = tryForms([key, stripVolumeNoise(key, LEADING_VOLUME_KEEP_UNIT), stripped])
  if (primary) return primary

  // R2 — the first alternative of "A / B".
  const alt = firstAlternative(key)
  if (alt) {
    const hit = resolveExercise(alt, index)
    if (hit) return hit
  }
  // R3 — a trailing load / percentage / scheme.
  const peeled = peelTrailing(stripped)
  if (peeled !== stripped) {
    const hit = tryForms([peeled])
    if (hit) return hit
  }
  // R4 — a leading step label, with whatever noise the name carries after it (a tempo note, a
  // parenthetical, a trailing load), so it goes through the same stripper as everything else.
  const unlabeled = dropStepLabel(key)
  if (unlabeled !== key) {
    const base = stripVolumeNoise(unlabeled)
    return tryForms([unlabeled, base, peelTrailing(base)])
  }
  return null
}
