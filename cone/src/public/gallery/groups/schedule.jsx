import RdCounter from '../../schedule/RdCounter.jsx'
import DemoPanel from '../../schedule/DemoPanel.jsx'
import LogPane from '../../schedule/LogPane.jsx'
import DeskRegPane from '../../schedule/DeskRegPane.jsx'
import ExRow from '../../schedule/ExRow.jsx'
import BlockDetail from '../../schedule/BlockDetail.jsx'
import SessionDetail from '../../schedule/SessionDetail.jsx'
import CheckinSheet from '../../schedule/CheckinSheet.jsx'
import { Case, Section, FixedFrame } from '../harness.jsx'
import {
  NOOP,
  exStandard,
  exProg,
  exComplex,
  schedBlPlain,
  schedBlRound,
  demoMapFull,
  demoMapTextOnly,
  demoMapEmpty,
  demoMapComplex,
  bdSess,
  bdBlWodWithAth,
  bdBlWodIdle,
  bdBlPlain,
  bdBlRound,
  bdBlEstacoes,
  sdSessNamed,
  sdSessUnnamed,
  logPaneSess,
  logPaneAthletes,
  logPaneBlockForm,
  logPaneBlockDone,
  deskRegBlFixture,
  deskRegBlAmrap,
  checkinAthletes,
} from '../fixtures.js'

export default {
  group: 'Schedule',
  items: [
    {
      id: 'rdcounter',
      label: 'RdCounter',
      render: () => (
        <Section
          title="RdCounter"
          sub="src/public/schedule/RdCounter.jsx — contador de rodadas (toque = avança, toque longo / botão direito = reset)"
        >
          <Case label="Idle">
            <RdCounter blId="b1" exId="e1" total={3} cur={0} onAdvance={NOOP} onReset={NOOP} />
          </Case>
          <Case label="Active">
            <RdCounter blId="b1" exId="e1" total={3} cur={1} onAdvance={NOOP} onReset={NOOP} />
          </Case>
          <Case label="Done">
            <RdCounter blId="b1" exId="e1" total={3} cur={3} onAdvance={NOOP} onReset={NOOP} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'demopanel',
      label: 'DemoPanel',
      render: () => (
        <Section
          title="DemoPanel"
          sub="src/public/schedule/DemoPanel.jsx — overlay de vídeo/descrição (position: fixed — contido num quadro abaixo via transform em Full; viewport real do MobileFrame em 390)"
        >
          <Case label="Conteúdo completo (vídeo + descrição + músculos + notas)">
            <FixedFrame variant="frameBottom">
              <DemoPanel target={[{ name: 'Thruster' }]} demoMap={demoMapFull} onClose={NOOP} />
            </FixedFrame>
          </Case>
          <Case label="Somente texto (sem vídeo)">
            <FixedFrame variant="frameBottom">
              <DemoPanel
                target={[{ name: 'Wall Ball' }]}
                demoMap={demoMapTextOnly}
                onClose={NOOP}
              />
            </FixedFrame>
          </Case>
          <Case label="Sem conteúdo disponível">
            <FixedFrame variant="frameBottom">
              <DemoPanel target={[{ name: 'Burpee' }]} demoMap={demoMapEmpty} onClose={NOOP} />
            </FixedFrame>
          </Case>
          <Case label="Complexo (múltiplos movimentos, conteúdo misto)">
            <FixedFrame variant="frameBottom">
              <DemoPanel
                target={[{ name: 'Clean Pull' }, { name: 'Power Clean' }]}
                demoMap={demoMapComplex}
                onClose={NOOP}
              />
            </FixedFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'exrow',
      label: 'ExRow',
      render: () => (
        <Section
          title="ExRow"
          sub="src/public/schedule/ExRow.jsx — linha de exercício interativa (checkbox/contador, chip de RM, Demo)"
        >
          <Case label="Padrão · pct">
            <ExRow
              ex={exStandard}
              bl={schedBlPlain}
              isWod={false}
              isRd={false}
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
          <Case label="Concluído (checked)">
            <ExRow
              ex={exStandard}
              bl={schedBlPlain}
              isWod={false}
              isRd={false}
              checked={new Set([`${schedBlPlain.id}|${exStandard.id}`])}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
          <Case label="Progressão (sem RM definido)">
            <ExRow
              ex={exProg}
              bl={schedBlPlain}
              isWod={false}
              isRd={false}
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
          <Case label="Progressão (RM definido · calculado)">
            <ExRow
              ex={exProg}
              bl={schedBlPlain}
              isWod={false}
              isRd={false}
              checked={new Set()}
              roundState={{}}
              rmValues={{ [exProg.id]: { rm: 100, unit: 'kg', source: 'manual' } }}
              rmEditKey={null}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
          <Case label="Progressão (editando RM)">
            <ExRow
              ex={exProg}
              bl={schedBlPlain}
              isWod={false}
              isRd={false}
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={exProg.id}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
          <Case label="Complexo (% RM, sem RM definido)">
            <ExRow
              ex={exComplex}
              bl={schedBlPlain}
              isWod={false}
              isRd={false}
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
          <Case label="Complexo (% RM, RM definido · calculado)">
            <ExRow
              ex={exComplex}
              bl={schedBlPlain}
              isWod={false}
              isRd={false}
              checked={new Set()}
              roundState={{}}
              rmValues={{ [exComplex.id]: { rm: 100, unit: 'kg', source: 'manual' } }}
              rmEditKey={null}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
          <Case label="Em bloco de rodadas (RdCounter no lugar do checkbox)">
            <ExRow
              ex={exStandard}
              bl={schedBlRound}
              isWod={false}
              isRd={true}
              checked={new Set()}
              roundState={{ [`${schedBlRound.id}|${exStandard.id}`]: 2 }}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
          <Case label="Em bloco WOD (sem checkbox/contador)">
            <ExRow
              ex={exStandard}
              bl={schedBlPlain}
              isWod={true}
              isRd={false}
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'blockdetail',
      label: 'BlockDetail',
      render: () => (
        <Section
          title="BlockDetail"
          sub="src/public/schedule/BlockDetail.jsx — cartão de bloco (2 colunas; só blocos WOD ganham Timer/Leaderboard/registro — rodadas não-WOD são só check-off)"
        >
          <Case label="WOD com atleta selecionado (resultado registrado)">
            <BlockDetail
              bl={bdBlWodWithAth}
              sess={bdSess}
              dateKey="2026-07-11"
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={() => true}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
              onLogBlock={NOOP}
              athResult={{ scale: 'RX', rpe: 7, perfTime: '12:34' }}
              athName="Bruna"
            />
          </Case>
          <Case label="WOD sem atleta selecionado (idle hint)">
            <BlockDetail
              bl={bdBlWodIdle}
              sess={bdSess}
              dateKey="2026-07-11"
              deskIdleHint={true}
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={() => false}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
              onLogBlock={null}
              athResult={null}
              athName=""
            />
          </Case>
          <Case label="Não-WOD (largura total, sem ações)">
            <BlockDetail
              bl={bdBlPlain}
              sess={bdSess}
              dateKey="2026-07-11"
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={() => false}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
            />
          </Case>
          <Case label="Bloco de rodadas (idle · não-WOD — onLogBlock passado mas ignorado, prova de que só WOD registra)">
            <BlockDetail
              bl={bdBlRound}
              sess={bdSess}
              dateKey="2026-07-11"
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={() => false}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
              onLogBlock={NOOP}
              athResult={null}
              athName="Bruna"
            />
          </Case>
          <Case label="Bloco de rodadas (parcialmente completo)">
            <BlockDetail
              bl={bdBlRound}
              sess={bdSess}
              dateKey="2026-07-11"
              checked={new Set()}
              roundState={{ [`${bdBlRound.id}|${exStandard.id}`]: 2 }}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={() => false}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
            />
          </Case>
          <Case label="Bloco de rodadas (completo)">
            <BlockDetail
              bl={bdBlRound}
              sess={bdSess}
              dateKey="2026-07-11"
              checked={new Set()}
              roundState={{ [`${bdBlRound.id}|${exStandard.id}`]: 4 }}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={() => false}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
            />
          </Case>
          <Case label="Estações">
            <BlockDetail
              bl={bdBlEstacoes}
              sess={bdSess}
              dateKey="2026-07-11"
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={() => false}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
              onLogBlock={NOOP}
              athResult={null}
              athName="Bruna"
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'sessiondetail',
      label: 'SessionDetail',
      render: () => (
        <Section
          title="SessionDetail"
          sub="src/public/schedule/SessionDetail.jsx — expansão mobile de uma sessão (lista de blocos, cada um com seu próprio botão de registro quando é WOD, + botão de registro da sessão inteira)"
        >
          <Case label="Com nome de sessão · múltiplos blocos (1 WOD já registrado + 1 não-WOD)">
            <SessionDetail
              sess={sdSessNamed}
              dateKey="2026-07-11"
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={bl => bl.id === bdBlWodWithAth.id}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
              onLog={NOOP}
              onLogBlock={NOOP}
              getAthResult={bl =>
                bl.id === bdBlWodWithAth.id ? { scale: 'RX', rpe: 7, perfTime: '12:34' } : null
              }
              athName="Bruna"
            />
          </Case>
          <Case label="Sem nome de sessão · um bloco (não-WOD, sem ações de registro)">
            <SessionDetail
              sess={sdSessUnnamed}
              dateKey="2026-07-11"
              checked={new Set()}
              roundState={{}}
              rmValues={{}}
              rmEditKey={null}
              demoMap={{}}
              isWodLogged={() => false}
              onCheck={NOOP}
              onAdvance={NOOP}
              onReset={NOOP}
              onRmToggle={NOOP}
              onRmConfirm={NOOP}
              onDemo={NOOP}
              onTimer={NOOP}
              onLog={NOOP}
              onLogBlock={NOOP}
              getAthResult={() => null}
              athName="Bruna"
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'logpane',
      label: 'LogPane',
      render: () => (
        <Section
          title="LogPane"
          sub="src/public/schedule/LogPane.jsx — painel de registro mobile (position: fixed — contido num quadro via transform em Full; viewport real do MobileFrame em 390)"
        >
          <Case label="Formulário">
            <FixedFrame variant="frameSide">
              <LogPane
                pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }}
                athId="a1"
                onAthId={NOOP}
                blocks={logPaneBlockForm}
                onBlocks={NOOP}
                submitting={false}
                success={false}
                error=""
                confirming={false}
                onConfirming={NOOP}
                onSubmit={NOOP}
                onClose={NOOP}
                lockedAthName=""
              />
            </FixedFrame>
          </Case>
          <Case label="Formulário · RPE + Escala selecionados (#78)">
            <FixedFrame variant="frameSide">
              <LogPane
                pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }}
                athId="a1"
                onAthId={NOOP}
                blocks={logPaneBlockDone}
                onBlocks={NOOP}
                submitting={false}
                success={false}
                error=""
                confirming={false}
                onConfirming={NOOP}
                onSubmit={NOOP}
                onClose={NOOP}
                lockedAthName=""
              />
            </FixedFrame>
          </Case>
          <Case label="Revisão (confirmar)">
            <FixedFrame variant="frameSide">
              <LogPane
                pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }}
                athId="a1"
                onAthId={NOOP}
                blocks={logPaneBlockDone}
                onBlocks={NOOP}
                submitting={false}
                success={false}
                error=""
                confirming={true}
                onConfirming={NOOP}
                onSubmit={NOOP}
                onClose={NOOP}
                lockedAthName="Bruna"
              />
            </FixedFrame>
          </Case>
          <Case label="Sucesso">
            <FixedFrame variant="frameSide">
              <LogPane
                pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }}
                athId="a1"
                onAthId={NOOP}
                blocks={logPaneBlockDone}
                onBlocks={NOOP}
                submitting={false}
                success={true}
                error=""
                confirming={false}
                onConfirming={NOOP}
                onSubmit={NOOP}
                onClose={NOOP}
                lockedAthName=""
              />
            </FixedFrame>
          </Case>
          <Case label="Erro no envio (RPC falhou)">
            <FixedFrame variant="frameSide">
              <LogPane
                pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }}
                athId="a1"
                onAthId={NOOP}
                blocks={logPaneBlockDone}
                onBlocks={NOOP}
                submitting={false}
                success={false}
                error="Erro ao enviar. Tente novamente."
                confirming={true}
                onConfirming={NOOP}
                onSubmit={NOOP}
                onClose={NOOP}
                lockedAthName="Bruna"
              />
            </FixedFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'deskregpane',
      label: 'DeskRegPane',
      render: () => (
        <Section
          title="DeskRegPane"
          sub="src/public/schedule/DeskRegPane.jsx — painel de registro desktop (3ª coluna)"
        >
          <Case label="Formulário · For Time">
            <DeskRegPane
              regBl={deskRegBlFixture}
              step="form"
              scale={null}
              rpe={null}
              perfTime=""
              perfRounds=""
              perfReps=""
              athName="Bruna"
              onScale={NOOP}
              onRpe={NOOP}
              onPerfTime={NOOP}
              onPerfRounds={NOOP}
              onPerfReps={NOOP}
              onConfirm={NOOP}
              onSubmit={NOOP}
              onBack={NOOP}
              onClose={NOOP}
              submitting={false}
              error=""
            />
          </Case>
          <Case label="Formulário · RPE + Escala selecionados (#78)">
            <DeskRegPane
              regBl={deskRegBlFixture}
              step="form"
              scale="RX"
              rpe={7}
              perfTime="12:34"
              perfRounds=""
              perfReps=""
              athName="Bruna"
              onScale={NOOP}
              onRpe={NOOP}
              onPerfTime={NOOP}
              onPerfRounds={NOOP}
              onPerfReps={NOOP}
              onConfirm={NOOP}
              onSubmit={NOOP}
              onBack={NOOP}
              onClose={NOOP}
              submitting={false}
              error=""
            />
          </Case>
          <Case label="Formulário · AMRAP (rounds/reps + dica)">
            <DeskRegPane
              regBl={deskRegBlAmrap}
              step="form"
              scale={null}
              rpe={null}
              perfTime=""
              perfRounds=""
              perfReps=""
              athName="Bruna"
              onScale={NOOP}
              onRpe={NOOP}
              onPerfTime={NOOP}
              onPerfRounds={NOOP}
              onPerfReps={NOOP}
              onConfirm={NOOP}
              onSubmit={NOOP}
              onBack={NOOP}
              onClose={NOOP}
              submitting={false}
              error=""
            />
          </Case>
          <Case label="Revisão (confirmar)">
            <DeskRegPane
              regBl={deskRegBlFixture}
              step="confirm"
              scale="RX"
              rpe={7}
              perfTime="12:34"
              perfRounds=""
              perfReps=""
              athName="Bruna"
              onScale={NOOP}
              onRpe={NOOP}
              onPerfTime={NOOP}
              onPerfRounds={NOOP}
              onPerfReps={NOOP}
              onConfirm={NOOP}
              onSubmit={NOOP}
              onBack={NOOP}
              onClose={NOOP}
              submitting={false}
              error=""
            />
          </Case>
          <Case label="Revisão (erro no envio)">
            <DeskRegPane
              regBl={deskRegBlFixture}
              step="confirm"
              scale="RX"
              rpe={7}
              perfTime="12:34"
              perfRounds=""
              perfReps=""
              athName="Bruna"
              onScale={NOOP}
              onRpe={NOOP}
              onPerfTime={NOOP}
              onPerfRounds={NOOP}
              onPerfReps={NOOP}
              onConfirm={NOOP}
              onSubmit={NOOP}
              onBack={NOOP}
              onClose={NOOP}
              submitting={false}
              error="Erro ao enviar. Tente novamente."
            />
          </Case>
          <Case label="Sucesso">
            <DeskRegPane
              regBl={deskRegBlFixture}
              step="success"
              scale="RX"
              rpe={7}
              perfTime="12:34"
              perfRounds=""
              perfReps=""
              athName="Bruna"
              onScale={NOOP}
              onRpe={NOOP}
              onPerfTime={NOOP}
              onPerfRounds={NOOP}
              onPerfReps={NOOP}
              onConfirm={NOOP}
              onSubmit={NOOP}
              onBack={NOOP}
              onClose={NOOP}
              submitting={false}
              error=""
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'checkinsheet',
      label: 'CheckinSheet',
      render: () => (
        <Section
          title="CheckinSheet"
          sub="src/public/schedule/CheckinSheet.jsx — bottom sheet de check-in via QR (position: fixed — contido num quadro via transform em Full; viewport real do MobileFrame em 390)"
        >
          <Case label="Modo atleta (busca na lista)">
            <FixedFrame variant="frameBottom">
              <CheckinSheet
                checkinExec={{ class_label: 'WOD 18h' }}
                checkinDone={false}
                checkinMode="athlete"
                onCheckinMode={NOOP}
                checkinSearch=""
                onCheckinSearch={NOOP}
                athletes={checkinAthletes}
                checkinAthId="a1"
                onCheckinAthId={NOOP}
                checkinAnonName=""
                onCheckinAnonName={NOOP}
                checkinSubmitting={false}
                onSubmit={NOOP}
                onClose={NOOP}
              />
            </FixedFrame>
          </Case>
          <Case label="Modo visitante (não está na lista)">
            <FixedFrame variant="frameBottom">
              <CheckinSheet
                checkinExec={{ class_label: 'WOD 18h' }}
                checkinDone={false}
                checkinMode="anon"
                onCheckinMode={NOOP}
                checkinSearch=""
                onCheckinSearch={NOOP}
                athletes={checkinAthletes}
                checkinAthId=""
                onCheckinAthId={NOOP}
                checkinAnonName="Visitante"
                onCheckinAnonName={NOOP}
                checkinSubmitting={false}
                onSubmit={NOOP}
                onClose={NOOP}
              />
            </FixedFrame>
          </Case>
          <Case label="Concluído">
            <FixedFrame variant="frameBottom">
              <CheckinSheet
                checkinExec={{ class_label: 'WOD 18h' }}
                checkinDone={true}
                checkinMode="athlete"
                onCheckinMode={NOOP}
                checkinSearch=""
                onCheckinSearch={NOOP}
                athletes={checkinAthletes}
                checkinAthId=""
                onCheckinAthId={NOOP}
                checkinAnonName=""
                onCheckinAnonName={NOOP}
                checkinSubmitting={false}
                onSubmit={NOOP}
                onClose={NOOP}
              />
            </FixedFrame>
          </Case>
        </Section>
      ),
    },
  ],
}
