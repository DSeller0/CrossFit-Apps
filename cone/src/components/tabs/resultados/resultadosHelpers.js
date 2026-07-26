import { isTimeBlock } from '../../../public/lib/wod.js';
import { monthGridCells } from '../../../public/lib/week.js';

// Pure helpers behind the Resultados tab (#74-B/plans/44, pure move out of
// Resultados.jsx — no behavior change). Mirrors public/results/resultsHelpers.js
// and public/schedule/scheduleHelpers.js.

// ── Constants ─────────────────────────────────────────────────────────────────
export const PRESENCE  = ['Presente', 'Ausente', 'Justificado'];
export const LEVEL_CLS = { Iniciante: 'lv-ini', Intermediário: 'lv-int', Avançado: 'lv-adv', Competidor: 'lv-comp' };
export const SCALE_CLS = { RX: 'sc-rx', Inter: 'sc-inter', SC: 'sc-sc', Adaptado: 'sc-adap' };

// ── Month/week grid ───────────────────────────────────────────────────────────
export function getWeeksInMonth(year, month) {
  return monthGridCells(year, month).map(week => ({ start: week[0].date, end: week[6].date }));
}

export function weekLabel(week, year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const s = week.start.getMonth() === month ? week.start.getDate() : 1;
  const e = week.end.getMonth() === month ? week.end.getDate() : lastDay;
  return `${s}–${e}`;
}

// ── KPI helpers ───────────────────────────────────────────────────────────────
export function calcKPIs(athleteId, results) {
  const ar = results.filter(r => r.athleteId === athleteId);
  const present = ar.filter(r => r.presence === 'Presente').length;
  const freq = ar.length > 0 ? Math.round(present / ar.length * 100) : 0;
  const rpes = ar.flatMap(r => r.blocks?.map(b => b.rpe).filter(Boolean) || []);
  const avgRpe = rpes.length > 0 ? (rpes.reduce((a,b) => a+b,0) / rpes.length).toFixed(1) : null;
  // Only scales an athlete actually chose count (plans/22 rules 1, 3, 5): a null
  // (never-picked, or nulled pre-#61 fabricated) scale is dropped from both sides,
  // so the rate is — until a real one exists, never a flattering 0% or a fake RX.
  const scales = ar.flatMap(r => r.blocks?.map(b => b.scale).filter(Boolean) || []);
  const rxCount = scales.filter(s => s==='RX').length;
  const rxRate = scales.length > 0 ? Math.round(rxCount / scales.length * 100) : null;
  const loadMap = {};
  ar.forEach(r => { r.blocks?.forEach(b => { if (b.exerciseName && b.load) { if (!loadMap[b.exerciseName]) loadMap[b.exerciseName]=[]; loadMap[b.exerciseName].push({date:r.date,load:parseFloat(b.load)}); } }); });
  let loadTrend = null;
  Object.entries(loadMap).forEach(([name,entries]) => {
    if (entries.length >= 3) {
      const sorted = entries.sort((a,b) => a.date.localeCompare(b.date));
      const diff = ((sorted[sorted.length-1].load - sorted[0].load) / sorted[0].load * 100).toFixed(1);
      if (!loadTrend || Math.abs(diff) > Math.abs(loadTrend.diff)) loadTrend = {name,first:sorted[0].load,last:sorted[sorted.length-1].load,diff:parseFloat(diff)};
    }
  });
  const lastRpes = ar.slice(-8).map(r => { const rs=r.blocks?.map(b=>b.rpe).filter(Boolean)||[]; return rs.length>0?rs.reduce((a,b)=>a+b,0)/rs.length:null; }).filter(Boolean);
  return { freq, avgRpe, rxRate, rxCount, scaleCount: scales.length, loadTrend, lastRpes, totalSessions: present };
}

export function calcSessionKPIs(dateKey, results) {
  const sr = results.filter(r => r.date===dateKey && r.presence==='Presente');
  if (!sr.length) return null;
  const allRpe = sr.flatMap(r => r.blocks?.map(b=>b.rpe).filter(Boolean)||[]);
  const avgRpe = allRpe.length>0 ? (allRpe.reduce((a,b)=>a+b,0)/allRpe.length).toFixed(1) : null;
  const allScales = sr.flatMap(r => r.blocks?.map(b=>b.scale).filter(Boolean)||[]);
  const scaleDist = {RX:0,Inter:0,SC:0,Adaptado:0};
  allScales.forEach(s => { if (scaleDist[s]!==undefined) scaleDist[s]++; });
  // null (not 0%) with no real scales — 0% reads as "logged, all scaled" and its
  // colour threshold would score no-data as "bad" (plans/22 rules 1, 5).
  const rxPct = allScales.length>0 ? Math.round(scaleDist.RX/allScales.length*100) : null;
  const flags = sr.filter(r=>r.flagForReview).length;
  return {avgRpe,rxPct,scaleDist,scaleTotal:allScales.length,flags,count:sr.length};
}

// ⚠️ Known live divergence (plans/44) — do NOT fix here. This is a fork of
// canonical `perfStr` (public/lib/wod.js) missing its DNF branch: a capped For
// Time athlete renders their work everywhere else and a bare dash here. Extracted
// verbatim on purpose so the decomposition stays a pure move; swap to `perfStr`
// in a separate follow-up commit so that behavior change is reviewable on its own.
export function getPerformanceStr(r, blockType) {
  if (isTimeBlock(blockType)) return r.perfTime||'—';
  const parts=[];
  if (r.perfRounds) parts.push(`${r.perfRounds} rds`);
  if (r.perfReps)   parts.push(`${r.perfReps} reps`);
  return parts.join(' + ') || '—';
}
