import { useState } from 'react'
import ScaleFilter from '../../shared/ScaleFilter.jsx'
import WodBlockCard from '../../shared/WodBlockCard.jsx'
import RankList from '../../shared/RankList.jsx'
import WodSelectCard from '../../leaderboard/WodSelectCard.jsx'
import WodCard from '../../leaderboard/WodCard.jsx'
import lb from '../../leaderboard/Leaderboard.module.css'
import { cardSummary } from '../../results/resultsHelpers.js'
import { Case, Section } from '../harness.jsx'
import { NOOP, lbWods, lbBlForTime, lbBlMetcon, rlFT, rlAmrap } from '../fixtures.js'
import s from '../Gallery.module.css'

function ScaleFilterDemo({ initial = 'Todos' }) {
  const [v, setV] = useState(initial)
  return <ScaleFilter value={v} onChange={setV} />
}
function WodSelectColDemo() {
  const [sel, setSel] = useState('w2')
  return (
    <div className={s.lbCol}>
      {lbWods.map(w => (
        <WodSelectCard key={w.key} w={w} selected={sel === w.key} onSelect={setSel} />
      ))}
    </div>
  )
}

// The whole mobile leaderboard: week nav → WOD cards → the open one holds the
// scale filter, the WOD, and the ranking. Replaces the <select> picker.
const LB_MOBILE = [
  { w: lbWods[0], bl: lbBlForTime, entries: rlFT, blType: 'For Time' },
  { w: lbWods[1], bl: lbBlMetcon, entries: rlAmrap, blType: 'AMRAP' },
  { w: lbWods[2], bl: lbBlForTime, entries: rlFT.slice(0, 3), blType: 'For Time' },
]
function LbMobileDemo({ initialOpen = 'w2', highlightAthleteId = '' }) {
  const [openKey, setOpenKey] = useState(initialOpen)
  const [scale, setScale] = useState('Todos')
  return (
    <div className={s.lbMobile}>
      <div className={lb.weekNav}>
        <button type="button" className={lb.weekBtn} aria-label="Semana anterior">
          ‹
        </button>
        <span className={lb.weekLabel}>5 – 11 Jul, 2026</span>
        <button type="button" className={lb.weekBtn} aria-label="Próxima semana">
          ›
        </button>
      </div>
      {LB_MOBILE.map(({ w, bl, entries, blType }) => (
        <WodCard
          key={w.key}
          w={w}
          summary={cardSummary(entries, blType, '')}
          expanded={openKey === w.key}
          onToggle={() => setOpenKey(k => (k === w.key ? '' : w.key))}
        >
          <div className={lb.cardOpen}>
            <ScaleFilter value={scale} onChange={setScale} />
            <WodBlockCard bl={bl} dt={w.dt} sessName={w.sessName} scaleFilter={scale} />
            <RankList
              entries={entries}
              blType={blType}
              scaleFilter={scale}
              highlightAthleteId={highlightAthleteId}
            />
          </div>
        </WodCard>
      ))}
    </div>
  )
}

export default {
  group: 'Leaderboard',
  items: [
    {
      id: 'wodcard',
      label: 'WodCard (mobile)',
      render: () => (
        <Section
          title="WodCard + a leaderboard mobile inteira"
          sub="src/public/leaderboard/WodCard.jsx — o <select> de WOD foi aposentado: a semana vira uma lista de cartões e o ranking mora dentro do que você abre. Mesmo gesto do SessionCard (ambos rodam sobre AccordionCard). Clique nos cartões; o filtro de escala é escopado ao WOD aberto. O ranking vira duas linhas sozinho — é uma container query, então ele reage à largura do cartão, não à da janela."
        >
          <Case label="Lista completa · interativa (abra/feche, filtre, veja o ranking dentro)">
            <LbMobileDemo />
          </Case>
          <Case label="Com o atleta em destaque (você é o 3º)">
            <LbMobileDemo initialOpen="w1" highlightAthleteId="a3" />
          </Case>
          <Case label="Tudo colapsado — a semana legível sem abrir nada (data · atletas · líder)">
            <LbMobileDemo initialOpen="" />
          </Case>
        </Section>
      ),
    },
    {
      id: 'scalefilter',
      label: 'ScaleFilter',
      render: () => (
        <Section
          title="ScaleFilter"
          sub="src/public/shared/ScaleFilter.jsx — pílulas de escala. Renderizadas duas vezes na página (barra mobile + coluna desktop), o que é justamente por que as duas cópias divergiram. Clique para ver o estado ativo; Tab para o foco."
        >
          <Case label="Interativo · 'Todos' inicial">
            <ScaleFilterDemo />
          </Case>
          <Case label="Interativo · 'RX' inicial">
            <ScaleFilterDemo initial="RX" />
          </Case>
          <Case label="Interativo · 'Adaptado' inicial (pílula mais larga)">
            <ScaleFilterDemo initial="Adaptado" />
          </Case>
        </Section>
      ),
    },
    {
      id: 'wodselectcard',
      label: 'WodSelectCard',
      render: () => (
        <Section
          title="WodSelectCard"
          sub="src/public/leaderboard/WodSelectCard.jsx — um WOD na coluna seletora do desktop. Agora alcançável pelo teclado (#14): era um <div> só de clique, e como nada renderiza até escolher um WOD, quem usa teclado via a página permanentemente vazia. Tab + Enter/Espaço para selecionar."
        >
          <Case label="Coluna interativa (selecionado = 'Treino B'; Tab/Enter funciona)">
            <WodSelectColDemo />
          </Case>
          <Case label="Não selecionado">
            <div className={s.lbCol}>
              <WodSelectCard w={lbWods[0]} selected={false} onSelect={NOOP} />
            </div>
          </Case>
          <Case label="Selecionado">
            <div className={s.lbCol}>
              <WodSelectCard w={lbWods[0]} selected onSelect={NOOP} />
            </div>
          </Case>
          <Case label="Sem nome de sessão → cai para o rótulo do bloco">
            <div className={s.lbCol}>
              <WodSelectCard w={lbWods[2]} selected={false} onSelect={NOOP} />
            </div>
          </Case>
          <Case label="Nome longo (overflow) + muitos atletas">
            <div className={s.lbCol}>
              <WodSelectCard w={lbWods[3]} selected={false} onSelect={NOOP} />
            </div>
          </Case>
        </Section>
      ),
    },
  ],
}
