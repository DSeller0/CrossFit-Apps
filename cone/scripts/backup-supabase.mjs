#!/usr/bin/env node
// Run from cone/: node scripts/backup-supabase.mjs
// Dumps the 9 Supabase KV-blob tables to cone/backups/<timestamp>/
// Backups are local-only (backups/.gitignore prevents commit of personal data).
// (`lb_colors` was the 10th until plans/87 dropped the table — #60/#43.)
//
// AUTH (#199 · plans/89). Four of the nine tables — coach_profile, locations, events, templates —
// are locked to `is_allowed_user()` reads (`0006`/`0009`), so the public anon key can't see them.
// RLS answers a forbidden read with zero rows, not an error, which is how this script once
// reported a green run over a backup missing the Pix key, the rates and the whole agenda.
// It therefore reads with `SUPABASE_SERVICE_ROLE_KEY` from the untracked `cone/.env.local`
// (the URL still comes from `.env.production`; `.env.local` wins on any clash). Vite only exposes
// `VITE_`-prefixed vars to the client, so that key never reaches a bundle. Without it the run
// falls back to anon, names the tables it cannot read, and EXITS NON-ZERO — a table that was
// refused is never allowed to look like one that was merely empty. The key is never printed.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function readEnv(name, { required = false } = {}) {
  const file = path.join(ROOT, name)
  if (!fs.existsSync(file)) {
    if (required) throw new Error(`${name} not found at ${file}`)
    return {}
  }
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && l.includes('='))
      .map(l => {
        const [k, ...v] = l.split('=')
        // Tolerate `KEY="value"` — a pasted key often arrives quoted.
        return [
          k.trim(),
          v
            .join('=')
            .trim()
            .replace(/^(['"])(.*)\1$/, '$2'),
        ]
      }),
  )
}

const TABLES = [
  'sessions',
  'athletes',
  'events',
  'locations',
  'coach_profile',
  'settings',
  'exercise_registry',
  'goals_data',
  'templates',
]

// Static fact from `0006` + `0009`, not something inferred from a null: the anon role cannot read
// these. If a future migration locks another table, add it here.
const ANON_LOCKED = ['events', 'locations', 'coach_profile', 'templates']

// A service-role key pasted wrong (the anon key in the wrong slot) would put us in "service-role
// mode" over tables that then read back null — exactly the silent-empty this plan exists to end.
// So check what the key claims to be. JWT keys carry a `role` claim; `sb_secret_` keys don't.
function assertServiceRole(key) {
  if (key.startsWith('sb_secret_')) return
  let role
  try {
    role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role
  } catch {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not a recognisable Supabase key — check .env.local',
    )
  }
  if (role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY carries role "${role}", not "service_role" — check .env.local`,
    )
  }
}

async function main() {
  const env = { ...readEnv('.env.production', { required: true }), ...readEnv('.env.local') }
  if (!env.VITE_SUPABASE_URL) throw new Error('VITE_SUPABASE_URL missing from .env.production')

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) assertServiceRole(serviceKey)
  const mode = serviceKey ? 'service-role' : 'anon'
  const supabase = createClient(env.VITE_SUPABASE_URL, serviceKey || env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (mode === 'service-role') {
    console.log('Auth: service-role (all 9 tables readable)\n')
  } else {
    console.log(
      `Auth: anon — ${ANON_LOCKED.length} tables will be unreadable: ${ANON_LOCKED.join(', ')}\n`,
    )
  }

  const ts = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19)
  const outDir = path.join(ROOT, 'backups', ts)
  fs.mkdirSync(outDir, { recursive: true })

  const manifest = { timestamp: new Date().toISOString(), auth: mode, tables: {} }
  const unreadable = []

  for (const table of TABLES) {
    if (mode === 'anon' && ANON_LOCKED.includes(table)) {
      console.warn(`  DENIED ${table}: locked to the coach's session (needs the service-role key)`)
      manifest.tables[table] = { status: 'unreadable', reason: 'anon-locked' }
      unreadable.push(table)
      continue
    }

    const { data, error } = await supabase.from(table).select('*').eq('id', 1).maybeSingle()

    if (error) {
      console.warn(`  FAIL   ${table}: ${error.message}`)
      manifest.tables[table] = { status: 'unreadable', reason: error.message }
      unreadable.push(table)
      continue
    }
    if (!data) {
      // Reached only where a null row is a real answer: service-role bypasses RLS, and the anon
      // tables that get here are ones anon can read. Worth seeing, not worth failing the run.
      console.log(`  EMPTY  ${table} (no row with id=1)`)
      manifest.tables[table] = { status: 'empty' }
      continue
    }

    const outPath = path.join(outDir, `${table}.json`)
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1)
    console.log(`  OK     ${table.padEnd(20)} ${kb} KB`)
    manifest.tables[table] = { status: 'ok', kb: Number(kb) }
  }

  manifest.complete = unreadable.length === 0
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

  if (unreadable.length) {
    console.error(
      `\nPARTIAL backup -> cone/backups/${ts}/ — could not read ${unreadable.length} of ${TABLES.length} tables: ${unreadable.join(', ')}`,
    )
    console.error('Add SUPABASE_SERVICE_ROLE_KEY (prod) to cone/.env.local and run again.')
    process.exitCode = 1
    return
  }
  console.log(`\nBackup complete -> cone/backups/${ts}/`)
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
