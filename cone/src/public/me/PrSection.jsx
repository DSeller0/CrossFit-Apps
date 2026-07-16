import { IconCheck, IconCircle, IconPencil, IconX, IconPlus } from '@tabler/icons-react'
import { blkColor } from '../lib/wod.js'
import { prBest, prPct, prDelta } from '../lib/goals.js'
import { onKey } from '../schedule/scheduleHelpers.js'
import TallyBar from '../shared/TallyBar.jsx'
import { PR_SKIP, prValLabel } from './meHelpers.js'
import styles from './Me.module.css'

// The PR board: registry block → exercise → detail, two levels of disclosure.
//
// NOT on shared/AccordionCard (a deviation from plans/21, flagged at the gallery
// gate): AccordionCard is a *card* shell — border, padding, dot, chevron — while
// these are dense list rows inside an existing card, and the exercise row hosts its
// own action buttons (editar / apagar / adicionar), which AccordionCard has no slot
// for and which cannot legally nest inside its role="button" header. Adopting it
// here would turn the PR list into stacked cards, which is a design decision for the
// Claude Design pass, not a mechanical one. What it *does* take from AccordionCard is
// the interaction contract: role, tabIndex, aria-expanded, and the shared onKey
// Enter/Space handler. Before #52 both levels were click-only <div>s with a text
// caret and no keyboard path at all.
//
// Icons are @tabler/icons-react, not the `ti` webfont — me.html no longer loads it.
export default function PrSection({ prs, registry, openBlock, setOpenBlock, openEx, setOpenEx, onOpen, onClear }) {
  const getName = e => typeof e === 'string' ? e : (e?.name || '')
  const blockOrder = Object.keys(registry).filter(bt => !PR_SKIP.has(bt) && (registry[bt] || []).length > 0)
  if (!blockOrder.length) return null

  return (
    <section className={styles.sh}><div className={styles.shInner}>
      <h2 className={styles.shTitle}>PR <span className={styles.shTitleR}>bloco → exercício → detalhe</span></h2>

      {blockOrder.map(bt => {
        const exercises = (registry[bt] || []).map(getName).filter(Boolean)
        if (!exercises.length) return null

        const color = blkColor({ type: bt })
        const exNamesLow = new Set(exercises.map(n => n.toLowerCase()))
        const btPrs = prs.filter(p =>
          (p.categories || []).includes(bt) || p.category === bt || exNamesLow.has((p.name || '').toLowerCase()))
        const prCount = btPrs.length, total = exercises.length
        const miniPct = total > 0 ? Math.round(prCount / total * 100) : 0
        const isBlockOpen = openBlock === bt
        const toggleBlock = () => setOpenBlock(isBlockOpen ? null : bt)

        return (
          <div key={bt}>
            <div className={`${styles.habBlock}${isBlockOpen ? ' ' + styles.habBlockOpen : ''}`}
              role="button" tabIndex={0} aria-expanded={isBlockOpen}
              onClick={toggleBlock} onKeyDown={onKey(toggleBlock)}>
              <span className={styles.habCaret} aria-hidden="true">{isBlockOpen ? '▼' : '▶'}</span>
              <span className={styles.habName}>{bt}</span>
              <div className={styles.habMini}>
                <TallyBar pct={miniPct} color={color} size="sm" />
              </div>
              <span className={styles.habCount} style={prCount > 0 ? { color } : undefined}>
                {prCount} / {total} PRs
              </span>
            </div>

            <div className={`${styles.habExList}${isBlockOpen ? ' ' + styles.habExListOpen : ''}`}>
              {exercises.map(name => {
                const pr = prs.find(p => (p.name || '').toLowerCase() === name.toLowerCase())
                const hasPr = !!pr
                const exKey = bt + ':' + name
                const isExOpen = openEx === exKey
                const toggleEx = () => { if (hasPr) setOpenEx(isExOpen ? null : exKey) }

                let best = null, pct = null, delta = null
                if (pr) { best = prBest(pr); pct = prPct(pr); delta = prDelta(pr) }
                const deltaTone = delta?.good === true ? styles.toneGood
                  : delta?.good === false ? styles.toneBad
                  : styles.toneEven

                return (
                  <div key={name}>
                    <div className={`${styles.habEx}${isExOpen ? ' ' + styles.habExOpen : ''}`}
                      {...(hasPr ? { role: 'button', tabIndex: 0, 'aria-expanded': isExOpen, onKeyDown: onKey(toggleEx) } : {})}
                      onClick={e => { e.stopPropagation(); toggleEx() }}>
                      <span className={`${styles.habCheck} ${hasPr ? styles.habCheckYes : styles.habCheckNo}`} aria-hidden="true">
                        {hasPr ? <IconCheck size={13} /> : <IconCircle size={13} />}
                      </span>
                      {/* The check/circle icon is the only thing that says whether a PR exists —
                          it needs a text alternative, not just a color and a glyph. */}
                      <span className={styles.srOnly}>{hasPr ? 'Com PR:' : 'Sem PR:'}</span>
                      <span className={`${styles.habExName}${hasPr ? '' : ' ' + styles.habExNameNone}`}>{name}</span>

                      {hasPr ? (
                        <>
                          <button className={styles.habBtnEdit} aria-label={`Editar PR de ${name}`}
                            onClick={e => { e.stopPropagation(); onOpen(name, pr.categories || [pr.category].filter(Boolean), pr) }}>
                            <IconPencil size={12} aria-hidden="true" />
                          </button>
                          <button className={styles.habBtnClear} aria-label={`Apagar registros de ${name}`}
                            onClick={e => { e.stopPropagation(); onClear(name) }}>
                            <IconX size={12} aria-hidden="true" />
                          </button>
                          <span className={styles.habExArr} aria-hidden="true">{isExOpen ? '▼' : '▶'}</span>
                        </>
                      ) : (
                        <button className={styles.habBtnAdd} aria-label={`Registrar PR de ${name}`}
                          onClick={e => { e.stopPropagation(); onOpen(name, bt ? [bt] : [], null) }}>
                          <IconPlus size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {hasPr && (
                      <div className={`${styles.habExDetail}${isExOpen ? ' ' + styles.habExDetailOpen : ''}`}>
                        <div className={styles.habDetailRow}>
                          {pct !== null
                            ? <TallyBar pct={pct} color={color} size="sm" grow />
                            : <div className={styles.habDetailSpacer} />}
                          <span className={styles.habDetailVal}>
                            {best ? prValLabel(best.value, pr) : '—'}
                            {pr.target ? ' / ' + prValLabel(pr.target, pr) : ''}
                          </span>
                          {delta && delta.label !== '=' && (
                            <span className={`${styles.habDetailDelta} ${deltaTone}`}>
                              {delta.good === true ? '↑' : delta.good === false ? '↓' : ''} {delta.label}
                            </span>
                          )}
                        </div>
                        {pct !== null && pr.target && (
                          <div className={styles.habDetailSub}>meta: {prValLabel(pr.target, pr)}</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div></section>
  )
}
