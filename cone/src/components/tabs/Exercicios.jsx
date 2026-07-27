import { useState, useMemo, useCallback } from 'react'
import { saveRegistry } from '../../utils/storage'
import { normExName } from '../../public/lib/registry.js'
import { BLOCK_ORDER, getExName, sortCat, initRegistry } from './exerciciosHelpers.js'
import {
  FAMILY_GROUPS,
  familyOf,
  groupByRoot,
  completeness,
} from '../../public/lib/exerciseGroups.js'
import { APP_CONFIG } from '../../utils/config'
import { useIsMobile } from '../../hooks/useIsMobile'
import IntensityInput from '../shared/IntensityInput'
import TallyBar from '../../public/shared/TallyBar.jsx'
import Button from '../ui/Button'
import Input from '../ui/Input'
import ConfirmReview from '../../public/shared/ConfirmReview'
import s from './Exercicios.module.css'

const famColorOf = cat => familyOf(cat)?.color || 'var(--muted)'
// % of a category's exercises that carry a video URL (any) — the Pane-1 coverage bar.
const coverage = list => {
  if (!list.length) return 0
  const withVid = list.filter(e => completeness(e).video !== 'none').length
  return Math.round((withVid / list.length) * 100)
}

// The 5-field completeness indicator (mockup 45). Video is 3-state; the other four are
// present/absent. Icons are Tabler (`ti`, the webfont Exercícios already loads) — the
// mockup's hand-drawn SVGs map here. Colors are UI state, not data: filled = accent,
// empty = dim, and video-unpublished gets its own amber "started, not live" tint (#5/#7).
const CMPL = [
  { key: 'cargas', icon: 'ti-barbell', label: 'Cargas padrão' },
  { key: 'video', icon: 'ti-video', label: 'Vídeo' },
  { key: 'desc', icon: 'ti-align-left', label: 'Descrição' },
  { key: 'musc', icon: 'ti-target', label: 'Músculos' },
  { key: 'det', icon: 'ti-notes', label: 'Detalhe' },
]

function CmplIcons({ c }) {
  const cls = { on: s.cmplOn, off: s.cmplOff, none: s.cmplNone, unpub: s.cmplUnpub, pub: s.cmplPub }
  return (
    <span className={s.cmplRow} aria-hidden="true">
      {CMPL.map(m => {
        const v = c[m.key]
        const state = m.key === 'video' ? v : v ? 'on' : 'off'
        return <i key={m.key} className={`ti ${m.icon} ${s.cmplIco} ${cls[state]}`} />
      })}
    </span>
  )
}

const extractYouTubeId = url => {
  if (!url) return null
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  )
  return m ? m[1] : null
}

// Per-field before→after diff for the save-summary modal (#2h). A create (orig === null)
// reads every filled field as "Criado". Pure — takes the original + new exercise objects
// plus their category lists (Tipos aren't stored on the object, they're which categories
// hold it).
function diffExercise(orig, origBlocks, next, nextBlocks) {
  const ch = []
  const isNew = !orig
  const norm = v => (v == null ? '' : String(v)).trim()
  const push = (label, before, after) => {
    const b = norm(before),
      a = norm(after)
    if (b === a) return
    if (isNew || !b) ch.push({ label, kind: 'created', after: a })
    else if (!a) ch.push({ label, kind: 'removed', before: b })
    else ch.push({ label, kind: 'changed', before: b, after: a })
  }
  const cargasStr = ex => {
    const d = ex?.defaults || {}
    const p = []
    if (d.sets) p.push(d.sets + ' séries')
    if (d.dist) p.push(d.dist + (d.distUnit || 'm'))
    else if (d.reps) p.push(d.reps + ' reps')
    if (d.intensity?.mode && d.intensity.mode !== 'none') p.push('intensidade: ' + d.intensity.mode)
    return p.join(' · ')
  }
  push('Nome', orig?.name, next.name)
  const added = nextBlocks.filter(b => !origBlocks.includes(b))
  const removed = origBlocks.filter(b => !nextBlocks.includes(b))
  if (added.length) ch.push({ label: 'Tipos', kind: 'created', after: added.join(', ') })
  if (removed.length) ch.push({ label: 'Tipos', kind: 'removed', before: removed.join(', ') })
  push('Cargas padrão', cargasStr(orig), cargasStr(next))
  push('Vídeo', orig?.videoUrl, next.videoUrl)
  if (!!orig?.videoPublished !== !!next.videoPublished && (next.videoUrl || orig?.videoUrl))
    ch.push({
      label: 'Vídeo publicado',
      kind: 'changed',
      before: orig?.videoPublished ? 'ON' : 'OFF',
      after: next.videoPublished ? 'ON' : 'OFF',
    })
  push('Descrição', orig?.description, next.description)
  push('Músculo(s) alvo', orig?.muscles, next.muscles)
  push('Detalhe', orig?.notes, next.notes)
  return ch
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExerciciosTab() {
  // initRegistry() only reads + migrates in memory; the write decision stays here,
  // at the call site, so a load with nothing to migrate performs zero writes (#109).
  const [registry, setRegistryState] = useState(() => {
    const { registry: reg, needsSave } = initRegistry()
    if (needsSave) saveRegistry(reg)
    return reg
  })
  const [selBlock, setSelBlock] = useState(null)
  const [pane, setPane] = useState(0)
  const [search, setSearch] = useState('')
  const [openFamilies, setOpenFamilies] = useState(() => new Set(['Forca']))
  const [detail, setDetail] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [saveSummary, setSaveSummary] = useState(null)
  const isMobile = useIsMobile()

  const persist = reg => {
    saveRegistry(reg)
    APP_CONFIG.blockNames = ['-', ...BLOCK_ORDER]
  }
  // Compared via normExName (#62) so a name differing only by whitespace/case/accent still
  // finds its own entry across categories instead of registering as a silent duplicate.
  const blocksOf = name => {
    const key = normExName(name)
    return BLOCK_ORDER.filter(b => (registry[b] || []).some(e => normExName(getExName(e)) === key))
  }

  const allEx = useMemo(() => {
    const map = {}
    BLOCK_ORDER.forEach(b => {
      ;(registry[b] || []).forEach(ex => {
        const key = normExName(getExName(ex))
        if (!map[key]) map[key] = ex
      })
    })
    return Object.values(map).sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'))
  }, [registry])

  // useCallback so the two memos below can depend on the predicate itself rather than
  // on `search` behind its back — same recompute cadence, honest deps array.
  const matchesSearch = useCallback(
    ex => {
      const q = normExName(search)
      return !q || normExName(getExName(ex)).includes(q)
    },
    [search],
  )

  // Category-selected list (alpha-canonical already), search-filtered.
  const visibleExs = useMemo(
    () => (selBlock === null ? allEx : registry[selBlock] || []).filter(matchesSearch),
    [registry, selBlock, allEx, matchesSearch],
  )

  // Todos view: one section per category (an exercise shows under each of its categories,
  // per plan 2b), search-filtered, empties dropped. Category order is canonical (family order).
  const todosSections = useMemo(() => {
    if (selBlock !== null) return []
    return FAMILY_GROUPS.flatMap(f => f.cats)
      .map(cat => ({
        cat,
        color: famColorOf(cat),
        exs: (registry[cat] || []).filter(matchesSearch),
      }))
      .filter(sec => sec.exs.length)
  }, [registry, selBlock, matchesSearch])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goToType = block => {
    setSelBlock(block)
    setDetail(null)
    setSearch('')
    if (isMobile) setPane(1)
  }

  const toggleFamily = key =>
    setOpenFamilies(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })

  const goToEx = exObj => {
    const name = getExName(exObj)
    const blocks = blocksOf(name)
    const o = typeof exObj === 'object' ? exObj : {}
    setDetail({
      orig: o,
      origName: name,
      origBlocks: blocks,
      isNew: false,
      name,
      selectedBlocks: [...blocks],
      videoUrl: o.videoUrl || '',
      videoPublished: o.videoPublished === true,
      description: o.description || '',
      muscles: o.muscles || '',
      notes: o.notes || '',
      defaults: {
        sets: o.defaults?.sets || '',
        reps: o.defaults?.reps || '',
        dist: o.defaults?.dist || '',
        distUnit: o.defaults?.distUnit || 'm',
        intensity: o.defaults?.intensity || null,
      },
      defaultsDistMode: !!o.defaults?.dist,
    })
    if (isMobile) setPane(2)
  }

  // "+ Adicionar" seeds a blank detail (no inline input, #2e) with the current category
  // pre-lit (#2f) and drills to the detail on mobile.
  const startAdd = () => {
    setDetail({
      orig: null,
      origName: '',
      origBlocks: [],
      isNew: true,
      name: '',
      selectedBlocks: selBlock ? [selBlock] : [],
      videoUrl: '',
      videoPublished: false,
      description: '',
      muscles: '',
      notes: '',
      defaults: { sets: '', reps: '', dist: '', distUnit: 'm', intensity: null },
      defaultsDistMode: false,
    })
    if (isMobile) setPane(2)
  }

  const goBack = () => {
    if (pane === 2) {
      setPane(1)
      setDetail(null)
    } else if (pane === 1) {
      setPane(0)
      setSelBlock(null)
      setDetail(null)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  const saveDetail = () => {
    if (!detail) return
    const {
      orig,
      origName,
      origBlocks,
      videoUrl,
      videoPublished,
      description,
      muscles,
      notes,
      selectedBlocks,
      defaults,
    } = detail
    const name = detail.name.trim()
    if (!name) {
      setDetail(p => ({ ...p, error: 'Informe um nome' }))
      return
    }
    if (selectedBlocks.length === 0) {
      setDetail(p => ({ ...p, error: 'Selecione pelo menos um tipo' }))
      return
    }

    const nameKey = normExName(name),
      origKey = normExName(origName)
    // Creating or renaming to a new key must never silently overwrite an existing entry
    // (the inline add's duplicate guard used to cover this, #2). Only checked on a key
    // change — a plain edit keeps its own key.
    if (
      nameKey !== origKey &&
      selectedBlocks.some(b => (registry[b] || []).some(e => normExName(getExName(e)) === nameKey))
    ) {
      setDetail(p => ({ ...p, error: `"${name}" já existe` }))
      return
    }

    const newEx = { name }
    if (videoUrl?.trim()) newEx.videoUrl = videoUrl.trim()
    if (videoPublished) newEx.videoPublished = true
    if (description?.trim()) newEx.description = description.trim()
    if (muscles?.trim()) newEx.muscles = muscles.trim()
    if (notes?.trim()) newEx.notes = notes.trim()
    const cleanDefaults = {}
    if (defaults?.sets?.toString().trim()) cleanDefaults.sets = defaults.sets
    if (defaults?.dist?.toString().trim()) {
      cleanDefaults.dist = defaults.dist
      cleanDefaults.distUnit = defaults.distUnit || 'm'
    } else if (defaults?.reps?.toString().trim()) cleanDefaults.reps = defaults.reps
    if (defaults?.intensity?.mode && defaults.intensity.mode !== 'none')
      cleanDefaults.intensity = defaults.intensity
    if (Object.keys(cleanDefaults).length) newEx.defaults = cleanDefaults

    const changes = diffExercise(orig, origBlocks, newEx, selectedBlocks)

    const reg = { ...registry }
    origBlocks.forEach(b => {
      reg[b] = (reg[b] || []).filter(e => normExName(getExName(e)) !== origKey)
    })
    selectedBlocks.forEach(b => {
      if (!(reg[b] || []).some(e => normExName(getExName(e)) === nameKey))
        reg[b] = [...(reg[b] || []), newEx]
      else reg[b] = (reg[b] || []).map(e => (normExName(getExName(e)) === nameKey ? newEx : e))
      reg[b] = sortCat(reg[b])
    })
    setRegistryState(reg)
    persist(reg)
    // The detail now edits the saved exercise — re-anchor it so a second save diffs correctly.
    setDetail(p => ({
      ...p,
      orig: newEx,
      origName: name,
      origBlocks: [...selectedBlocks],
      isNew: false,
      error: undefined,
    }))
    setSaveSummary({ name, isNew: !orig, changes })
  }

  const confirmDelete = () => {
    const name = pendingDelete
    if (!name) return
    const reg = { ...registry }
    const nameKey = normExName(name)
    blocksOf(name).forEach(b => {
      reg[b] = (reg[b] || []).filter(e => normExName(getExName(e)) !== nameKey)
    })
    setRegistryState(reg)
    persist(reg)
    setPendingDelete(null)
    setDetail(null)
    if (isMobile) setPane(1)
  }

  // ── Pane 1: category families ────────────────────────────────────────────────
  const renderPane1 = () => (
    <div className={s.p1scroll}>
      <button
        type="button"
        className={`${s.todosRow}${selBlock === null ? ' ' + s.todosSel : ''}`}
        onClick={() => goToType(null)}
      >
        <i className={`ti ti-list ${s.todosIcon}`} />
        <span className={s.todosName}>Todos</span>
        <span className={s.todosCount}>{allEx.length}</span>
      </button>

      {FAMILY_GROUPS.map(fam => {
        const open = isMobile || openFamilies.has(fam.key)
        const famCount = fam.cats.reduce((n, c) => n + (registry[c] || []).length, 0)
        return (
          <div key={fam.key} className={s.fam} style={{ '--fc': fam.color }}>
            {isMobile ? (
              <div className={s.famLbl}>{fam.label}</div>
            ) : (
              <button
                type="button"
                className={s.famHead}
                onClick={() => toggleFamily(fam.key)}
                aria-expanded={open}
              >
                <span className={s.famChev}>{open ? '▾' : '▸'}</span>
                <span className={s.famName}>{fam.label}</span>
                <span className={s.famCount}>{famCount}</span>
              </button>
            )}
            {open &&
              fam.cats.map(cat => {
                const list = registry[cat] || []
                const sel = selBlock === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`${s.catRow}${sel ? ' ' + s.catSel : ''}`}
                    onClick={() => goToType(cat)}
                  >
                    <span className={s.catDot} />
                    <span className={s.catBody}>
                      <span className={s.catTop}>
                        <span className={s.catName}>{cat}</span>
                        <span className={s.catCount}>{list.length}</span>
                      </span>
                      <span className={s.catBar}>
                        <TallyBar pct={coverage(list)} color={fam.color} size="sm" grow />
                        <span className={s.catPct}>{coverage(list)}%</span>
                      </span>
                    </span>
                    {isMobile && <i className={`ti ti-chevron-right ${s.catChevron}`} />}
                  </button>
                )
              })}
          </div>
        )
      })}
    </div>
  )

  // ── Pane 2: exercise card grid ───────────────────────────────────────────────
  const ExCard = ({ ex, catContext }) => {
    const name = getExName(ex)
    const c = completeness(ex)
    const active = detail && !detail.isNew && normExName(detail.origName) === normExName(name)
    const filled = [c.cargas, c.video !== 'none', c.desc, c.musc, c.det].filter(Boolean).length
    const tags = blocksOf(name).filter(b => b !== catContext)
    return (
      <button
        type="button"
        className={`${s.exCard}${active ? ' ' + s.exCardActive : ''}`}
        style={{ '--fc': famColorOf(catContext || blocksOf(name)[0]) }}
        onClick={() => goToEx(ex)}
        title={`${filled} de 5 campos preenchidos`}
      >
        <span className={s.exCardName}>{name}</span>
        <CmplIcons c={c} />
        {tags.length > 0 && (
          <div className={s.chips}>
            {tags.slice(0, 3).map(t => (
              <span key={t} className={s.chip} style={{ '--cc': famColorOf(t) }}>
                {t}
              </span>
            ))}
            {tags.length > 3 && <span className={s.chipMore}>+{tags.length - 3}</span>}
          </div>
        )}
      </button>
    )
  }

  const renderPane2 = () => {
    const famColor = selBlock ? famColorOf(selBlock) : 'var(--muted)'
    return (
      <div className={s.pane2} style={{ '--fc': famColor }}>
        <div className={s.stickyHead}>
          <div className={s.p2title}>
            {selBlock === null ? (
              <i className={`ti ti-list ${s.p2icon}`} />
            ) : (
              <span className={s.p2dot} style={{ background: famColor }} />
            )}
            <span className={s.p2name} style={selBlock ? { color: famColor } : undefined}>
              {selBlock || 'Todos'}
            </span>
            <span className={s.p2count}>{visibleExs.length}</span>
          </div>
          <div className={s.searchBox}>
            <i className={`ti ti-search ${s.searchIcon}`} />
            <input
              className={s.searchInput}
              type="text"
              value={search}
              placeholder="Buscar exercício..."
              aria-label="Buscar exercício"
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className={s.searchClear}
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>
          <Button variant="primary" full onClick={startAdd}>
            <i className="ti ti-plus" /> Adicionar exercício
          </Button>
        </div>

        <div className={s.p2scroll}>
          {selBlock === null ? (
            todosSections.length === 0 ? (
              <div className={s.empty}>
                {search ? 'Nenhum exercício encontrado.' : 'Nenhum exercício cadastrado.'}
              </div>
            ) : (
              todosSections.map(sec => (
                <div key={sec.cat} className={s.section}>
                  <div className={s.vgLbl} style={{ color: sec.color }}>
                    {sec.cat} <span className={s.vgCount}>({sec.exs.length})</span>
                  </div>
                  <div className={s.grid}>
                    {sec.exs.map(ex => (
                      <ExCard key={sec.cat + ':' + getExName(ex)} ex={ex} catContext={sec.cat} />
                    ))}
                  </div>
                </div>
              ))
            )
          ) : (
            renderCategoryGrid()
          )}
        </div>
      </div>
    )
  }

  // A single category → variation sub-groups (▾ Squat (7)) with singletons under Avulsos.
  const renderCategoryGrid = () => {
    if (visibleExs.length === 0)
      return (
        <div className={s.empty}>
          {search ? 'Nenhum exercício encontrado.' : 'Nenhum exercício. Use "+ Adicionar".'}
        </div>
      )
    const { groups, singles } = groupByRoot(visibleExs, getExName)
    return (
      <>
        {groups.map(g => (
          <div key={g.root} className={s.section}>
            <div className={s.vgLbl}>
              ▾ {g.root} <span className={s.vgCount}>({g.items.length})</span>
            </div>
            <div className={s.grid}>
              {g.items.map(ex => (
                <ExCard key={getExName(ex)} ex={ex} catContext={selBlock} />
              ))}
            </div>
          </div>
        ))}
        {singles.length > 0 && (
          <div className={s.section}>
            {groups.length > 0 && (
              <div className={s.vgLbl}>
                · Avulsos <span className={s.vgCount}>({singles.length})</span>
              </div>
            )}
            <div className={s.grid}>
              {singles.map(ex => (
                <ExCard key={getExName(ex)} ex={ex} catContext={selBlock} />
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Pane 3: detail (2-col desktop, 1-col mobile) ─────────────────────────────
  const renderPane3 = () => {
    if (!detail)
      return <div className={s.detailEmpty}>Selecione um exercício ou use “+ Adicionar”.</div>

    const cDetail = completeness(detail)
    const filled = [
      cDetail.cargas,
      cDetail.video !== 'none',
      cDetail.desc,
      cDetail.musc,
      cDetail.det,
    ].filter(Boolean).length
    const cls = {
      on: s.cmplOn,
      off: s.cmplOff,
      none: s.cmplNone,
      unpub: s.cmplUnpub,
      pub: s.cmplPub,
    }
    const fIco = mkey => {
      const m = CMPL.find(x => x.key === mkey)
      const v = cDetail[mkey]
      const state = mkey === 'video' ? v : v ? 'on' : 'off'
      return <i className={`ti ${m.icon} ${s.cmplIco} ${cls[state]}`} aria-hidden="true" />
    }

    const toggleTag = block =>
      setDetail(p => {
        const has = p.selectedBlocks.includes(block)
        return {
          ...p,
          selectedBlocks: has
            ? p.selectedBlocks.filter(b => b !== block)
            : [...p.selectedBlocks, block],
          error: undefined,
        }
      })
    const videoId = extractYouTubeId(detail.videoUrl)

    return (
      <div className={s.pane3}>
        <div className={s.detailHead}>
          <span className={s.detailKicker}>{detail.isNew ? 'Novo exercício' : 'Exercício'}</span>
          <span className={s.detailComplete}>
            {filled === 5 ? 'completo' : `${filled}/5`}
            <CmplIcons c={cDetail} />
          </span>
        </div>

        <div className={s.detailBody}>
          <div className={s.fSpan}>
            <Input
              label="Nome"
              value={detail.name}
              autoFocus={detail.isNew}
              onChange={e => setDetail(p => ({ ...p, name: e.target.value, error: undefined }))}
              onKeyDown={e => {
                if (e.key === 'Enter') saveDetail()
              }}
            />
          </div>

          <div className={s.fSpan}>
            <div className={s.sLabel}>Tipos</div>
            <div className={s.tagWrap}>
              {BLOCK_ORDER.map(block => {
                const col = famColorOf(block)
                const isSel = detail.selectedBlocks.includes(block)
                return (
                  <button
                    key={block}
                    type="button"
                    className={s.tagToggle}
                    onClick={() => toggleTag(block)}
                    aria-pressed={isSel}
                    style={{
                      background: isSel ? col : 'transparent',
                      color: isSel ? 'var(--bg)' : col,
                      border: `1px solid ${isSel ? col : col + '55'}`,
                    }}
                  >
                    {block}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={s.field}>
            <div className={s.sLabel}>{fIco('cargas')} Cargas padrão</div>
            <div className={s.defRow}>
              <input
                className={s.defInput}
                style={{ width: 58 }}
                placeholder="Séries"
                value={detail.defaults.sets}
                aria-label="Séries padrão"
                onChange={e =>
                  setDetail(p => ({ ...p, defaults: { ...p.defaults, sets: e.target.value } }))
                }
              />
              <span className={s.defTimes}>×</span>
              {detail.defaultsDistMode ? (
                <>
                  <input
                    className={s.defInput}
                    style={{ width: 76 }}
                    placeholder="Dist."
                    value={detail.defaults.dist}
                    aria-label="Distância padrão"
                    onChange={e =>
                      setDetail(p => ({ ...p, defaults: { ...p.defaults, dist: e.target.value } }))
                    }
                  />
                  <select
                    className={s.defInput}
                    style={{ width: 62 }}
                    value={detail.defaults.distUnit}
                    aria-label="Unidade de distância"
                    onChange={e =>
                      setDetail(p => ({
                        ...p,
                        defaults: { ...p.defaults, distUnit: e.target.value },
                      }))
                    }
                  >
                    <option value="m">m</option>
                    <option value="cal">cal</option>
                  </select>
                </>
              ) : (
                <input
                  className={s.defInput}
                  style={{ width: 76 }}
                  placeholder="Reps"
                  value={detail.defaults.reps}
                  aria-label="Reps padrão"
                  onChange={e =>
                    setDetail(p => ({ ...p, defaults: { ...p.defaults, reps: e.target.value } }))
                  }
                />
              )}
              <button
                type="button"
                className={`${s.distToggle}${detail.defaultsDistMode ? ' ' + s.on : ''}`}
                onClick={() =>
                  setDetail(p => ({
                    ...p,
                    defaultsDistMode: !p.defaultsDistMode,
                    defaults: { ...p.defaults, ...(p.defaultsDistMode ? { dist: '' } : {}) },
                  }))
                }
                aria-label={
                  detail.defaultsDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'
                }
                title={detail.defaultsDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}
              >
                <i className={`ti ${detail.defaultsDistMode ? 'ti-repeat' : 'ti-ruler-2'}`} />
              </button>
            </div>
            <IntensityInput
              value={detail.defaults.intensity}
              onChange={ins =>
                setDetail(p => ({ ...p, defaults: { ...p.defaults, intensity: ins } }))
              }
              defaultReps={detail.defaults.reps}
              defaultSets={detail.defaults.sets}
            />
          </div>

          <div className={s.field}>
            <div className={s.videoHead}>
              <div className={s.sLabel}>{fIco('video')} Vídeo (YouTube)</div>
              <button
                type="button"
                className={`${s.pubToggle}${detail.videoPublished ? ' ' + s.on : ''}`}
                onClick={() => setDetail(p => ({ ...p, videoPublished: !p.videoPublished }))}
                aria-pressed={detail.videoPublished}
                aria-label={
                  detail.videoPublished
                    ? 'Vídeo publicado — clique para ocultar'
                    : 'Vídeo oculto — clique para publicar'
                }
              >
                {detail.videoPublished ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className={s.videoRow}>
              <input
                className={s.videoInput}
                placeholder="https://youtu.be/..."
                value={detail.videoUrl}
                aria-label="URL do vídeo"
                onChange={e => setDetail(p => ({ ...p, videoUrl: e.target.value }))}
              />
              {videoId && (
                <Button
                  variant="secondary"
                  iconOnly
                  onClick={() => setShowVideoModal(true)}
                  aria-label="Pré-visualizar vídeo"
                  title="Pré-visualizar vídeo"
                >
                  <i className="ti ti-player-play" />
                </Button>
              )}
            </div>
          </div>

          <div className={s.field}>
            <div className={s.sLabel}>{fIco('desc')} Descrição</div>
            <textarea
              className={s.taInput}
              rows={2}
              placeholder="Descrição breve do movimento..."
              value={detail.description}
              onChange={e => setDetail(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className={s.field}>
            <div className={s.sLabel}>{fIco('musc')} Músculo(s) alvo</div>
            <input
              className={s.videoInput}
              placeholder="Ex: Quadríceps, glúteos."
              value={detail.muscles}
              onChange={e => setDetail(p => ({ ...p, muscles: e.target.value }))}
            />
          </div>

          <div className={s.fSpan}>
            <div className={s.sLabel}>{fIco('det')} Detalhe</div>
            <textarea
              className={s.taInput}
              rows={2}
              placeholder="Observações, cuidados ou pontos de atenção..."
              value={detail.notes}
              onChange={e => setDetail(p => ({ ...p, notes: e.target.value }))}
            />
          </div>

          {detail.error && <div className={`${s.fSpan} ${s.fieldError}`}>{detail.error}</div>}
        </div>

        <div className={s.detailFoot}>
          <Button variant="primary" full onClick={saveDetail}>
            {detail.isNew ? 'Criar exercício' : 'Salvar'}
          </Button>
          {!detail.isNew && (
            <Button
              variant="destructive"
              iconOnly
              onClick={() => setPendingDelete(detail.origName)}
              aria-label="Remover exercício"
            >
              <i className="ti ti-trash" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ── Video modal ─────────────────────────────────────────────────────────────
  const videoId = detail ? extractYouTubeId(detail.videoUrl) : null
  const VideoModal =
    showVideoModal && videoId ? (
      <div className={s.overlay} onClick={() => setShowVideoModal(false)}>
        <div
          className={s.modal}
          role="dialog"
          aria-modal="true"
          aria-label={detail.name}
          onClick={e => e.stopPropagation()}
        >
          <div className={s.modalHead}>
            <span className={s.modalTitle}>{detail.name}</span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={() => setShowVideoModal(false)}
              aria-label="Fechar"
            >
              <i className="ti ti-x" />
            </Button>
          </div>
          <div className={s.videoBox}>
            <iframe
              className={s.videoFrame}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`}
              allowFullScreen
              allow="autoplay"
            />
          </div>
        </div>
      </div>
    ) : null

  // ── Save-summary modal (#2h) ───────────────────────────────────────────────────
  const KIND = {
    created: { lbl: 'Criado', cls: s.diffCreated },
    changed: { lbl: 'Alterado', cls: s.diffChanged },
    removed: { lbl: 'Removido', cls: s.diffRemoved },
  }
  const SaveModal = saveSummary ? (
    <div className={s.overlay} onClick={() => setSaveSummary(null)}>
      <div
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Resumo do salvamento"
        onClick={e => e.stopPropagation()}
      >
        <div className={s.modalHead}>
          <span className={s.modalTitle}>
            {saveSummary.isNew ? 'Exercício criado' : 'Alterações salvas'}: {saveSummary.name}
          </span>
        </div>
        <div className={s.diffBody}>
          {saveSummary.changes.length === 0 ? (
            <div className={s.diffEmpty}>
              Nenhuma alteração — nada mudou desde o último salvamento.
            </div>
          ) : (
            saveSummary.changes.map((c, i) => (
              <div key={i} className={s.diffRow}>
                <span className={`${s.diffTag} ${KIND[c.kind].cls}`}>{KIND[c.kind].lbl}</span>
                <span className={s.diffField}>{c.label}</span>
                <span className={s.diffVal}>
                  {c.kind === 'changed' ? (
                    <>
                      <span className={s.diffBefore}>{c.before}</span> →{' '}
                      <span className={s.diffAfter}>{c.after}</span>
                    </>
                  ) : c.kind === 'removed' ? (
                    <span className={s.diffBefore}>{c.before}</span>
                  ) : (
                    <span className={s.diffAfter}>{c.after}</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
        <div className={s.diffFoot}>
          <Button variant="primary" full onClick={() => setSaveSummary(null)}>
            OK
          </Button>
        </div>
      </div>
    </div>
  ) : null

  // ── Delete confirm ────────────────────────────────────────────────────────────
  const deleteBlocks = pendingDelete ? blocksOf(pendingDelete) : []
  const DeleteConfirm = (
    <ConfirmReview
      open={!!pendingDelete}
      title="Remover exercício"
      editLabel="Cancelar"
      confirmLabel="Remover"
      onEdit={() => setPendingDelete(null)}
      onClose={() => setPendingDelete(null)}
      onConfirm={confirmDelete}
    >
      <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.5 }}>
        Remover <strong style={{ color: 'var(--cream)' }}>{pendingDelete}</strong> de{' '}
        {deleteBlocks.length} tipo{deleteBlocks.length !== 1 ? 's' : ''}? Vídeo, cargas padrão e
        descrição serão perdidos.
      </div>
    </ConfirmReview>
  )

  // An element, not a component — same shape as VideoModal/SaveModal/DeleteConfirm above.
  // Declared as `const Footer = () => …` and used as `<Footer />` it was a component
  // re-created every render, so React remounted its subtree each time (react-hooks/
  // static-components). Nothing here holds state, but the mobile back button below did.
  const Footer = (
    <div className={s.footer}>
      <span className={s.footerCount}>
        {BLOCK_ORDER.length} tipos · {allEx.length} exercícios
      </span>
    </div>
  )

  // ── Mobile layout (drilldown) ────────────────────────────────────────────────
  if (isMobile) {
    // A render helper called as a function, not a component rendered as <BackBtn/> —
    // see the Footer note above.
    const backBtn = label => (
      <button type="button" className={s.backBtn} onClick={goBack}>
        <i className="ti ti-chevron-left" /> {label}
      </button>
    )
    return (
      <div className={s.mobileWrap}>
        {pane === 0 && renderPane1()}
        {pane === 1 && (
          <div className={s.mobilePane}>
            {backBtn('Categorias')}
            {renderPane2()}
          </div>
        )}
        {pane === 2 && (
          <div className={s.mobilePane}>
            {backBtn(selBlock || 'Todos')}
            {renderPane3()}
          </div>
        )}
        {Footer}
        {VideoModal}
        {SaveModal}
        {DeleteConfirm}
      </div>
    )
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────
  return (
    <div className={s.wrap}>
      <div className={s.col1}>{renderPane1()}</div>
      <div className={s.col2}>{renderPane2()}</div>
      <div className={s.col3}>{renderPane3()}</div>
      {Footer}
      {VideoModal}
      {SaveModal}
      {DeleteConfirm}
    </div>
  )
}
