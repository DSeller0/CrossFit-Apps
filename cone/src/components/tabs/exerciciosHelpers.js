import { loadRegistry } from '../../utils/storage';

export const BLOCK_ORDER = [
  'HIIT', 'MetCon', 'EMOM', 'For Time', 'AMRAP',
  'Estações', 'Força', 'LPO', 'Core', 'Acessórios',
  'Aquecimento', 'Skill', 'Cardio', 'Mobilidade', 'Benchmark',
];

export const getExName = ex => typeof ex === 'string' ? ex : (ex?.name || '');

// Alphabetical-within-category is the canonical stored order (#87) — the registry is a
// lookup catalog, not an ordered playlist, so insertion order + a manual A→Z button /
// drag-reorder are retired. Every mutation re-sorts the touched category here.
export const sortCat = arr => [...arr].sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'));

// Builds the in-memory registry from storage, migrating string-only entries to {name}
// objects and re-sorting each category. Never writes — a load path never writes (#109;
// see #76/`0007` for what a load-time write cost there). The caller reads `needsSave`
// and decides whether to persist.
export function initRegistry() {
  const migrateEx = ex => typeof ex === 'string' ? { name: ex } : ex;
  const existing  = loadRegistry();
  if (existing && typeof existing === 'object') {
    const reg = {};
    let needsSave = false;
    BLOCK_ORDER.forEach(n => {
      if (!existing[n]) { reg[n] = []; needsSave = true; return; }
      const raw      = Array.isArray(existing[n]) ? existing[n] : [];
      if (raw.some(e => typeof e === 'string')) needsSave = true;
      const migrated = raw.map(migrateEx);
      const sorted   = sortCat(migrated);
      if (sorted.some((e, i) => e !== migrated[i])) needsSave = true;
      reg[n] = sorted;
    });
    return { registry: reg, needsSave };
  }
  const reg = {};
  BLOCK_ORDER.forEach(n => { reg[n] = []; });
  return { registry: reg, needsSave: true };
}
