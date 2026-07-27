import { IconPencil, IconX, IconPlus } from '@tabler/icons-react'
import { blkColor } from '../lib/wod.js'
import { prBest, prPct, prDelta } from '../lib/goals.js'
import { normExName } from '../lib/registry.js'
import { onKey } from '../schedule/scheduleHelpers.js'
import TallyBar from '../shared/TallyBar.jsx'
import { PR_SKIP, BENCHMARK_CAT, prValLabel } from './meHelpers.js'
import styles from './Me.module.css'

// The PR board (#55 / #87 · plans/38 Phase B). Redesigned from a two-level disclosure
// LIST (block → exercise row → detail row: two taps to see one value) into FAMILY CARDS
// holding a grid of PR TILES, so each best value is glanceable at one tap. Reuses the
// real primitives: blkColor family colors (data — same in every theme), TallyBar
// (10-block, data-color fill), prBest/prPct/prDelta. me.html is a PUBLIC page → square
// corners (only the family dot is a circle), per the design-system rule.
//
// Benchmarks (#87): named WODs live in PR_SKIP (it holds all WOD_TYPES). A benchmark's
// PR is its completion TIME — a different surface from per-movement load/reps — so it
// gets its own gold card below the movement families, read straight off BENCHMARK_CAT.
//
// Icons are @tabler/icons-react, not the `ti` webfont — me.html no longer loads it.
const getName = e => (typeof e === 'string' ? e : e?.name || '')
const getDesc = e => (typeof e === 'object' && e ? e.description || '' : '')

// The best result split into a big mono number + a small unit label, per surface.
function bestParts(pr, bench = false) {
  const best = prBest(pr)
  if (!best) return null
  let unit
  if (pr.type === 'time') unit = 'mm:ss'
  else if (pr.type === 'reps') unit = bench ? 'rounds' : 'reps'
  else if (pr.type === 'dist') unit = pr.unit || 'm'
  else unit = pr.unit || 'kg'
  return { num: best.value, unit }
}

// Arrow follows the VALUE direction (from the label's sign); color follows good/bad.
// So a faster time ("-0:14", better) shows ↓ green, more load ("+5 kg") shows ↑ green.
function Delta({ delta }) {
  if (!delta) return null
  const arrow = delta.label.startsWith('-') ? '↓ ' : delta.label.startsWith('+') ? '↑ ' : ''
  const tone =
    delta.good === true
      ? styles.deltaGood
      : delta.good === false
        ? styles.deltaBad
        : styles.deltaEven
  return (
    <span className={`${styles.delta} ${tone}`}>
      {arrow}
      {delta.label}
    </span>
  )
}

function MovTile({ name, pr, color, bt, onOpen, onClear }) {
  if (!pr) {
    return (
      <div className={`${styles.tile} ${styles.tileNone}`}>
        <span className={styles.tileName}>{name}</span>
        <button
          className={styles.noneBtn}
          style={{ '--fam': color }}
          onClick={() => onOpen(name, bt ? [bt] : [], null)}
        >
          <IconPlus size={12} aria-hidden="true" /> Registrar
        </button>
      </div>
    )
  }
  const parts = bestParts(pr)
  const pct = prPct(pr)
  const delta = prDelta(pr)
  return (
    <div className={`${styles.tile} ${styles.tileHas}`}>
      <div className={styles.tileTop}>
        <span className={styles.tileName}>{name}</span>
        <span className={styles.tileActs}>
          <button
            className={styles.iconBtn}
            aria-label={`Editar PR de ${name}`}
            onClick={() => onOpen(name, pr.categories || [pr.category].filter(Boolean), pr)}
          >
            <IconPencil size={12} aria-hidden="true" />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            aria-label={`Apagar registros de ${name}`}
            onClick={() => onClear(name)}
          >
            <IconX size={12} aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className={styles.tileVal}>
        <span className={styles.tileNum}>{parts?.num ?? '—'}</span>
        {parts && <span className={styles.tileUnit}>{parts.unit}</span>}
      </div>
      {(pct !== null || delta) && (
        <div className={styles.barRow}>
          {pct !== null && (
            <span className={styles.barGrow}>
              <TallyBar pct={pct} color={color} size="sm" grow />
            </span>
          )}
          <Delta delta={delta} />
        </div>
      )}
      {pr.target && <div className={styles.tileMeta}>meta {prValLabel(pr.target, pr)}</div>}
    </div>
  )
}

function BenchTile({ name, desc, pr, color, onOpen, onClear }) {
  const parts = pr ? bestParts(pr, true) : null
  const delta = pr ? prDelta(pr) : null
  return (
    <div className={`${styles.tile} ${styles.benchTile} ${pr ? styles.tileHas : styles.tileNone}`}>
      <div className={styles.benchTop}>
        <span className={styles.benchName}>{name}</span>
        {desc && <span className={styles.benchRx}>{desc}</span>}
        {pr && (
          <span className={styles.tileActs}>
            <button
              className={styles.iconBtn}
              aria-label={`Editar PR de ${name}`}
              onClick={() => onOpen(name, pr.categories || [BENCHMARK_CAT], pr)}
            >
              <IconPencil size={12} aria-hidden="true" />
            </button>
            <button
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              aria-label={`Apagar registros de ${name}`}
              onClick={() => onClear(name)}
            >
              <IconX size={12} aria-hidden="true" />
            </button>
          </span>
        )}
      </div>
      {pr ? (
        <div className={styles.benchBottom}>
          <span className={styles.benchTime}>{parts?.num}</span>
          <span className={styles.benchTimeUnit}>{parts?.unit}</span>
          <Delta delta={delta} />
          {pr.target && <span className={styles.tileMeta}>meta {prValLabel(pr.target, pr)}</span>}
        </div>
      ) : (
        <button
          className={styles.noneBtn}
          style={{ '--fam': color }}
          onClick={() => onOpen(name, [BENCHMARK_CAT], null)}
        >
          <IconPlus size={12} aria-hidden="true" /> Registrar tempo
        </button>
      )}
    </div>
  )
}

// Family / benchmark card: a stone surface with a family-colored left accent, a header
// carrying coverage (TallyBar + N/M), and a body of PR tiles rendered only when open.
function FamCard({
  bt,
  color,
  sub,
  entries,
  isOpen,
  toggle,
  prFor,
  onOpen,
  onClear,
  bench = false,
}) {
  const total = entries.length
  const prCount = entries.filter(e => !!prFor(getName(e))).length
  const pct = total ? Math.round((prCount / total) * 100) : 0

  return (
    <div className={styles.famCard} style={{ '--fam': color }}>
      <div
        className={styles.famHead}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={toggle}
        onKeyDown={onKey(toggle)}
      >
        <span className={styles.famDot} aria-hidden="true" />
        <span className={styles.famName}>{bt}</span>
        {sub && <span className={styles.famSub}>{sub}</span>}
        <span className={styles.famSpacer} />
        <span className={styles.famCov}>
          <span className={styles.famCovBar}>
            <TallyBar pct={pct} color={color} size="sm" grow />
          </span>
          <span
            className={`${styles.famCovNum}${prCount ? ' ' + styles.famCovNumHas : ''}`}
            style={prCount ? { color } : undefined}
          >
            {prCount} / {total}
          </span>
        </span>
        <span className={styles.famChev} aria-hidden="true">
          {isOpen ? '▼' : '▶'}
        </span>
      </div>

      {isOpen && (
        <div className={styles.famBody}>
          <div className={styles.tileGrid}>
            {entries.map(e => {
              const name = getName(e)
              return bench ? (
                <BenchTile
                  key={name}
                  name={name}
                  desc={getDesc(e)}
                  pr={prFor(name)}
                  color={color}
                  onOpen={onOpen}
                  onClear={onClear}
                />
              ) : (
                <MovTile
                  key={name}
                  name={name}
                  pr={prFor(name)}
                  color={color}
                  bt={bt}
                  onOpen={onOpen}
                  onClear={onClear}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PrSection({
  prs,
  registry,
  openBlocks,
  setOpenBlock,
  onOpen,
  onClear,
  query = '',
  onQuery,
}) {
  const q = normExName(query || '')
  const matches = name => !q || normExName(name).includes(q)
  const prFor = name => prs.find(p => (p.name || '').toLowerCase() === name.toLowerCase())

  // Movement families: registry categories that carry per-movement PRs (Força, LPO,
  // Core, Acessórios, Skill, Cardio, Mobilidade). WOD formats + filler are skipped;
  // Benchmark is pulled into its own card below.
  const famBlocks = Object.keys(registry)
    .filter(bt => !PR_SKIP.has(bt) && bt !== BENCHMARK_CAT && (registry[bt] || []).length > 0)
    .map(bt => ({ bt, entries: (registry[bt] || []).filter(e => matches(getName(e))) }))
    .filter(f => f.entries.length)

  const benchEntries = (registry[BENCHMARK_CAT] || []).filter(e => matches(getName(e)))

  const hasAny = Object.keys(registry).some(
    bt => (bt === BENCHMARK_CAT || !PR_SKIP.has(bt)) && (registry[bt] || []).length > 0,
  )
  if (!hasAny) return null

  const nothing = q && !famBlocks.length && !benchEntries.length
  // When searching, matching families reveal their matches; otherwise respect the Set.
  const isOpen = bt => !!q || openBlocks.has(bt)

  return (
    <section className={styles.sh}>
      <div className={styles.shInner}>
        <h2 className={styles.shTitle}>
          PR <span className={styles.shTitleR}>por família de movimento</span>
        </h2>

        {onQuery && (
          <div className={styles.prSearch}>
            <input
              className={styles.prSearchInput}
              type="search"
              value={query}
              onChange={e => onQuery(e.target.value)}
              placeholder="Buscar exercício…"
              aria-label="Buscar exercício por nome"
            />
          </div>
        )}

        {nothing && <div className={styles.emptyLine}>Nenhum exercício encontrado.</div>}

        {famBlocks.map(({ bt, entries }) => (
          <FamCard
            key={bt}
            bt={bt}
            color={blkColor({ type: bt })}
            entries={entries}
            isOpen={isOpen(bt)}
            toggle={() => setOpenBlock(bt)}
            prFor={prFor}
            onOpen={onOpen}
            onClear={onClear}
          />
        ))}

        {benchEntries.length > 0 && (
          <>
            <div className={styles.prSubLabel}>Benchmarks — tempo de conclusão</div>
            <FamCard
              bt="Benchmarks"
              sub="WODs nomeados"
              color={blkColor({ type: BENCHMARK_CAT })}
              entries={benchEntries}
              isOpen={isOpen(BENCHMARK_CAT)}
              toggle={() => setOpenBlock(BENCHMARK_CAT)}
              prFor={prFor}
              onOpen={onOpen}
              onClear={onClear}
              bench
            />
          </>
        )}
      </div>
    </section>
  )
}
