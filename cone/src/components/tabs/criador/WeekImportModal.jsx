import { useState, useMemo } from 'react'
// uid/toISO come straight from the canonical lib modules, not the utils/storage
// re-export: storage pulls the SPA Supabase client, and this component renders in
// the (client-free) gallery.
import { uid } from '../../../public/lib/wod.js'
import { DAY_PT, toISO } from '../../../public/lib/week.js'
import { parseWeek } from './textFormat.js'
import s from './textMode.module.css'
import Button from '../../ui/Button.jsx'

// ── WeekImportModal (#92) ─────────────────────────────────────────────────────
// One paste, five sessions. The coach writes the whole week in a phone notepad;
// this is the path that stops him re-typing it. Detection runs BEFORE anything is
// created, and the import only ever ADDS: a day that already has a session in the
// current box scope is listed and skipped, never overwritten.
export function WeekImportModal({
  weekDates,
  weekLabel,
  sessions,
  boxFilter,
  boxLocs,
  selBox,
  onPrevWeek,
  onNextWeek,
  onCreate,
  onClose,
  initialText = '',
}) {
  const [text, setText] = useState(initialText)
  const [locationIds, setLocationIds] = useState(() =>
    selBox === 'all' || selBox === 'none' ? [] : [selBox],
  )
  const [isPublic, setIsPublic] = useState(true)

  const days = useMemo(() => (text.trim() ? parseWeek(text) : []), [text])

  const rows = useMemo(
    () =>
      days.map(d => {
        const date = weekDates[d.dayIndex]
        const dateKey = date ? toISO(date) : null
        const taken = dateKey ? (sessions[dateKey] || []).filter(boxFilter).length > 0 : false
        const exCount = d.blocks.reduce(
          (n, b) =>
            n + (b.exercises || []).filter(e => (e.name || '').trim() || e.isComplex).length,
          0,
        )
        const noType = d.warnings.filter(w => w.kind === 'type-unresolved').length
        const noted = d.warnings.filter(
          w => w.kind === 'unparsed-line' || w.kind === 'orphan-load',
        ).length
        return { ...d, date, dateKey, taken, exCount, noType, noted }
      }),
    [days, weekDates, sessions, boxFilter],
  )

  const creatable = rows.filter(r => r.dateKey && !r.taken)

  const create = () => {
    onCreate(
      creatable.map(r => ({
        dateKey: r.dateKey,
        session: {
          id: uid(),
          date: r.dateKey,
          sessionName: r.sessionName || '',
          mainTraining: [],
          locationIds,
          public: isPublic,
          blocks: r.blocks,
        },
      })),
    )
  }

  return (
    <div className={s.scrim} onClick={onClose}>
      <div
        className={s.modal}
        role="dialog"
        aria-label="Importar semana"
        onClick={e => e.stopPropagation()}
      >
        <div className={s.modalHd}>
          <span className={s.modalTitle}>
            <i className="ti ti-clipboard-text" /> Importar semana
          </span>
          <Button size="xs" iconOnly variant="ghost" onClick={onClose} aria-label="Fechar">
            <i className="ti ti-x" />
          </Button>
        </div>

        <div className={s.modalBody}>
          <label className={s.lbl} htmlFor="wk-import-ta">
            Cole o texto da semana
          </label>
          <textarea
            id="wk-import-ta"
            className={s.ta}
            style={{ minHeight: 130 }}
            spellCheck={false}
            placeholder={'SEGUNDA-FEIRA\n\nWarm Up\n3 rounds\n100m Run\n…'}
            value={text}
            onChange={e => setText(e.target.value)}
          />

          <div className={s.weekPick}>
            <Button size="sm" iconOnly onClick={onPrevWeek} aria-label="Semana anterior">
              <i className="ti ti-chevron-left" />
            </Button>
            <span className={s.lbl} style={{ margin: 0 }}>
              Semana de
            </span>
            <span className={s.weekPickVal}>{weekLabel}</span>
            <Button size="sm" iconOnly onClick={onNextWeek} aria-label="Próxima semana">
              <i className="ti ti-chevron-right" />
            </Button>
          </div>

          <span className={s.lbl}>Detectado</span>
          {!text.trim() ? (
            <div className={s.prevEmpty}>Nada colado ainda.</div>
          ) : rows.length === 0 ? (
            <div className={s.prevFoot} style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
              <span className={s.warnRow}>⚠ Nenhum dia da semana reconhecido.</span>
              <br />
              <span className={s.infoRow}>
                Comece cada dia com o nome dele: <b>SEGUNDA-FEIRA</b>.
              </span>
            </div>
          ) : (
            <table className={s.det}>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.taken ? s.detSkip : undefined}>
                    <td className={s.detDay}>
                      {DAY_PT[r.dayIndex]} {r.date ? r.date.getDate() : '—'}
                    </td>
                    <td className={s.detCount}>
                      {r.blocks.length} blocos · {r.exCount} ex
                    </td>
                    <td className={s.detState}>
                      {r.taken ? (
                        <span className={s.infoRow}>já tem sessão — pular</span>
                      ) : r.noType ? (
                        <span className={s.warnRow}>⚠ {r.noType} tipo por definir</span>
                      ) : r.noted ? (
                        <span className={s.infoRow}>⚠ {r.noted} linha como nota</span>
                      ) : (
                        <span style={{ color: 'var(--green)' }}>✓</span>
                      )}
                      {r.sessionName && (
                        <span style={{ color: 'var(--gold)', marginLeft: 6 }}>
                          &ldquo;{r.sessionName}&rdquo;
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {boxLocs.length > 0 && (
            <>
              <span className={s.lbl}>Box</span>
              <div className={s.pills}>
                {[{ id: null, name: 'Sem box' }, ...boxLocs].map(b => {
                  const on = b.id === null ? locationIds.length === 0 : locationIds.includes(b.id)
                  return (
                    <button
                      key={b.id || 'none'}
                      type="button"
                      className={`${s.pill} ${on ? s.pillOn : ''}`}
                      onClick={() =>
                        setLocationIds(cur =>
                          b.id === null
                            ? []
                            : cur.includes(b.id)
                              ? cur.filter(x => x !== b.id)
                              : [...cur, b.id],
                        )
                      }
                    >
                      {b.id && (
                        <span className={s.dot} style={{ background: b.color || 'var(--muted)' }} />
                      )}
                      {b.name}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <span className={s.lbl}>Visibilidade</span>
          <div className={s.pills}>
            {[
              ['Público', true],
              ['Oculto', false],
            ].map(([label, val]) => (
              <button
                key={label}
                type="button"
                className={`${s.pill} ${isPublic === val ? s.pillOn : ''}`}
                onClick={() => setIsPublic(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.modalFoot}>
          <Button size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" variant="primary" disabled={!creatable.length} onClick={create}>
            <i className="ti ti-calendar-plus" /> Criar {creatable.length}{' '}
            {creatable.length === 1 ? 'sessão' : 'sessões'}
          </Button>
        </div>
      </div>
    </div>
  )
}
