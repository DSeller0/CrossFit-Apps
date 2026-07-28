// #115 · One-time repair of colonless perfTime values in results_v2.blocks.
// Run from cone/:  node scripts/repair-results-time.mjs [--env=production] [--write]
//
// Every result-logging form used a raw text box until #115, so athletes typed `1400` meaning
// 14:00. toSecs' single-segment branch reads that as 1400 SECONDS — 23:20 — and ranks it
// accordingly. The prod audit found 9 of 16 logged times affected
// (docs/reviews/115-results-audit.md).
//
// ⚠️ Repairs ONLY the unambiguous cases. A 3- or 4-digit value is mm:ss read from the right,
// exactly as maskMMSS would have produced it, so `1400` → `14:00` is a rewrite of notation and
// not a guess. A 1- or 2-digit value is genuinely ambiguous — `14` is almost certainly 14
// minutes, but it could be 14 seconds, and only a human knows. Those are REPORTED and never
// written: inventing a number that reads as data is the failure mode #66 exists to name.
//
// Mirrors scripts/normalize-session-ids.mjs: dry-run by default, --write applies locally, and
// against production it refuses and prints SQL to paste into the Supabase SQL editor instead
// (this repo holds no prod service-role key).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { maskMMSS, expandMMSS, fmtSecs } from '../src/public/lib/wod.js'

const args = process.argv.slice(2)
const doWrite = args.includes('--write')
const envName = (args.find(a => a.startsWith('--env=')) || '--env=production').split('=')[1]
const envFile = `./.env.${envName}`

const raw = readFileSync(envFile, 'utf8')
const env = Object.fromEntries(
  raw
    .split('\n')
    .map(l => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(m => [m[1], m[2].trim()]),
)

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

function classify(v) {
  const s = String(v ?? '').trim()
  if (!s || s.includes(':')) return { kind: 'ok' }
  const d = s.replace(/\D/g, '')
  if (!d) return { kind: 'ok' }
  // A decimal separator is a DIFFERENT shape, not noise: '11.50' is 11:50 if the dot stood in
  // for a colon, but 11:30 if the athlete meant 11.5 minutes. Both are plausible, so this is
  // a human call — the digit rule below would silently pick one.
  if (/[.,]/.test(s)) return { kind: 'ambiguous', guess: maskMMSS(d), note: 'decimal' }
  // 3–4 bare digits: mm:ss read from the right, exactly what maskMMSS would have produced.
  // A rewrite of notation, not a guess.
  if (d.length >= 3) return { kind: 'fix', to: maskMMSS(d) }
  // 1–2 digits: expandMMSS would read it as minutes, which is the likely intent but not a
  // certainty. Report, never write.
  return { kind: 'ambiguous', guess: expandMMSS(d), note: 'short' }
}

const sqlLit = s => `'${String(s).replace(/'/g, "''")}'`

function buildSql(fixes) {
  const lines = [
    '-- #115 · repair colonless perfTime values in results_v2.blocks',
    '-- Each statement rewrites ONE block entry of ONE row. Idempotent: the WHERE clause',
    "-- matches only while the old value is still there, so re-running is a no-op.",
    'begin;',
  ]
  fixes.forEach(f => {
    lines.push(
      `update results_v2 set blocks = jsonb_set(blocks, '{${f.index},perfTime}', ${sqlLit(`"${f.to}"`)}::jsonb)` +
        ` where id = ${sqlLit(f.rowId)} and blocks->${f.index}->>'perfTime' = ${sqlLit(f.from)};`,
    )
  })
  lines.push('commit;')
  return lines.join('\n')
}

async function main() {
  const { data: rows, error } = await sb.from('results_v2').select('id, date, blocks')
  if (error) {
    console.error('read failed:', error.message)
    process.exit(1)
  }

  const fixes = []
  const ambiguous = []
  const next = new Map()

  for (const r of rows || []) {
    const blocks = Array.isArray(r.blocks) ? r.blocks : []
    let touched = false
    const copy = blocks.map((b, index) => {
      const c = classify(b?.perfTime)
      if (c.kind === 'fix') {
        fixes.push({
          rowId: r.id,
          index,
          date: r.date,
          label: b.blockLabel,
          from: String(b.perfTime),
          to: c.to,
        })
        touched = true
        return { ...b, perfTime: c.to }
      }
      if (c.kind === 'ambiguous')
        ambiguous.push({
          rowId: r.id,
          index,
          date: r.date,
          label: b.blockLabel,
          from: String(b.perfTime),
          guess: c.guess,
          note: c.note,
        })
      return b
    })
    if (touched) next.set(r.id, copy)
  }

  if (!fixes.length && !ambiguous.length) {
    console.log('No colonless perfTime values found. Nothing to do.')
    return
  }

  if (fixes.length) {
    console.log(`\n${fixes.length} unambiguous value(s) — 3+ digits, mm:ss from the right:`)
    fixes.forEach(f =>
      console.log(`  ${f.date}  ${f.label || '(block)'}  "${f.from}"  ->  "${f.to}"`),
    )
  }

  if (ambiguous.length) {
    console.log(`\n${ambiguous.length} AMBIGUOUS value(s) — NOT repaired, decide these by hand:`)
    ambiguous.forEach(a => {
      const alt =
        a.note === 'decimal'
          ? `"${fmtSecs(Math.round(parseFloat(a.from.replace(',', '.')) * 60))}"  (as decimal minutes)`
          : `"00:${String(a.from).padStart(2, '0')}"  (as seconds)`
      console.log(
        `  ${a.date}  ${a.label || '(block)'}  "${a.from}"  ->  "${a.guess}"  (as mm:ss)  or  ${alt}`,
      )
    })
  }

  if (!doWrite) {
    console.log('\nDry run — no write performed. Pass --write to apply (local only).')
    return
  }

  if (envName === 'production') {
    console.log(
      '\n--write is refused against production (no prod service-role key in this repo; prod',
    )
    console.log(
      'writes go through an authenticated coach session, not a script). Paste this into the',
    )
    console.log('Supabase SQL editor instead:\n')
    console.log(buildSql(fixes))
    return
  }

  const svcKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!svcKey) {
    console.error('\nSUPABASE_SERVICE_ROLE_KEY not set in ' + envFile)
    process.exit(1)
  }
  const writer = createClient(env.VITE_SUPABASE_URL, svcKey)
  for (const [id, blocks] of next) {
    const { error: e } = await writer.from('results_v2').update({ blocks }).eq('id', id)
    if (e) {
      console.error(`\nWrite failed for ${id}:`, e.message)
      process.exit(1)
    }
  }
  console.log(`\nRepaired ${fixes.length} value(s) across ${next.size} row(s) in ${envName}.`)
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
