#!/usr/bin/env node
// #125 — one-time repair of colonless block.goal time values in the `sessions` blob.
// `criador/GoalInput.jsx` wrapped `MaskedTimeInput` directly and skipped the
// expandMMSS-on-blur contract (fixed in MaskedTimeInput.jsx itself, plans/60), so a coach
// typing `14` into a For Time block's Meta field got back `14`, not `14:00`. toSecs then reads
// that as 14 SECONDS, which inverts #117's goal badge (a 13:45 finish resolves to 'missed').
//
// Read-only by default (anon key — `sessions` is anon-readable). Reports the exact diff either
// way. Unlike scripts/repair-results-time.mjs, there is no ambiguous case to gate behind a
// flag: `expandMMSS`'s "a colonless value in a WOD time field means minutes" rule (wod.js) is
// already the established, unconditional convention, so every colonless goal is repaired in
// one pass.
//
//   node scripts/repair-goal-time.mjs                     dry run against prod (default, read-only)
//   node scripts/repair-goal-time.mjs --env=development   dry run against local dev stack
//   node scripts/repair-goal-time.mjs --write              WRITES to local (service-role key)
//
// --write against production is refused on purpose (mirrors normalize-session-ids.mjs /
// CLAUDE.md's migration workflow: this repo has no prod service-role key, and prod writes go
// through the coach's authenticated session or manual SQL, not a script). Instead it prints a
// ready-to-paste jsonb_set UPDATE for the Supabase SQL editor.
//
// Safe to re-run: expandMMSS is idempotent, so a second run against already-repaired data
// reports zero changes.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { expandMMSS } from '../src/public/lib/wod.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function readEnv(file) {
  const full = path.join(ROOT, file)
  if (!fs.existsSync(full)) throw new Error(file + ' not found at ' + full)
  return Object.fromEntries(
    fs
      .readFileSync(full, 'utf8')
      .split('\n')
      .filter(l => l.includes('='))
      .map(l => {
        const [k, ...v] = l.split('=')
        return [k.trim(), v.join('=').trim()]
      }),
  )
}

const args = process.argv.slice(2)
const envName = (args.find(a => a.startsWith('--env=')) || '--env=production').split('=')[1]
const doWrite = args.includes('--write')
if (!['development', 'production'].includes(envName)) {
  console.error(`Unknown --env=${envName} (expected development|production)`)
  process.exit(1)
}
const envFile = `.env.${envName}`

// Walks every session's blocks, repairing any time-kind goal whose min/max is colonless.
// Returns the repaired blob plus a flat list of what changed (for the report + SQL builder).
function repairGoals(sessions) {
  const after = {}
  const changes = []
  for (const dateKey of Object.keys(sessions)) {
    const arr = Array.isArray(sessions[dateKey]) ? sessions[dateKey] : []
    after[dateKey] = arr.map((sess, sessIdx) => {
      const blocks = Array.isArray(sess.blocks) ? sess.blocks : []
      const newBlocks = blocks.map((block, blockIdx) => {
        const g = block.goal
        if (!g || g.kind !== 'time') return block
        const fields = {}
        for (const key of ['min', 'max']) {
          const v = g[key]
          if (!v) continue
          const fixed = expandMMSS(v)
          if (fixed !== v) fields[key] = fixed
        }
        if (Object.keys(fields).length === 0) return block
        changes.push({
          dateKey,
          sessIdx,
          blockIdx,
          blockId: block.id,
          sessionName: sess.name || sess.sessionName,
          before: { min: g.min, max: g.max },
          after: { ...g, ...fields },
        })
        return { ...block, goal: { ...g, ...fields } }
      })
      return { ...sess, blocks: newBlocks }
    })
  }
  return { after, changes }
}

// jsonb path segments are text — quote any segment holding chars an unquoted array literal
// can't take. Date keys ("2026-06-06") never need it; guards anyway.
const NEEDS_QUOTE = /[",{}\\\s]/
const pathSeg = s => (NEEDS_QUOTE.test(s) ? `"${s.replace(/(["\\])/g, '\\$1')}"` : s)

// A SQL string literal, single-quoted with internal single quotes doubled — not
// JSON.stringify's double-quoted form, which SQL reads as an identifier.
const sqlLit = s => `'${s.replace(/'/g, "''")}'`

function buildSql(changes) {
  const inner = changes.reduce((acc, c) => {
    let sql = acc
    for (const key of ['min', 'max']) {
      if (c.after[key] === undefined || c.after[key] === c.before[key]) continue
      const p = `{${pathSeg(c.dateKey)},${c.sessIdx},blocks,${c.blockIdx},goal,${key}}`
      sql = `jsonb_set(${sql}, '${p}', ${sqlLit(JSON.stringify(c.after[key]))}::jsonb)`
    }
    return sql
  }, 'value')
  const title = '#125/plans/60 — repair colonless block.goal time values to mm:ss (prod)'
  return `-- ${title}\nUPDATE sessions SET value = ${inner} WHERE id = 1;`
}

async function main() {
  const env = readEnv(envFile)
  const reader = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

  console.log(`Reading sessions from ${envName} (${env.VITE_SUPABASE_URL})\n`)
  const { data, error } = await reader.from('sessions').select('value').eq('id', 1).maybeSingle()
  if (error) {
    console.error('Read failed:', error.message)
    process.exit(1)
  }
  const before = data?.value || {}

  const { after, changes } = repairGoals(before)

  if (changes.length === 0) {
    console.log('Nothing to repair — every time-kind goal already carries a colon.')
    return
  }

  console.log(`${changes.length} block goal(s) to repair:`)
  changes.forEach(c =>
    console.log(
      `  ${c.dateKey}[${c.sessIdx}] "${c.sessionName || '(unnamed)'}" block ${c.blockId}  ` +
        `min:${c.before.min ?? '—'}->${c.after.min ?? c.before.min ?? '—'}  ` +
        `max:${c.before.max ?? '—'}->${c.after.max ?? c.before.max ?? '—'}`,
    ),
  )

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
    console.log(buildSql(changes))
    return
  }

  const svcKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!svcKey) {
    console.error('\nSUPABASE_SERVICE_ROLE_KEY not set in ' + envFile)
    process.exit(1)
  }
  const writer = createClient(env.VITE_SUPABASE_URL, svcKey)
  const { error: writeErr } = await writer.from('sessions').update({ value: after }).eq('id', 1)
  if (writeErr) {
    console.error('\nWrite failed:', writeErr.message)
    process.exit(1)
  }
  console.log(`\nWrote repaired sessions blob to ${envName}.`)
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
