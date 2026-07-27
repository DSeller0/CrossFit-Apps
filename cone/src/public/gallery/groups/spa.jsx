import { useState } from 'react'
import Button from '../../../components/ui/Button.jsx'
import Input from '../../../components/ui/Input.jsx'
import Card from '../../../components/ui/Card.jsx'
import MaskedTimeInput from '../../shared/MaskedTimeInput.jsx'
import ConfirmReview, { ReadBox, ReadRow } from '../../shared/ConfirmReview.jsx'
import { Case, Section, ModalBox } from '../harness.jsx'
import { NOOP } from '../fixtures.js'
import s from '../Gallery.module.css'

// Inline SVG icons (no ti webfont) so the Button cases render in the generated card too.
const IcPlus = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const IcPencil = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 20h4L18 10l-4-4L4 16v4zM13 5l4 4" />
  </svg>
)
const IcTrash = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
)
const IcCheck = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12l5 5L20 7" />
  </svg>
)

function MaskedTimeDemo({ initial = '' }) {
  const [v, setV] = useState(initial)
  return (
    <div style={{ width: 150 }}>
      <MaskedTimeInput label="Tempo" value={v} onChange={setV} hint="digite só números" />
    </div>
  )
}

const crBody = (
  <ReadBox title="For Time · 21-15-9">
    <ReadRow label="Escala" value="RX" />
    <ReadRow label="RPE" value="8 / 10" />
    <ReadRow label="Tempo" value="11:42" mono />
  </ReadBox>
)
function ConfirmReviewDemo() {
  const [open, setOpen] = useState(false)
  return (
    <div className={s.sheetBtns}>
      <button className={s.demoBtn} onClick={() => setOpen(true)}>
        Abrir ConfirmReview
      </button>
      <ConfirmReview
        open={open}
        onEdit={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        {crBody}
      </ConfirmReview>
    </div>
  )
}

export default {
  group: 'SPA',
  items: [
    {
      id: 'ui-button',
      label: 'Button',
      render: () => (
        <Section
          title="Button"
          sub="src/components/ui/Button.jsx — o único botão da SPA (#54/C0). Substitui o zoo (.b/.bp/.bsec/.bd/.bsm + .tb-btn + hex inline). Tudo em tokens: hover via filter/color-mix, nunca hex — responde aos 4 temas. Foco-visível = anel --accent (dê Tab). Icon-only EXIGE aria-label."
        >
          <Case label="Hierarquia · primary / secondary / destructive / ghost">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary">
                <IcCheck /> Confirmar
              </Button>
              <Button variant="secondary">Cancelar</Button>
              <Button variant="destructive">
                <IcTrash /> Remover
              </Button>
              <Button variant="ghost">Editar</Button>
            </div>
          </Case>
          <Case label="Tamanhos · md · sm · xs">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" size="md">
                md · 40
              </Button>
              <Button variant="primary" size="sm">
                sm · 32
              </Button>
              <Button variant="primary" size="xs">
                xs · 24
              </Button>
            </div>
          </Case>
          <Case label="Desabilitado (as 4 hierarquias)">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" disabled>
                Confirmar
              </Button>
              <Button variant="secondary" disabled>
                Cancelar
              </Button>
              <Button variant="destructive" disabled>
                Remover
              </Button>
              <Button variant="ghost" disabled>
                Editar
              </Button>
            </div>
          </Case>
          <Case label="Icon-only (aria-label obrigatório) · md / sm / xs">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="secondary" iconOnly aria-label="Adicionar">
                <IcPlus />
              </Button>
              <Button variant="secondary" size="sm" iconOnly aria-label="Editar">
                <IcPencil />
              </Button>
              <Button variant="destructive" size="xs" iconOnly aria-label="Remover">
                <IcTrash />
              </Button>
            </div>
          </Case>
          <Case label="full (largura total)">
            <div style={{ maxWidth: 360 }}>
              <Button variant="primary" full>
                <IcCheck /> Salvar sessão
              </Button>
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'ui-input',
      label: 'Input',
      render: () => (
        <Section
          title="Input"
          sub="src/components/ui/Input.jsx — campo com <label htmlFor> real (fim do placeholder-como-rótulo) e UM anel de foco-visível no lugar dos ~14 :focus{border-color} divergentes. Valor 16px = sem zoom no iOS."
        >
          <Case label="Padrão + hint">
            <div style={{ maxWidth: 260 }}>
              <Input
                label="Nome do atleta"
                placeholder="ex: Ana Medrado"
                hint="como aparece no ranking"
              />
            </div>
          </Case>
          <Case label="Erro (borda + mensagem --err)">
            <div style={{ maxWidth: 260 }}>
              <Input label="Nome do atleta" defaultValue="" error="Informe um nome." />
            </div>
          </Case>
          <Case label="Desabilitado">
            <div style={{ maxWidth: 260 }}>
              <Input label="Nome do atleta" defaultValue="—" disabled />
            </div>
          </Case>
          <Case label="as='select' e as='textarea'">
            <div style={{ display: 'grid', gap: 12, maxWidth: 260 }}>
              <Input as="select" label="Escala" defaultValue="RX">
                <option>RX</option>
                <option>Inter</option>
                <option>SC</option>
                <option>Adaptado</option>
              </Input>
              <Input as="textarea" label="Observação" placeholder="notas do coach…" />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'ui-maskedtime',
      label: 'MaskedTimeInput',
      render: () => (
        <Section
          title="MaskedTimeInput"
          sub="src/public/shared/MaskedTimeInput.jsx — o único campo mm:ss (#54/C0 · absorve #35). Insere os dois-pontos sozinho, valor em --font-mono. Cross-surface (confirmar + timer/schedule), por isso mora em shared/. Digite números no primeiro."
        >
          <Case label="Interativo (digite: 1→1, 123→1:23, 1234→12:34)">
            <MaskedTimeDemo />
          </Case>
          <Case label="Preenchido">
            <div style={{ width: 150 }}>
              <MaskedTimeInput label="Tempo" value="12:34" onChange={NOOP} />
            </div>
          </Case>
          <Case label="Erro">
            <div style={{ width: 150 }}>
              <MaskedTimeInput label="Tempo" value="" onChange={NOOP} error="Obrigatório." />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'ui-card',
      label: 'Card',
      render: () => (
        <Section
          title="Card"
          sub="src/components/ui/Card.jsx — a superfície da SPA: --stone/--stone2 + --border/--divider + raio mínimo, padding na escala --sp. Substitui .sc-card/.ex-card e as cascas de modal (raio 6–16px ad-hoc)."
        >
          <Case label="Superfície + aninhamento (stone → stone2)">
            <div style={{ maxWidth: 300 }}>
              <Card title="Sessão · 06:00">
                <Card variant="stone2" pad="sm" title="Bloco A" style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: 'var(--sub)',
                    }}
                  >
                    <span>Escala</span>
                    <b style={{ color: 'var(--cream)' }}>RX</b>
                  </div>
                </Card>
                <Card variant="stone2" pad="sm" title="Bloco B">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: 'var(--sub)',
                    }}
                  >
                    <span>Resultado</span>
                    <b style={{ color: 'var(--cream)', fontFamily: 'var(--font-mono)' }}>11:42</b>
                  </div>
                </Card>
              </Card>
            </div>
          </Case>
          <Case label="Densidades de padding (md / sm / none)">
            <div style={{ display: 'grid', gap: 10, maxWidth: 300 }}>
              <Card pad="md">pad md · --sp-4</Card>
              <Card pad="sm">pad sm · --sp-3</Card>
              <Card pad="none" style={{ padding: 2 }}>
                pad none
              </Card>
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'ui-confirmreview',
      label: 'ConfirmReview',
      render: () => (
        <Section
          title="ConfirmReview"
          sub="src/public/shared/ConfirmReview.jsx — um só role='dialog' (foco preso, Escape → Editar, foco restaurado) com os rótulos canônicos 'Revisar registro' · 'Editar' · 'Confirmar'. Colapsa as 3 divergências (Results/DeskRegPane/LogPane)."
        >
          <Case label="Interativo (abra; Tab prende o foco; Escape volta ao form)">
            <ConfirmReviewDemo />
          </Case>
          <Case label="Aberto — diálogo padrão">
            <ModalBox>
              <ConfirmReview open onEdit={NOOP} onConfirm={NOOP} onClose={NOOP}>
                {crBody}
              </ConfirmReview>
            </ModalBox>
          </Case>
          <Case label="Enviando (ambos desabilitados)">
            <ModalBox>
              <ConfirmReview
                open
                submitting
                onEdit={NOOP}
                onConfirm={NOOP}
                onClose={NOOP}
                title="Revisar alteração"
              >
                {crBody}
              </ConfirmReview>
            </ModalBox>
          </Case>
          <Case label="Com erro">
            <ModalBox>
              <ConfirmReview
                open
                error="Erro ao enviar. Tente novamente."
                onEdit={NOOP}
                onConfirm={NOOP}
                onClose={NOOP}
              >
                {crBody}
              </ConfirmReview>
            </ModalBox>
          </Case>
        </Section>
      ),
    },
  ],
}
