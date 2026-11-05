import { useId, useMemo, useState } from 'react'
import { buildRegistryIndex } from '../../../public/lib/registry.js'
import { blkColor, blockExercises } from '../../../public/lib/wod.js'
import ConfirmReview, { ReadRow } from '../../../public/shared/ConfirmReview.jsx'
import Button from '../../ui/Button.jsx'
import { PreviewBlock } from './PreviewBlock.jsx'
import { ParseWarnings } from './ParseWarnings.jsx'
import { parseSession, serializeSession } from './textFormat.js'
import { suggestSession } from './suggest/index.js'
import { LPO_FAMILIES, PATTERNS } from './suggest/patterns.js'
import {
  bumpAll,
  bumpVariant,
  budgetNote,
  checkedTypes,
  confirmRows,
  focusNoteOf,
  highlightParts,
  initialControls,
  isTouched,
  optionsOf,
  recordFor,
  scopeOf,
  summaryLine,
  toggleBlockType,
  weekdayLabel,
  widenNote,
} from './suggest/paneModel.js'
import s from './SessionSuggestPane.module.css'

// ── SessionSuggestPane (#235 · plans/102) ─────────────────────────────────────
// ✦ Sugerido — the third way to fill a session: one synthesized from the box's OWN history by
// the #233 engine (suggest/index.js). Built from the approved card, mockups/67. Like
// SessionTextPane it commits nothing until Aplicar, and Aplicar only hands blocks + a
// `suggestion` snapshot UP — the editor puts them on its state, and the only write is Salvar.
//
// The engine is synchronous (≈ 60 ms), so there is no loading or error state. CLIENT-FREE: no
// utils/storage — `sessions`, `registry` and `locations` are props, so this renders in the
// gallery. A re-roll is per block TYPE (`variants[type]`), and an untouched pane sends the
// engine no options at all, so its own defaults decide the day.
//
// `initial` / `initialOpen` seed the controls and the open por quês — only the gallery passes them
// (a stateful demo renders at its first state), the editor never does.
export function SessionSuggestPane({
  sessions,
  registry,
  locations = [],
  locationIds,
  date,
  blocks,
  isMobile = false,
  onApply,
  onCancel,
  onGoToText,
  initial,
  initialOpen,
}) {
  const [controls, setControls] = useState(() => initial || initialControls())
  const [openWhy, setOpenWhy] = useState(() => new Set(initialOpen || []))
  const [showHelp, setShowHelp] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [mobileCtl, setMobileCtl] = useState(false)

  const index = useMemo(() => buildRegistryIndex(registry), [registry])
  const { scope, extra } = scopeOf(locationIds)
  const result = useMemo(
    () =>
      suggestSession({
        sessions,
        registry: index,
        locations,
        scope,
        date,
        options: optionsOf(controls),
        variants: controls.variants,
      }),
    [sessions, index, locations, scope, date, controls],
  )
  const { blocks: sug, why, meta } = result
  const warnings = useMemo(
    () => parseSession(serializeSession({ blocks: sug }), { registry: index }).warnings,
    [sug, index],
  )

  const day = weekdayLabel(date)
  const boxName = locations.find(l => l.id === scope)?.name || (extra ? 'Box' : 'Sem box')
  const note = budgetNote(meta, controls)
  const widened = widenNote(controls, meta, day.plural)
  const exCount = sug.reduce(
    (n, b) => n + blockExercises(b).filter(e => (e.name || '').trim() || e.isComplex).length,
    0,
  )

  const change = next => setControls(next)
  const toggleWhy = type =>
    setOpenWhy(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  const requestApply = () => {
    if (!sug.length) return
    if (blocks.length) setConfirm(true)
    else doApply()
  }
  // `at` is read here, in the click handler — never during render.
  const doApply = () => {
    setConfirm(false)
    onApply(sug, recordFor({ scope, date, controls, blocks: sug, at: new Date().toISOString() }))
  }

  const ctxSub = [
    `${meta.weekdayCount} ${meta.weekdayCount === 1 ? day.name : day.plural} no histórico · ${meta.historyCount} ${meta.historyCount === 1 ? 'sessão' : 'sessões'}`,
    extra ? `1º de ${extra + 1} boxes` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const controlsEl = (
    <Controls
      controls={controls}
      meta={meta}
      onChange={change}
      ctxTitle={`${day.cap} ${day.dd} · ${boxName}`}
      ctxSub={ctxSub}
    />
  )

  const previewEl = (
    <div className={s.prev}>
      <div className={s.title}>
        Sugestão · {day.name} {day.dd} · {boxName}
      </div>
      {sug.length > 0 && (
        <div className={s.chips}>
          <span className={s.pchip}>
            {sug.length} {sug.length === 1 ? 'bloco' : 'blocos'}
          </span>
          <span className={`${s.pchip}${note ? ' ' + s.pchipWarn : ''}`}>
            ≈ {meta.estimateMin} min
          </span>
          <span className={`${s.pchip} ${s.pchipDim}`}>motor v{meta.engineVersion}</span>
        </div>
      )}
      {sug.length > 0 && (
        <div className={s.estr}>Estrutura: {sug.map(b => b.type).join(' → ')}</div>
      )}

      {note && (
        <Banner kind="warn" icon="⏱">
          Estimativa <b>≈ {note.estimate} min</b> — <b>{note.over} min</b> acima dos {note.budget}{' '}
          que você indicou. <b>Nada foi cortado</b>: ajuste os blocos ou aplique assim mesmo.
        </Banner>
      )}
      {meta.thin && meta.historyCount > 0 && (
        <Banner
          kind="warn"
          icon="⚠"
          actions={
            <>
              {controls.widen !== 'weekdays' && (
                <Button size="sm" onClick={() => change({ ...controls, widen: 'weekdays' })}>
                  Usar todos os dias do box
                </Button>
              )}
              {controls.widen !== 'boxes' && (
                <Button size="sm" onClick={() => change({ ...controls, widen: 'boxes' })}>
                  Usar todos os boxes
                </Button>
              )}
            </>
          }
        >
          <b>Poucos dados.</b> {meta.thinReason} A sugestão pode errar mais. Para tentar de novo com
          mais histórico:
        </Banner>
      )}
      {widened && (
        <Banner
          kind="info"
          icon="ⓘ"
          actions={
            <Button size="sm" variant="ghost" onClick={() => change({ ...controls, widen: null })}>
              Voltar ao box
            </Button>
          }
        >
          {widened}
        </Banner>
      )}

      {sug.length === 0 ? (
        <div className={s.empty}>
          <span className={s.eIc} aria-hidden="true">
            ✦
          </span>
          <b>
            {meta.historyCount
              ? 'Nenhum bloco pôde ser sugerido com este histórico.'
              : meta.thinReason}
          </b>
          <span>
            Não há de onde tirar uma sugestão. Você pode usar o histórico de todos os boxes, ou
            escrever a sessão em ¶ Texto.
          </span>
          <div className={s.eAct}>
            {controls.widen !== 'boxes' && (
              <Button size="sm" onClick={() => change({ ...controls, widen: 'boxes' })}>
                Usar todos os boxes
              </Button>
            )}
            {onGoToText && (
              <Button size="sm" variant="ghost" onClick={onGoToText}>
                Ir para ¶ Texto
              </Button>
            )}
          </div>
        </div>
      ) : (
        sug.map((b, i) => (
          <PreviewBlock
            key={b.type}
            block={b}
            footer={
              <BlockFooter
                why={why[i]}
                open={openWhy.has(b.type)}
                onToggle={() => toggleWhy(b.type)}
                variant={controls.variants[b.type] || 0}
                onReroll={() => change(bumpVariant(controls, b.type))}
                note={b.type === 'Força' ? focusNoteOf(why[i]) : null}
              />
            }
          />
        ))
      )}
      {meta.skipped.map(sk => (
        <Banner key={sk.type} kind="note" icon="ⓘ">
          <b>{sk.type}</b> não foi sugerido — {sk.reason}
        </Banner>
      ))}

      {sug.length > 0 && (
        <div className={s.foot}>
          <b>
            {sug.length} {sug.length === 1 ? 'bloco' : 'blocos'} · {exCount} movimento
            {exCount === 1 ? '' : 's'}
          </b>{' '}
          · {warnings.length ? <ParseWarnings warnings={warnings} /> : '0 avisos de formato'}
          <br />
          Nada é gravado até <b>Aplicar</b> e <b>Salvar</b>. Ao salvar, a sessão guarda a etiqueta{' '}
          <b>✦ Sugerida</b> e o texto sugerido.
        </div>
      )}
    </div>
  )

  const applyLabel = sug.length
    ? `Aplicar${isMobile ? ` · ${sug.length} ${sug.length === 1 ? 'bloco' : 'blocos'}` : ''}`
    : 'Aplicar'
  const actions = (
    <>
      <Button size="sm" onClick={onCancel}>
        Cancelar
      </Button>
      <Button size="sm" variant="primary" disabled={!sug.length} onClick={requestApply}>
        <i className="ti ti-check" /> {applyLabel}
      </Button>
    </>
  )

  return (
    <div className={s.wrap}>
      {isMobile ? (
        <>
          <button
            type="button"
            className={s.mSum}
            aria-expanded={mobileCtl}
            onClick={() => setMobileCtl(v => !v)}
          >
            <span>
              <b>Ajustes</b> · {summaryLine(controls)}
            </span>
            <span aria-hidden="true">{mobileCtl ? '▴' : '▾'}</span>
          </button>
          {mobileCtl && <div className={s.mCtl}>{controlsEl}</div>}
          {previewEl}
          <div className={s.sticky}>{actions}</div>
        </>
      ) : (
        <>
          <div className={s.bar}>
            <span className={s.barTxt}>Aplicar troca os blocos da sessão</span>
            <span className={s.spacer} />
            <button
              type="button"
              className={s.help}
              aria-expanded={showHelp}
              onClick={() => setShowHelp(v => !v)}
            >
              ⓘ Como funciona
            </button>
            {actions}
          </div>
          {showHelp && (
            <div className={s.helpBox}>
              A sessão é <b>sintetizada só com o histórico deste box</b> — sem IA, sem servidor,
              nada sai do app. Cada escolha tem um número por trás (veja o <b>por quê</b> de cada
              bloco). O mesmo dia sempre dá a mesma sessão; <b>↻ Outra</b> muda um bloco por vez, e
              o tempo da aula só avisa — nunca corta blocos.
            </div>
          )}
          <div className={s.pane}>
            <div className={s.left}>{controlsEl}</div>
            {previewEl}
          </div>
        </>
      )}

      <ConfirmReview
        open={confirm}
        title="Aplicar a sugestão?"
        editLabel="Cancelar"
        confirmLabel="Substituir blocos"
        onEdit={() => setConfirm(false)}
        onClose={() => setConfirm(false)}
        onConfirm={doApply}
      >
        {confirmRows(blocks, sug.length).map(r => (
          <ReadRow key={r.label} label={r.label} value={r.value} />
        ))}
      </ConfirmReview>
    </div>
  )
}

// ── the controls column ───────────────────────────────────────────────────────
function Controls({ controls, meta, onChange, ctxTitle, ctxSub }) {
  const family = meta.picks?.family
  const types = meta.structure || []
  const checked = checkedTypes(controls, meta.dayTypes || [])
  const set = patch => onChange({ ...controls, ...patch })
  return (
    <div className={s.ctls}>
      <div className={s.ctx}>
        <b>{ctxTitle}</b>
        <span>{ctxSub}</span>
      </div>

      <div>
        <div className={s.ctlL}>Levantamento do LPO</div>
        <div className={s.selRow}>
          <Chip on={!controls.lpoLift} onClick={() => set({ lpoLift: null })}>
            {!controls.lpoLift && family ? `Automático → ${family}` : 'Automático'}
          </Chip>
          {LPO_FAMILIES.map(f => (
            <Chip key={f} on={controls.lpoLift === f} onClick={() => set({ lpoLift: f })}>
              {f}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className={s.ctlL}>Foco de movimento</div>
        <div className={s.selRow}>
          <Chip on={!controls.pattern} onClick={() => set({ pattern: null })}>
            Sem foco
          </Chip>
          {PATTERNS.map(p => (
            <Chip key={p} on={controls.pattern === p} onClick={() => set({ pattern: p })}>
              {p}
            </Chip>
          ))}
        </div>
        <div className={s.hint}>
          Com foco, a <b>Força</b> e os <b>Acessórios</b> usam só esse padrão; o <b>Core</b> e o{' '}
          <b>WOD</b> o pesam <b>×3</b>.
        </div>
      </div>

      <div>
        <div className={s.ctlL}>Tempo da aula</div>
        <div className={s.minRow}>
          <input
            className={s.numInp}
            inputMode="numeric"
            placeholder="—"
            aria-label="Tempo da aula em minutos"
            value={controls.budget}
            onChange={e => set({ budget: e.target.value.replace(/\D/g, '').slice(0, 3) })}
          />
          <span>min</span>
        </div>
        <div className={s.hint}>
          Só avisa. <b>Nunca corta</b> blocos.
        </div>
      </div>

      {types.length > 0 && (
        <div>
          <div className={s.ctlL}>
            Blocos <span className={s.ctlSub}>estrutura do box</span>
          </div>
          <div className={s.chkGrid}>
            {types.map(t => {
              const on = checked.includes(t)
              return (
                <label key={t} className={`${s.chk}${on ? ' ' + s.chkOn : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={on && checked.length === 1}
                    title={on && checked.length === 1 ? 'Ao menos um bloco' : undefined}
                    onChange={() =>
                      onChange(toggleBlockType(controls, t, meta.dayTypes || [], types))
                    }
                  />
                  <i className={s.dot} style={{ background: blkColor({ type: t }) }} />
                  <span>{t}</span>
                </label>
              )
            })}
          </div>
          <div className={s.hint}>
            Ordem das últimas 6 semanas ({meta.structureBasis?.sessions} sessões de força).
            Marcados: os blocos {controls.blockTypes ? 'que você escolheu' : 'habituais deste dia'}.
          </div>
        </div>
      )}

      <div className={s.ctlAct}>
        <Button
          size="sm"
          disabled={!meta.dayTypes?.length}
          onClick={() => onChange(bumpAll(controls, meta.dayTypes || []))}
        >
          ↻ Outra sessão
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!isTouched(controls)}
          onClick={() => onChange(initialControls())}
        >
          Limpar ajustes
        </Button>
      </div>
    </div>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      className={`${s.sel}${on ? ' ' + s.selOn : ''}`}
      aria-pressed={on}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Banner({ kind = 'warn', icon, actions, children }) {
  const cls = kind === 'info' ? s.bannerInfo : kind === 'note' ? s.bannerNote : ''
  return (
    <div className={`${s.banner} ${cls}`} role="status">
      <span className={s.bi} aria-hidden="true">
        {icon}
      </span>
      <div className={s.bt}>{children}</div>
      {actions && <div className={s.ba}>{actions}</div>}
    </div>
  )
}

// ── under each block: por quê · ↻ Outra ───────────────────────────────────────
function BlockFooter({ why, open, onToggle, variant, onReroll, note }) {
  const id = useId()
  return (
    <>
      {note && <div className={s.focusNote}>{note}</div>}
      <div className={s.actions}>
        <button
          type="button"
          className={`${s.whyBtn}${open ? ' ' + s.whyBtnOn : ''}`}
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
        >
          por quê{' '}
          <span className={s.car} aria-hidden="true">
            ▾
          </span>
        </button>
        {variant > 0 && (
          <span className={s.vtag} title={`variante ${variant} deste bloco`}>
            variante {variant}
          </span>
        )}
        <span className={s.spacer} />
        <Button size="xs" onClick={onReroll} title="Outro bloco, sem mexer nos demais">
          ↻ Outra
        </Button>
      </div>
      <ol id={id} className={s.whyList} hidden={!open}>
        {(why || []).map((line, i) => (
          <li key={i} className={i === 0 ? s.whyLead : undefined}>
            {highlightParts(line).map((p, j) =>
              p.num ? (
                <b key={j} className={s.num}>
                  {p.text}
                </b>
              ) : (
                p.text
              ),
            )}
          </li>
        ))}
      </ol>
    </>
  )
}
