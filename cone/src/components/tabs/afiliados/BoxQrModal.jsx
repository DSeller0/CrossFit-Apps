import { IconCheck, IconCopy } from '@tabler/icons-react'
import Modal from '../../ui/Modal.jsx'
import Button from '../../ui/Button.jsx'
import s from './Afiliados.module.css'

// The per-box QR + shareable link (#56/C2).
//
// ⚠️ The link is a SOFT view scope (#80) — `?box=` filters what a public page shows
// and is NOT access control. The copy says "para compartilhar", never "privado".
//
// `qr` (a data URL) and `link` are computed by the container: `QRCode.toDataURL` is
// an async effect and `window.location.origin` is environment, neither of which
// belongs in a component that has to render in the gallery. `qr === ''` is the
// pending state.
//
// CLIENT-FREE.
export default function BoxQrModal({
  open,
  loc,
  qr = '',
  link = '',
  copied = false,
  onCopy,
  onClose,
}) {
  return (
    <Modal
      open={open}
      size="sm"
      title={`Link do ${loc?.name || 'box'}`}
      onClose={onClose}
      footer={
        <Button variant="primary" full onClick={onCopy}>
          {copied ? <IconCheck /> : <IconCopy />} {copied ? 'Copiado!' : 'Copiar link'}
        </Button>
      }
    >
      <div className={s.qrWrap}>
        {qr ? (
          <img
            src={qr}
            alt={`QR code do link público de ${loc?.name || 'box'}`}
            className={s.qrImg}
          />
        ) : (
          <div className={s.qrPending}>Gerando…</div>
        )}
        <div className={s.qrLink}>{link}</div>
        <p className={s.qrFoot}>
          Abre o app já filtrado neste box. Para compartilhar com atletas e testers — é um filtro de
          exibição, não uma restrição de acesso.
        </p>
      </div>
    </Modal>
  )
}
