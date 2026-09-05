import { useState } from 'react'
import { loadAthletes, loadSettings, loadLocations, loadCoach } from '../../../utils/storage'
import { buildPixPayload, pixClean } from '../../../utils/pix'
import { MONTH_PT, toISO } from '../../../public/lib/week.js'
import { uid } from '../../../public/lib/wod.js'
import { sessName } from '../../../public/lib/sessions.js'
import { fmtDateNum, fmtDur, calcTotal, sumByCurrency, effectiveRateSource } from './billing.js'
import { qrToBase64 } from './pixQr.js'
import EventFilter from './agenda/EventFilter.jsx'
import { reportFilter, filterEvents, matchingAthleteIds } from './eventFilter.js'
import Modal from '../../ui/Modal.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import Toast from '../../ui/Toast.jsx'
// Aliased `css`, not the usual `s` — this file uses `s` as a local variable name
// for individual session objects (`sessions[date].find(s => …)`), same reason
// exportViews.jsx picked `css` over `s`.
import css from './Publicador.module.css'

// ── EventFormInner — standalone so inputs don't lose focus ───────────────────
export function EventFormInner({ showForm, sessions, athletes, initialData, onSave, onCancel }) {
  const [fd, setFd] = useState(() => ({ ...initialData }))
  const isPers = showForm.type === 'personal'
  const daySessions = sessions[showForm.date] || []
  const locs = loadLocations()
  const boxSvcs = locs.filter(l => l.type === 'box')
  const set = (k, v) => setFd(p => ({ ...p, [k]: v }))
  const toggleAthlete = id =>
    setFd(p => ({
      ...p,
      athleteIds: p.athleteIds?.includes(id)
        ? p.athleteIds.filter(x => x !== id)
        : [...(p.athleteIds || []), id],
    }))
  const selSvc = !isPers && fd.locationId ? locs.find(l => l.id === fd.locationId) : null
  // #104(c) — the personal-location reverse lookup, same shape as the per-athlete one the
  // picker below already does at render time, keyed off whichever athlete is first
  // selected. A personal location's rate is shared by every athlete in its athleteIds[]
  // (CLAUDE.md/plans/71), so the athletes on one event are practically always on the
  // same location — the first one is representative, not a guess.
  const persSvc =
    isPers && (fd.athleteIds || []).length
      ? locs.find(l => l.type === 'personal' && (l.athleteIds || []).includes(fd.athleteIds[0]))
      : null
  // #104(c) — freeze the rate at booking time so a later change in Afiliados can't
  // retroactively re-price an event already booked; `rate: 0`/no service resolves to no
  // snapshot at all, matching calcTotal's own "no rate → no total" behavior (billing.js).
  // A rate change AFTER booking is what #154's `rateHistory` covers (billing.js's
  // `rateAsOf`) — this snapshot still wins over it, unconditionally (calcTotal's
  // precedence), since a quoted price at booking time should never move either way.
  const svc = selSvc || persSvc
  const rateSnapshot = svc?.rate
    ? { rate: svc.rate, rateUnit: svc.rateUnit, currency: svc.currency || 'R$' }
    : null
  const [rec, setRec] = useState({
    enabled: false,
    freq: 'weekly',
    days: [new Date(showForm.date + 'T12:00:00').getDay()],
    until: '',
  })
  const toggleRecDay = i =>
    setRec(r => ({ ...r, days: r.days.includes(i) ? r.days.filter(x => x !== i) : [...r.days, i] }))
  const handleSave = () => {
    const base = { ...fd, ...(rateSnapshot ? { rateSnapshot } : {}) }
    if (!rec.enabled || !rec.until || (rec.freq === 'weekly' && rec.days.length === 0)) {
      onSave([base])
      return
    }
    const results = []
    const until = new Date(rec.until + 'T12:00:00')
    let cur = new Date(showForm.date + 'T12:00:00')
    // Every recurring instance clones `base`, so all N dated events freeze TODAY's rate —
    // even the ones dated months out. Defensible (it's the quoted price at booking time),
    // not a bug; stated here because it would otherwise be easy to mistake for one.
    while (cur <= until) {
      if (rec.freq === 'daily' || rec.days.includes(cur.getDay()))
        results.push({
          ...base,
          id: uid(),
          // `toISO`, not `cur.toISOString().slice(0,10)`. The latter converts to UTC,
          // so east of UTC+12 a midday-local date lands on the PREVIOUS day — the bug
          // class `week.js`'s toISO exists to prevent. Harmless from Brazil today,
          // which is exactly why it would have gone on being harmless until it wasn't.
          date: toISO(cur),
          recurrenceGroup: base.id,
        })
      cur.setDate(cur.getDate() + 1)
    }
    onSave(results.length > 0 ? results : [base])
  }

  return (
    <Modal
      open
      title={`${showForm.eventId ? 'Editar' : 'Novo'} ${isPers ? 'Personal' : 'Aula'}`}
      onClose={onCancel}
      closeOnBackdrop={false}
      size="sm"
      footer={
        <>
          <Button variant="primary" onClick={handleSave}>
            {rec.enabled && rec.until ? 'Criar eventos' : 'Salvar'}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className={css.evfDate}>
        {new Date(showForm.date + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        })}
      </div>

      <Input
        label={isPers ? 'Nome / cliente' : 'Nome da turma'}
        value={fd.label || ''}
        onChange={e => set('label', e.target.value)}
        placeholder={isPers ? 'Ex: Jinx' : 'Ex: Turma Manhã'}
      />

      {!isPers && (
        <Input
          as="select"
          label="Serviço (cobrança)"
          value={fd.locationId || ''}
          onChange={e => set('locationId', e.target.value || null)}
          hint={
            selSvc
              ? `${selSvc.currency || 'R$'} ${selSvc.rate || 0}/${selSvc.rateUnit === 'per_hour' ? 'hora' : 'sessão'}`
              : ''
          }
        >
          <option value="">Sem serviço</option>
          {boxSvcs.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Input>
      )}

      {isPers && (
        <div>
          <span className={css.evfLabel}>Atletas</span>
          <div className={css.evfCheckList}>
            {athletes.map(a => {
              const athSvc = locs.find(
                l => l.type === 'personal' && (l.athleteIds || []).includes(a.id),
              )
              return (
                <label key={a.id} className={css.evfCheckRow}>
                  <input
                    type="checkbox"
                    checked={(fd.athleteIds || []).includes(a.id)}
                    onChange={() => toggleAthlete(a.id)}
                    style={{ accentColor: a.color }}
                  />
                  <span className={css.evfDot} style={{ background: a.color }} />
                  <span style={{ flex: 1 }}>{a.name}</span>
                  {athSvc && (
                    <span
                      className={css.evfSvcHint}
                    >{`${athSvc.currency || 'R$'}${athSvc.rate || 0}`}</span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {isPers && (
        <Input
          as="select"
          label="Local (opcional)"
          value={fd.local || ''}
          onChange={e => set('local', e.target.value)}
        >
          <option value="">—</option>
          {boxSvcs.map(l => (
            <option key={l.id} value={l.name}>
              {l.name}
            </option>
          ))}
          <option value="__outro__">Outro...</option>
        </Input>
      )}

      {isPers && fd.local === '__outro__' && (
        <Input
          label="Especificar local"
          value={fd.localText || ''}
          onChange={e => set('localText', e.target.value)}
          placeholder="Ex: Studio Norte"
        />
      )}

      <div className={css.evfRow2}>
        <Input
          className={css.evfHalf}
          label="Horário"
          type="time"
          value={fd.time || '07:00'}
          onChange={e => set('time', e.target.value)}
        />
        <Input
          className={css.evfHalf}
          label="Duração (min)"
          type="number"
          value={fd.durationMin || 60}
          onChange={e => set('durationMin', Number(e.target.value))}
          min={15}
          max={480}
          step={15}
        />
      </div>

      {!isPers && (
        <div>
          <span className={css.evfLabel}>Atletas presentes (opcional)</span>
          <div className={css.evfCheckList} style={{ maxHeight: 100 }}>
            {athletes.map(a => (
              <label key={a.id} className={css.evfCheckRow}>
                <input
                  type="checkbox"
                  checked={(fd.athleteIds || []).includes(a.id)}
                  onChange={() => toggleAthlete(a.id)}
                  style={{ accentColor: a.color }}
                />
                <span className={css.evfDot} style={{ background: a.color }} />
                {a.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {daySessions.length > 0 && (
        <Input
          as="select"
          label="Sessão vinculada"
          value={fd.sessionId || ''}
          onChange={e => set('sessionId', e.target.value || null)}
        >
          <option value="">Nenhuma</option>
          {daySessions.map(sess => (
            <option key={sess.id} value={sess.id}>
              {sessName(sess, showForm.date)}
            </option>
          ))}
        </Input>
      )}

      <Input
        as="textarea"
        label="Notas (opcional)"
        value={fd.notes || ''}
        onChange={e => set('notes', e.target.value)}
        rows={2}
        placeholder="Observações..."
      />

      {!showForm.eventId && (
        <div className={css.evfRecur}>
          <label className={css.evfRecurToggle}>
            <input
              type="checkbox"
              checked={rec.enabled}
              onChange={e => setRec(r => ({ ...r, enabled: e.target.checked }))}
              style={{ accentColor: 'var(--accent)' }}
            />
            <i className="ti ti-refresh" style={{ fontSize: 13 }} />
            Repetir evento
          </label>
          {rec.enabled && (
            <div className={css.evfRecurBody}>
              <div className={css.evfFreqRow}>
                {['weekly', 'daily'].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRec(r => ({ ...r, freq: f }))}
                    className={`${css.evfPill}${rec.freq === f ? ' ' + css.evfPillOn : ''}`}
                  >
                    {f === 'weekly' ? 'Semanal' : 'Diário'}
                  </button>
                ))}
              </div>
              {rec.freq === 'weekly' && (
                <div className={css.evfDayRow}>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleRecDay(i)}
                      className={`${css.evfDayPill}${rec.days.includes(i) ? ' ' + css.evfPillOn : ''}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
              <Input
                label="Repetir até"
                type="date"
                value={rec.until}
                onChange={e => setRec(r => ({ ...r, until: e.target.value }))}
                min={showForm.date}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── ReportModal ───────────────────────────────────────────────────────────────
export function ReportModal({ events, sessions, onClose }) {
  const locations = loadLocations()
  const coach = loadCoach()
  const gymCfg = loadSettings()
  const now = new Date()
  // #105 — eleven pieces of filter state became one object, shared with Agenda.
  // `reportFilter` preserves this modal's own opening position: this month,
  // completed only.
  const [filter, setFilter] = useState(() => reportFilter(now.getFullYear(), now.getMonth()))
  const period = filter.period
  const useRange = period.mode === 'range'
  const { yr, mo } = period
  const rangeFrom = period.from
  const rangeTo = period.to
  const [showDetails, setShowDetails] = useState(false)
  const [showRate, setShowRate] = useState(true)
  const [showHeader, setShowHeader] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showPix, setShowPix] = useState(false)
  // Replaces the old alert()/prompt() calls (#59 C5·c — zero window.* popups in the
  // publicador family): a PDF failure is shown inline instead of blocking, and a
  // clipboard copy — success or failure — is a Toast, never a blocking prompt asking
  // the coach to select-and-copy a code by hand.
  const [pdfError, setPdfError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [pixFallback, setPixFallback] = useState('')

  function filteredEvents() {
    return filterEvents(events, filter)
  }

  function groupByLocation(evs) {
    const groups = {}
    evs.forEach(ev => {
      if (ev.type === 'personal') {
        // The athlete-level half of the filter, from the same module as the
        // event-level half — this line used to re-implement the predicate
        // (`athAll || athSelected.has(id)`) a second time. Grouping stays here;
        // the rule lives in eventFilter.js. See its header for the boundary.
        const athIds = matchingAthleteIds(ev, filter)
        if (athIds.length === 0) {
          if (!groups['__unlabelled__']) groups['__unlabelled__'] = []
          groups['__unlabelled__'].push(ev)
          return
        }
        athIds.forEach(id => {
          const k = '__ath__' + id
          if (!groups[k]) groups[k] = []
          groups[k].push(ev)
        })
      } else {
        const key = ev.locationId || '__unlabelled__'
        if (!groups[key]) groups[key] = []
        groups[key].push(ev)
      }
    })
    return groups
  }

  // The one `locForCalc` resolution, used by all four calcTotal call sites below — a
  // personal group resolves through the athlete (a personal location's rate is shared by
  // every athlete in its athleteIds[]); anything else already has its own `loc`.
  function resolveLocForCalc(loc, athGroup) {
    return athGroup
      ? locations.find(l => l.type === 'personal' && (l.athleteIds || []).includes(athGroup.id))
      : loc
  }

  // The report-wide grand total: every group's per-currency buckets, flattened and re-summed
  // by sumByCurrency — the same primitive calcTotal itself uses per-event. Called identically
  // by generatePDF's footer and the on-screen preview below, so the two can't independently
  // drift the way the on-screen total once did (#149).
  function grandTotal(evs) {
    const entries = []
    Object.entries(groupByLocation(evs)).forEach(([locId, levs]) => {
      const loc = locations.find(l => l.id === locId)
      const athGroupId = locId.startsWith('__ath__') ? locId.slice(7) : null
      const athGroup = athGroupId ? loadAthletes().find(a => a.id === athGroupId) : null
      const t = calcTotal(levs, resolveLocForCalc(loc, athGroup))
      Object.entries(t.totals).forEach(([currency, total]) => entries.push({ total, currency }))
    })
    return sumByCurrency(entries)
  }

  async function generatePDF() {
    setGenerating(true)
    setPdfError('')
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const evs = filteredEvents()
        const groups = groupByLocation(evs)
        const period = useRange
          ? `${fmtDateNum(rangeFrom)} – ${fmtDateNum(rangeTo)}`
          : MONTH_PT[mo] + ' ' + yr
        const gymName = gymCfg.gymName || 'Cone'
        let y = 15
        if (showHeader) {
          doc.setFontSize(18)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 30, 30)
          doc.text(gymName, 14, y)
          y += 7
          doc.setFontSize(11)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          if (coach.name) {
            doc.text('Coach: ' + coach.name, 14, y)
            y += 5
          }
          if (coach.contact) {
            doc.text(coach.contact, 14, y)
            y += 5
          }
          if (coach.phone) {
            doc.text(coach.phone, 14, y)
            y += 5
          }
          doc.setFontSize(9)
          doc.setTextColor(150, 150, 150)
          doc.text('Gerado em: ' + new Date().toLocaleDateString('pt-BR'), 14, y)
          y += 10
        }
        doc.setFontSize(15)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text('Relatório — ' + period, 14, y)
        y += 8
        const summaryRows = []
        Object.entries(groups).forEach(([locId, levs]) => {
          const loc = locations.find(l => l.id === locId)
          const athGroupId2 = locId.startsWith('__ath__') ? locId.slice(7) : null
          const athGroup2 = athGroupId2 ? loadAthletes().find(a => a.id === athGroupId2) : null
          const name = athGroup2
            ? athGroup2.name
            : loc
              ? loc.name
              : locId === '__unlabelled__'
                ? 'Sem local'
                : locId
          const totalMin = levs.reduce((s, ev) => s + (ev.durationMin || 60), 0)
          const t = calcTotal(levs, resolveLocForCalc(loc, athGroup2))
          summaryRows.push([
            name,
            loc?.type === 'box' ? 'Box' : 'Personal',
            String(levs.length),
            fmtDur(totalMin),
            t.currencies.length ? t.label : '-',
          ])
        })
        // #104(b) — per-currency subtotals, not one grand total: two locations with
        // different `currency` strings used to sum into a single meaningless number
        // (grandCurrency was just whichever group happened to run last). One row per
        // currency actually seen (almost always just one), so a report spanning R$ and, say,
        // US$ locations never prints a total that silently added the two together.
        const { currencies: grandCurrencies, label: grandLabel } = grandTotal(evs)
        autoTable(doc, {
          startY: y,
          head: [['Local', 'Tipo', 'Sessões', 'Tempo Total', 'Valor']],
          body: summaryRows,
          foot: showRate && grandCurrencies.length > 0 ? [['', '', '', 'Total', grandLabel]] : [],
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 25 },
            2: { cellWidth: 22 },
            3: { cellWidth: 28 },
            4: { cellWidth: 35 },
          },
          margin: { left: 14, right: 14 },
        })
        y = doc.lastAutoTable.finalY + 14
        for (const [locId, levs] of Object.entries(groups)) {
          const loc = locations.find(l => l.id === locId)
          const athGroupId2 = locId.startsWith('__ath__') ? locId.slice(7) : null
          const athGroup2 = athGroupId2 ? loadAthletes().find(a => a.id === athGroupId2) : null
          const name = athGroup2
            ? athGroup2.name
            : loc
              ? loc.name
              : locId === '__unlabelled__'
                ? 'Sem local'
                : locId
          if (y > 250) {
            doc.addPage()
            y = 15
          }
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 30, 30)
          doc.text(name + ' — ' + period, 14, y)
          y += 6
          // #104(b)/#149/#154 — computed BEFORE the rows, and the per-event cells below
          // gate on IT (whether a price actually resolves), never on the location's
          // current `loc.rate`. Those two can now diverge: a location zeroed out today
          // still has a real historical rate for a past event via `rateHistory`, and
          // gating on today's (falsy) rate would silently drop the whole Valor column
          // while this same `t` total — and the subtotal line right below the table —
          // still show a real number. Same divergence bug this feature exists to close,
          // just one level down.
          const locForCalc = resolveLocForCalc(loc, athGroup2)
          const t = calcTotal(levs, locForCalc)
          const hasRate = showRate && t.currencies.length > 0
          const rows = levs.map(ev => {
            const daySess = sessions[ev.date] || []
            const linked = ev.sessionId ? daySess.find(sess => sess.id === ev.sessionId) : null
            const blockLabels = linked
              ? (linked.blocks || [])
                  .map(b => (b.label && b.label !== '-' ? b.label : b.type))
                  .join(' · ')
              : ''
            const row = [
              fmtDateNum(ev.date),
              ev.time,
              fmtDur(ev.durationMin || 60),
              ev.label || name,
            ]
            if (showDetails) row.push(blockLabels || '-')
            if (hasRate) {
              const src = effectiveRateSource(ev, locForCalc)
              row.push(src?.rate ? (src.currency || 'R$') + ' ' + src.rate : '-')
            }
            return row
          })
          const head = [['Data', 'Hora', 'Duração', 'Sessão']]
          if (showDetails) head[0].push('Detalhes')
          if (hasRate) head[0].push('Valor')
          autoTable(doc, {
            startY: y,
            head,
            body: rows,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold' },
            margin: { left: 14, right: 14 },
          })
          y = doc.lastAutoTable.finalY + 4
          const totalMin = levs.reduce((s, ev) => s + (ev.durationMin || 60), 0)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(100, 100, 100)
          let sub = `${levs.length} ${levs.length !== 1 ? 'sessões' : 'sessão'} · ${fmtDur(totalMin)}`
          if (hasRate) sub += ` · ${t.label}`
          doc.text(sub, 14, y)
          y += 8
          // Pix needs one amount + one currency — a group whose booked events snapshotted
          // two different currencies (the location's currency changed between them) has no
          // single QR/EMV payload that can represent both, so Pix is skipped for it rather
          // than silently picking one.
          const pixCurrency = t.currencies.length === 1 ? t.currencies[0] : null
          const pixTotal = pixCurrency ? t.totals[pixCurrency] : 0
          if (showPix && coach.pixEnabled && coach.pixKey && pixCurrency && pixTotal > 0) {
            const cap =
              coach.pixTestCap && Number(coach.pixTestCap) > 0 ? Number(coach.pixTestCap) : null
            const payAmount = cap && pixTotal > cap ? cap : pixTotal
            const isCapped = cap && pixTotal > cap
            const prd = useRange
              ? `${fmtDateNum(rangeFrom)}-${fmtDateNum(rangeTo)}`
              : (MONTH_PT[mo].substring(0, 3) + yr).replace(/\s/g, '')
            const desc = `${name} ${prd}`.slice(0, 72)
            const txid = (
              name.replace(/\s/g, '').slice(0, 10) +
              String(mo + 1).padStart(2, '0') +
              yr
            ).slice(0, 25)
            const pixPayload = buildPixPayload({
              pixKey: coach.pixKey,
              merchantName: coach.name || gymName,
              merchantCity: coach.cidade || 'BRASIL',
              amount: payAmount,
              description: desc,
              txid,
            })
            const qrB64 = await qrToBase64(pixPayload, 200)
            if (y > 240) {
              doc.addPage()
              y = 15
            }
            if (qrB64) {
              doc.addImage(qrB64, 'PNG', 14, y, 28, 28)
              doc.setFontSize(9)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(30, 30, 30)
              doc.text('Pagar com Pix', 46, y + 5)
              doc.setFontSize(10)
              doc.setFont('helvetica', 'bold')
              doc.text(
                `${pixCurrency} ${payAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                46,
                y + 11,
              )
              doc.setFontSize(8)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(80, 80, 80)
              doc.text(coach.pixKey, 46, y + 17)
              doc.text(
                pixClean(coach.name || gymName)
                  .slice(0, 25)
                  .toUpperCase(),
                46,
                y + 22,
              )
              if (isCapped) {
                doc.setFontSize(8)
                doc.setTextColor(180, 80, 0)
                doc.text(
                  `⚠ Valor limitado a ${pixCurrency} ${payAmount.toFixed(2)} (modo teste)`,
                  14,
                  y + 31,
                )
                y += 35
              } else {
                y += 33
              }
            }
          }
          y += 6
        }
        const gymSlug = (gymCfg.gymName || 'relatorio')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036F]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        const filename = `${gymSlug}-relatorio-${period.replace(/\s/g, '-').toLowerCase()}.pdf`
        doc.save(filename)
      } catch (err) {
        console.error('PDF error:', err)
        setPdfError('Erro ao gerar PDF: ' + err.message)
      }
    } catch (loadErr) {
      setPdfError('Erro ao carregar bibliotecas PDF: ' + loadErr.message)
    }
    setGenerating(false)
  }

  // On failure, the old `prompt('Copie o código Pix:', payload)` at least handed the coach
  // the real EMV payload to select and copy — a Toast message alone (what this briefly
  // regressed to) would have thrown that fallback away, since the generated PDF never
  // prints the payload as text (only a QR image + the bare Pix key). `pixFallback` keeps
  // the payload on screen, dismissibly, instead of a blocking prompt().
  const copyPix = payload => {
    navigator.clipboard
      ?.writeText(payload)
      .then(() => {
        setPixFallback('')
        setToastMsg('Código Pix copiado!')
      })
      .catch(() => setPixFallback(payload))
  }

  const evs = filteredEvents()
  const groups = groupByLocation(evs)

  return (
    <Modal open title="Gerar Relatório" onClose={onClose} closeOnBackdrop={false} size="lg">
      {/* #105 — the ONE filter. Four hand-rolled sections (period · tipo · status ·
          afiliados · atletas, ~395 lines) collapse into the shared component in its
          column layout, which is a superset of what was here: `status` gains the
          scheduled-only value this modal never had, and the "só personal" rule that
          was buried in `filteredEvents` is now visible on screen. */}
      <EventFilter
        value={filter}
        onChange={setFilter}
        axes={['period', 'type', 'status', 'affiliate', 'athlete']}
        layout="column"
        locs={locations}
        athletes={loadAthletes()}
      />

      <div className={css.optionsBox}>
        <div className={css.optionsHdr}>Opções</div>
        <label className={css.optionRow}>
          <input type="checkbox" checked={showDetails} onChange={() => setShowDetails(v => !v)} />
          Mostrar detalhes da sessão (blocos/exercícios)
        </label>
        <label className={css.optionRow}>
          <input type="checkbox" checked={showRate} onChange={() => setShowRate(v => !v)} />
          Incluir valor por sessão
        </label>
        <label className={css.optionRow}>
          <input type="checkbox" checked={showHeader} onChange={() => setShowHeader(v => !v)} />
          Incluir cabeçalho (coach, academia, data)
        </label>
        {coach.pixEnabled && coach.pixKey && showRate && (
          <label className={css.optionRow}>
            <input type="checkbox" checked={showPix} onChange={() => setShowPix(v => !v)} />
            Incluir QR code Pix (por local)
          </label>
        )}
      </div>

      {evs.length > 0 && (
        <div className={css.previewBox}>
          <div className={css.previewHdr}>Pré-visualização</div>
          {Object.entries(groups).map(([locId, levs]) => {
            const loc = locations.find(l => l.id === locId)
            const athGroupId = locId.startsWith('__ath__') ? locId.slice(7) : null
            const athGroup = athGroupId ? loadAthletes().find(a => a.id === athGroupId) : null
            const name = athGroup
              ? athGroup.name
              : loc
                ? loc.name
                : locId === '__unlabelled__'
                  ? 'Sem local'
                  : locId
            const t = calcTotal(levs, resolveLocForCalc(loc, athGroup))
            const totalMin = levs.reduce((sum, ev) => sum + (ev.durationMin || 60), 0)
            // Pix needs one amount + one currency — see the same guard in generatePDF.
            const previewCurrency = t.currencies.length === 1 ? t.currencies[0] : null
            const previewTotal = previewCurrency ? t.totals[previewCurrency] : 0
            const previewCap =
              coach.pixTestCap && Number(coach.pixTestCap) > 0 ? Number(coach.pixTestCap) : null
            const previewAmt = previewCap && previewTotal > previewCap ? previewCap : previewTotal
            const previewPayload =
              showPix && coach.pixEnabled && coach.pixKey && previewCurrency && previewTotal > 0
                ? buildPixPayload({
                    pixKey: coach.pixKey,
                    merchantName: coach.name || gymCfg.gymName || 'COACH',
                    merchantCity: coach.cidade || 'BRASIL',
                    amount: previewAmt,
                    description: name.slice(0, 72),
                    txid: name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'CONE',
                  })
                : null
            return (
              <div key={locId} className={css.previewRow}>
                <span className={css.previewName}>{name}</span>
                <span className={css.previewMeta}>
                  {levs.length + (levs.length !== 1 ? ' sessões' : ' sessão')}
                </span>
                <span className={css.previewMeta}>{fmtDur(totalMin)}</span>
                {t.currencies.length && showRate ? (
                  <span className={css.previewValue}>{t.label}</span>
                ) : null}
                {previewPayload && (
                  <button
                    type="button"
                    title="Copiar código Pix"
                    className={css.previewPixBtn}
                    onClick={() => copyPix(previewPayload)}
                  >
                    <i className="ti ti-copy" style={{ fontSize: 10 }} />
                    Pix
                  </button>
                )}
              </div>
            )
          })}
          {showRate && (
            // #149 — this used to be its own naive `acc += t.total` sum with no currency
            // key or label, so a two-currency report showed a correct per-currency footer
            // in the generated PDF and a meaningless combined number right above it in
            // this same preview. `grandTotal` is the exact function generatePDF's footer
            // calls, so the two can no longer independently drift.
            <div className={css.previewTotal}>Total: {grandTotal(evs).label || '0'}</div>
          )}
        </div>
      )}

      {evs.length === 0 && (
        <div className={css.reportEmpty}>
          Nenhum evento encontrado para os filtros selecionados.
        </div>
      )}

      {pdfError && <div className={css.reportError}>{pdfError}</div>}

      {pixFallback && (
        <div className={css.pixFallback}>
          <span className={css.pixFallbackLabel}>
            Não foi possível copiar automaticamente — selecione e copie:
          </span>
          <input
            readOnly
            value={pixFallback}
            onFocus={e => e.target.select()}
            className={css.pixFallbackInput}
            aria-label="Código Pix para copiar manualmente"
          />
          <button
            type="button"
            className={css.pixFallbackClose}
            onClick={() => setPixFallback('')}
            aria-label="Fechar"
          >
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      <Button
        variant="primary"
        full
        disabled={evs.length === 0 || generating}
        onClick={generatePDF}
      >
        <i className={generating ? 'ti ti-loader' : 'ti ti-file-download'} />
        {generating ? 'Gerando PDF...' : 'Gerar PDF'}
      </Button>

      <Toast open={!!toastMsg} message={toastMsg} onDismiss={() => setToastMsg('')} />
    </Modal>
  )
}
