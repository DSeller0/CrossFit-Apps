#!/usr/bin/env node
// Run from cone/: node scripts/backup-supabase.mjs
// Dumps the 9 Supabase KV-blob tables to cone/backups/<timestamp>/
// Backups are local-only (.gitignore prevents commit of personal data).
// (`lb_colors` was the 10th until plans/87 dropped the table — #60/#43.)
//
// 🔴 THIS SCRIPT IS CURRENTLY BLIND TO 4 OF ITS 9 TABLES — backlog #199.
// It authenticates with VITE_SUPABASE_ANON_KEY (below), and since #81/`0006` and
// #150/`0009` revoked the anon "public read" on coach_profile, locations, events and
// templates, the anon role cannot read them at all. RLS returns zero rows rather than an
// error, so `.maybeSingle()` yields null, this script logs "EMPTY", continues, and exits 0.
// Measured against prod 2026-09-13 — readable: sessions, athletes, settings,
// exercise_registry, goals_data · silently empty: events, locations, coach_profile, templates.
// That means the Pix key, the service rates, the whole agenda and every session template are
// NOT in any backup taken since 2026-08. Fixing it needs a service-role key (which this repo
// deliberately does not carry for prod) or an authenticated coach session — a real decision,
// which is why it is filed rather than patched here.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function readEnv() {
  const file = path.join(ROOT, '.env.production')
  if (!fs.existsSync(file)) throw new Error('.env.production not found at ' + file)
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(l => l.includes('='))
      .map(l => {
        const [k, ...v] = l.split('=')
        return [k.trim(), v.join('=').trim()]
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

async function main() {
  const env = readEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

  const ts = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19)
  const outDir = path.join(ROOT, 'backups', ts)
  fs.mkdirSync(outDir, { recursive: true })

  const manifest = { timestamp: new Date().toISOString(), tables: {} }

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('id', 1).maybeSingle()

    if (error) {
      console.warn(`  SKIP  ${table}: ${error.message}`)
      manifest.tables[table] = { status: 'error', error: error.message }
      continue
    }
    if (!data) {
      console.log(`  EMPTY ${table}`)
      manifest.tables[table] = { status: 'empty' }
      continue
    }

    const outPath = path.join(outDir, `${table}.json`)
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1)
    console.log(`  OK    ${table.padEnd(20)} ${kb} KB`)
    manifest.tables[table] = { status: 'ok', kb: Number(kb) }
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`\nBackup complete -> cone/backups/${ts}/`)
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
