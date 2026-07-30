import SessionCard from '../../results/SessionCard.jsx'
import KpiGrid from '../../results/KpiGrid.jsx'
import LoggedResult from '../../results/LoggedResult.jsx'
import LogForm from '../../results/LogForm.jsx'
import WodSummary from '../../results/WodSummary.jsx'
import { calcKpis, cardSummary } from '../../results/resultsHelpers.js'
import { Case, Section } from '../harness.jsx'
import {
  NOOP,
  rlFT,
  rlAmrap,
  rlLong,
  rcSess,
  rcSessDay,
  rcBlFT,
  rcBlFTCap,
  rcBlAmrap,
  rcBlComplex,
  rcBlBare,
  rcInpEmpty,
  rcInpDone,
  rcInpAmrap,
  rcBrFT,
  rcBrDNF,
  rcBrAmrap,
  bdBlEstacoes,
} from '../fixtures.js'
import s from '../Gallery.module.css'

export default {
  group: 'Results',
  items: [
    {
      id: 'sessioncard',
      label: 'SessionCard',
      render: () => (
        <Section
          title="SessionCard"
          sub="src/public/results/SessionCard.jsx — cartão de sessão (mobile). O cabeçalho colapsado agora responde às 3 perguntas que se abre o cartão para fazer: quantos registraram, quem lidera, e como você está."
        >
          <Case label="Com resultados · você já registrou">
            <SessionCard
              sess={rcSess}
              dk="2026-07-12"
              isExpanded={false}
              onToggle={NOOP}
              hasAthlete
              summary={cardSummary(rlFT, 'For Time', 'a3')}
            />
          </Case>
          <Case label="Com resultados · você ainda não registrou (CTA)">
            <SessionCard
              sess={rcSess}
              dk="2026-07-12"
              isExpanded={false}
              onToggle={NOOP}
              hasAthlete
              summary={cardSummary(rlFT, 'For Time', 'a99')}
            />
          </Case>
          <Case label="Com resultados · nenhum atleta selecionado (sem coluna 'Você')">
            <SessionCard
              sess={rcSess}
              dk="2026-07-12"
              isExpanded={false}
              onToggle={NOOP}
              summary={cardSummary(rlFT, 'For Time', '')}
            />
          </Case>
          <Case label="Zero resultados · loggável">
            <SessionCard
              sess={rcSess}
              dk="2026-07-12"
              isExpanded={false}
              onToggle={NOOP}
              hasAthlete
              summary={cardSummary([], 'For Time', 'a1')}
            />
          </Case>
          <Case label="Sem nome de sessão → cai para o nome do dia">
            <SessionCard
              sess={rcSessDay}
              dk="2026-07-12"
              isExpanded={false}
              onToggle={NOOP}
              hasAthlete
              summary={cardSummary(rlAmrap, 'AMRAP', 'a2')}
            />
          </Case>
          <Case label="Líder com nome longo (overflow)">
            <SessionCard
              sess={rcSess}
              dk="2026-07-12"
              isExpanded={false}
              onToggle={NOOP}
              hasAthlete
              summary={cardSummary(rlLong, 'For Time', 'a2')}
            />
          </Case>
          <Case label="Expandido · você já registrou (WOD + KPIs + resultado)">
            <SessionCard
              sess={rcSess}
              dk="2026-07-12"
              isExpanded
              onToggle={NOOP}
              hasAthlete
              summary={cardSummary(rlFT, 'For Time', 'a3')}
            >
              <div className={s.rcBody}>
                <WodSummary bl={rcBlFT} showTitle />
                <KpiGrid kpis={calcKpis(rlFT, 'For Time')} btype="For Time" />
                <LoggedResult br={rcBrFT} btype="For Time" onEdit={NOOP} />
              </div>
            </SessionCard>
          </Case>
          <Case label="Expandido · você ainda não registrou (WOD + formulário)">
            <SessionCard
              sess={rcSess}
              dk="2026-07-12"
              isExpanded
              onToggle={NOOP}
              hasAthlete
              summary={cardSummary(rlFT, 'For Time', 'a99')}
            >
              <div className={s.rcBody}>
                <WodSummary bl={rcBlFTCap} showTitle />
                <LogForm
                  bl={rcBlFTCap}
                  inp={rcInpEmpty}
                  isSubmitting={false}
                  onRpe={NOOP}
                  onScale={NOOP}
                  onField={NOOP}
                  onSubmit={NOOP}
                />
              </div>
            </SessionCard>
          </Case>
        </Section>
      ),
    },
    {
      id: 'wodsummary',
      label: 'WodSummary',
      render: () => (
        <Section
          title="WodSummary"
          sub="src/public/results/WodSummary.jsx — o WOD em si (meta + exercícios), o que o atleta lê enquanto registra. compact = cartão mobile; extended = painel desktop."
        >
          <Case label="compact · For Time (CAP + esquema 21-15-9 + distância)">
            <WodSummary bl={rcBlFT} />
          </Case>
          <Case label="compact · com título do bloco">
            <WodSummary bl={rcBlFT} showTitle />
          </Case>
          <Case label="compact · rounds + CAP">
            <WodSummary bl={rcBlFTCap} />
          </Case>
          <Case label="compact · complexo (sem nome próprio — os movimentos carregam)">
            <WodSummary bl={rcBlComplex} showTitle />
          </Case>
          <Case label="compact · sem meta e sem exercícios → não renderiza nada">
            <WodSummary bl={rcBlBare} />
          </Case>
          <Case label="extended · For Time">
            <WodSummary bl={rcBlFT} variant="extended" />
          </Case>
          <Case label="extended · com título do bloco">
            <WodSummary bl={rcBlFT} variant="extended" showTitle />
          </Case>
          <Case label="extended · rounds + CAP">
            <WodSummary bl={rcBlFTCap} variant="extended" />
          </Case>
          <Case label="extended · complexo">
            <WodSummary bl={rcBlComplex} variant="extended" showTitle />
          </Case>
          <Case label="extended · AMRAP (3 exercícios)">
            <WodSummary bl={rcBlAmrap} variant="extended" />
          </Case>
          <Case label="compact · Estações (blockExercises achata as estações, #116)">
            <WodSummary bl={bdBlEstacoes} showTitle />
          </Case>
        </Section>
      ),
    },
    {
      id: 'kpigrid',
      label: 'KpiGrid',
      render: () => (
        <Section
          title="KpiGrid"
          sub="src/public/results/KpiGrid.jsx — uma grade, duas densidades (compact = cartão mobile; extended = painel desktop, com a divisão por escala). Mostrado sob o WOD, como aparece na página."
        >
          <Case label="compact · For Time (sob o WOD)">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFT} showTitle />
              <KpiGrid kpis={calcKpis(rlFT, 'For Time')} btype="For Time" />
            </div>
          </Case>
          <Case label="compact · AMRAP (sob o WOD)">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlAmrap} showTitle />
              <KpiGrid kpis={calcKpis(rlAmrap, 'AMRAP')} btype="AMRAP" />
            </div>
          </Case>
          <Case label="compact · zero resultados">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFT} showTitle />
              <KpiGrid kpis={calcKpis([], 'For Time')} btype="For Time" />
            </div>
          </Case>
          <Case label="extended · For Time (sob o WOD)">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFT} variant="extended" showTitle />
              <KpiGrid
                kpis={calcKpis(rlFT, 'For Time', 'extended')}
                btype="For Time"
                variant="extended"
              />
            </div>
          </Case>
          <Case label="extended · AMRAP (sob o WOD)">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlAmrap} variant="extended" showTitle />
              <KpiGrid
                kpis={calcKpis(rlAmrap, 'AMRAP', 'extended')}
                btype="AMRAP"
                variant="extended"
              />
            </div>
          </Case>
          <Case label="extended · zero resultados">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFT} variant="extended" showTitle />
              <KpiGrid
                kpis={calcKpis([], 'For Time', 'extended')}
                btype="For Time"
                variant="extended"
              />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'loggedresult',
      label: 'LoggedResult',
      render: () => (
        <Section
          title="LoggedResult"
          sub="src/public/results/LoggedResult.jsx — resultado já registrado. O botão Editar é a autocorreção (#51, decisão 2): o caminho de submit já mesclava certo, era só este bloqueio visual que tornava o resultado final. As notas por exercício (#116), quando presentes, aparecem num bloco separado abaixo — .logged é uma única linha flex e uma nota pode ser uma frase inteira."
        >
          <Case label="For Time · com Editar">
            <LoggedResult br={rcBrFT} btype="For Time" onEdit={NOOP} />
          </Case>
          <Case label="For Time · somente leitura (sem onEdit)">
            <LoggedResult br={rcBrFT} btype="For Time" />
          </Case>
          <Case label="For Time · DNF (capped em 4 rds)">
            <LoggedResult br={rcBrDNF} btype="For Time" onEdit={NOOP} />
          </Case>
          <Case label="AMRAP · com notas por exercício (#116)">
            <LoggedResult br={rcBrAmrap} btype="AMRAP" onEdit={NOOP} />
          </Case>
          <Case label="Sem escala / sem RPE (dados antigos)">
            <LoggedResult br={{ blockId: 'x' }} btype="For Time" onEdit={NOOP} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'logform',
      label: 'LogForm',
      render: () => (
        <Section
          title="LogForm"
          sub="src/public/results/LogForm.jsx — formulário de registro/edição de um bloco (mesmos campos, mesma etapa de confirmação; muda só a afordância). Mostrado sob o WOD, como aparece na página."
        >
          <Case label="Criar · For Time (mobile — WOD compact)">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFT} showTitle />
              <LogForm
                bl={rcBlFT}
                inp={rcInpEmpty}
                isSubmitting={false}
                onRpe={NOOP}
                onScale={NOOP}
                onField={NOOP}
                onSubmit={NOOP}
              />
            </div>
          </Case>
          <Case label="Criar · For Time (desktop — WOD extended)">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFT} variant="extended" showTitle />
              <LogForm
                bl={rcBlFT}
                inp={rcInpEmpty}
                isSubmitting={false}
                onRpe={NOOP}
                onScale={NOOP}
                onField={NOOP}
                onSubmit={NOOP}
              />
            </div>
          </Case>
          <Case label="Criar · For Time com CAP (campo de rounds DNF)">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFTCap} showTitle />
              <LogForm
                bl={rcBlFTCap}
                inp={rcInpEmpty}
                isSubmitting={false}
                onRpe={NOOP}
                onScale={NOOP}
                onField={NOOP}
                onSubmit={NOOP}
              />
            </div>
          </Case>
          <Case label="Criar · AMRAP (rounds + reps + notas por exercício não-RX, #116)">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlAmrap} showTitle />
              <LogForm
                bl={rcBlAmrap}
                inp={rcInpAmrap}
                isSubmitting={false}
                onRpe={NOOP}
                onScale={NOOP}
                onField={NOOP}
                onSubmit={NOOP}
              />
            </div>
          </Case>
          <Case label="Editar · preenchido + Cancelar">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFT} showTitle />
              <LogForm
                bl={rcBlFT}
                inp={rcInpDone}
                isSubmitting={false}
                mode="edit"
                onRpe={NOOP}
                onScale={NOOP}
                onField={NOOP}
                onSubmit={NOOP}
                onCancel={NOOP}
              />
            </div>
          </Case>
          <Case label="Enviando">
            <div className={s.rcBody}>
              <WodSummary bl={rcBlFT} showTitle />
              <LogForm
                bl={rcBlFT}
                inp={rcInpDone}
                isSubmitting
                onRpe={NOOP}
                onScale={NOOP}
                onField={NOOP}
                onSubmit={NOOP}
              />
            </div>
          </Case>
        </Section>
      ),
    },
  ],
}
