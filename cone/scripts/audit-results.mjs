// #115 · Prod results_v2 fidelity audit. Read-only preflight for plans/52 — it sizes every
// decision in that plan and must run BEFORE the ScoreFields extraction lands. Run from cone/:
//   node scripts/audit-results.mjs
// → prints a summary and rewrites docs/reviews/115-results-audit.md. Uses .env.production
// (anon read: results_v2 and sessions are both anon-readable, so no service-role key).
//
// Reports four things, each tied to a plan decision:
//   1. perfTime values with no colon      — live corruption from the never-rolled-out mm:ss mask
//                                           (toSecs reads a bare '1234' as 1234 SECONDS)
//   2. scale values outside SCALES         — the 'Rx'/'Sc'/'Adp' population ClassPanel writes
//   3. MetCon/HIIT results                 — re-ranking blast radius for making them time-scored
//   4. blocks carrying a goal, by kind     — how much of the badge surface is reachable
// Plus two sizing counts for the DNF step: how many entries are already DNF-shaped, and how
// many time blocks have no `rounds` (on those, a capped athlete cannot record anything today).
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { SCALES, isTimeBlock, toSecs } from '../src/public/lib/wod.js'

const env = readFileSync('./.env.production', 'utf8')
const get = k => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const sb = createClient(get('VITE_SUPABASE_URL'), get('VITE_SUPABASE_ANON_KEY'))

const [{ data: sessRow }, { data: results, error: resErr }] = await Promise.all([
  sb.from('sessions').select('value').eq('id', 1).maybeSingle(),
  sb.from('results_v2').select('*'),
])
if (resErr) {
  console.error('results_v2 read failed:', resErr.message)
  process.exit(1)
}

// blockId → { block, sess, dateKey }. Block ids are unique per block object across the blob;
// results reference them directly (blocks[].blockId), so a flat index is enough.
const byBlockId = new Map()
const allBlocks = []
Object.entries(sessRow?.value || {}).forEach(([dateKey, day]) =>
  (Array.isArray(day) ? day : []).forEach(sess =>
    (sess.blocks || []).forEach(block => {
      byBlockId.set(String(block.id), { block, sess, dateKey })
      allBlocks.push({ block, sess, dateKey })
    }),
  ),
)

const rows = results || []
const entries = []
rows.forEach(r =>
  (r.blocks || []).forEach(b =>
    entries.push({ ...b, _rowId: r.id, _ath: r.athlete_id, _date: r.date, _sess: r.session_id }),
  ),
)

const sample = (arr, n = 8) => arr.slice(0, n)
const tally = arr => {
  const m = new Map()
  arr.forEach(v => m.set(v, (m.get(v) || 0) + 1))
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

// ── 1. malformed perfTime ────────────────────────────────────────────────────
// A logged time with no ':' is read by toSecs' single-segment branch as raw seconds.
const badTime = entries
  .filter(e => e.perfTime && !String(e.perfTime).includes(':'))
  .map(e => ({
    val: e.perfTime,
    readAs: toSecs(e.perfTime),
    meant: `${e.perfTime}`.padStart(4, '0').replace(/(\d{1,2})(\d{2})$/, '$1:$2'),
    date: e._date,
    label: e.blockLabel,
  }))

// ── 2. non-canonical scale ───────────────────────────────────────────────────
const badScale = entries.filter(e => e.scale && !SCALES.includes(e.scale))

// ── 3. MetCon / HIIT results (the isTimeBlock change's blast radius) ─────────
const mcTypes = ['MetCon', 'HIIT']
const mcEntries = entries.filter(e => {
  const t = e.blockType || byBlockId.get(String(e.blockId))?.block?.type
  return mcTypes.includes(t)
})
const mcWithTime = mcEntries.filter(e => e.perfTime)
const mcWithRounds = mcEntries.filter(e => e.perfRounds || e.perfReps)

// ── 4. goals by kind ─────────────────────────────────────────────────────────
const goalBlocks = allBlocks.filter(({ block }) => block.goal)
const goalKinds = tally(goalBlocks.map(({ block }) => block.goal.kind || '(none)'))
// Reachable = a goal whose kind can be compared against a logged score at all.
const goalComparable = goalBlocks.filter(({ block }) => block.goal.kind !== 'text')
const goalWithResults = goalComparable.filter(({ block }) =>
  entries.some(e => String(e.blockId) === String(block.id)),
)

// ── DNF sizing ───────────────────────────────────────────────────────────────
const timeEntries = entries.filter(e => {
  const t = e.blockType || byBlockId.get(String(e.blockId))?.block?.type
  return isTimeBlock(t)
})
const dnfShaped = timeEntries.filter(e => !e.perfTime && e.perfRounds)
const timeNoScore = timeEntries.filter(e => !e.perfTime && !e.perfRounds)
// Time blocks with no `rounds`: today LogForm/LogPane hide the DNF field entirely on these.
const timeBlocksNoRounds = allBlocks.filter(
  ({ block }) => isTimeBlock(block.type) && !(Number(block.rounds) > 0),
)
const timeBlocksTotal = allBlocks.filter(({ block }) => isTimeBlock(block.type))

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—')

const md = `# #115 — prod \`results_v2\` fidelity audit

> Generated by \`node scripts/audit-results.mjs\` · ${new Date().toISOString().slice(0, 10)}
> Read-only preflight for [plans/52](../plans/52-result-fidelity-chain.md).

**Corpus:** ${rows.length} \`results_v2\` rows · ${entries.length} block entries ·
${allBlocks.length} blocks across ${Object.keys(sessRow?.value || {}).length} session days.

## 1. Malformed \`perfTime\` (no colon) — the missing mm:ss mask

**${badTime.length} of ${entries.filter(e => e.perfTime).length}** logged times (${pct(badTime.length, entries.filter(e => e.perfTime).length)}) have no \`:\`.
\`toSecs\` reads these through its single-segment \`parseInt\` branch, i.e. **as raw seconds**.

${
  badTime.length
    ? `| stored | toSecs reads | probably meant | date | block |\n|---|---|---|---|---|\n${sample(
        badTime,
        20,
      )
        .map(b => `| \`${b.val}\` | ${b.readAs}s | \`${b.meant}\` | ${b.date} | ${b.label} |`)
        .join('\n')}`
    : '_None._ The raw inputs have not produced a colonless time in prod yet — the mask rollout is preventive here, not a cleanup.'
}

## 2. Non-canonical \`scale\` — the ClassPanel drift

Canonical is \`${SCALES.join(' · ')}\`. **${badScale.length}** entries carry something else.

${
  badScale.length
    ? `${tally(badScale.map(e => e.scale))
        .map(([v, n]) => `- \`${v}\` × ${n}`)
        .join(
          '\n',
        )}\n\nThese cannot be coloured by \`SCALE_COL\` and never match \`ScaleFilter\`. → \`scripts/normalize-results-scale.mjs\`.`
    : '_None._ No normalization script needed — fixing `ClassPanel` at the source is enough.'
}

## 3. MetCon / HIIT results — blast radius of making them time-scored

**${mcEntries.length}** logged entries on MetCon/HIIT blocks:
with a time **${mcWithTime.length}** · with rounds/reps **${mcWithRounds.length}**.

${
  mcWithRounds.length
    ? `${mcWithRounds.length} entries are rounds-scored and **would re-rank** when \`isTimeBlock\` gains these types (they have no time, so they sort last). Step 4 needs its own normalization note.`
    : 'Nothing is rounds-scored on these types, so adding them to `isTimeBlock` re-ranks nothing. Safe to fold into step 4 directly.'
}

## 4. Goals — how much of the badge surface is reachable

**${goalBlocks.length}** of ${allBlocks.length} blocks carry a \`goal\`.

${goalKinds.map(([k, n]) => `- \`${k}\` × ${n}`).join('\n') || '_None._'}

Comparable (not \`text\`): **${goalComparable.length}** · of those, **${goalWithResults.length}** already have at least one logged result, i.e. the badge would render on ${goalWithResults.length} block(s) today.

## 5. DNF sizing (step 2)

- Time-block entries: **${timeEntries.length}**
- Already DNF-shaped (no time, has rounds): **${dnfShaped.length}** ${dnfShaped.length > 1 ? `— these all tie in \`rankResults\` today (\`Infinity - Infinity\` = NaN)` : ''}
- Time-block entries with **no score at all** (no time, no rounds): **${timeNoScore.length}** ${timeNoScore.length ? '— capped athletes with nothing recordable' : ''}
- Time blocks with no \`rounds\` set: **${timeBlocksNoRounds.length} of ${timeBlocksTotal.length}** (${pct(timeBlocksNoRounds.length, timeBlocksTotal.length)}) — on these the DNF field is hidden entirely today.
`

writeFileSync('docs/reviews/115-results-audit.md', md)

console.log(`
results_v2 fidelity audit  ·  ${rows.length} rows / ${entries.length} block entries

1. malformed perfTime (no colon)   ${badTime.length} of ${entries.filter(e => e.perfTime).length} logged times
2. non-canonical scale             ${badScale.length}  ${badScale.length ? `(${tally(badScale.map(e => e.scale)).map(([v, n]) => `${v}×${n}`).join(', ')})` : ''}
3. MetCon/HIIT entries             ${mcEntries.length}  (time ${mcWithTime.length} / rounds ${mcWithRounds.length})
4. blocks with a goal              ${goalBlocks.length} of ${allBlocks.length}  (comparable ${goalComparable.length}, with results ${goalWithResults.length})
5. DNF-shaped entries              ${dnfShaped.length}   · time entries with no score ${timeNoScore.length}
   time blocks with no rounds      ${timeBlocksNoRounds.length} of ${timeBlocksTotal.length}  (DNF field hidden on these)

→ docs/reviews/115-results-audit.md
`)
