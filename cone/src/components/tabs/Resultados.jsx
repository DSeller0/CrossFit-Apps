import { useState } from 'react'
import { loadResults, loadAthletes } from '../../utils/storage'
import { RegistroView } from './resultados/RegistroView.jsx'

// ── ResultadosTab (root) ──────────────────────────────────────────────────────
// #57/plans/80 (C3) removed the sub-tab bar entirely. It had three entries: Leaderboard
// was a second copy of leaderboard.html (deleted in Phase 0), and Histórico's two halves
// moved to where they are actually looked for — "Por atleta" into the Atletas ficha,
// "Por sessão" onto the session itself inside the class header. Nothing was left behind
// it, and a bar of one tab is not a bar.
//
// What survives here is the data ownership: this component holds `athletes`/`results`
// (the two storage reads) so RegistroView's own tree takes everything as props.
export default function ResultadosTab({ sessions, preload, onPreloadConsumed }) {
  const [athletes] = useState(loadAthletes)
  const [results, setResults] = useState(loadResults)

  return (
    <RegistroView
      athletes={athletes}
      sessions={sessions}
      results={results}
      setResults={setResults}
      preload={preload}
      onPreloadConsumed={onPreloadConsumed}
    />
  )
}
