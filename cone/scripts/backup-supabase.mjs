#!/usr/bin/env node
// Run from cone/: node scripts/backup-supabase.mjs
// Dumps all 11 Supabase KV-blob tables to cone/backups/<timestamp>/
// Backups are local-only (.gitignore prevents commit of personal data).

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function readEnv() {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) throw new Error('.env.local not found at ' + file);
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .filter(l => l.includes('='))
      .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
  );
}

const TABLES = [
  'sessions',
  'athletes',
  'results',
  'events',
  'locations',
  'coach_profile',
  'settings',
  'exercise_registry',
  'goals_data',
  'lb_colors',
  'templates',
];

async function main() {
  const env = readEnv();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  const ts = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
  const outDir = path.join(ROOT, 'backups', ts);
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = { timestamp: new Date().toISOString(), tables: {} };

  for (const table of TABLES) {
    const { data, error } = await supabase
      .from(table).select('*').eq('id', 1).maybeSingle();

    if (error) {
      console.warn(`  SKIP  ${table}: ${error.message}`);
      manifest.tables[table] = { status: 'error', error: error.message };
      continue;
    }
    if (!data) {
      console.log(`  EMPTY ${table}`);
      manifest.tables[table] = { status: 'empty' };
      continue;
    }

    const outPath = path.join(outDir, `${table}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`  OK    ${table.padEnd(20)} ${kb} KB`);
    manifest.tables[table] = { status: 'ok', kb: Number(kb) };
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nBackup complete -> cone/backups/${ts}/`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
