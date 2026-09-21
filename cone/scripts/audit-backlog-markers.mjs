// #151 · Board/plan marker drift audit. Read-only, run any time from cone/:
//   node scripts/audit-backlog-markers.mjs
// → prints a table to stdout. No Supabase client, no .env — reads docs/BACKLOG.md and
// docs/plans/*.md off disk, so it's the only audit-*.mjs that runs offline.
//
// Cross-references three sources per #N: a board row's own leading marker (🟢 Ready / ✅
// shipped / bare), the plan file's `> ✅ Done:` marker (present? which #Ns does it name?),
// and any other board row that already calls the same #N shipped. Reports six shapes — the
// first four match the drift found and hand-corrected in reviews/2026-08-05-full-pass.md:
//   ready-but-shipped · bare-but-shipped · plan-missing-done-marker · partial-marker
// plus two added by #223 (2026-09-20), which close the two gaps the 2026-09-20 review found:
//   must-haves-unverified · now-section-drift
//
// Deliberately permissive — this board is prose, not data. A false negative (missed drift)
// is fine; a false positive would train the next session to ignore the table. See plans/70
// for the parsing notes this file encodes.
import { readFileSync, readdirSync } from 'node:fs'

const PLANS_DIR = 'docs/plans'
const BACKLOG = 'docs/BACKLOG.md'

// #223 · the must-haves gate applies to plans written from here on, NOT retroactively.
// 93 was the highest plan when the gate shipped, so 94 is the first plan expected to carry
// `## Must-haves`. Raising this number silently disarms the gate — don't, unless the
// convention itself is being retired.
const MUST_HAVES_FROM = 94

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
    // What the plan claims to have closed, from three sources UNIONED — a plan that shipped
    // several items names them in different places depending on when it was written:
    //   1. the title's own leading chain (`# 80 — #57 · Design pass C3 …`);
    //   2. the marker's leading chain immediately after `Done:` (`> ✅ Done: #59 · #105 · #106 …`),
    //      which is how the multi-session plans record their full set;
    //   3. a `clos… #N …` clause anywhere in the marker block (plans/45's "Also fully closes #101").
    // ⚠️ Source 2 is deliberately anchored to the START of the marker. plans/68's marker
    // mentions "#147–#151" as review OUTPUT ("5 new rows"), not what it closed — that sits in
    // prose further along and must not be swept in. Anchoring is what keeps it out.
    let doneNums = [...titleNums]
    let markerText = ''
    if (hasDoneMarker) {
      let end = start
      while (
        end < lines.length &&
        /^>/.test(lines[end]) &&
        lines[end].replace(/^>\s?/, '').trim() !== ''
      )
        end++
      const blockText = lines.slice(start, end).join(' ')
      markerText = blockText
      const lead = blockText.match(/^>\s*\*{0,2}✅\*{0,2}\s*\*{0,2}Done:?\*{0,2}\s*(#\d[^—–-]*)/)
      // allNums, not leadingChainNums: the capture is already anchored to the marker's
      // start and bounded by the em dash, and this board separates a chain with ` · `,
      // which CHAIN_RE (built for `+`/`,`) does not accept.
      if (lead) doneNums = [...new Set([...doneNums, ...allNums(lead[1])])]
      const cm = blockText.match(/\b[Cc]los\w*:?\s+((?:\*\*)?#\d+[^.]*)\./)
      if (cm) doneNums = [...new Set([...doneNums, ...allNums(cm[1])])]
    }
    // #223 · the must-haves gate. `hasMustHaves` is the plan declaring what it must be able
    // to demonstrate; `markerEvidences` is the Done marker recording that each one WAS driven.
    // Both are matched permissively (case, hyphen, `##`/`###`) — the point is to catch a plan
    // that skipped the step entirely, not to police spelling.
    const hasMustHaves = lines.some(l => /^#{2,3}\s*Must[- ]?haves?\b/i.test(l))
    const markerEvidences = /Must[- ]?haves?/i.test(markerText)
    plans.set(nn, { file, hasDoneMarker, doneNums, hasMustHaves, markerEvidences })
  }
  return plans
}

// ── board rows ───────────────────────────────────────────────────────────────────
// A row is a top-level `- ` bullet (plans/70's parsing note) — indented continuation lines
// and numbered historical recaps ("13. ✅ …") are deliberately not rows.
//
// Every `## ` column carries rows, and every row is ONE LINE in the documented grammar
// (BACKLOG.md's header; WORKFLOW.md "Board row grammar"). Before 2026-09-05 the Done section
// held multi-paragraph narrative entries whose `- ` lines were prose bullets *inside* an
// already-shipped entry, so scanning it was pure noise and it was excluded.
//
// 🔴 That exclusion is exactly what went wrong. `plan-missing-done-marker` and
// `partial-marker` are fed ONLY by ✅ rows carrying a leading `**[… plans/NN]` bracket, and
// the board drifted into blockquote refill banners during 2026-08 — which are not `- ` rows.
// So this audit printed "Zero drift found" for five weeks while plans/75, 76, 77, 78, 82 and
// 83 (the six most recent shipped plans) carried no Done marker at all. The board stopped
// using the format its own drift detector reads, and the detector went quiet rather than
// complaining. Done is now the PRIMARY feed for both shapes.
//
// Two grammar invariants this depends on, both stated in WORKFLOW.md:
//   · a Done row's leading bracket names the plan that SHIPPED it — never a program or
//     decision doc (plans/16, 22 and 42 legitimately have no marker, and a Done row linking
//     one would make plan-missing-done-marker fire forever);
//   · a row's `closed #…` clause contains no `.` but its terminator (rowClosedClauseNums
//     stops at the first period).
// If a frozen point-in-time section is ever re-added, its `## ` heading must NOT match the
// regex below — that is what the retired "Housekeeping program (ranked …)" section was.
function boardSectionRanges(lines) {
  const starts = []
  lines.forEach((l, i) => {
    if (/^## /.test(l)) starts.push({ line: i, title: l })
  })
  const ranges = []
  for (let i = 0; i < starts.length; i++) {
    if (!/Ready|In Progress|Icebox|Done/.test(starts[i].title)) continue
    // Third element added by #223 so a row can name the column it sits in — the ▶ Now
    // cross-check needs 🟢 Ready and 🔵 In Progress told apart, which rowLeadMarker
    // deliberately does not do (it folds both into one 'ready' class).
    ranges.push([
      starts[i].line,
      starts[i + 1] ? starts[i + 1].line : lines.length,
      starts[i].title,
    ])
  }
  return ranges
}

function rowLeadMarker(line) {
  const rest = line.replace(/^-\s+/, '')
  // 'ready' requires the exact documented marker shape, not just a 🟢 emoji somewhere —
  // "🟢 **[→ folded into #55 · plans/38]**" (a row absorbed into a DIFFERENT item) uses the
  // same emoji for a completely different claim and must not read as a live Ready pointer.
  if (/^🟢\s*\*\*\[→ Ready · plans\/\d+\]/.test(rest)) return 'ready'
  // 🔵 In Progress shares the 'ready' class deliberately: for drift purposes "this row claims
  // to be a live pick while its plan already carries a Done marker" is one shape, so reusing
  // the class covers In Progress with no new finding type and no new reporting code.
  if (/^🔵\s*\*\*\[→ In Progress · plans\/\d+\]/.test(rest)) return 'ready'
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
  const m = line.match(/^-\s+(?:🟢|🔵|✅|⏸)?\s*\*\*\[([^\]]*)\]/)
  if (!m) return null
  const pm = m[1].match(/plans\/(\d+)/)
  return pm ? Number(pm[1]) : null
}

// 'Ready' is tested before 'In Progress' only because neither heading contains the other's
// words; `## 🟢 Ready (planned — pick from the top)` and `## 🔵 In Progress` are disjoint.
function sectionName(title) {
  if (/In Progress/.test(title)) return 'in-progress'
  if (/Ready/.test(title)) return 'ready'
  if (/Icebox/.test(title)) return 'icebox'
  return 'done'
}

function parseRows() {
  const lines = readFileSync(BACKLOG, 'utf8').split(/\r?\n/)
  const ranges = boardSectionRanges(lines)
  const sectionOf = i => {
    const hit = ranges.find(([start, end]) => i >= start && i < end)
    return hit ? sectionName(hit[2]) : null
  }
  const rows = []
  lines.forEach((line, i) => {
    const section = sectionOf(i)
    if (!/^-\s/.test(line) || !section) return
    rows.push({
      lineNo: i + 1,
      text: line,
      section,
      lead: rowLeadMarker(line),
      titleNums: rowTitleNums(line),
      closedNums: rowClosedClauseNums(line),
      planNN: rowPlanLink(line),
    })
  })
  return rows
}

// ── ▶ Now ────────────────────────────────────────────────────────────────────────
// #223. The ▶ Now block is the board's position tracker and was pure prose, which is why
// it could disagree with the columns below it indefinitely and nothing noticed. Two of its
// bullets now carry a FIXED grammar (WORKFLOW.md "▶ Now grammar"):
//
//   - **Ready:** none          |  - **Ready:** #207 · #211
//   - **In Progress:** none    |  - **In Progress:** #207
//
// Those two bullets carry a claim and NOTHING ELSE — no dates, no plan links, no history.
// That restriction is the whole point: the previous wording was "none. plans/91 (#164)
// shipped 2026-09-18; plans/92 (#181) …", where every #N is historical commentary, and no
// parser can tell a claim from a reminiscence inside one bullet. Every other bullet in the
// block stays free-form and is not read here.
function parseNow() {
  const lines = readFileSync(BACKLOG, 'utf8').split(/\r?\n/)
  const start = lines.findIndex(l => /^##\s.*▶\s*Now/.test(l))
  if (start === -1) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i
      break
    }
  }
  const claim = label => {
    const re = new RegExp(`^-\\s+\\*\\*${label}:?\\*\\*`)
    for (let i = start; i < end; i++) {
      if (!re.test(lines[i])) continue
      const rest = lines[i].replace(/^-\s+\*\*[^*]*\*\*:?\s*/, '').trim()
      return { lineNo: i + 1, rest, isNone: /^none\b/i.test(rest), nums: allNums(rest) }
    }
    return null
  }
  return { ready: claim('Ready'), inProgress: claim('In Progress') }
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
      detail: `row leads 🟢/🔵 live → plans/${r.planNN}, but ${plan.file} already has a Done marker`,
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

// must-haves-unverified (#223). The 2026-09-20 review found #113 closed with a fix that did
// not work — the ritual's `/run` step is advice, so it gets skipped, and nothing downstream
// could tell. A plan from MUST_HAVES_FROM on declares what it must be able to demonstrate,
// and its Done marker records that each one was actually driven. Only plans that already
// claim to be shipped are checked: a live plan has not reached the gate yet.
for (const [nn, p] of plans) {
  if (nn < MUST_HAVES_FROM || !p.hasDoneMarker) continue
  if (!p.hasMustHaves) {
    findings.push({
      shape: 'must-haves-unverified',
      line: null,
      detail: `${p.file} carries a Done marker but has no \`## Must-haves\` section (expected from plans/${MUST_HAVES_FROM} on)`,
    })
  } else if (!p.markerEvidences) {
    findings.push({
      shape: 'must-haves-unverified',
      line: null,
      detail: `${p.file} declares must-haves, but its Done marker records no evidence they were driven`,
    })
  }
}

// now-section-drift (#223). ▶ Now is the board's position tracker; until now nothing
// compared it to the columns underneath it, which is the same silence that let the board
// run five weeks on a format its own detector could not read.
const now = parseNow()
for (const [label, claim, section] of [
  ['Ready', now?.ready, 'ready'],
  ['In Progress', now?.inProgress, 'in-progress'],
]) {
  if (!now) break
  if (!claim) {
    findings.push({
      shape: 'now-section-drift',
      line: null,
      detail: `▶ Now has no \`- **${label}:**\` bullet — the grammar requires both`,
    })
    continue
  }
  if (claim.isNone && claim.nums.length) {
    findings.push({
      shape: 'now-section-drift',
      line: claim.lineNo,
      detail: `▶ Now's **${label}:** says "none" and then names #${claim.nums.join(', #')} — a claim bullet carries one or the other, never prose`,
    })
    continue
  }
  const column = new Set()
  for (const r of rows) if (r.section === section) r.titleNums.forEach(n => column.add(n))
  const claimed = new Set(claim.isNone ? [] : claim.nums)
  const missing = [...column].filter(n => !claimed.has(n))
  const extra = [...claimed].filter(n => !column.has(n))
  if (missing.length || extra.length) {
    const parts = []
    if (missing.length) parts.push(`the column has #${missing.join(', #')} which ▶ Now omits`)
    if (extra.length) parts.push(`▶ Now names #${extra.join(', #')} which is not in the column`)
    findings.push({
      shape: 'now-section-drift',
      line: claim.lineNo,
      detail: `▶ Now's **${label}:** disagrees with the ${label} column — ${parts.join('; ')}`,
    })
  }
}

// ── report ───────────────────────────────────────────────────────────────────────
const SHAPES = [
  'ready-but-shipped',
  'bare-but-shipped',
  'plan-missing-done-marker',
  'partial-marker',
  'must-haves-unverified',
  'now-section-drift',
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
