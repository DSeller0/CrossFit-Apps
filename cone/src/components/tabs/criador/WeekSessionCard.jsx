import { ExerciseList } from '../../../public/shared/ExerciseList.jsx';
import { blkColor, goalStr } from '../../../public/lib/wod.js';
import { serializeSession } from './textFormat.js';
import { getTypeCfg } from './blockModel.js';
import s from './textMode.module.css';

// ── WeekSessionCard (#92) ─────────────────────────────────────────────────────
// A session's contents inside the week grid, in whichever mode the grid is in.
// Not a new surface — the grid keeps its columns, its box filter and its week
// arrows; only this changes, which is what makes comparing days free.
//
//   grade — the real ExerciseList at size `grid` (tiny's scale, with a 12px name
//           and the intensity on its own line — a 200px column clips it inline).
//   texto — the coach's own notation, straight from serializeSession. It is the
//           copyable one, and the only one that can carry the structure line,
//           `Meta:` and the verbatim notes (ExerciseList has no row for those).
export function WeekSessionCard({ session, mode }) {
  const blocks = session.blocks || [];
  if (!blocks.length) return null;

  if (mode === 'texto') {
    const text = serializeSession({ blocks });
    return (
      <pre className={s.cardTxt}>
        {text.split('\n').map((line, i, arr) => {
          // Bold the header line of each block — the only visual structure the
          // notation needs to stay scannable in a 200px column.
          const isHead = i === 0 || arr[i - 1] === '';
          return <span key={i}>{isHead && line ? <b>{line}</b> : line}{i < arr.length - 1 ? '\n' : ''}</span>;
        })}
      </pre>
    );
  }

  return (
    <>
      {blocks.map(bl => {
        const cfg = getTypeCfg(bl.type);
        const color = blkColor(bl);
        const label = bl.label && bl.label !== bl.type ? bl.label : '';
        // Display form (goalStr), not the notation form (serializeGoal) — the
        // Texto mode above already carries the re-parseable one.
        const goal = goalStr(bl);
        const meta = [
          label,
          bl.rounds && `${bl.rounds}×`,
          bl.duration && `CAP ${bl.duration}'`,
        ].filter(Boolean).join(' · ');
        return (
          <div key={bl.id} className={s.cardBlk}>
            <div className={s.cardBlkHd}>
              {bl.type
                ? <span className={s.chip} style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
                    <i className={`ti ${cfg.icon}`} /> {bl.type}
                  </span>
                : <span className={`${s.chip} ${s.chipNoType}`}>sem tipo</span>}
              {meta && <span className={s.prevMeta}>{meta}</span>}
            </div>
            {bl.type === 'Estações'
              ? <div className={s.prevMeta}>{(bl.stations || []).filter(st => !st.isRest).length} grupos</div>
              : <ExerciseList exercises={bl.exercises || []} color={color} size="grid" />}
            {goal && <div className={s.prevGoal}>Meta {goal}</div>}
          </div>
        );
      })}
    </>
  );
}
