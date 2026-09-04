import { useState } from 'react'
import OrigemCores from './OrigemCores'
import LogoPanel from './LogoPanel'
import TamanhoPanel from './TamanhoPanel'
import LayoutPanel from './LayoutPanel'
import BlocosPanel from './BlocosPanel'
import TitulosPanel from './TitulosPanel'
import Button from '../../../ui/Button'
import s from '../Publicador.module.css'

const PANELS = [
  { id: 'origem', label: 'Origem/Cores' },
  { id: 'logo', label: 'Logo' },
  { id: 'tamanho', label: 'Tamanho' },
  { id: 'layout', label: 'Layout' },
  { id: 'blocos', label: 'Blocos' },
  { id: 'titulos', label: 'Títulos' },
]

// Aparência — the third rail column, a 6-panel carousel (#59 C5·b1 step d added the
// first 3 — Origem/Cores · Logo · Tamanho; #59 C5·b2/plans/83 grows it to 6 — Layout ·
// Blocos · Títulos are the parametric-renderer axes). The carousel was built to grow;
// this is that growth.
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
      {panel.id === 'layout' && (
        <LayoutPanel
          format={props.format}
          zoneCount={props.zoneCount}
          onZoneCount={props.onZoneCount}
          zoneSplit={props.zoneSplit}
          onZoneSplit={props.onZoneSplit}
          zoneCollapseMessage={props.zoneCollapseMessage}
          visibleDays={props.visibleDays}
          onToggleDay={props.onToggleDay}
          mobileModel={props.mobileModel}
          onMobileModel={props.onMobileModel}
        />
      )}
      {panel.id === 'blocos' && (
        <BlocosPanel
          format={props.format}
          treatment={props.blockTreatment}
          onTreatment={props.onBlockTreatment}
          content={props.blockContent}
          onToggleContent={props.onToggleBlockContent}
        />
      )}
      {panel.id === 'titulos' && (
        <TitulosPanel
          gymName={props.gymName}
          onGymName={props.onGymName}
          footer={props.footer}
          onFooter={props.onFooter}
          format={props.format}
          title={props.title}
          onTitleChange={props.onTitleChange}
          computedDefault={props.computedDefault}
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
