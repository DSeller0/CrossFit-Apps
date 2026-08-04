import Button from '../../ui/Button.jsx'
import cr from './criador.module.css'

// ── CriadorToolbar ────────────────────────────────────────────────────────────
// The page's actions, above the week. Rendered only while the editor is closed —
// once a session is open the editor header carries its own actions.
export function CriadorToolbar({ onImport, onTemplates, onGoToPublish, onNewSession }) {
  return (
    <div className={cr.toolbar}>
      <span className={cr.toolbarTitle}>Criador</span>
      <span className={cr.toolbarSpacer} />
      <Button size="sm" onClick={onImport} title="Colar a semana inteira de uma vez">
        <i className="ti ti-clipboard-text" /> Importar semana
      </Button>
      <Button size="sm" onClick={onTemplates}>
        <i className="ti ti-template" /> Templates
      </Button>
      {onGoToPublish && (
        <Button size="sm" onClick={onGoToPublish} title="Ir para Publicador">
          <i className="ti ti-calendar-event" /> Publicar
        </Button>
      )}
      <Button size="sm" variant="primary" onClick={onNewSession}>
        <i className="ti ti-plus" /> Nova sessão
      </Button>
    </div>
  )
}
