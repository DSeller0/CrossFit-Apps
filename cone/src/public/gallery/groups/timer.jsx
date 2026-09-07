import { Case, Section, TallModalBox } from '../harness.jsx'
import { NOOP } from '../fixtures.js'
import BlockTypePicker from '../../timer/BlockTypePicker.jsx'

// ── Timer group (#174/plans/86) ──
// timer.html's Timer.jsx is the client boundary (imports the SPA-free Supabase
// client for the settings/theme fetch) and cannot render here — BlockTypePicker
// is the one client-free piece of the surface, and the one this pass rebuilt onto
// shared/Modal (it was a hand-rolled overlay with no role="dialog", no Escape and
// no focus trap). TallModalBox gives its position:fixed overlay a contained box to
// resolve into, same trick FixedFrame/ModalBox use elsewhere in the gallery.

export default {
  group: 'Timer',
  items: [
    {
      id: 'timer-blocktypepicker',
      label: 'BlockTypePicker',
      render: () => (
        <Section
          title="BlockTypePicker"
          sub="src/public/timer/BlockTypePicker.jsx — o seletor de tipo/benchmark de 3 níveis do timer.html, agora sobre shared/Modal (role=dialog, Escape, foco preso e restaurado). O nível 2 mostra a volta ('← Benchmark') no CORPO, não no cabeçalho — o cabeçalho do Modal é título + ✕, então o título carrega o nível ('Tipo de WOD' / 'Benchmark' / 'Girls')."
        >
          <Case label="Interativo — Tipo de WOD → Benchmark → Girls/Heroes → item (Esc fecha, foco preso)">
            <TallModalBox>
              <BlockTypePicker onSelect={NOOP} onSelectBenchmark={NOOP} onClose={NOOP} />
            </TallModalBox>
          </Case>
        </Section>
      ),
    },
  ],
}
