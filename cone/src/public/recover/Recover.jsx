import { useState, useMemo, useEffect } from 'react'
import s from './Recover.module.css'

const KEYS = {
  'gym_v9':                   'Sessões de treino',
  'eagles_athletes_v1':       'Atletas',
  'eagles_results_v1':        'Resultados',
  'eagles_events_v1':         'Eventos / agenda',
  'eagles_locations_v1':      'Serviços / locais',
  'eagles_coach_v1':          'Perfil do professor',
  'eagles_settings_v1':       'Configurações',
  'eagles_lb_colors_v1':      'Cores do leaderboard',
  'eagles_block_registry_v1': 'Registro de exercícios',
  'eagles_athlete_goals_v1':  'Metas e PRs',
}

function countItems(val, key) {
  try {
    const v = JSON.parse(val)
    if (Array.isArray(v)) return `${v.length} itens`
    if (typeof v === 'object' && v !== null) {
      if (key === 'gym_v9') {
        const days = Object.keys(v).length
        const sess = Object.values(v).reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0)
        return `${days} dias · ${sess} sessões`
      }
      return `${Object.keys(v).length} itens`
    }
    return '—'
  } catch { return '—' }
}

export default function Recover() {
  const [copied, setCopied] = useState(false)

  const { found, payload, blobUrl } = useMemo(() => {
    const found = {}
    Object.keys(KEYS).forEach(k => {
      const v = localStorage.getItem(k)
      if (v) found[k] = v
    })
    if (Object.keys(found).length === 0) return { found, payload: null, blobUrl: null }
    const payload = JSON.stringify(
      Object.fromEntries(Object.entries(found).map(([k, v]) => [k, JSON.parse(v)])),
      null, 2
    )
    const blob = new Blob([payload], { type: 'application/json' })
    return { found, payload, blobUrl: URL.createObjectURL(blob) }
  }, [])

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [blobUrl])

  function copyData() {
    navigator.clipboard.writeText(payload).then(ok).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = payload
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      ok()
    })
    function ok() {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const hasData = Object.keys(found).length > 0
  const today   = new Date().toISOString().slice(0, 10)

  return (
    <div className={s.card}>
      <div className={s.header}>
        <span className={s.title}>Cone — Recuperar dados</span>
        <a href="index.html" className={s.back} title="Início">← Início</a>
      </div>

      <p className={s.sub}>
        {hasData ? 'Dados encontrados neste navegador:' : 'Lendo localStorage deste navegador...'}
      </p>

      {!hasData ? (
        <div className={s.empty}>
          Nenhum dado encontrado neste navegador.<br />
          Os dados podem ter sido apagados.
        </div>
      ) : (
        <>
          {Object.entries(KEYS).map(([k, label]) => (
            <div key={k} className={s.row}>
              <span className={s.rowLabel}>{label}</span>
              <span className={found[k] ? s.rowVal : s.none}>
                {found[k] ? countItems(found[k], k) : '—'}
              </span>
            </div>
          ))}

          <a className={`${s.btn} ${s.btnDl}`} href={blobUrl} download={`cone-backup-${today}.json`}>
            ⬇ Baixar backup (.json)
          </a>

          <button className={`${s.btn} ${s.btnCopy} ${copied ? s.ok : ''}`} onClick={copyData}>
            {copied ? '✓ Copiado!' : '📋 Copiar JSON'}
          </button>

          <div className={s.warn}>
            Compartilhe o arquivo baixado (ou o JSON copiado) com o administrador para restaurar os dados no Supabase.
          </div>
        </>
      )}
    </div>
  )
}
