import { useState } from 'react'
import { ExerciseList } from '../../shared/ExerciseList.jsx'
import RankList from '../../shared/RankList.jsx'
import AccordionCard from '../../shared/AccordionCard.jsx'
import WodBlockCard from '../../shared/WodBlockCard.jsx'
import TallyBar from '../../shared/TallyBar.jsx'
import Nav from '../../Nav.jsx'
import { Case, Section } from '../harness.jsx'
import {
  AMBER,
  BLUE,
  RED,
  GREEN,
  FULL_LIST,
  exStandard,
  exScheme,
  exProg,
  exProgStepsOnly,
  exComplex,
  exDist,
  exCal,
  exCardio,
  exLong,
  exNoteOnly,
  rlFT,
  rlDNF,
  rlAmrap,
  rlLong,
  rlMany,
  lbBlMetcon,
  lbBlForTime,
  lbBlEstacoes,
  lbBlBare,
} from '../fixtures.js'
import s from '../Gallery.module.css'

function AccordionCardDemo({ initial = false, title = 'Treino A', tag = null }) {
  const [open, setOpen] = useState(initial)
  return (
    <AccordionCard
      title={title}
      tag={tag}
      filled={open}
      expanded={open}
      onToggle={() => setOpen(o => !o)}
      meta={<span style={{ color: 'var(--muted)' }}>linha de meta — cada página passa a sua</span>}
    >
      <div style={{ padding: '10px', color: 'var(--sub)', fontSize: 13 }}>
        corpo (children) — só monta quando aberto
      </div>
    </AccordionCard>
  )
}

export default {
  group: 'Shared',
  items: [
    {
      id: 'tallybar',
      label: 'TallyBar',
      render: () => (
        <Section
          title="TallyBar"
          sub="src/public/shared/TallyBar.jsx — a única barra do app (mockup 24). Lê em dezenas: 10 blocos de 10%, e o bloco onde o valor cai se divide em 10 unidades. Sempre 10 blocos, qualquer que seja o denominador — quem chama converte o seu '5 / 6' em % e mantém os números literais ao lado. Substituiu o SegBar (trilho contínuo + grid de 1%)."
        >
          <Case label="0 · 35 · 72 · 100%">
            <div style={{ display: 'grid', gap: 10 }}>
              <TallyBar pct={0} />
              <TallyBar pct={35} />
              <TallyBar pct={72} />
              <TallyBar pct={100} />
            </div>
          </Case>
          <Case label="Bloco parcial · 60 (redondo, sem parcial) · 76 (7 + 6/10) · 87,5 (8 + 8/10) · 100 (dez blocos cheios)">
            <div style={{ display: 'grid', gap: 10 }}>
              <TallyBar pct={60} size="lg" />
              <TallyBar pct={76} size="lg" />
              <TallyBar pct={87.5} size="lg" />
              <TallyBar pct={100} size="lg" />
            </div>
          </Case>
          <Case label="Valores pequenos · 1 · 4 · 5 · 9% (só o bloco parcial acende)">
            <div style={{ display: 'grid', gap: 10 }}>
              <TallyBar pct={1} size="lg" />
              <TallyBar pct={4} size="lg" />
              <TallyBar pct={5} size="lg" />
              <TallyBar pct={9} size="lg" />
            </div>
          </Case>
          <Case label="Tamanhos · sm (mini-bar e detalhe de PR) / md (BarList) / lg (meta, stats)">
            <div style={{ display: 'grid', gap: 10 }}>
              <TallyBar pct={76} size="sm" />
              <TallyBar pct={76} size="md" />
              <TallyBar pct={76} size="lg" />
            </div>
          </Case>
          <Case label="Cores de dados (famílias de bloco, não tokens)">
            <div style={{ display: 'grid', gap: 10 }}>
              <TallyBar pct={83} color={AMBER} />
              <TallyBar pct={88} color={BLUE} />
              <TallyBar pct={45} color={RED} />
              <TallyBar pct={30} color={GREEN} />
            </div>
          </Case>
          <Case label="Marcos como na GoalList (a configuração real · lg + ticks)">
            <TallyBar
              pct={55}
              size="lg"
              ticks={[
                { pct: 20, state: 'hit' },
                { pct: 50, state: 'hit' },
                { pct: 75, state: 'next' },
                { pct: 95, state: 'future' },
              ]}
            />
          </Case>
          <Case label="Marcos nos extremos (0% e 100% não podem ser cortados ao meio)">
            <TallyBar
              pct={100}
              size="lg"
              ticks={[
                { pct: 0, state: 'hit' },
                { pct: 100, state: 'hit' },
              ]}
            />
          </Case>
          <Case label="Fora da faixa (−20 e 140 são fixados em 0/100)">
            <div style={{ display: 'grid', gap: 10 }}>
              <TallyBar pct={-20} size="lg" />
              <TallyBar pct={140} size="lg" />
            </div>
          </Case>
          <Case label="Denominador grande — o motivo das dezenas: 12/20 · 30/45 · 70/100 nunca viram sopa">
            <div style={{ display: 'grid', gap: 10 }}>
              <TallyBar pct={60} color={BLUE} />
              <TallyBar pct={66.7} color={BLUE} />
              <TallyBar pct={70} color={BLUE} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'exerciselist',
      label: 'ExerciseList',
      render: () => (
        <Section
          title="ExerciseList"
          sub="src/public/shared/ExerciseList.jsx — read-only, compartilhado (TV + schedule)"
        >
          <Case label="Matriz completa · compact">
            <ExerciseList exercises={FULL_LIST} color={AMBER} />
          </Case>
          <Case label="Padrão · pct">
            <ExerciseList exercises={[exStandard]} color={BLUE} />
          </Case>
          <Case label="Esquema 21-15-9 · gender">
            <ExerciseList exercises={[exScheme]} color={RED} />
          </Case>
          <Case label="Progressão">
            <ExerciseList exercises={[exProg]} color={BLUE} />
          </Case>
          <Case label="Progressão · reps só em steps">
            <ExerciseList exercises={[exProgStepsOnly]} color={BLUE} />
          </Case>
          <Case label="Complexo">
            <ExerciseList exercises={[exComplex]} color={BLUE} />
          </Case>
          <Case label="Distância m / cal + cardio legado">
            <ExerciseList exercises={[exDist, exCal, exCardio]} color={GREEN} />
          </Case>
          <Case label="Nome longo (overflow)">
            <ExerciseList exercises={[exLong]} color={AMBER} />
          </Case>
          <Case label="Só nota (sem volume)">
            <ExerciseList exercises={[exNoteOnly]} color={GREEN} />
          </Case>
          <Case label="Vazio">
            <ExerciseList exercises={[]} color={AMBER} />
          </Case>
          <Case label="size='large' (TV)">
            <ExerciseList
              exercises={[exStandard, exComplex, exProgStepsOnly]}
              color={AMBER}
              size="large"
            />
          </Case>
          <Case label="size='tiny' (LogPane / WodBlockCard)">
            <ExerciseList
              exercises={[exStandard, exProg, exComplex, exLong]}
              color={BLUE}
              size="tiny"
            />
          </Case>
          {/* 200px wide on purpose: `grid` exists for the Criador week column, and
              the two things it changes (12px name, intensity on its own line)
              only read as fixes at the width that broke them. */}
          <Case label="size='grid' (coluna da semana do Criador · 200px)">
            <div
              style={{
                width: 200,
                background: 'var(--stone2)',
                border: '1px solid var(--divider)',
                padding: 8,
              }}
            >
              <ExerciseList
                exercises={[exStandard, exProg, exComplex, exLong]}
                color={AMBER}
                size="grid"
              />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'ranklist',
      label: 'RankList',
      render: () => (
        <Section
          title="RankList"
          sub="src/public/shared/RankList.jsx — ranking compartilhado (leaderboard + painéis do results). Pódio via --podium-1/2/3; cores de escala são data-colors (SCALE_COL)."
        >
          <Case label="Pódio + demais · For Time">
            <RankList entries={rlFT} blType="For Time" />
          </Case>
          <Case label="Atleta em destaque (você é o 3º)">
            <RankList entries={rlFT} blType="For Time" highlightAthleteId="a3" />
          </Case>
          <Case label="Filtro de escala · RX">
            <RankList entries={rlFT} blType="For Time" scaleFilter="RX" />
          </Case>
          <Case label="Filtro de escala · Adaptado (1 resultado)">
            <RankList entries={rlFT} blType="For Time" scaleFilter="Adaptado" />
          </Case>
          <Case label="AMRAP (rounds + reps, desempate por reps)">
            <RankList entries={rlAmrap} blType="AMRAP" />
          </Case>
          <Case label="DNF · capped (4 rds) e sem resultado ordenam por último">
            <RankList entries={rlDNF} blType="For Time" />
          </Case>
          <Case label="Nome longo (overflow)">
            <RankList entries={rlLong} blType="For Time" />
          </Case>
          <Case label="Muitos (zebra além do pódio)">
            <RankList entries={rlMany} blType="For Time" />
          </Case>
          <Case label="Um só (pódio de 1)">
            <RankList entries={rlFT.slice(0, 1)} blType="For Time" />
          </Case>
          <Case label="Vazio">
            <RankList entries={[]} blType="For Time" />
          </Case>
          <Case label="Sem pódio (podium=false)">
            <RankList entries={rlFT} blType="For Time" podium={false} />
          </Case>
          <Case label="size='large' + dots do atleta (página leaderboard)">
            <RankList
              entries={rlFT}
              blType="For Time"
              size="large"
              showDots
              highlightAthleteId="a2"
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'wodblockcard',
      label: 'WodBlockCard',
      render: () => (
        <Section
          title="WodBlockCard"
          sub="src/public/shared/WodBlockCard.jsx — o WOD acima de um ranking, com a mesma forma do BlockCard da TV (régua lateral da família + selo do tipo, depois a ExerciseList compartilhada). Absorve o antigo cabeçalho do leaderboard: o selo é o rótulo, as fichas são rounds/CAP, e o rodapé leva data · sessão · escala ativa."
        >
          <Case label="MetCon (família vermelha) · 4 rounds · CAP 40'">
            <WodBlockCard bl={lbBlMetcon} dt="qui., 25/06" sessName="Treino B" />
          </Case>
          <Case label="Com filtro de escala ativo (entra no rodapé)">
            <WodBlockCard bl={lbBlMetcon} dt="qui., 25/06" sessName="Treino B" scaleFilter="RX" />
          </Case>
          <Case label="For Time (família âmbar) · só CAP, sem rounds">
            <WodBlockCard bl={lbBlForTime} dt="qua., 08/07" sessName="Treino A" />
          </Case>
          <Case label="Estações — achatado numa lista só, como na TV">
            <WodBlockCard bl={lbBlEstacoes} dt="ter., 07/07" sessName="Treino C" />
          </Case>
          <Case label="Sem exercícios (só selo + fichas + rodapé)">
            <WodBlockCard bl={lbBlBare} dt="seg., 06/07" sessName="Treino D" />
          </Case>
          <Case label="size='large' (coluna de ranking do desktop)">
            <WodBlockCard bl={lbBlMetcon} dt="qui., 25/06" sessName="Treino B" size="large" />
          </Case>
        </Section>
      ),
    },
    {
      id: 'accordioncard',
      label: 'AccordionCard',
      render: () => (
        <Section
          title="AccordionCard"
          sub="src/public/shared/AccordionCard.jsx — a casca de expansão por trás do SessionCard (results) e do WodCard (leaderboard). Os cabeçalhos levam dados diferentes, mas a interação é uma só: um contrato de teclado, um aria-expanded, um chevron. Tab + Enter/Espaço."
        >
          <Case label="Colapsado">
            <AccordionCardDemo />
          </Case>
          <Case label="Expandido (com tag)">
            <AccordionCardDemo initial tag="AMRAP" />
          </Case>
          <Case label="Título + tag longos (ambos truncam)">
            <AccordionCardDemo
              title="Treino de Sábado — Turma da Manhã"
              tag="Benchmark de Resistência Muscular"
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'nav',
      label: 'Nav',
      render: () => (
        <Section
          title="Nav"
          sub="src/public/Nav.jsx — chrome fixo; a forma muda por viewport (barra ≤767 / sidebar ≥768). Redimensione o navegador para ver a sidebar."
        >
          <Case label="active='schedule' — contido num quadro (fixed→relativo via transform)">
            <div className={s.navFrame}>
              <Nav active="schedule" gymName="Team Medrado" />
            </div>
          </Case>
        </Section>
      ),
    },
  ],
}
