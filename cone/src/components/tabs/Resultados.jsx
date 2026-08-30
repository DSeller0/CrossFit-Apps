import { useState } from 'react'
import { loadResults, loadAthletes } from '../../utils/storage'
import { RegistroView } from './resultados/RegistroView.jsx'
import { HistoryView } from './resultados/HistoryView.jsx'

// ── ResultadosTab (root) ──────────────────────────────────────────────────────
export default function ResultadosTab({ sessions, preload, onPreloadConsumed }) {
  const [subView, setSubView] = useState('registro')
  const [athletes] = useState(loadAthletes)
  const [results, setResults] = useState(loadResults)

  return (
    <div>
      <div className="res-tabs">
        {[
          ['registro', 'ti-pencil', 'Registro'],
          ['history', 'ti-chart-bar', 'Histórico / KPIs'],
        ].map(([id, icon, lbl]) => (
          <button
            key={id}
            type="button"
            className={`res-tab ${subView === id ? 'on' : ''}`}
            onClick={() => setSubView(id)}
          >
            <i className={`ti ${icon}`} /> {lbl}
          </button>
        ))}
      </div>
      {subView === 'registro' && (
        <RegistroView
          athletes={athletes}
          sessions={sessions}
          results={results}
          setResults={setResults}
          preload={preload}
          onPreloadConsumed={onPreloadConsumed}
        />
      )}
      {subView === 'history' && (
        <HistoryView athletes={athletes} sessions={sessions} results={results} />
      )}
    </div>
  )
}
