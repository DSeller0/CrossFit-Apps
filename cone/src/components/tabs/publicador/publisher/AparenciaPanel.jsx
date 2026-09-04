import { useState } from 'react'
import OrigemCores from './OrigemCores'
import LogoPanel from './LogoPanel'
import TamanhoPanel from './TamanhoPanel'
import Button from '../../../ui/Button'
import s from '../Publicador.module.css'

const PANELS = [
  { id: 'origem', label: 'Origem/Cores' },
  { id: 'logo', label: 'Logo' },
  { id: 'tamanho', label: 'Tamanho' },
]

// Aparência — the third rail column, a 3-panel carousel (#59 C5·b1 step d). b1 carries
// only Origem/Cores, Logo and Tamanho; Blocos/Layout/Títulos are plans/83's (b2) — do
// not add tabs here for those, the accordion is built to grow but growing it is b2's job.
export default function AparenciaPanel(props) {
  const [idx, setIdx] = useState(0)
  const panel = PANELS[idx]

  return (
    <div>
      <div className={s.apNav}>
        <button
          type="button"
          className={s.sclStep}
          onClick={() => setIdx(i => (i - 1 + PANELS.length) % PANELS.length)}
          aria-label="Painel anterior"
        >
          ◀
        </button>
        <span className={s.apLabel}>{panel.label}</span>
        <button
          type="button"
          className={s.sclStep}
          onClick={() => setIdx(i => (i + 1) % PANELS.length)}
          aria-label="Próximo painel"
        >
          ▶
        </button>
      </div>
      <div className={s.apDots}>
        {PANELS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`${s.apDot} ${i === idx ? s.on : ''}`}
            aria-label={p.label}
            aria-current={i === idx}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>

      {panel.id === 'origem' && (
        <OrigemCores
          boxes={props.boxes}
          origin={props.origin}
          onSelectOrigin={props.onSelectOrigin}
          palette={props.palette}
          custom={props.custom}
          onCustomChange={props.onCustomChange}
        />
      )}
      {panel.id === 'logo' && (
        <LogoPanel
          logoInputRef={props.logoInputRef}
          onLogoUpload={props.onLogoUpload}
          logoDataUrl={props.logoDataUrl}
          onRemoveLogo={props.onRemoveLogo}
          logoScale={props.logoScale}
          onLogoScaleStep={props.onLogoScaleStep}
        />
      )}
      {panel.id === 'tamanho' && (
        <TamanhoPanel
          fontScale={props.fontScale}
          onFontScaleStep={props.onFontScaleStep}
          exportScale={props.exportScale}
          onExportScaleStep={props.onExportScaleStep}
          zoneScales={props.zoneScales}
          onZoneScaleStep={props.onZoneScaleStep}
          blockTitleScales={props.blockTitleScales}
          onBlockTitleScaleStep={props.onBlockTitleScaleStep}
          showZoneControls={props.showZoneControls}
          canvasLabel={props.canvasLabel}
          sizeEstimate={props.sizeEstimate}
        />
      )}

      <div className={s.footRow}>
        <Button variant="secondary" size="sm" onClick={props.onResetDefaults}>
          Restaurar padrão
        </Button>
      </div>
    </div>
  )
}
