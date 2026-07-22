import { uid } from '../../../public/lib/wod.js';
import { todayISO } from '../../../public/lib/week.js';
import { resolveExercise } from '../../../public/lib/registry.js';

// ── Factories ─────────────────────────────────────────────────────────────────
export const emptyEx = () => ({ id: uid(), name: '', sets: '', reps: '', dist: '', distUnit: 'm', intensity: null, note: '' });
export const emptyMovement = () => ({ id: uid(), name: '', reps: '' });
export const emptyStation = (name = 'Grupo', isRest = false) => ({
  id: uid(), name, duration: '', isRest, exercises: isRest ? [] : [emptyEx()],
});
export const emptyBlock = (type = 'For Time') => {
  if (type === 'Estações') return {
    id: uid(), label: type, type,
    zone: 'Zona 01', notes: '', stationRepeat: 1, restBetweenCycles: '',
    stations: [emptyStation('Grupo A'), emptyStation('Grupo B')],
  };
  return {
    id: uid(), label: type, type,
    zone: 'Zona 01', duration: '', rounds: '', notes: '', ladderMode: false,
    exercises: [emptyEx()],
  };
};
export const emptyS = () => ({ id: uid(), date: todayISO(), mainTraining: [], sessionName: '', locationIds: [], blocks: [] });

// Legacy `intensity.mode==='cardio'` exercises carried distance in the load slot (#37).
// Lazily convert them to the `dist`/`distUnit` siblings on next edit/save — no bulk migration.
export const normalizeCardioEx = ex => ex.intensity?.mode === 'cardio'
  ? { ...ex, dist: ex.intensity.cardioVal || ex.dist || '', distUnit: ex.intensity.cardioUnit || 'm', intensity: null }
  : ex;
export const normalizeLegacyCardio = blocks => (blocks || []).map(bl => bl.type === 'Estações'
  ? { ...bl, stations: (bl.stations || []).map(st => ({ ...st, exercises: (st.exercises || []).map(normalizeCardioEx) })) }
  : { ...bl, exercises: (bl.exercises || []).map(normalizeCardioEx) });

// One registry entry per exercise name (#38) — resolved via #62's alias/normalization
// layer so a coach's shorthand ("BMU", "T2B") still finds its registry defaults.
// `reg` is passed in by the caller (never loaded here) so this module stays pure —
// no Supabase client in its import graph, and tests can inject a fixture registry
// directly instead of mocking localStorage.
export function isCardioRegistered(name, reg) {
  if (!name) return false;
  return !!resolveExercise(name, reg || {})?.categories?.includes('Cardio');
}

export function getRegistryDefaults(name, reg) {
  if (!name?.trim()) return null;
  return resolveExercise(name, reg || {})?.defaults || null;
}

// Registry ghost defaults (#38) — empty volume/intensity fields materialize into real
// values on session save (not at render time, so editing a registry default later never
// retroactively rewrites past WODs).
export const materializeEx = (ex, reg) => {
  const { intensityDefaultDismissed, ...rest } = ex;
  const regDefaults = ex.isComplex ? null : getRegistryDefaults(ex.name, reg);
  if (!regDefaults) return rest;
  const out = { ...rest };
  if (!String(out.sets || '').trim() && regDefaults.sets) out.sets = regDefaults.sets;
  const distEmpty = !String(out.dist || '').trim(), repsEmpty = !String(out.reps || '').trim();
  if (regDefaults.dist && distEmpty && repsEmpty) {
    out.dist = regDefaults.dist; out.distUnit = regDefaults.distUnit || out.distUnit || 'm';
  } else if (regDefaults.reps && repsEmpty && distEmpty) {
    out.reps = regDefaults.reps;
  }
  const hasIntensity = out.intensity && out.intensity.mode && out.intensity.mode !== 'none';
  if (regDefaults.intensity && !hasIntensity && !intensityDefaultDismissed) out.intensity = regDefaults.intensity;
  return out;
};
export const materializeBlocks = (blocks, reg) => (blocks || []).map(bl => bl.type === 'Estações'
  ? { ...bl, stations: (bl.stations || []).map(st => ({ ...st, exercises: (st.exercises || []).map(ex => materializeEx(ex, reg)) })) }
  : { ...bl, exercises: (bl.exercises || []).map(ex => materializeEx(ex, reg)) });

// ── Type metadata ─────────────────────────────────────────────────────────────
export const TYPE_CONFIG = {
  // RED family — intensity blocks
  'HIIT':       { icon: 'ti-bolt',        color: '#e05848', desc: 'Alta intensidade intervalado', showDuration: true,  showRounds: true,  durationLabel: 'Intervalo (s)'  },
  'MetCon':     { icon: 'ti-flame',       color: '#c84040', desc: 'Condicionamento misto',        showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  // AMBER family — time-structured blocks
  'EMOM':       { icon: 'ti-alarm',       color: '#d07828', desc: 'Every Minute on the Minute',  showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'For Time':   { icon: 'ti-clock',       color: '#c86828', desc: 'Contra o relógio',             showDuration: true,  showRounds: true,  durationLabel: 'Time cap (min)' },
  'AMRAP':      { icon: 'ti-refresh',     color: '#e09830', desc: 'Máx rounds em tempo fixo',    showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Estações':   { icon: 'ti-map-pin',     color: '#c8a030', desc: 'Treino por grupos / estações', showDuration: false, showRounds: false, durationLabel: 'Duração (min)', isStations: true },
  // BLUE family — barbell / lifting blocks
  'Força':      { icon: 'ti-trending-up', color: '#5090e0', desc: 'Força e hipertrofia',          showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'LPO':        { icon: 'ti-weight',      color: '#4070c0', desc: 'Levantamento Olímpico',        showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Core':       { icon: 'ti-hexagon',     color: '#6090d8', desc: 'Core e estabilização',         showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Acessórios': { icon: 'ti-dumbbell',    color: '#4878b8', desc: 'Trabalho acessório',            showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  // GREEN family — movement quality blocks
  'Aquecimento':{ icon: 'ti-sun',         color: '#80c040', desc: 'Aquecimento e preparação',     showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Skill':      { icon: 'ti-target',      color: '#4ac8c0', desc: 'Técnica e habilidade',         showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Cardio':     { icon: 'ti-run',         color: '#40b878', desc: 'Cardio / Aeróbico',             showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Mobilidade': { icon: 'ti-leaf',        color: '#30a868', desc: 'Mobilidade e flexibilidade',   showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  // GOLD — Benchmark
  'Benchmark':  { icon: 'ti-trophy',      color: '#d8a840', desc: 'Benchmark WOD (Girls, Heroes, Custom)', showDuration: true, showRounds: true, durationLabel: 'Time cap (min)' },
};
export const DEFAULT_TYPE_CFG = { icon: 'ti-edit', color: '#888', desc: 'Bloco livre', showDuration: true, showRounds: true, durationLabel: 'Duração (min)' };
export const getTypeCfg = t => TYPE_CONFIG[t] || DEFAULT_TYPE_CFG;

// Which shape the block's `Meta:` takes (#10). A For Time-family block is scored in
// time, an AMRAP in rounds, and everything else has no numeric scoring axis at all —
// so the goal falls back to whatever sentence the coach wants to write.
// Same three kinds textFormat's parseGoal emits, so a goal typed in Texto mode and
// one typed in Detalhado mode are the same object.
const GOAL_KIND = {
  'For Time': 'time', 'Benchmark': 'time', 'MetCon': 'time', 'HIIT': 'time',
  'AMRAP': 'rounds',
};
export const goalKindFor = type => GOAL_KIND[type] || 'text';

export function stationsCapStr(block) {
  if (block.type !== 'Estações') return null;
  const parse = v => { if (!v) return 0; const p = String(v).split(':'); return p.length >= 2 ? (+p[0]||0)*60+(+p[1]||0) : (+p[0]||0)*60; };
  const sts = block.stations || [];
  const singleCycle = sts.reduce((s, st) => s + parse(st.duration), 0);
  if (!singleCycle) return null;
  const repeat = block.stationRepeat || 1;
  const restBetween = parse(block.restBetweenCycles) * (repeat - 1);
  const totalSec = singleCycle * repeat + restBetween;
  const m = Math.floor(totalSec / 60), s = totalSec % 60;
  return s > 0 ? `Cap ${m}:${String(s).padStart(2, '0')}` : `Cap ${m}'`;
}

export function blockSummary(block) {
  if (block.benchmarkRef) return block.benchmarkRef;
  if (block.type === 'Estações') {
    const groups = (block.stations || []).filter(s => !s.isRest).length;
    const rests  = (block.stations || []).filter(s => s.isRest).length;
    const rep    = (block.stationRepeat || 1) > 1 ? `×${block.stationRepeat}` : '';
    const cap    = stationsCapStr(block);
    return [cap, groups && `${groups} grupos`, rests && `${rests} descanso`, rep].filter(Boolean).join(' · ');
  }
  const cfg = getTypeCfg(block.type);
  const parts = [];
  if (cfg.showDuration && block.duration) parts.push(`${block.duration}'`);
  if (cfg.showRounds && block.rounds) parts.push(`${block.rounds}×`);
  const named = (block.exercises || []).filter(e => e.name.trim()).length;
  if (named) parts.push(`${named} mov.`);
  return parts.join(' · ');
}

export function loadBadgeStr(ex) {
  const ins = ex.intensity;
  if (!ins || !ins.mode || ins.mode === 'none') return null;
  if (ins.mode === 'pct') return ins.pct ? `${ins.pct}%` : null;
  if (ins.mode === 'gender') {
    const scales = ['RX','Inter','SC'];
    const hasAny = scales.some(k => ins[`Masculino_${k}`] || ins[`Feminino_${k}`]);
    return hasAny ? 'M/F' : null;
  }
  if (ins.mode === 'progression') {
    const steps = ins.steps || [];
    const loads = steps.map(s => s.load).filter(Boolean);
    if (!loads.length) return '↗';
    const unit = (steps[0]?.unit || '%').replace('% do RM', '%');
    return `${loads[0]}${unit}`;
  }
  return null;
}

export const cloneBlocks = bls => bls.map(bl => ({
  ...bl, id: uid(),
  exercises: (bl.exercises || []).map(ex => ({
    ...ex, id: uid(),
    complexMovements: (ex.complexMovements || []).map(mv => ({ ...mv, id: uid() })),
  })),
}));
