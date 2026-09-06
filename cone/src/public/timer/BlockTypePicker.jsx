import { useState } from 'react'
import s from './BlockTypePicker.module.css'
import Modal from '../shared/Modal.jsx'
import { BENCHMARK_GIRLS, BENCHMARK_HEROES } from '../lib/benchmarks.js'

const TYPES = [
  { key: 'For Time', desc: 'Tempo fixo ou cap', color: 'var(--gold)' },
  { key: 'AMRAP', desc: 'Máximo de rounds', color: 'var(--gold)' },
  { key: 'EMOM', desc: 'Todo minuto, on the min', color: 'var(--gold)' },
  { key: 'Estações', desc: 'Circuito rotativo', color: 'var(--teal)' },
  // Benchmark is an amber-family block type (blkColor, wod.js) — same family as
  // For Time / AMRAP / EMOM above, so it wears the same var(--gold) here (#53). The
  // old orphan #d05878 rose lives on below only as the Girls SUBcategory accent.
  { key: 'Benchmark', desc: 'WOD clássico Girls/Heroes', color: 'var(--gold)' },
]

const BM_CATS = [
  { key: 'Girls', label: 'Girls', color: '#d05878', desc: 'Fran, Grace, Helen, Annie...' },
  { key: 'Heroes', label: 'Heroes', color: '#d8a840', desc: 'Murph, DT, JT, Nate...' },
]

// ── BlockTypePicker (timer.html's 3-level type/benchmark chooser) ─────────────
//
// #174/plans/86 put it on the shared Modal. It was a hand-rolled `position:fixed`
// overlay with NO role="dialog", no aria-modal, no Escape and no focus trap —
// dismissable by mouse only, on a page used one-handed at the gym.
//
// 🔑 Adopting Modal did NOT change the presentation, which is what made this safe:
// Modal is already a bottom sheet on a phone (`max-width:600px` → `align-items:
// flex-end`, and it even animates up) and a centred dialog above that, which is the
// same split this file's own CSS had. Only the breakpoint moved, 768 → 600.
// It also drops a `left:220px` this file's desktop backdrop carried — an SPA-sidebar
// offset copy-pasted onto a public page that has no sidebar, so the backdrop used to
// leave a 220px unshaded strip down the left of timer.html.
//
// ⚠️ Modal's header is title + ✕, so the level-2 back control lives in the BODY
// rather than the header, and the TITLE carries the level instead.
export default function BlockTypePicker({ onSelect, onSelectBenchmark, onClose }) {
  const [level, setLevel] = useState(0)
  const [bmCat, setBmCat] = useState(null)

  function handleTypeClick(type) {
    if (type === 'Benchmark') {
      setLevel(1)
    } else {
      onSelect(type)
      onClose()
    }
  }

  function handleCatClick(cat) {
    setBmCat(cat)
    setLevel(2)
  }

  function handleBmClick(bm) {
    onSelectBenchmark(bm)
    onClose()
  }

  function goBack() {
    if (level === 2) {
      setBmCat(null)
      setLevel(1)
    } else setLevel(0)
  }

  const catMeta = BM_CATS.find(c => c.key === bmCat)
  const bmList = bmCat === 'Girls' ? BENCHMARK_GIRLS : BENCHMARK_HEROES
  const title = level === 0 ? 'Tipo de WOD' : level === 1 ? 'Benchmark' : bmCat
  // Where the back button returns TO, which is not the level it is currently on.
  const backLabel = level === 2 ? 'Benchmark' : 'Tipo de WOD'

  return (
    <Modal open title={title} onClose={onClose} size="lg">
      {level > 0 && (
        <button type="button" className={s.backBtn} onClick={goBack}>
          ← {backLabel}
        </button>
      )}

      {level === 0 && (
        <div className={s.grid}>
          {TYPES.map(t => (
            <button
              key={t.key}
              type="button"
              className={s.card}
              style={{ '--card-color': t.color }}
              onClick={() => handleTypeClick(t.key)}
            >
              <span className={s.cardName}>{t.key}</span>
              <span className={s.cardDesc}>{t.desc}</span>
            </button>
          ))}
        </div>
      )}

      {level === 1 && (
        <div className={s.grid}>
          {BM_CATS.map(cat => (
            <button
              key={cat.key}
              type="button"
              className={s.card}
              style={{ '--card-color': cat.color }}
              onClick={() => handleCatClick(cat.key)}
            >
              <span className={s.cardName}>{cat.label}</span>
              <span className={s.cardDesc}>{cat.desc}</span>
            </button>
          ))}
        </div>
      )}

      {level === 2 && (
        <div className={s.list}>
          {bmList.map(bm => (
            <button
              key={bm.name}
              type="button"
              className={s.listItem}
              style={{ '--card-color': catMeta?.color || 'var(--gold)' }}
              onClick={() => handleBmClick(bm)}
            >
              <span className={s.listName}>{bm.name}</span>
              <span className={s.listDesc}>{bm.desc}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
