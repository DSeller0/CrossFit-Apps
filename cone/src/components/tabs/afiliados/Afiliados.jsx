import { useState, useEffect, useMemo, useRef } from 'react'
import QRCode from 'qrcode'
import {
  loadAthletes,
  loadLocations,
  saveLocations,
  loadCoach,
  saveCoach,
  loadSettings,
  saveSettings,
  uid,
} from '../../../utils/storage'
import { useIsMobile } from '../../../hooks/useIsMobile'
import ConfirmReview from '../../../public/shared/ConfirmReview'
import AffiliateRail from './AffiliateRail.jsx'
import AffiliatesPane from './AffiliatesPane.jsx'
import MeuPerfilPane from './MeuPerfilPane.jsx'
import FechamentoPane from './FechamentoPane.jsx'
import MinhaSemanaPane from './MinhaSemanaPane.jsx'
import AffiliateFormModal from './AffiliateFormModal.jsx'
import BoxQrModal from './BoxQrModal.jsx'
import { boxLink, monthBounds } from './affiliateHelpers.js'
import { stampFor, advance, setStamp } from './billingState.js'
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

// Container for the Afiliados tab (#56/C2 · plans/75; rail + 3-column "Meus
// afiliados" #161/plans/77, mockup 60) — was ServicosTab. Owns all storage
// reads/writes and QR generation; every rendered component is client-free.
//
// `id:'locations'` (tabs.js) and the `locations` blob are UNCHANGED — this is a
// rename + restructure, not a new entity (plans/42 decision 1). `events` is a NEW
// prop (App.jsx, from `useSync()`) — read-only, the same pattern AtletasTab
// already uses, needed to resolve each affiliate's monthly total.
export default function AfiliadosTab({ events = {} }) {
  const [locs, setLocs] = useState(loadLocations)
  const [coach, setCoach] = useState(loadCoach)
  // The per-box theme picker (#59 C5·b1 step e), moved here from Configurações —
  // same `settings.value.boxThemes` key (#143). Read once like `locs`/`coach`
  // above; written straight from `setBoxTheme` below, never a `useEffect` on this
  // state (CLAUDE.md's "a load/read path never writes" — the same shape `saveLoc`/
  // `toggleAthlete` already use for `locations`).
  const [boxThemes, setBoxThemes] = useState(() => loadSettings().boxThemes || {})
  const [pane, setPane] = useState('afiliados')
  const [selectedId, setSelectedId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [fechAffiliateId, setFechAffiliateId] = useState(null)
  const [fechPeriod, setFechPeriod] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDel, setConfirmDel] = useState(null)
  const [qrLoc, setQrLoc] = useState(null)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  const athletes = useMemo(() => loadAthletes(), [])
  // The affiliates pane's own list/detail/receivable layout collapses at 600px
  // (AffiliatesPane's existing `compact`, unchanged); the RAIL collapses to a
  // horizontal strip separately, at 768px — a 214px rail leaves nothing for the
  // stage below that (Approach 1, plans/77).
  const isMobile = useIsMobile()
  const railCompact = useIsMobile(768)
  const { from, to, label: monthLabel } = monthBounds()

  // panes[] is array-driven so a new panel is one more row — Fechamento and Minha
  // semana (#162/plans/78) are the two more rows plans/77 anticipated, and the
  // mockup's role switch (4 more panels behind "Sou dono do box") is dropped
  // outright: no role model exists to switch on (plans/42; see
  // AffiliateRail.jsx). `count` is live so the rail shows how many affiliates
  // exist without opening the pane.
  const panes = useMemo(
    () => [
      { id: 'afiliados', label: 'Meus afiliados', group: 'Painéis', count: locs.length },
      { id: 'fechamento', label: 'Fechamento', group: 'Painéis' },
      { id: 'semana', label: 'Minha semana', group: 'Painéis' },
      { id: 'perfil', label: 'Meu perfil', group: 'Conta' },
    ],
    [locs.length],
  )

  // Coach profile persists on its own debounced effect (many small field writes)
  // rather than from a mutator per field. Skips the mount run so merely opening the
  // tab doesn't re-upsert `coach_profile` (#109) — same disease #76 fixed for
  // `results_v2`, which cost a migration (`0007`) to undo.
  //
  // `skipCoachEffectRef` (#162/plans/78) covers the one OTHER writer of `coach`:
  // `advanceInvoice` below saves `billing` directly and immediately (a deliberate
  // one-off action, not keystrokes) — but it still calls `setCoach`, which this
  // same effect watches, so without the flag it would schedule a second, redundant
  // save of the identical data 500ms later. Same pull-suppression shape
  // `SyncContext.jsx` uses for its own two auto-save effects.
  const coachMounted = useRef(false)
  const skipCoachEffectRef = useRef(false)
  useEffect(() => {
    if (!coachMounted.current) {
      coachMounted.current = true
      return
    }
    if (skipCoachEffectRef.current) {
      skipCoachEffectRef.current = false
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

  // Writes `settings.value.boxThemes[locId]`, NOT `locations` — same reasoning
  // Configurações' old version recorded: `locations` is anon-locked (0006), so a
  // public page could never read a theme stored there. `...loadSettings()` spread
  // is load-bearing (CLAUDE.md's blind-overwrite trap) — this must not clobber
  // gymName/boxWarnings/theme/etc. An empty value means "inherit the gym default";
  // store nothing rather than an empty string, so resolveTheme's isTheme() guard
  // never has to special-case it.
  const setBoxTheme = (locId, val) => {
    const next = { ...boxThemes }
    if (val) next[locId] = val
    else delete next[locId]
    setBoxThemes(next)
    saveSettings({ ...loadSettings(), boxThemes: next })
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

  const goToAffiliate = locId => {
    setPane('afiliados')
    setSelectedId(locId)
    setExpandedId(locId)
  }

  const goToInvoice = (locId, period) => {
    setPane('fechamento')
    setFechAffiliateId(locId)
    setFechPeriod(period)
  }

  // Billing stamps persist directly from this mutator (not the debounced
  // `coach`-profile effect above) — advancing an invoice is a deliberate,
  // one-off action, not a stream of keystrokes, so it should land immediately
  // the same way `saveLoc`/`toggleAthlete` do (CLAUDE.md's "prefer saving from
  // the mutators that actually change state" — #109's fix shape). `coach` is
  // one state slot shared with the Pix-profile form fields, so `setCoach` here
  // still re-triggers that effect — `skipCoachEffectRef` is what stops it from
  // scheduling a redundant second save of the same data.
  const advanceInvoice = (locId, period, to, computed) => {
    const stamp = stampFor(coach.billing, locId, period)
    const nextBilling = setStamp(coach.billing, locId, period, advance(stamp, to, computed))
    const next = { ...coach, billing: nextBilling }
    skipCoachEffectRef.current = true
    setCoach(next)
    saveCoach(next)
  }

  return (
    <div className={`${s.shell}${railCompact ? ' ' + s.shellCol : ' ' + s.shellRow}`}>
      <AffiliateRail panes={panes} active={pane} onChange={setPane} compact={railCompact} />

      <div className={s.stage}>
        {pane === 'afiliados' ? (
          <AffiliatesPane
            locs={locs}
            athletes={athletes}
            events={events}
            billing={coach.billing}
            from={from}
            to={to}
            monthLabel={monthLabel}
            pixKey={coach.pixKey}
            boxThemes={boxThemes}
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
            onSetTheme={setBoxTheme}
          />
        ) : pane === 'fechamento' ? (
          <FechamentoPane
            locs={locs}
            events={events}
            coach={coach}
            selectedAffiliateId={fechAffiliateId}
            selectedPeriod={fechPeriod}
            onSelect={(id, period) => {
              setFechAffiliateId(id)
              setFechPeriod(period)
            }}
            onAdvance={advanceInvoice}
            compact={isMobile}
          />
        ) : pane === 'semana' ? (
          <MinhaSemanaPane
            locs={locs}
            athletes={athletes}
            events={events}
            onGoToInvoice={goToInvoice}
            compact={isMobile}
          />
        ) : (
          <MeuPerfilPane
            coach={coach}
            setCoach={setCoach}
            locs={locs}
            onSelectAffiliate={goToAffiliate}
            onSelectInvoice={goToInvoice}
          />
        )}
      </div>

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
