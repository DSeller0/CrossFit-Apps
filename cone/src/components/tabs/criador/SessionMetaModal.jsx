import { useState, useEffect } from 'react'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import s from './criador.module.css'

// ── SessionMetaModal (#58) ────────────────────────────────────────────────────
// Everything about a session that isn't a block: date, name, audience, visibility,
// box tags, briefing. It used to be a permanent slab above the blocks — six fields
// the coach fills once and then scrolls past every time he edits a WOD. Here it is
// a dialog, opened to create a session and reopened from the editor header.
//
// It holds a DRAFT and commits on confirm, so "Cancelar" really cancels. The
// move-to-another-date guard stays in the parent, which is the only place that
// knows whether the session is already saved and on which day.
//
// The athlete picker is inline, not a second modal on top of this one.
export function SessionMetaModal({
  initial,
  athletes = [],
  boxLocs = [],
  isEdit = false,
  onCancel,
  onConfirm,
}) {
  const [d, setD] = useState(initial)
  const [showAth, setShowAth] = useState(false)

  // Escape cancels — the draft is discarded either way, so it's a safe dismissal.
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel?.()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const targets = Array.isArray(d.mainTraining) ? d.mainTraining : []
  const boxIds = d.locationIds || []

  const toggleAthlete = name =>
    set({
      mainTraining: targets.includes(name) ? targets.filter(n => n !== name) : [...targets, name],
    })
  const toggleBox = id =>
    set({
      locationIds:
        id === null ? [] : boxIds.includes(id) ? boxIds.filter(x => x !== id) : [...boxIds, id],
    })

  return (
    <div className={s.scrim} onClick={onCancel}>
      <div
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-meta-title"
        onClick={e => e.stopPropagation()}
      >
        <div className={s.modalHd}>
          <span id="cr-meta-title" className={s.modalTitle}>
            {isEdit ? 'Editar dados da sessão' : 'Nova sessão'}
          </span>
          <Button size="xs" iconOnly variant="ghost" aria-label="Fechar" onClick={onCancel}>
            <i className="ti ti-x" />
          </Button>
        </div>

        <div className={s.modalBody}>
          <div className={s.row2}>
            <Input
              label="Data"
              type="date"
              value={d.date || ''}
              onChange={e => set({ date: e.target.value })}
            />
            <Input
              label="Nome da sessão"
              placeholder="ex: Semana 3 · D1 · Força Lower"
              value={d.sessionName || ''}
              onChange={e => set({ sessionName: e.target.value })}
            />
          </div>

          <div>
            <span className={s.lbl}>Para quem</span>
            <button
              type="button"
              className={`${s.athBtn}${targets.length ? '' : ' ' + s.athBtnEmpty}`}
              aria-expanded={showAth}
              onClick={() => setShowAth(v => !v)}
            >
              <i className="ti ti-users" aria-hidden="true" />
              {targets.length === 0
                ? 'Nenhum atleta — clique para selecionar'
                : targets.map(n => (
                    <span key={n} className={s.athChip}>
                      {n}
                    </span>
                  ))}
            </button>
            {showAth && (
              <div className={s.athList}>
                {athletes.length === 0 && (
                  <span className={s.athLevel}>Nenhum atleta cadastrado.</span>
                )}
                {athletes.map(a => {
                  const on = targets.includes(a.name)
                  return (
                    <label key={a.id} className={`${s.athRow}${on ? ' ' + s.athRowOn : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleAthlete(a.name)}
                        style={{ accentColor: a.color || 'var(--accent)' }}
                      />
                      <span className={s.dot} style={{ background: a.color || 'var(--muted)' }} />
                      <span className={s.athName}>{a.name}</span>
                      <span className={s.athLevel}>{a.level || ''}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <span className={s.lbl}>Visibilidade</span>
            <div className={s.pillRow}>
              {[
                { label: 'Público', val: true },
                { label: 'Oculto', val: false },
              ].map(({ label, val }) => {
                const on = val ? d.public !== false : d.public === false
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    className={`${s.pill}${on ? ' ' + (val ? s.pillOn : s.pillOff) : ''}`}
                    onClick={() => set({ public: val })}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Box tags are a PARTITION, not an overlay: a session with any box tag is
              visible only under those boxes' scoped links (boxScope.js). "Sem box" is
              the 0-tags state, not a tag — same toggle pattern as exercise categories. */}
          {boxLocs.length > 0 && (
            <div>
              <span className={s.lbl}>Box</span>
              <div className={s.pillRow}>
                {[{ id: null, name: 'Sem box' }, ...boxLocs].map(b => {
                  const on = b.id === null ? boxIds.length === 0 : boxIds.includes(b.id)
                  return (
                    <button
                      key={b.id || 'none'}
                      type="button"
                      aria-pressed={on}
                      className={`${s.pill}${on ? ' ' + s.pillOn : ''}`}
                      style={on && b.color ? { borderColor: b.color, color: b.color } : undefined}
                      onClick={() => toggleBox(b.id)}
                    >
                      {b.id && (
                        <span className={s.dot} style={{ background: b.color || 'var(--muted)' }} />
                      )}
                      {b.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Always open. It was behind a disclosure, which cost a click on every
              session that has a briefing and hid the field on every one that
              should. There are six fields here; a seventh doesn't need folding. */}
          <Input
            as="textarea"
            label="Briefing da sessão"
            placeholder="Contexto, objetivos, link de vídeo, regras..."
            value={d.notes || ''}
            onChange={e => set({ notes: e.target.value })}
          />
        </div>

        <div className={s.modalFoot}>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirm(d)}>
            {isEdit ? 'Salvar dados' : 'Criar sessão'}
          </Button>
        </div>
      </div>
    </div>
  )
}
