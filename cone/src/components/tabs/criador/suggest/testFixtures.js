// Synthetic history for the suggest/*.test.js suites (#233). Backups are personal data and
// gitignored, so every test builds its box here. A day is written as Texto and read by the real
// parseSession — the same path the user's own week takes. ⚠️ Shared with the dev-only gallery
// (gallery/groups/criador.jsx, #235), so it is not test-only: nothing in a PRODUCTION bundle imports
// it, but the gallery's SessionSuggestPane entries break if it changes shape.

import { parseSession } from '../textFormat.js'
import { addDays } from './history.js'

export const REGISTRY = {
  Força: [
    'Back Squat',
    'Front Squat',
    'Overhead Squat',
    'Bench Press',
    'Strict Press',
    'Deadlift',
    'Sumo Deadlift',
    'Push Jerk',
    'Split Jerk',
    'Push Press',
    'Bulgarian Split Squat',
    'Barbell Row',
    'Thruster',
  ].map(name => ({ name })),
  LPO: [
    'Snatch',
    'Power Snatch',
    'Drop Snatch',
    'Snatch Balance',
    'Muscle Snatch',
    'Hang Snatch',
    'Clean',
    'Power Clean',
    'Hang Clean',
    'Clean Pull',
    'Muscle Clean',
    'Jerk Balance',
    'DB Snatch',
    'Snatch Deadlift',
  ].map(name => ({ name })),
  Core: ['Plate Sit-up', 'V-up', 'Russian Twist', 'Toes to Bar', 'Plank', 'Hollow Rock'].map(
    name => ({ name }),
  ),
  Skill: ['Strict Pull-up', 'Double Under', 'Bar Muscle-up', 'Strict HSPU', 'Pull-up'].map(
    name => ({ name }),
  ),
  Acessórios: ['Russian Row', 'Lateral Raise', 'DB Bench Press', 'Hip Thrust', 'Nordic Curl'].map(
    name => ({ name }),
  ),
  Cardio: [
    { name: 'Run' },
    { name: 'Bike (Assault/Echo)' },
    { name: 'Remo (Ergômetro)' },
    { name: 'Burpee' },
    { name: 'Wall Ball', defaults: { reps: '20' } },
  ],
  Aquecimento: ['Air Squat', 'Inchworm'].map(name => ({ name })),
}

let n = 0
export function session(date, text, extra = {}) {
  n++
  return {
    id: `s${n}`,
    date,
    sessionName: '',
    locationIds: [],
    blocks: parseSession(text).blocks,
    ...extra,
  }
}

// { dateKey: [session] }, several sessions on one date allowed.
export function blob(list) {
  const out = {}
  list.forEach(s => (out[s.date] = out[s.date] || []).push(s))
  return out
}

// ── The standard box ──────────────────────────────────────────────────────────
const lpo = fam =>
  fam === 'Snatch'
    ? `LPO – Snatch
3 rounds 15' A cada 1'30"
A 3 Drop Snatch 30/35/40%
B 2 Power Snatch 65/70/75%
C 2 Snatch 60/65/70%`
    : `LPO – Clean
3 rounds 15' A cada 1'30"
A 3 Clean Pull 70/80/90%
B 2 Power Clean 60/65/70%
C 1 Clean 70/75/80%`

export const MONDAY = ({
  lift = 'Back Squat',
  top = 85,
  fam = 'Snatch',
  wod = '10 DB Snatch 22/15kg',
} = {}) => `Core
3 rounds 9'
15 Plate Sit-up
15 V-up
20 Russian Twist

Força
2x4 ${lift} ${top - 20}/${top - 10}%
2x2 ${lift} ${top - 5}/${top}%

${lpo(fam)}

Acessórios
3 rounds
8/8 Bulgarian Split Squat
8 Strict Pull-up
8 Russian Row

For Time
3 rounds Cap 15'
${wod}
12 Toes to Bar
400m Run
Meta: 12'

Cardio
40' Bike (Z1)`

const TUESDAY = ({ lift = 'Bench Press' } = {}) => `Core
3 rounds
20 Russian Twist
30" Plank

Força
5x3 ${lift} 60/65/70/75/80%

LPO – Jerk
3 rounds
A 3 Jerk Balance 50/55/60%
B 2 Split Jerk 65/70/75%

Acessórios
3 rounds
10 DB Bench Press
12 Lateral Raise

EMOM
5 rounds A cada 2'
10 Wall Ball 9/6kg
8 Strict HSPU

Cardio
30' Remo (Z2)`

const WEDNESDAY = ({ lift = 'Deadlift', fam = 'Clean' } = {}) => `Aquecimento
2 rounds
10 Air Squat
5 Inchworm

Força
4x3 ${lift} 70/75/80/85%

${lpo(fam)}

Acessórios
3 rounds
12 Hip Thrust
8 Nordic Curl

For Time
Cap 20'
30 Wall Ball 9/6kg
20 Bar Muscle-up
800m Run
Meta: 16'

Cardio
40' Run (Z1)`

const FRIDAY = ({ lift = 'Front Squat' } = {}) => `Core
3 rounds
15 Hollow Rock
12 Toes to Bar

Força
3x3 ${lift} 70/80/90%

${lpo('Snatch')}

Acessórios
3 rounds
10 Barbell Row
8 Strict Pull-up

For Time
4 rounds Cap 14'
15 Thruster 40/30kg
12 Pull-up
10 Burpee

Cardio
20' Run (Z2)`

const MON_LIFTS = ['Back Squat', 'Back Squat', 'Back Squat', 'Front Squat']
const FRI_LIFTS = ['Front Squat', 'Overhead Squat', 'Back Squat']

/**
 * `weeks` Sunday-start weeks from 2026-06-07 — Mon/Tue/Wed/Fri, Snatch and Clean alternating
 * between Monday and Wednesday (the pair rule), Monday's lift in 3-week Back Squat blocks with a
 * Front Squat week between them. `tweak(day, week, text)` may rewrite any day's Texto.
 */
export function standardBox({
  weeks = 12,
  start = '2026-06-07',
  tweak = (d, w, t) => t,
  extra,
} = {}) {
  const list = []
  for (let w = 0; w < weeks; w++) {
    const sun = addDays(start, 7 * w)
    const fam = w % 2 ? 'Clean' : 'Snatch'
    const days = [
      [1, MONDAY({ lift: MON_LIFTS[w % 4], top: 80 + 5 * (w % 3), fam })],
      [2, TUESDAY()],
      [3, WEDNESDAY({ fam: fam === 'Snatch' ? 'Clean' : 'Snatch' })],
      [5, FRIDAY({ lift: FRI_LIFTS[w % 3] })],
    ]
    days.forEach(([d, text]) => {
      const date = addDays(sun, d)
      const t = tweak(d, w, text)
      if (t) list.push(session(date, t, extra))
    })
  }
  return blob(list)
}

// Ids are fresh uid()s on every run; everything else must be identical.
export const stripIds = value =>
  JSON.parse(JSON.stringify(value, (k, v) => (k === 'id' ? undefined : v)))
