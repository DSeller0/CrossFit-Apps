import { loadAthletes } from '../../../../utils/storage'
import { APP_CONFIG } from '../../../../utils/config'
import { MONTH_PT } from '../../../../public/lib/week.js'

// ── PublisherToolbar — logo, gym name/label, month nav, and the export action row.
// Pure move (#59 C5·b1 step b): same markup, same handlers, no behaviour change.
// Dies in step d, replaced by the when-picker + format rail + Aparência trigger.
export default function PublisherToolbar({
  logoInputRef,
  onLogoUpload,
  logoDataUrl,
  setLogoDataUrl,
  logoScale,
  setLogoScale,
  gymName,
  setGymName,
  filterAthlete,
  setFilterAthlete,
  label,
  setLabel,
  fontScale,
  setFontScale,
  month,
  setMonth,
  year,
  setYear,
  previewOpen,
  setPreviewOpen,
  setPresenterOpen,
  setSettingsOpen,
  exporting,
  setExportTarget,
  doExport,
  doMobileExport,
  doMobileWeeklyExport,
}) {
  return (
    <div className="pub-controls">
      <input
        type="file"
        ref={logoInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onLogoUpload}
      />
      <div className="fg" style={{ minWidth: '80px', alignItems: 'center' }}>
        <span className="lbl">Logo</span>
        <div
          onClick={() => logoInputRef.current?.click()}
          title="Clique para enviar o logo"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '6px',
            border: logoDataUrl ? '2px solid #e87820' : '1.5px dashed #444',
            background: '#111',
            cursor: 'pointer',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color .15s',
            flexShrink: 0,
          }}
        >
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <i
                className="ti ti-upload"
                style={{ fontSize: '18px', color: '#555' }}
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: '9px',
                  color: '#555',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}
              />
            </div>
          )}
        </div>
        {logoDataUrl && (
          <button
            type="button"
            className="b bd bsm"
            style={{
              marginTop: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              minHeight: '22px',
            }}
            onClick={() => setLogoDataUrl(null)}
          >
            <i className="ti ti-x" aria-hidden="true" />
            {' Remover'}
          </button>
        )}
      </div>
      {logoDataUrl && (
        <div className="fg" style={{ minWidth: '160px' }}>
          <span className="lbl">{`Escala do logo — ${logoScale.toFixed(2)}×`}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="b bsm"
              style={{ padding: '4px 8px', minHeight: '28px' }}
              onClick={() =>
                setLogoScale(s => Math.max(0.25, Math.round((s - 0.01) * 1000) / 1000))
              }
            >
              −
            </button>
            <input
              type="range"
              min="0.25"
              max="4"
              step="0.01"
              value={logoScale}
              onChange={e => setLogoScale(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#e87820' }}
            />
            <button
              type="button"
              className="b bsm"
              style={{ padding: '4px 8px', minHeight: '28px' }}
              onClick={() => setLogoScale(s => Math.min(4, Math.round((s + 0.01) * 1000) / 1000))}
            >
              +
            </button>
          </div>
        </div>
      )}
      <div className="fg" style={{ flex: '1', minWidth: '140px' }}>
        <span className="lbl">Nome da academia</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            placeholder="Cone"
            value={gymName}
            onChange={e => setGymName(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            value={filterAthlete?.id || ''}
            onChange={e => {
              const aths = loadAthletes()
              const a = aths.find(x => x.id === e.target.value) || null
              setFilterAthlete(a)
              if (a) setGymName(a.name)
              else setGymName('')
            }}
            style={{
              width: '36px',
              fontFamily: 'inherit',
              fontSize: '13px',
              background: '#111',
              border: '1px solid #2e2e2e',
              borderRadius: '5px',
              color: '#888',
              cursor: 'pointer',
              flexShrink: 0,
              padding: '0 4px',
            }}
            title="Filtrar por atleta"
          >
            <option value="">👤</option>
            {loadAthletes().map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="fg" style={{ flex: '1', minWidth: '140px' }}>
        <span className="lbl">Rótulo do período</span>
        <input placeholder="ex: Semana 4" value={label} onChange={e => setLabel(e.target.value)} />
      </div>
      <div className="fg" style={{ minWidth: '180px' }}>
        <span className="lbl">{`Escala da fonte — ${fontScale.toFixed(2)}×`}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="b bsm"
            style={{ padding: '4px 8px', minHeight: '28px' }}
            onClick={() => setFontScale(f => Math.max(0.5, Math.round((f - 0.01) * 1000) / 1000))}
          >
            −
          </button>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.01"
            value={fontScale}
            onChange={e => setFontScale(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#e87820' }}
          />
          <button
            type="button"
            className="b bsm"
            style={{ padding: '4px 8px', minHeight: '28px' }}
            onClick={() => setFontScale(f => Math.min(3, Math.round((f + 0.01) * 1000) / 1000))}
          >
            +
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          type="button"
          className="b bsm"
          onClick={() => {
            const d = new Date(year, month - 1, 1)
            setMonth(d.getMonth())
            setYear(d.getFullYear())
          }}
        >
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>
        <span
          style={{
            fontSize: '13px',
            color: '#ccc',
            padding: '0 6px',
            whiteSpace: 'nowrap',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {`${MONTH_PT[month]} ${year}`}
        </span>
        <button
          type="button"
          className="b bsm"
          onClick={() => {
            const d = new Date(year, month + 1, 1)
            setMonth(d.getMonth())
            setYear(d.getFullYear())
          }}
        >
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="b"
          style={{
            borderColor: 'var(--theme-accent)',
            color: previewOpen ? 'var(--theme-accent-text)' : 'var(--theme-accent)',
            background: previewOpen ? 'var(--theme-accent)' : 'transparent',
          }}
          onClick={() => setPreviewOpen(p => !p)}
        >
          <i className="ti ti-eye" aria-hidden="true" />
          {previewOpen ? ' Fechar' : ' Pré-visualizar'}
        </button>
        <button
          type="button"
          className="b"
          style={{
            borderColor: '#9b59b6',
            color: '#9b59b6',
            background: 'transparent',
          }}
          onClick={() => setPresenterOpen(true)}
          title="Modo TV — tela cheia com QR code para atletas"
        >
          <i className="ti ti-presentation" aria-hidden="true" />
          {' Apresentar'}
        </button>
        <button
          type="button"
          className="b bsm"
          title="Configurações"
          onClick={() => setSettingsOpen(true)}
        >
          <i className="ti ti-settings" aria-hidden="true" />
          {' Cores'}
        </button>
        <button
          type="button"
          className="b bsec"
          style={{ fontSize: '12px' }}
          onClick={() => {
            setExportTarget('daily')
            doExport('daily')
          }}
          disabled={exporting}
        >
          <i className="ti ti-download" aria-hidden="true" />
          {' Diário'}
        </button>
        <button
          type="button"
          className="b bsec"
          style={{ fontSize: '12px' }}
          onClick={() => {
            setExportTarget('semanal')
            doExport('semanal')
          }}
          disabled={exporting}
        >
          <i className="ti ti-table-column" aria-hidden="true" />
          {' Semanal'}
        </button>
        <button
          type="button"
          className="b bsec"
          style={{ fontSize: '12px' }}
          onClick={() => {
            setExportTarget('calendar')
            doExport('calendar')
          }}
          disabled={exporting}
        >
          <i className="ti ti-calendar-down" aria-hidden="true" />
          {' Calendário'}
        </button>
        <button
          type="button"
          className="b bsm"
          style={{
            fontSize: '12px',
            background: 'var(--theme-accent)',
            color: 'var(--theme-accent-text)',
            borderColor: 'var(--theme-accent)',
            fontWeight: 700,
          }}
          onClick={() => doMobileExport('A')}
          disabled={exporting}
        >
          <i className="ti ti-device-mobile" aria-hidden="true" />
          {' Mobile 01'}
        </button>
        <button
          type="button"
          className="b bsm"
          style={{
            fontSize: '12px',
            background: '#00b8d4',
            color: '#000',
            borderColor: '#00b8d4',
            fontWeight: 700,
          }}
          onClick={() => doMobileExport('B')}
          disabled={exporting}
        >
          <i className="ti ti-device-mobile" aria-hidden="true" />
          {' Mobile 02'}
        </button>
        <button
          type="button"
          className="b bsm"
          style={{
            fontSize: '11px',
            background: 'var(--theme-accent)',
            color: 'var(--theme-accent-text)',
            borderColor: 'var(--theme-accent)',
            fontWeight: 700,
          }}
          onClick={() => doMobileWeeklyExport('A')}
          disabled={exporting}
        >
          <i className="ti ti-layout-list" aria-hidden="true" />{' '}
          {APP_CONFIG.mobileWeeklyLabels?.[0] || 'Mobile Semanal 01'}
        </button>
        <button
          type="button"
          className="b bsm"
          style={{
            fontSize: '11px',
            background: '#00b8d4',
            color: '#000',
            borderColor: '#00b8d4',
            fontWeight: 700,
          }}
          onClick={() => doMobileWeeklyExport('B')}
          disabled={exporting}
        >
          <i className="ti ti-layout-list" aria-hidden="true" />{' '}
          {APP_CONFIG.mobileWeeklyLabels?.[1] || 'Mobile Semanal 02'}
        </button>
        {exporting && <span style={{ fontSize: '11px', color: '#e87820' }}>Exportando...</span>}
      </div>
    </div>
  )
}
