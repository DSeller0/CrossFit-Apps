import {
  IconPlus,
  IconMapPin,
  IconBuildingStore,
  IconPencil,
  IconQrcode,
} from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import AffiliateRow from './AffiliateRow.jsx'
import AthleteAssignment from './AthleteAssignment.jsx'
import DirectionPair from './DirectionPair.jsx'
import AffiliateSessions from './AffiliateSessions.jsx'
import ReceivableRail from './ReceivableRail.jsx'
import { rateLabel, typeLabel, eventsForAffiliate } from './affiliateHelpers.js'
import s from './Afiliados.module.css'

// "Meus afiliados" (#56/C2; three columns + the two-direction pair #161/plans/77,
// mockup 60): the list ("Onde eu trabalho") · the selected affiliate's detail
// (money in both directions, this month's sessions, the roster, the QR) · "A
// receber" across every affiliate.
//
// The list column holds ONLY the list — the coach profile that used to sit on top
// of it moved to its own pane back in C2, which is what stops the list from
// starting below the fold on a short window.
//
// `events` is the raw blob; `eventsForAffiliate` resolves the selected affiliate's
// own slice for the detail column, `ReceivableRail` resolves all of them itself
// (it takes `events`/`from`/`to` directly — see its own file).
//
// CLIENT-FREE.
export default function AffiliatesPane({
  locs = [],
  athletes = [],
  events = {},
  from,
  to,
  monthLabel = '',
  pixKey = '',
  selectedId = null,
  expandedId = null,
  compact = false,
  onSelect,
  onToggleExpand,
  onNew,
  onQr,
  onEdit,
  onDelete,
  onToggleAthlete,
}) {
  const sel = locs.find(l => l.id === selectedId) || null

  const emptyList = (
    <EmptyState
      icon={<IconBuildingStore />}
      title="Nenhum afiliado ainda"
      text="Um afiliado é um box ou um serviço de personal — é onde a taxa e a lista de atletas ficam."
      action={
        <Button variant="primary" size="sm" onClick={onNew}>
          <IconPlus /> Novo afiliado
        </Button>
      }
    />
  )

  // ── mobile: one accordion column ──────────────────────────────────────────
  if (compact) {
    return (
      <div className={s.mobileWrap}>
        <div className={s.mobileHdr}>
          <h2 className={s.listTitle}>Afiliados</h2>
          <Button variant="primary" size="xs" onClick={onNew}>
            <IconPlus /> Novo
          </Button>
        </div>
        {locs.length === 0
          ? emptyList
          : locs.map(l => (
              <AffiliateRow
                key={l.id}
                loc={l}
                variant="card"
                expanded={expandedId === l.id}
                onToggle={() => onToggleExpand?.(l.id)}
                onQr={onQr}
                onEdit={onEdit}
                onDelete={onDelete}
              >
                <div className={s.mobileDetailStack}>
                  <DirectionPair
                    loc={l}
                    events={eventsForAffiliate(events, l, from, to)}
                    pixKey={pixKey}
                    monthLabel={monthLabel}
                  />
                  <AffiliateSessions
                    loc={l}
                    events={eventsForAffiliate(events, l, from, to)}
                    monthLabel={monthLabel}
                  />
                  <AthleteAssignment loc={l} athletes={athletes} onToggle={onToggleAthlete} />
                </div>
              </AffiliateRow>
            ))}
      </div>
    )
  }

  // ── desktop: list + detail + receivable ─────────────────────────────────────
  return (
    <div className={s.paneBody}>
      <div className={s.listPane}>
        <div className={s.listHdr}>
          <h2 className={s.listTitle}>Onde eu trabalho</h2>
          <Button variant="primary" size="xs" onClick={onNew}>
            <IconPlus /> Novo
          </Button>
        </div>
        {locs.length === 0
          ? emptyList
          : locs.map(l => (
              <AffiliateRow
                key={l.id}
                loc={l}
                selected={selectedId === l.id}
                onSelect={() => onSelect?.(selectedId === l.id ? null : l.id)}
                onQr={onQr}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
      </div>

      <div className={s.detailPane}>
        {!sel ? (
          <EmptyState
            pane
            icon={<IconMapPin />}
            title="Selecione um afiliado"
            text="Escolha um box ou personal na lista para ver o que ele paga, o que você cobra e quem está vinculado."
          />
        ) : (
          <>
            <div className={s.detailHdr}>
              <div className={s.detailHdrTop}>
                <div>
                  <h2 className={s.detailName}>{sel.name}</h2>
                  <div className={s.detailSub}>
                    {typeLabel(sel.type)} · {rateLabel(sel)}
                  </div>
                </div>
                <div className={s.detailActions}>
                  {sel.type === 'box' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      iconOnly
                      aria-label={`QR e link público de ${sel.name}`}
                      onClick={() => onQr?.(sel)}
                    >
                      <IconQrcode />
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    iconOnly
                    aria-label={`Editar ${sel.name}`}
                    onClick={() => onEdit?.(sel)}
                  >
                    <IconPencil />
                  </Button>
                </div>
              </div>
            </div>

            <DirectionPair
              loc={sel}
              events={eventsForAffiliate(events, sel, from, to)}
              pixKey={pixKey}
              monthLabel={monthLabel}
            />

            <div className={s.detailSection}>
              <AffiliateSessions
                loc={sel}
                events={eventsForAffiliate(events, sel, from, to)}
                monthLabel={monthLabel}
              />
            </div>

            <div className={s.detailSection}>
              <AthleteAssignment loc={sel} athletes={athletes} onToggle={onToggleAthlete} />
            </div>
          </>
        )}
      </div>

      <ReceivableRail
        locs={locs}
        events={events}
        from={from}
        to={to}
        monthLabel={monthLabel}
        selectedId={selectedId}
        onSelect={id => onSelect?.(id)}
      />
    </div>
  )
}
