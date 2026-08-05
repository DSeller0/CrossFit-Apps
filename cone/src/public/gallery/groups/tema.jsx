import { useState } from 'react'
import ThemeCards from '../../tema/ThemeCards.jsx'
import { Case, Section } from '../harness.jsx'

// ── Tema (#143) ──
// tema.html's picker grid. Tema.jsx itself imports supabaseClient (gym name + settings),
// so the gallery renders ThemeCards — the client-free half it was split into for exactly
// this reason.

// The picker is only meaningful while you can click it: a static `value` prop would show
// one state and hide the thing under test (that all four previews render their OWN palette
// on a page that is only one theme).
function ThemeCardsDemo({ initial = 'totk-dark' }) {
  const [v, setV] = useState(initial)
  return <ThemeCards value={v} onPick={setV} />
}

export default {
  group: 'Tema',
  items: [
    {
      id: 'themecards',
      label: 'ThemeCards',
      render: () => (
        <Section
          title="ThemeCards"
          sub="src/public/tema/ThemeCards.jsx — o seletor de tema público (tema.html), aberto pela aba Tema do Nav. Escolher grava cone_theme_user, que passa a vencer o tema do box."
        >
          <Case label="Interativo — clique para trocar (aplica na hora, como na página real)">
            <div style={{ maxWidth: 560 }}>
              <ThemeCardsDemo />
            </div>
          </Case>
          <Case label="Coluna estreita (390px) — um card por linha">
            <div style={{ maxWidth: 340 }}>
              <ThemeCardsDemo initial="spirit-blossom" />
            </div>
          </Case>
          <Case label="⚠️ As 4 miniaturas usam hex fixo, não tokens">
            <div style={{ maxWidth: 560 }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
                themes.css escopa cada paleta em <code>html.theme-*</code>, então uma prévia dentro
                da página não herda o tema que ela mostra — as quatro precisam aparecer ao mesmo
                tempo numa página que é só uma delas. Mesma exceção já registrada para os swatches
                de Config.module.css. Troque o tema no seletor acima: as miniaturas não mudam, o
                resto da página sim.
              </p>
              <ThemeCardsDemo initial="totk-light" />
            </div>
          </Case>
        </Section>
      ),
    },
  ],
}
