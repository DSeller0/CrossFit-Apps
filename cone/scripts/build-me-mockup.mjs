#!/usr/bin/env node
/**
 * Build the plans/21 me.html layout mockup card.
 *
 *   node scripts/build-me-mockup.mjs
 *
 * One-off Lane-A ideation, not part of `npm run design:cards` — the cards are a
 * permanent projection of the gallery; this is a throwaway argument about layout that
 * gets archived once a layout is approved. It reuses the same SSR machinery so the
 * mockup is made of the REAL components: only the layout around them is invented.
 */
import { build } from 'vite'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONE  = resolve(__dirname, '..')
const REPO  = resolve(CONE, '..')
const BUILD = resolve(CONE, '.design-build-mockup')
const OUT   = resolve(CONE, 'design/mockups/23-me-layout.html')

const FONTS = [
  ['Cinzel', 400, '@fontsource/cinzel/files/cinzel-latin-400-normal.woff2'],
  ['Cinzel', 600, '@fontsource/cinzel/files/cinzel-latin-600-normal.woff2'],
  ['Cinzel', 700, '@fontsource/cinzel/files/cinzel-latin-700-normal.woff2'],
  ['Cinzel', 800, '@fontsource/cinzel/files/cinzel-latin-800-normal.woff2'],
  ['Cinzel', 900, '@fontsource/cinzel/files/cinzel-latin-900-normal.woff2'],
  ['Crimson Pro', 400, '@fontsource/crimson-pro/files/crimson-pro-latin-400-normal.woff2'],
  ['Amarante', 400, '@fontsource/amarante/files/amarante-latin-400-normal.woff2'],
]

function fontFaces() {
  let css = ''
  for (const [family, weight, rel] of FONTS) {
    const f = resolve(CONE, 'node_modules', rel)
    if (!existsSync(f)) { console.warn(`  ! font missing: ${rel}`); continue }
    css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;`
        +  `src:url(data:font/woff2;base64,${readFileSync(f).toString('base64')}) format('woff2')}\n`
  }
  return css
}

// The reset every public page inlines — without it the columns render content-box and
// 40%+padding overflows the pane, which is not what the real page does. See
// build-design-cards.mjs's PAGE_RESET.
const PAGE_RESET = '*{box-sizing:border-box;margin:0;padding:0}'

const MOCKUP_CSS = `
  body{background:var(--bg);color:var(--text);font-family:var(--font)}
  .mkBar{padding:16px 22px;border-bottom:1px solid var(--divider);background:var(--stone);
    display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:flex-start}
  .mkBar h1{font-size:15px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 8px;color:var(--cream)}
  .mkNote{font-family:var(--font-body);font-size:13px;line-height:1.65;color:var(--sub);margin:0;max-width:900px}
  .mkNote b{color:var(--cream)} .mkNote code{font-size:12px;color:var(--muted)}
  .mkBar label{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.1em;
    text-transform:uppercase;color:var(--sub);white-space:nowrap}
  .mkBar select{background:var(--stone2);color:var(--cream);border:1px solid var(--divider);
    font-family:inherit;font-size:12px;padding:5px 8px}
  .mkWrap{padding:22px}
  .mkH2{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);
    margin:30px 0 4px;padding-bottom:6px;border-bottom:1px solid var(--divider)}
  .mkH2:first-child{margin-top:0}
  .mkSub{font-family:var(--font-body);font-style:italic;font-size:12px;color:var(--muted);margin:0 0 14px}
  .mkLbl{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin:16px 0 6px}
  .mkLbl b{color:var(--teal)}

  /* Desktop frame — the real Me.module.css numbers: 220 nav + 272 picker + 788 pane. */
  .mkDesk{width:1280px;display:flex;align-items:stretch;background:var(--stone);
    border:1px solid var(--divider);overflow:hidden}
  .mkRail{flex-shrink:0;display:flex;align-items:flex-start;justify-content:center;padding-top:14px;
    font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);text-align:center;
    background:var(--bg);border-right:1px solid var(--divider)}
  .mkRailNav{width:220px} .mkRailPick{width:272px}
  .mkProf{flex:1;min-width:0;background:var(--bg)}
  .mkGrid{display:flex;align-items:flex-start}
  .mkColMain{min-width:0;padding:20px 24px}
  .mkColPrs{min-width:0;padding:20px 24px;border-left:1px solid var(--divider)}
  .mkGridCur  .mkColMain{flex:0 0 40%} .mkGridCur  .mkColPrs{flex:0 0 60%}
  .mkGridProp .mkColMain{flex:0 0 60%} .mkGridProp .mkColPrs{flex:0 0 40%}

  .mkPhone{width:390px;background:var(--bg)}
  .mkPhone .mkColMain{padding:0}

  .mkRow{display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap}
  .mkScroll{overflow-x:auto;padding-bottom:6px}
  .mkFrame{border:1px solid var(--divider);background:var(--bg)}
  .mkFrame iframe{display:block;border:0;width:390px}

  /* Mockup annotation — NOT a proposal to ship a placeholder (plans/21 §5). */
  .mkSlot{border:1px dashed var(--gold);background:color-mix(in srgb, var(--gold) 7%, transparent);
    padding:16px;margin-bottom:14px;text-align:center}
  .mkSlotT{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
  .mkSlotS{font-family:var(--font-body);font-size:11px;color:var(--muted);margin-top:5px}
`

// Mobile frames go in srcless iframes so a real 390px viewport drives the media queries.
// Me.module.css:279 restyles HeroCard's type above 768px, so a plain 390px <div> on a
// wide card would render DESKTOP typography and quietly lie about mobile — the exact
// reason the gallery's MobileFrame.jsx uses an iframe too.
const IFRAME_JS = `
(function () {
  function theme() { return document.getElementById('mkTheme').value }
  var frames = []
  document.querySelectorAll('[data-mk-phone]').forEach(function (host) {
    var tpl = host.querySelector('template')
    var f = document.createElement('iframe')
    f.setAttribute('scrolling', 'no')
    f.setAttribute('title', host.getAttribute('data-mk-phone'))
    host.appendChild(f)
    var d = f.contentDocument
    d.open(); d.write('<!doctype html><html><head></head><body></body></html>'); d.close()
    document.querySelectorAll('style').forEach(function (s) {
      var c = d.createElement('style'); c.textContent = s.textContent; d.head.appendChild(c)
    })
    d.body.style.margin = '0'
    d.body.innerHTML = tpl.innerHTML
    tpl.remove()
    frames.push(f)
    function fit() { f.style.height = (d.documentElement.scrollHeight + 2) + 'px' }
    new ResizeObserver(fit).observe(d.documentElement)
    fit()
  })
  function apply(v) {
    document.documentElement.className = 'theme-' + v
    frames.forEach(function (f) { f.contentDocument.documentElement.className = 'theme-' + v })
  }
  document.getElementById('mkTheme').addEventListener('change', function () { apply(theme()) })
  apply(theme())
})()
`

const THEMES = [
  ['totk-dark', 'TotK Dark'], ['totk-light', 'TotK Light'],
  ['spirit-blossom', 'Spirit Blossom'], ['spirit-blossom-light', 'Spirit Blossom Light'],
]

async function main() {
  console.log('▸ SSR-building the real me/ components…')
  const base = (await import(pathToFileURL(resolve(CONE, 'vite.design.config.js')).href)).default
  await build({
    ...base,
    configFile: false,
    build: { ...base.build, ssr: resolve(__dirname, 'me-mockup-entry.jsx'), outDir: BUILD },
    logLevel: 'warn',
  })

  const cssFile = readdirSync(resolve(BUILD, 'assets')).find(f => f.endsWith('.css'))
  const componentCss = readFileSync(resolve(BUILD, 'assets', cssFile), 'utf8')

  globalThis.window ??= { location: { search: '' } }
  const m = await import(pathToFileURL(resolve(BUILD, 'me-mockup-entry.js')).href)

  const R = fn => renderToStaticMarkup(fn())
  const deskCur = R(m.DesktopCurrent), deskProp = R(m.DesktopProposed)
  const mobCur  = R(m.MobileCurrent),  mobProp  = R(m.MobileProposed)

  const opts = THEMES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')

  const html = `<!-- @dsCard group="Mockups" -->
<!-- plans/21 — me.html layout. GENERATED from the real components by
     scripts/build-me-mockup.mjs; only the LAYOUT is proposed. Throwaway Lane-A
     ideation: archive it once a layout is approved. -->
<meta charset="utf-8">
<title>Cone — me.html, layout (plans/21)</title>
<style>${fontFaces()}</style>
<style>${readFileSync(resolve(REPO, 'themes.css'), 'utf8')}</style>
<style>${PAGE_RESET}</style>
<style>${componentCss}</style>
<style>${MOCKUP_CSS}</style>
<body>
<div class="mkBar">
  <div>
    <h1>me.html — layout</h1>
    <p class="mkNote">
      Cada card aqui é o <b>componente real</b> (HeroCard, GoalList, PrSection…) com as fixtures da galeria —
      só o <b>layout</b> é proposta, então é a única coisa em discussão. Duas mudanças, independentes:
      dá pra aceitar uma e recusar a outra.
    </p>
    <p class="mkNote">
      <b>(1) Inverter <code>contentGrid</code>: <code>colMain 40% / colPrs 60%</code> → 60/40.</b>
      Hoje a coluna da identidade (Objetivos, adesão, e o slot reservado do Desenvolvimento) fica com
      <b>314px num 1280</b> — mais estreita que um celular — enquanto os PRs, uma lista de consulta, levam 60%.
      <b>E a 314px dois componentes já vazam para fora do card</b> (<code>overflow:visible</code>, medido nos
      frames abaixo): o cabeçalho de Sessões (<code>Sessão│Data│Escala│RPE</code>) por <b>35px</b> e o título
      <code>Distribuição · Últimos 90 dias</code> por <b>25px</b>. <b>A 472px os dois somem.</b>
      Não é questão de gosto: a coluna está estreita demais para o que já vive nela — antes mesmo do card de
      5–6 barras que a plans/22 precisa encaixar aqui <i>sem</i> um re-layout.
    </p>
    <p class="mkNote">
      <b>(2) Reordenar <code>colMain</code>:</b> agrupar os <b>quatro cards de barra</b>
      (Desenvolvimento · Objetivos · WODs · Distribuição) — todos usam o mesmo <code>SegBar</code>, então
      viram um bloco visual só, com uma narrativa: <i>quem estou virando → aonde vou → estou fazendo o
      trabalho → o que fiz</i>. As duas listas (Sessões, Eventos) fecham a coluna. Hoje as listas vêm primeiro
      e partem as barras ao meio.
    </p>
  </div>
  <label>Tema <select id="mkTheme">${opts}</select></label>
</div>

<div class="mkWrap">
  <div class="mkH2">Desktop · 1280</div>
  <p class="mkSub">Larguras reais de Me.module.css:7-18 — 220 nav + 272 atletas + 788 de painel.</p>

  <div class="mkLbl">Atual — <b>colMain 40% / colPrs 60%</b></div>
  <div class="mkScroll"><div class="mkFrame" style="width:1280px">${deskCur}</div></div>

  <div class="mkLbl">Proposta — <b>colMain 60% / colPrs 40%</b> + ordem agrupando as barras</div>
  <div class="mkScroll"><div class="mkFrame" style="width:1280px">${deskProp}</div></div>

  <div class="mkH2">Mobile · 390</div>
  <p class="mkSub">Em iframes de 390px de verdade — o tipo do HeroCard muda acima de 768px (Me.module.css:279), então um &lt;div&gt; estreito numa página larga mentiria sobre o mobile.</p>

  <div class="mkRow">
    <div>
      <div class="mkLbl">Atual</div>
      <div class="mkFrame" data-mk-phone="me.html atual, 390"><template>${mobCur}</template></div>
    </div>
    <div>
      <div class="mkLbl">Proposta</div>
      <div class="mkFrame" data-mk-phone="me.html proposta, 390"><template>${mobProp}</template></div>
    </div>
  </div>
</div>
<script>${IFRAME_JS}</script>
</body>
`

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, html)
  console.log(`  ✓ design/mockups/23-me-layout.html   ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`)
}

main().catch(e => { console.error(e); process.exit(1) })
