import Button from '../../../ui/Button'
import s from '../Publicador.module.css'

// Logo — the second Aparência panel (#59 C5·b1 step d). Unchanged capability from the
// old toolbar's logo uploader, just relocated.
export default function LogoPanel({
  logoInputRef,
  onLogoUpload,
  logoDataUrl,
  onRemoveLogo,
  logoScale,
  onLogoScaleStep,
}) {
  return (
    <div>
      <p className={s.grp}>Logo</p>
      <input
        type="file"
        ref={logoInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onLogoUpload}
      />
      <div
        role="button"
        tabIndex={0}
        className={`${s.logoBox} ${logoDataUrl ? s.has : ''}`}
        onClick={() => logoInputRef.current?.click()}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            logoInputRef.current?.click()
          }
        }}
        aria-label="Enviar logo"
      >
        {logoDataUrl ? (
          <img src={logoDataUrl} className={s.logoImg} alt="" />
        ) : (
          <i className="ti ti-upload" aria-hidden="true" style={{ color: 'var(--dim)' }} />
        )}
      </div>
      {logoDataUrl && (
        <Button variant="ghost" size="sm" onClick={onRemoveLogo} style={{ marginTop: 6 }}>
          <i className="ti ti-x" aria-hidden="true" /> Remover
        </Button>
      )}
      <div className={s.scl} style={{ marginTop: 10, paddingLeft: 0 }}>
        <button
          type="button"
          className={s.sclStep}
          onClick={() => onLogoScaleStep(-1)}
          aria-label="Diminuir escala do logo"
        >
          −
        </button>
        <span className={s.sclVal}>{`${logoScale.toFixed(2)}×`}</span>
        <button
          type="button"
          className={s.sclStep}
          onClick={() => onLogoScaleStep(1)}
          aria-label="Aumentar escala do logo"
        >
          +
        </button>
        <span className={s.sclName}>escala</span>
      </div>
    </div>
  )
}
