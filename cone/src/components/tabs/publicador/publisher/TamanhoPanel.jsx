import s from '../Publicador.module.css'

function Scale({ label, value, onStep, digits = 2 }) {
  return (
    <div className={s.scl}>
      <button
        type="button"
        className={s.sclStep}
        onClick={() => onStep(-1)}
        aria-label={`Diminuir ${label}`}
      >
        −
      </button>
      <span className={s.sclVal}>{`${value.toFixed(digits)}×`}</span>
      <button
        type="button"
        className={s.sclStep}
        onClick={() => onStep(1)}
        aria-label={`Aumentar ${label}`}
      >
        +
      </button>
      <span className={s.sclName}>{label}</span>
    </div>
  )
}

// Tamanho — the third Aparência panel (#59 C5·b1 step d). Font + export scale, unchanged
// from the old toolbar/settings drawer. The per-zone sliders are Dia-only (they always
// were — the old preview modal showed them only while `previewTarget === 'daily'`) and
// stay here rather than moving to a Layout panel that doesn't exist yet — plans/83 owns
// the real zone-count/layout axis; this pass only relocates what already existed.
export default function TamanhoPanel({
  fontScale,
  onFontScaleStep,
  exportScale,
  onExportScaleStep,
  zoneScales,
  onZoneScaleStep,
  blockTitleScales,
  onBlockTitleScaleStep,
  showZoneControls,
  canvasLabel,
  sizeEstimate,
}) {
  return (
    <div>
      <p className={s.grp}>Fonte e arquivo</p>
      <Scale label="fonte" value={fontScale} onStep={onFontScaleStep} />
      <Scale label="export" value={exportScale} onStep={onExportScaleStep} digits={0} />
      <p className={s.hint} style={{ marginLeft: 0, marginTop: 6 }}>
        {canvasLabel} · escala {exportScale}× no arquivo final
        {sizeEstimate ? ` · ~${sizeEstimate}` : ''}
      </p>

      {showZoneControls && (
        <>
          <p className={s.grp}>Tamanho por zona</p>
          {[0, 1, 2].map(zi => (
            <Scale
              key={zi}
              label={`zona 0${zi + 1}`}
              value={zoneScales[zi]}
              onStep={d => onZoneScaleStep(zi, d)}
            />
          ))}
          <p className={s.grp}>Título do bloco por zona</p>
          {[0, 1, 2].map(zi => (
            <Scale
              key={zi}
              label={`título 0${zi + 1}`}
              value={blockTitleScales[zi]}
              onStep={d => onBlockTitleScaleStep(zi, d)}
            />
          ))}
        </>
      )}
    </div>
  )
}
