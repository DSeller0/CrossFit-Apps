import { useState, useEffect, useMemo, useRef } from 'react'
import QRCode from 'qrcode'
import {
  loadAthletes,
  loadLocations,
  saveLocations,
  loadCoach,
  saveCoach,
  uid,
} from '../../../utils/storage'
import { useIsMobile } from '../../../hooks/useIsMobile'
import ConfirmReview from '../../../public/shared/ConfirmReview'
import PaneTabs from './PaneTabs.jsx'
import AffiliatesPane from './AffiliatesPane.jsx'
import MeuNegocioPane from './MeuNegocioPane.jsx'
import AffiliateFormModal from './AffiliateFormModal.jsx'
import BoxQrModal from './BoxQrModal.jsx'
import { boxLink } from './affiliateHelpers.js'
import s from './Afiliados.module.css'

const EMPTY_FORM = {
  name: '',
  type: 'box',
  color: '#4ac8c0',
  rate: '',
  rateUnit: 'per_session',
  currency: 'R$',
  coachName: '',
}

// panes[] is deliberately an array of two today — Coaches (#103) and Turmas (#40)
// have no data behind them yet, so each appends a row here rather than a placeholder
// tab shipping now (see PaneTabs.jsx). plans/77/78 extend this same array.
const PANES = [
  { id: 'afiliados', label: 'Afiliados' },
  { id: 'negocio', label: 'Meu negócio' },
]

// Container for the Afiliados tab (#56/C2 · plans/75) — was ServicosTab. Owns all
// storage reads/writes and QR generation; every rendered component is client-free.
//
// `id:'locations'` (tabs.js) and the `locations` blob are UNCHANGED — this is a
// rename + restructure, not a new entity (plans/42 decision 1).
export default function AfiliadosTab() {
  const [locs, setLocs] = useState(loadLocations)
  const [coach, setCoach] = useState(loadCoach)
  const [pane, setPane] = useState('afiliados')
  const [selectedId, setSelectedId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDel, setConfirmDel] = useState(null)
  const [qrLoc, setQrLoc] = useState(null)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  const athletes = useMemo(() => loadAthletes(), [])
  const isMobile = useIsMobile()

  // Coach profile persists on its own debounced effect (many small field writes)
  // rather than from a mutator per field. Skips the mount run so merely opening the
  // tab doesn't re-upsert `coach_profile` (#109) — same disease #76 fixed for
  // `results_v2`, which cost a migration (`0007`) to undo.
  const coachMounted = useRef(false)
  useEffect(() => {
    if (!coachMounted.current) {
      coachMounted.current = true
      return
    }
    const t = setTimeout(() => saveCoach(coach), 500)
    return () => clearTimeout(t)
  }, [coach])

  // `qr` is reset in the `onQr` handler below, not here — setState synchronously in
  // an effect body (rather than inside the async .then) trips react-hooks/set-state-
  // in-effect, and a real click handler is the correct place for it anyway.
  useEffect(() => {
    if (!qrLoc) return
    let cancelled = false
    QRCode.toDataURL(boxLink(qrLoc.id, window.location.origin), { width: 320, margin: 2 })
      .then(url => {
        if (!cancelled) setQr(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [qrLoc])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openNew = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const startEdit = loc => {
    setForm({
      name: loc.name,
      type: loc.type,
      color: loc.color || '#4ac8c0',
      rate: String(loc.rate || ''),
      rateUnit: loc.rateUnit || 'per_session',
      currency: loc.currency || 'R$',
      coachName: loc.coachName || '',
    })
    setEditId(loc.id)
    setFormOpen(true)
  }

  // Locations persist from each mutator directly (not a `useEffect` on `locs`) so
  // that merely opening the tab performs zero writes (#109).
  const saveLoc = () => {
    if (!form.name.trim()) return
    const next = editId
      ? locs.map(l => (l.id === editId ? { ...l, ...form, rate: Number(form.rate) || 0 } : l))
      : [...locs, { ...form, id: uid(), rate: Number(form.rate) || 0, athleteIds: [] }]
    setLocs(next)
    saveLocations(next)
    setFormOpen(false)
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  const deleteLoc = () => {
    const id = confirmDel
    const next = locs.filter(l => l.id !== id)
    setLocs(next)
    saveLocations(next)
    if (selectedId === id) setSelectedId(null)
    if (expandedId === id) setExpandedId(null)
    setConfirmDel(null)
  }

  const toggleAthlete = (locId, athId) => {
    const next = locs.map(l => {
      if (l.id !== locId) return l
      const ids = l.athleteIds || []
      return {
        ...l,
        athleteIds: ids.includes(athId) ? ids.filter(x => x !== athId) : [...ids, athId],
      }
    })
    setLocs(next)
    saveLocations(next)
  }

  const copyLink = () => {
    navigator.clipboard
      ?.writeText(boxLink(qrLoc.id, window.location.origin))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      })
      .catch(() => {})
  }

  const confirmLocName = locs.find(l => l.id === confirmDel)?.name || ''

  return (
    <div className={s.tab}>
      <PaneTabs panes={PANES} active={pane} onChange={setPane} />

      {pane === 'afiliados' ? (
        <AffiliatesPane
          locs={locs}
          athletes={athletes}
          compact={isMobile}
          selectedId={selectedId}
          expandedId={expandedId}
          onSelect={setSelectedId}
          onToggleExpand={id => setExpandedId(e => (e === id ? null : id))}
          onNew={openNew}
          onQr={loc => {
            setQrLoc(loc)
            setQr('')
            setCopied(false)
          }}
          onEdit={startEdit}
          onDelete={loc => setConfirmDel(loc.id)}
          onToggleAthlete={toggleAthlete}
        />
      ) : (
        <MeuNegocioPane coach={coach} setCoach={setCoach} />
      )}

      {/* Conditionally mounted, not always-rendered with `open` — the form's own
          `touched` (validation-gate) state must reset on each new open, the same
          reason the old LocFormModal was `{showForm && <LocFormModal/>}`. */}
      {formOpen && (
        <AffiliateFormModal
          open
          editId={editId}
          form={form}
          setF={setF}
          onSave={saveLoc}
          onClose={() => {
            setFormOpen(false)
            setEditId(null)
          }}
        />
      )}

      <BoxQrModal
        open={!!qrLoc}
        loc={qrLoc}
        qr={qr}
        link={qrLoc ? boxLink(qrLoc.id, window.location.origin) : ''}
        copied={copied}
        onCopy={copyLink}
        onClose={() => setQrLoc(null)}
      />

      <ConfirmReview
        open={!!confirmDel}
        title="Remover afiliado"
        editLabel="Cancelar"
        confirmLabel="Remover"
        onEdit={() => setConfirmDel(null)}
        onClose={() => setConfirmDel(null)}
        onConfirm={deleteLoc}
      >
        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.5 }}>
          Remover <strong style={{ color: 'var(--cream)' }}>{confirmLocName}</strong>? Eventos
          vinculados perdem a referência ao local.
        </div>
      </ConfirmReview>
    </div>
  )
}
