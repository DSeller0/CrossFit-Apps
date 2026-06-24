#!/usr/bin/env node
// Phase 4 migration: results blob → results_v2 normalized rows
//
// Prerequisites:
//   1. Run supabase-schema-v2.sql in Supabase Dashboard → SQL Editor
//   2. A fresh backup already exists in cone/backups/ (run backup-supabase.mjs first)
//
// Usage (from cone/ directory):
//   node scripts/migrate-phase4.mjs
//
// Safe to re-run: uses upsert by id — no duplicates created.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function readEnv() {
  const file = path.join(ROOT, '.env.local');
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8').split('\n')
      .filter(l => l.includes('='))
      .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
  );
}

function resultToRow(r) {
  return {
    id:                String(r.id),
    date:              r.date || '',
    athlete_id:        r.athleteId || null,
    session_id:        r.sessionId ? String(r.sessionId) : null,
    presence:          r.presence || 'Presente',
    energy_level:      r.energyLevel ?? null,
    blocks:            r.blocks || [],
    coach_note:        r.coachNote || '',
    flag_for_review:   !!r.flagForReview,
    logged_by_athlete: !!r.loggedByAthlete,
    updated_at:        new Date().toISOString(),
  };
}

async function main() {
  const env = readEnv();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  console.log('Phase 4 migration — results blob → results_v2\n');

  // ── Load source data ─────────────────────────────────────────────────────────
  const { data: src, error: srcErr } = await supabase
    .from('results').select('value').eq('id', 1).maybeSingle();
  if (srcErr) { console.error('Failed to load results blob:', srcErr.message); process.exit(1); }

  const blob = src?.value;
  if (!blob || !Array.isArray(blob) || blob.length === 0) {
    console.log('results blob is empty — nothing to migrate.');
    return;
  }
  console.log(`Source: ${blob.length} result(s) in old results blob`);

  // ── Convert and upsert ───────────────────────────────────────────────────────
  const rows = blob.map(resultToRow);
  console.log('Rows to upsert:');
  rows.forEach(r => console.log(`  ${r.id}  athlete:${r.athlete_id}  session:${r.session_id}  date:${r.date}`));

  const { error: upsertErr } = await supabase
    .from('results_v2')
    .upsert(rows, { onConflict: 'id' });

  if (upsertErr) {
    console.error('\nUpsert failed:', upsertErr.message);
    console.error('Hint: make sure supabase-schema-v2.sql was run in the Supabase dashboard first.');
    process.exit(1);
  }

  // ── Verify ───────────────────────────────────────────────────────────────────
  const { count, error: countErr } = await supabase
    .from('results_v2').select('*', { count: 'exact', head: true });
  if (countErr) { console.error('Verification failed:', countErr.message); process.exit(1); }

  if (count !== rows.length) {
    console.error(`\nMISMATCH: source=${rows.length}, results_v2 rows=${count}`);
    process.exit(1);
  }

  console.log(`\nVerified: ${count}/${rows.length} rows in results_v2   OK`);
  console.log('\nMigration complete.');
  console.log('Next: deploy the app update so it reads/writes results_v2 instead of the old blob.');
  console.log('Old results table is NOT dropped — keep it as rollback for now.');
}

main().catch(e => { console.error('\nMigration failed:', e.message); process.exit(1); });
