// #151 · Board/plan marker drift audit. Read-only, run any time from cone/:
//   node scripts/audit-backlog-markers.mjs
// → prints a table to stdout. No Supabase client, no .env — reads docs/BACKLOG.md and
// docs/plans/*.md off disk, so it's the only audit-*.mjs that runs offline.
//
// Cross-references three sources per #N: a board row's own leading marker (🟢 Ready / ✅
// shipped / bare), the plan file's `> ✅ Done:` marker (present? which #Ns does it name?),
// and any other board row that already calls the same #N shipped. Reports four shapes,
// matching the drift found and hand-corrected in reviews/2026-08-05-full-pass.md:
//   ready-but-shipped · bare-but-shipped · plan-missing-done-marker · partial-marker
//
// Deliberately permissive — this board is prose, not data. A false negative (missed drift)
// is fine; a false positive would train the next session to ignore the table. See plans/70
// for the parsing notes this file encodes.
import { readFileSync, readdirSync } from 'node:fs'

const PLANS_DIR = 'docs/plans'
const BACKLOG = 'docs/BACKLOG.md'

// ── number extraction ───────────────────────────────────────────────────────────
// `#126–#131` (en dash, the range form the board uses) expands to every number in
// between. Guarded against a runaway match (`b < a`, or a huge span) by falling back to
// just the first number — better an undercount than an infinite-looking table.
function expandRanges(text) {
  return text.replace(/#(\d+)\s*[–-]\s*#?(\d+)\b/g, (_, a, b) => {
    a = Number(a)
    b = Number(b)
    if (!(b > a) || b - a > 50) return `#${a}`
    const out = []
    for (let n = a; n <= b; n++) out.push(`#${n}`)
    return out.join(',')
  })
}

function allNums(text) {
  return [...new Set((expandRanges(text).match(/#\d+/g) || []).map(s => Number(s.slice(1))))]
}

// The board's convention: a title (plan title line, or a row's bold `**#N …**` span) opens
// with a CHAIN of `#N`s joined by `+`/`,` (`#149 + #104(c)`, `#134 + #135 + #136`), then
// prose. Only that leading chain is the item's own identity — a later `#N` mentioned in the
// prose ("#132 The #116 adaptation note appears…") is a cross-reference, not a second
// identity, and must NOT be swept in. This is the one rule that keeps the whole audit from
// drowning in this board's own cross-references.
const CHAIN_ELEMENT = String.raw`#\d+(?:\([a-zA-Z]+\))*(?:\s*[–-]\s*#?\d+)?`
const CHAIN_RE = new RegExp(`^${CHAIN_ELEMENT}(?:\\s*[+,]\\s*${CHAIN_ELEMENT})*`)

function leadingChainNums(text) {
  const idx = text.search(/#\d/)
  if (idx === -1) return []
  const m = text.slice(idx).match(CHAIN_RE)
  return m ? allNums(m[0]) : []
}

// ── plan files ───────────────────────────────────────────────────────────────────
function parsePlans() {
  const plans = new Map() // nn -> { file, hasDoneMarker, doneNums }
  for (const file of readdirSync(PLANS_DIR)) {
    const m = file.match(/^(\d+)-.*\.md$/)
    if (!m) continue
    const nn = Number(m[1])
    const lines = readFileSync(`${PLANS_DIR}/${file}`, 'utf8').split(/\r?\n/)
    const titleNums = leadingChainNums(lines[0] || '')

    // The Done marker is the leading blockquote block, prepended immediately under the
    // title per WORKFLOW.md's plan lifecycle rule. If the first `>` line isn't a Done line,
    // there is no marker — plans/61's real bug was exactly "missing entirely", not misplaced.
    let start = -1
    for (let i = 1; i < lines.length && i < 30; i++) {
      if (/^>/.test(lines[i])) {
        if (lines[i].includes('✅') && /\bDone\b/.test(lines[i])) start = i
        break
      }
      if (lines[i].trim() !== '') break
    }
    const hasDoneMarker = start !== -1
    // Prefer the title's own numbers — plans/68's Done marker mentions "#147–#151" as review
    // OUTPUT ("5 new rows"), not what the plan itself closed, and the title is what's
    // reliable there. Only fall back to scanning the marker block's "Closed #…" clause when
    // the title carries no number at all (plans/61: a prose title, numbers only in the marker).
    let doneNums = titleNums
    if (hasDoneMarker && !doneNums.length) {
      let end = start
      while (
        end < lines.length &&
        /^>/.test(lines[end]) &&
        lines[end].replace(/^>\s?/, '').trim() !== ''
      )
        end++
      const blockText = lines.slice(start, end).join(' ')
      const cm = blockText.match(/\b[Cc]losed:?\s+([^.]*)\./)
      if (cm) doneNums = allNums(cm[1])
    }
    plans.set(nn, { file, hasDoneMarker, doneNums })
  }
  return plans
}

// ── board rows ───────────────────────────────────────────────────────────────────
// A row is a top-level `- ` bullet (plans/70's parsing note) — indented continuation lines
// and numbered historical recaps ("13. ✅ …") are deliberately not rows.
//
// Only two sections carry LIVE rows that a marker check applies to: Ready and Icebox. The
// "Housekeeping program (ranked …)" section is a frozen point-in-time ranking snapshot (its
// own header says "treat every number as stale until re-run") whose item rows are never
// updated after shipping by convention — live status lives in Ready/Icebox instead, and in
// that section's own strikethrough banners. "Done (recent)"'s `- ` lines are prose bullets
// *inside* an already-shipped narrative entry, not board items needing their own marker.
// Scanning either section turns "this plan shipped a while ago" into noise.
function liveSectionRanges(lines) {
  const starts = []
  lines.forEach((l, i) => {
    if (/^## /.test(l)) starts.push({ line: i, title: l })
  })
  const ranges = []
  for (let i = 0; i < starts.length; i++) {
    if (!/Ready|Icebox/.test(starts[i].title)) continue
    ranges.push([starts[i].line, starts[i + 1] ? starts[i + 1].line : lines.length])
  }
  return ranges
}

function rowLeadMarker(line) {
  const rest = line.replace(/^-\s+/, '')
  // 'ready' requires the exact documented marker shape, not just a 🟢 emoji somewhere —
  // "🟢 **[→ folded into #55 · plans/38]**" (a row absorbed into a DIFFERENT item) uses the
  // same emoji for a completely different claim and must not read as a live Ready pointer.
  if (/^🟢\s*\*\*\[→ Ready · plans\/\d+\]/.test(rest)) return 'ready'
  if (rest.startsWith('✅')) return 'shipped'
  if (rest.startsWith('**')) return 'bare'
  return 'other' // ⏸/🔴/⚠️-led rows: a real marker, just not one of the two this audit tracks
}

// The row's own identity: the leading chain inside the FIRST bold span that opens with `#`.
// This skips the marker's own `**[→ Ready · plans/70]**`/`**[shipped … ]**` span (it opens
// with `[`, not `#`) without needing to special-case it.
function rowTitleNums(line) {
  const m = line.match(/\*\*(#\d+[^*]*)\*\*/)
  return m ? leadingChainNums(m[1]) : []
}

// Supplementary: rows like 61·A/B/C name what they closed in prose ("closed #127, #126,
// #130…") rather than in the title. Not leading-chain-restricted — this clause is already a
// narrow, keyword-anchored context, so every #N inside it is fair game.
function rowClosedClauseNums(line) {
  const m = line.match(/\b[Cc]losed:?\s+([^.]*)\./)
  return m ? allNums(m[1]) : []
}

// A plan link only counts inside the row's own LEADING marker bracket
// (`- 🟢/✅ **[… · plans/NN](...)**`) — the real convention for "this row ships via that
// plan". A `[plans/61](...)` link deep in a row's prose (#138's row cites plans/61 as
// context; #151's own row names plans/61 in backticks while describing its historical bug)
// is a cross-reference, not this row's own shipping vehicle, and must not turn an unrelated
// row into a "linking row" for that plan.
function rowPlanLink(line) {
  const m = line.match(/^-\s+(?:🟢|✅)?\s*\*\*\[([^\]]*)\]/)
  if (!m) return null
  const pm = m[1].match(/plans\/(\d+)/)
  return pm ? Number(pm[1]) : null
}

function parseRows() {
  const lines = readFileSync(BACKLOG, 'utf8').split(/\r?\n/)
  const ranges = liveSectionRanges(lines)
  const inLiveSection = i => ranges.some(([start, end]) => i >= start && i < end)
  const rows = []
  lines.forEach((line, i) => {
    if (!/^-\s/.test(line) || !inLiveSection(i)) return
    rows.push({
      lineNo: i + 1,
      text: line,
      lead: rowLeadMarker(line),
      titleNums: rowTitleNums(line),
      closedNums: rowClosedClauseNums(line),
      planNN: rowPlanLink(line),
    })
  })
  return rows
}

// ── cross-reference ─────────────────────────────────────────────────────────────
const plans = parsePlans()
const rows = parseRows()

// boardNums deliberately comes from `closedNums` ONLY, not `titleNums`. A row's title-#N
// just names what THAT row is (e.g. plans/37 closes #58 · #10 · #90 across three separate,
// individually-✅ rows — none of them claiming to be plans/37's exhaustive closure list).
// A "closed #…" clause is different: it's the row explicitly enumerating what the PLAN
// closed (61·A/B/C's "closed #127, #126, #130…"), which is the actual signal partial-marker
// needs — comparing against titleNums as well flags plenty of plans that did nothing wrong.
const boardNumsByPlan = new Map() // nn -> Set<#N>
const linkingRowsByPlan = new Map() // nn -> row[]
for (const r of rows) {
  if (r.planNN == null) continue
  const set = boardNumsByPlan.get(r.planNN) || new Set()
  r.closedNums.forEach(n => set.add(n))
  boardNumsByPlan.set(r.planNN, set)
  const arr = linkingRowsByPlan.get(r.planNN) || []
  arr.push(r)
  linkingRowsByPlan.set(r.planNN, arr)
}

// #N -> the (first) plan that claims to have shipped it, across every plan WITH a marker.
const shippedNums = new Map()
for (const [nn, p] of plans) {
  if (!p.hasDoneMarker) continue
  for (const n of p.doneNums) if (!shippedNums.has(n)) shippedNums.set(n, nn)
}

const findings = []

// ready-but-shipped
for (const r of rows) {
  if (r.lead !== 'ready') continue
  if (r.planNN == null) continue
  const plan = plans.get(r.planNN)
  if (plan?.hasDoneMarker) {
    findings.push({
      shape: 'ready-but-shipped',
      line: r.lineNo,
      detail: `row leads 🟢 Ready → plans/${r.planNN}, but ${plan.file} already has a Done marker`,
    })
  }
}

// bare-but-shipped. Skips a row that already carries a ✅ ANYWHERE in its own text (not just
// as the leading marker) — e.g. #60's row explicitly says "✅ Client leg SHIPPED … What's
// left, and why it's still here": the human already recorded that this plan only PARTIALLY
// closed the item, which is exactly why the row is deliberately still bare. A bare row that
// has never been annotated at all is the real target.
for (const r of rows) {
  if (r.lead !== 'bare' || !r.titleNums.length || r.text.includes('✅')) continue
  const hit = r.titleNums.find(n => shippedNums.has(n))
  if (hit === undefined) continue
  const nn = shippedNums.get(hit)
  findings.push({
    shape: 'bare-but-shipped',
    line: r.lineNo,
    detail: `row carries no marker, but #${hit} is claimed shipped by plans/${nn} (${plans.get(nn).file})`,
  })
}

// plan-missing-done-marker
for (const [nn, p] of plans) {
  if (p.hasDoneMarker) continue
  const linking = linkingRowsByPlan.get(nn) || []
  if (linking.length && linking.every(r => r.lead === 'shipped')) {
    findings.push({
      shape: 'plan-missing-done-marker',
      line: null,
      detail: `${p.file} has no Done marker, but every board row linking plans/${nn} is marked ✅ shipped (line ${linking.map(r => r.lineNo).join(', ')})`,
    })
  }
}

// partial-marker
for (const [nn, p] of plans) {
  if (!p.hasDoneMarker || !p.doneNums.length) continue
  const board = boardNumsByPlan.get(nn)
  if (!board || !board.size) continue
  const done = new Set(p.doneNums)
  const isStrictSubset = [...done].every(n => board.has(n)) && board.size > done.size
  if (isStrictSubset) {
    const missing = [...board].filter(n => !done.has(n))
    findings.push({
      shape: 'partial-marker',
      line: null,
      detail: `${p.file}'s Done marker names {${[...done].sort((a, b) => a - b).join(',')}}, but board rows linking plans/${nn} also claim {${missing.sort((a, b) => a - b).join(',')}}`,
    })
  }
}

// ── report ───────────────────────────────────────────────────────────────────────
const SHAPES = [
  'ready-but-shipped',
  'bare-but-shipped',
  'plan-missing-done-marker',
  'partial-marker',
]
console.log(`\n# Backlog marker audit — ${rows.length} board rows · ${plans.size} plan files\n`)
if (!findings.length) {
  console.log('Zero drift found.\n')
} else {
  for (const shape of SHAPES) {
    const hits = findings.filter(f => f.shape === shape)
    if (!hits.length) continue
    console.log(`## ${shape} (${hits.length})\n`)
    console.log('| line | detail |')
    console.log('|---|---|')
    for (const h of hits) console.log(`| ${h.line ?? '—'} | ${h.detail} |`)
    console.log('')
  }
}
console.log(`${findings.length} total finding(s).\n`)
