import Input from '../../../ui/Input'
import { FORMATS } from './FormatRail'
import s from '../Publicador.module.css'

const FORMAT_LABEL = Object.fromEntries(FORMATS.map(f => [f.id, f.label]))
const MOBILE_FORMATS = new Set(['diaMobile', 'semanaMobile'])

// Títulos — the 6th Aparência panel (#59 · C5·b2 · plans/83 T7). The title field
// is PER FORMAT — the same string meant something different on all 5 (a Semana
// title showing up on Dia's header) — while Academia and Rodapé are global.
// `label` (the old shared field) migrated into `titles.semana` on first read; the
// caller owns that migration, this panel only edits whatever format is selected.
export default function TitulosPanel({
  gymName,
  onGymName,
  footer,
  onFooter,
  format,
  title,
  onTitleChange,
  computedDefault,
}) {
  const isMobile = MOBILE_FORMATS.has(format)
  return (
    <div>
      <p className={s.grp}>Global — vale para todos os formatos</p>
      <Input
        label="Academia"
        placeholder="Cone"
        value={gymName}
        onChange={e => onGymName(e.target.value)}
      />
      <Input
        label="Rodapé"
        placeholder="@seubox"
        value={footer}
        onChange={e => onFooter(e.target.value)}
        disabled={!isMobile}
        hint={isMobile ? '' : 'só aparece nos formatos mobile'}
      />

      <p className={s.grp}>Deste formato — {FORMAT_LABEL[format] || format}</p>
      <Input
        label="Título"
        placeholder={computedDefault}
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        hint={`vazio = "${computedDefault}"`}
      />
      <p className={s.hint} style={{ marginLeft: 0, marginTop: 6 }}>
        Dia · Mês · Dia mobile · Semana mobile guardam o próprio título cada um.
      </p>
    </div>
  )
}
