import { IconPlus, IconMapPin, IconBuildingStore } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import AffiliateRow from './AffiliateRow.jsx'
import AthleteAssignment from './AthleteAssignment.jsx'
import { rateLabel, typeLabel } from './affiliateHelpers.js'
import s from './Afiliados.module.css'

// The Afiliados pane: the list and the selected affiliate's roster (#56/C2).
//
// The list column holds ONLY the list now — the coach profile that used to sit on
// top of it moved to its own "Meu negócio" pane, which is what stops the list from
// starting below the fold on a short window.
//
// CLIENT-FREE.
export default function AffiliatesPane({
  locs = [],
  athletes = [],
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
                <AthleteAssignment loc={l} athletes={athletes} onToggle={onToggleAthlete} />
              </AffiliateRow>
            ))}
      </div>
    )
  }

  // ── desktop: list + roster ────────────────────────────────────────────────
  return (
    <div className={s.paneBody}>
      <div className={s.listPane}>
        <div className={s.listHdr}>
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
            text="Escolha um box ou personal na lista para vincular atletas."
          />
        ) : (
          <>
            <div className={s.detailHdr}>
              <h2 className={s.detailName}>{sel.name}</h2>
              <div className={s.detailSub}>
                {typeLabel(sel.type)} · {rateLabel(sel)}
              </div>
            </div>
            <AthleteAssignment loc={sel} athletes={athletes} onToggle={onToggleAthlete} />
          </>
        )}
      </div>
    </div>
  )
}
