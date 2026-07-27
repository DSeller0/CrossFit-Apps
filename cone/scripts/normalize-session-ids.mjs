#!/usr/bin/env node
// #110/plans/46 — one-time fix for the 7 sessions (2026-06-06..2026-06-15) whose
// `id` is still a raw Date.now()+Math.random() NUMBER (uid() has returned a base36
// string since mid-June 2026). Every results_v2 writer does String(sessionId), so a
// numeric session id never === its own results (see CLAUDE.md "Supabase clients").
// This script normalizes the `sessions` blob in place — after this, the load-boundary
// fix (normalizeSessionIds in src/public/lib/sessions.js) has nothing left to fix on
// read, it's just defense in depth against the next stale numeric id.
//
// Read-only by default (anon key — `sessions` is anon-readable). Reports the exact
// diff either way.
//
//   node scripts/normalize-session-ids.mjs                     dry run against local dev stack
//   node scripts/normalize-session-ids.mjs --env=production    dry run against prod (read-only)
//   node scripts/normalize-session-ids.mjs --write              WRITES to local (service-role key)
//
// --write against production is refused on purpose (mirrors the migration workflow in
// CLAUDE.md/[[project-schema]]: this repo has no prod service-role key, and prod writes
// go through the coach's authenticated session via RLS, not a script). Instead it prints
// a ready-to-paste jsonb_set UPDATE for the Supabase SQL editor.
//
// Safe to re-run: normalizeSessionIds is idempotent, so a second run against
// already-normalized data reports zero changes.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { normalizeSessionIds } from '../src/public/lib/sessions.js'

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
const envName = (args.find(a => a.startsWith('--env=')) || '--env=development').split('=')[1]
const doWrite = args.includes('--write')
if (!['development', 'production'].includes(envName)) {
  console.error(`Unknown --env=${envName} (expected development|production)`)
  process.exit(1)
}
const envFile = `.env.${envName}`

// Every session that would change: dateKey, its index in that date's array, old id, new id.
function diffSessions(before, after) {
  const changes = []
  for (const dateKey of Object.keys(before)) {
    const beforeArr = before[dateKey],
      afterArr = after[dateKey]
    if (!Array.isArray(beforeArr) || !Array.isArray(afterArr)) continue
    beforeArr.forEach((sess, i) => {
      const oldId = sess?.id,
        newId = afterArr[i]?.id
      if (oldId !== newId)
        changes.push({ dateKey, index: i, oldId, newId, name: sess?.name || sess?.sessionName })
    })
  }
  return changes
}

// jsonb path segments are text — quote any segment holding chars an unquoted
// array literal can't take. Date keys ("2026-06-06") never need it; guards anyway.
const NEEDS_QUOTE = /[",{}\\\s]/
const pathSeg = s => (NEEDS_QUOTE.test(s) ? `"${s.replace(/(["\\])/g, '\\$1')}"` : s)

// A SQL string literal, single-quoted with internal single quotes doubled —
// not JSON.stringify's double-quoted form, which SQL reads as an identifier.
const sqlLit = s => `'${s.replace(/'/g, "''")}'`

function buildSql(changes) {
  const inner = changes.reduce(
    (acc, c) =>
      `jsonb_set(${acc}, '{${pathSeg(c.dateKey)},${c.index},id}', ${sqlLit(JSON.stringify(String(c.newId)))}::jsonb)`,
    'value',
  )
  const title = '#110/plans/46 — normalize 7 legacy numeric session ids to string (prod)'
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

  const after = normalizeSessionIds(before)
  const changes = diffSessions(before, after)

  if (changes.length === 0) {
    console.log('Nothing to normalize — every session id is already a string.')
    return
  }

  console.log(`${changes.length} session id(s) to normalize:`)
  changes.forEach(c =>
    console.log(
      `  ${c.dateKey}[${c.index}] "${c.name || '(unnamed)'}"  ${c.oldId} (${typeof c.oldId})  ->  "${c.newId}"`,
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
  console.log(`\nWrote normalized sessions blob to ${envName}.`)
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
