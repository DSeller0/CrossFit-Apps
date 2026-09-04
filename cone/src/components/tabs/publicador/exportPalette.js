// Export colour model (#59 · C5·b1 · plans/82).
//
// Measured 2026-09-04: 29 of the 37 export colour defaults were an EXACT totk-dark
// token, hand-copied (#4ac8c0=--accent ×10, #c8b090=--sub ×7, #d8a840=--gold ×5,
// #0d0b09=--bg ×3, #554a3a=--dim ×2, ...); the 466-line ~40-key colour drawer this
// module replaces was ~94% a frozen totk-dark palette, not a real per-artefact
// theming feature. This collapses it to 8 roles, resolved through the SAME
// resolveTheme() every public page uses — plus a per-box preset and a device-local
// "Personalizado" override.
//
// ⚠️ Pure and client-free (no Supabase import, direct or transitive — same rule as
// public/lib/theme.js and boxScope.js) so it renders in the gallery unmodified.
//
// ⚠️ Every value here is LITERAL HEX, never `var(--…)`. A rasterised export must not
// depend on live custom-property resolution inside html2canvas's cloned document —
// confirmed safe by a standalone spike (html2canvas DOES resolve `var()` correctly
// against literal-hex custom properties), but resolving to hex up front removes the
// risk entirely rather than merely mitigating it, and it's what lets the four export
// gates (`npm run build:all` included) render an export with zero live DOM.
import { THEMES, DEFAULT_THEME, isTheme, resolveTheme } from '../../../public/lib/theme.js'

// role → the app token it replaces. This IS the 40-key drawer, collapsed: every
// consumer that used to read one of ~15 different `useState` colours for "the accent
// on this artefact" now reads one of these 8 roles instead.
export const EXPORT_ROLES = [
  { role: '--a-bg', token: '--bg', label: 'Fundo' },
  { role: '--a-div', token: '--divider', label: 'Divisor' },
  { role: '--a-hdr', token: '--accent', label: 'Cabeçalho / destaque' },
  { role: '--a-name', token: '--sub', label: 'Nome do exercício' },
  { role: '--a-int', token: '--gold', label: 'Intensidade / carga' },
  { role: '--a-note', token: '--dim', label: 'Observação' },
  { role: '--a-sub', token: '--muted', label: 'Subtítulo / data' },
  { role: '--a-on-accent', token: '--accent-text', label: 'Texto sobre o destaque' },
]

// Literal per-theme hex for the 8 tokens EXPORT_ROLES draws from. Hand-transcribed
// from themes.css (not imported — this module stays pure/client-free and themes.css
// isn't a JS module); re-verify against themes.css if a theme's palette changes.
const THEME_TOKENS = {
  'totk-dark': {
    '--bg': '#0d0b09',
    '--divider': '#2a231c',
    '--accent': '#4ac8c0',
    '--sub': '#c8b090',
    '--gold': '#d8a840',
    '--dim': '#554a3a',
    '--muted': '#806850',
    '--accent-text': '#000000',
  },
  'totk-light': {
    '--bg': '#ede8dc',
    '--divider': '#d4cab8',
    '--accent': '#1c6860',
    '--sub': '#503828',
    '--gold': '#9a6c14',
    '--dim': '#a89070',
    '--muted': '#7a6448',
    '--accent-text': '#ffffff',
  },
  'spirit-blossom': {
    '--bg': '#09070f',
    '--divider': '#221638',
    '--accent': '#38c4d0',
    '--sub': '#c4a0d0',
    '--gold': '#e05490',
    '--dim': '#4a2d60',
    '--muted': '#7d5090',
    '--accent-text': '#09070f',
  },
  'spirit-blossom-light': {
    '--bg': '#f4eefb',
    '--divider': '#e2d4f0',
    '--accent': '#0f727e',
    '--sub': '#4a2460',
    '--gold': '#c83070',
    '--dim': '#9070b0',
    '--muted': '#7840a0',
    '--accent-text': '#ffffff',
  },
}

// Confirms THEME_TOKENS covers every theme.js knows about, at import time rather
// than as a silent gap — a theme #43 adds without a matching row here would
// otherwise resolve every export to whatever DEFAULT_THEME happens to be.
THEMES.forEach(t => {
  if (!THEME_TOKENS[t.id]) throw new Error(`exportPalette.js: no THEME_TOKENS row for "${t.id}"`)
})

// The middle precedence tier: settings.boxThemes[box] → the coach's own app theme.
// Deliberately NOT resolveTheme({settings, box}) — that ranks the visitor's own
// device-local SPA pick above the box default, which is right for a public-page
// visitor but wrong here: the coach picked "this box" as the export's Origem, so the
// box preset must outrank whatever theme they personally browse the SPA in. The
// visitor-pick tier only re-enters via the fallback call, exactly as plans/82's
// colour contract specifies ("→ resolveTheme({settings})", no box argument).
export function resolveExportThemeId({ settings = {}, box = null } = {}) {
  const boxTheme = box && settings.boxThemes ? settings.boxThemes[box] : null
  if (isTheme(boxTheme)) return boxTheme
  return resolveTheme({ settings })
}

// The literal 8-role palette for one resolved theme id, with `custom` (the device-
// local "Personalizado" overrides, `cone_export_custom`) applied on top role by role.
// An unknown/retired theme id falls through to DEFAULT_THEME rather than being
// applied — the same rule resolveTheme itself documents, for the same reason: a
// `theme-<garbage>` id must never silently paint an export in nothing.
export function resolveExportPalette({ themeId, custom } = {}) {
  const id = isTheme(themeId) ? themeId : DEFAULT_THEME
  const tokens = THEME_TOKENS[id]
  const palette = {}
  for (const { role, token } of EXPORT_ROLES) {
    palette[role] = (custom && custom[role]) || tokens[token]
  }
  return palette
}

// ── Legacy migration ──────────────────────────────────────────────────────────
// The ~40 legacy dv*/wk*/ea*/mm* keys stop being written (this pass) and are never
// deleted (plans/82 acceptance) — a coach who set them keeps that data. This is the
// one-time "Importar cores antigas para Personalizado" offer's pure half: which
// legacy key feeds which role, and whether any of them actually differs from the
// totk-dark default (the offer is pointless noise for a profile that never touched
// the drawer). The UI trigger and the ConfirmReview-style prompt are step d's.
const LEGACY_ROLE_KEYS = {
  '--a-bg': ['dvBg', 'wkBg', 'eaglesBg', 'megaManBg'],
  '--a-div': ['dvDivider', 'wkDivider'],
  '--a-hdr': ['dvDate', 'dvZoneType', 'dvBlockLabel', 'wkHeader', 'eaBlockType', 'mmBlockType'],
  '--a-name': [
    'dvExName',
    'dvGymName',
    'wkExName',
    'eaGymName',
    'eaExName',
    'mmGymName',
    'mmExName',
  ],
  '--a-int': ['dvCap', 'dvRounds', 'dvIntensity', 'eaIntensity', 'mmIntensity'],
  '--a-note': ['dvNote', 'dvBlockNotes'],
  '--a-sub': ['dvMainTraining', 'wkDateNum', 'wkMainTraining', 'eaSubtitle', 'mmSubtitle'],
  '--a-on-accent': ['mmBlockMetaText'],
}

// One legacy key per role — the FIRST value present wins, matching how the drawer's
// own sections listed them (daily's dvDate before semanal's wkHeader, etc).
export function legacyColorsToCustom(legacy = {}) {
  const custom = {}
  for (const { role } of EXPORT_ROLES) {
    for (const key of LEGACY_ROLE_KEYS[role] || []) {
      if (legacy[key]) {
        custom[role] = legacy[key]
        break
      }
    }
  }
  return custom
}

// True when the profile's legacy colours diverge from totk-dark anywhere — the
// condition that makes the one-time import offer worth showing at all.
export function hasNonDefaultLegacyColors(legacy = {}) {
  const totkDark = THEME_TOKENS['totk-dark']
  const custom = legacyColorsToCustom(legacy)
  return EXPORT_ROLES.some(({ role, token }) => custom[role] && custom[role] !== totkDark[token])
}
