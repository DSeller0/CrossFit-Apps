#!/usr/bin/env node
// Run from cone/: node scripts/seed-dev.mjs
// Snapshots prod's 10 KV-blob tables + results_v2 into the local Supabase stack
// (supabase start). Read-only against prod (anon key); writes locally via the
// service-role key so RLS doesn't get in the way. allowed_emails is already
// seeded by supabase/migrations/0001_init.sql on every fresh `supabase start`.
//
// Safe to re-run: every write is an upsert.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

const BLOB_TABLES = [
  'sessions',
  'athletes',
  'events',
  'locations',
  'coach_profile',
  'settings',
  'exercise_registry',
  'goals_data',
  'lb_colors',
  'templates',
]

async function main() {
  const prodEnv = readEnv('.env.production')
  const localEnv = readEnv('.env.development')

  const prod = createClient(prodEnv.VITE_SUPABASE_URL, prodEnv.VITE_SUPABASE_ANON_KEY)
  const local = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY)

  console.log('Seeding local Supabase from prod snapshot\n')

  await Promise.all(
    BLOB_TABLES.map(async table => {
      const { data, error } = await prod.from(table).select('*').eq('id', 1).maybeSingle()
      if (error) {
        console.warn(`  SKIP  ${table}: ${error.message}`)
        return
      }
      if (!data) {
        console.log(`  EMPTY ${table}`)
        return
      }

      const { error: upsertErr } = await local.from(table).upsert(data)
      if (upsertErr) {
        console.warn(`  FAIL  ${table}: ${upsertErr.message}`)
        return
      }
      console.log(`  OK    ${table}`)
    }),
  )

  const { data: results, error: resultsErr } = await prod.from('results_v2').select('*')
  if (resultsErr) {
    console.warn(`  FAIL  results_v2: ${resultsErr.message}`)
  } else if (!results || results.length === 0) {
    console.log('  EMPTY results_v2')
  } else {
    const { error: upsertErr } = await local
      .from('results_v2')
      .upsert(results, { onConflict: 'id' })
    if (upsertErr) console.warn(`  FAIL  results_v2: ${upsertErr.message}`)
    else console.log(`  OK    results_v2 (${results.length} row(s))`)
  }

  console.log('\nSeed complete.')
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
