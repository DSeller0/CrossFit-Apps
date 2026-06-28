import { useState } from 'react'
import s from './BlockTypePicker.module.css'
import { BENCHMARK_GIRLS, BENCHMARK_HEROES } from '../lib/benchmarks.js'

const TYPES = [
  { key: 'For Time',  desc: 'Tempo fixo ou cap',     color: 'var(--gold)'  },
  { key: 'AMRAP',     desc: 'Máximo de rounds',       color: 'var(--gold)'  },
  { key: 'EMOM',      desc: 'Todo minuto, on the min',color: 'var(--gold)'  },
  { key: 'Estações',  desc: 'Circuito rotativo',      color: 'var(--teal)'  },
  { key: 'Benchmark', desc: 'WOD clássico Girls/Heroes', color: '#d05878'   },
]

const BM_CATS = [
  { key: 'Girls',  label: 'Girls',  color: '#d05878', desc: 'Fran, Grace, Helen, Annie...' },
  { key: 'Heroes', label: 'Heroes', color: '#d8a840', desc: 'Murph, DT, JT, Nate...'      },
]

export default function BlockTypePicker({ onSelect, onSelectBenchmark, onClose }) {
  const [level, setLevel] = useState(0)
  const [bmCat, setBmCat] = useState(null)

  function handleTypeClick(type) {
    if (type === 'Benchmark') { setLevel(1) }
    else { onSelect(type); onClose() }
  }

  function handleCatClick(cat) { setBmCat(cat); setLevel(2) }

  function handleBmClick(bm) { onSelectBenchmark(bm); onClose() }

  function goBack() {
    if (level === 2) { setBmCat(null); setLevel(1) }
    else setLevel(0)
  }

  const catMeta = BM_CATS.find(c => c.key === bmCat)
  const bmList  = bmCat === 'Girls' ? BENCHMARK_GIRLS : BENCHMARK_HEROES

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.header}>
          {level > 0
            ? <button className={s.backBtn} onClick={goBack}>← {level === 2 ? bmCat : 'Tipo'}</button>
            : <span className={s.title}>Tipo de WOD</span>
          }
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {level === 0 && (
          <div className={s.grid}>
            {TYPES.map(t => (
              <button key={t.key} className={s.card}
                style={{ '--card-color': t.color }}
                onClick={() => handleTypeClick(t.key)}>
                <span className={s.cardName}>{t.key}</span>
                <span className={s.cardDesc}>{t.desc}</span>
              </button>
            ))}
          </div>
        )}

        {level === 1 && (
          <div className={s.grid}>
            {BM_CATS.map(cat => (
              <button key={cat.key} className={s.card}
                style={{ '--card-color': cat.color }}
                onClick={() => handleCatClick(cat.key)}>
                <span className={s.cardName}>{cat.label}</span>
                <span className={s.cardDesc}>{cat.desc}</span>
              </button>
            ))}
          </div>
        )}

        {level === 2 && (
          <div className={s.list}>
            {bmList.map(bm => (
              <button key={bm.name} className={s.listItem}
                style={{ '--card-color': catMeta?.color || 'var(--gold)' }}
                onClick={() => handleBmClick(bm)}>
                <span className={s.listName}>{bm.name}</span>
                <span className={s.listDesc}>{bm.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
