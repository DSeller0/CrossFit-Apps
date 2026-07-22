import MaskedTimeInput from '../../../public/shared/MaskedTimeInput.jsx';
import Input from '../../ui/Input.jsx';
import { goalKindFor } from './blockModel.js';
import s from './criador.module.css';

// ── GoalInput (#10) ───────────────────────────────────────────────────────────
// The coach's `Meta:` line as a field, type-aware: a For Time block is scored in
// time, an AMRAP in rounds, everything else in a sentence. Writes `block.goal` —
// the ONE new persisted block field, in exactly the shape textFormat's parseGoal
// emits (plans/36), so a Meta typed here and one typed in Texto mode are the same
// object and survive a flip in either direction.
//
// An all-empty goal is written as `undefined`, never as `{kind:'time'}` — a block
// the coach never gave a target to must carry no goal at all, or every render
// surface has to defend against a hollow one.
export function GoalInput({ block, onUpdate }) {
  const kind = goalKindFor(block.type);
  // A block whose type changed (For Time → AMRAP) keeps its old goal in storage but
  // must not render it into the wrong fields — the coach re-states the target.
  const g = block.goal?.kind === kind ? block.goal : null;

  const put = patch => {
    const next = { kind, ...(g || {}), ...patch };
    const empty = kind === 'time'   ? !next.min && !next.max
                : kind === 'rounds' ? !next.min && !next.reps
                :                     !String(next.text || '').trim();
    onUpdate({ ...block, goal: empty ? undefined : next });
  };

  if (kind === 'time') {
    return (
      <div className={s.goalRow}>
        <MaskedTimeInput className={s.goalField} label="Meta" placeholder="11:00"
          value={g?.min || ''} onChange={v => put({ min: v })} />
        <span className={s.goalSep} aria-hidden="true">–</span>
        <MaskedTimeInput className={s.goalField} label="até" placeholder="12:00"
          value={g?.max || ''} onChange={v => put({ max: v })} />
      </div>
    );
  }

  if (kind === 'rounds') {
    return (
      <div className={s.goalRow}>
        <Input className={s.goalField} label="Meta rounds" type="number" min={1}
          inputMode="numeric" placeholder="5"
          value={g?.min ?? ''} onChange={e => put({ min: e.target.value })} />
        <span className={s.goalSep} aria-hidden="true">+</span>
        <Input className={s.goalField} label="reps" type="number" min={0}
          inputMode="numeric" placeholder="—"
          value={g?.reps ?? ''} onChange={e => put({ reps: e.target.value })} />
      </div>
    );
  }

  return (
    <div className={s.goalRow}>
      <Input className={s.goalFieldWide} label="Meta (opcional)"
        placeholder="ex: manter cadência, sem quebrar"
        value={g?.text || ''} onChange={e => put({ text: e.target.value })} />
    </div>
  );
}
