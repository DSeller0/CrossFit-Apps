import { useState } from 'react'
import { ExerciseList } from '../shared/ExerciseList.jsx'
import Nav from '../Nav.jsx'
import { blkColor } from '../lib/wod.js'
import s from './Gallery.module.css'

// ── Component gallery (dev-only) ───────────────────────────────────────────────
// The all-states source of truth: renders the REAL components in every state so
// it cannot drift from what ships. Grows page-by-page as reusable pieces are
// extracted (see #17 / the design program). Coverage standard + process:
// cone/docs/WORKFLOW.md → "Design / component gallery".

const THEMES = [
  { v: 'totk-dark',            label: 'TotK Dark' },
  { v: 'totk-light',           label: 'TotK Light' },
  { v: 'spirit-blossom',       label: 'Spirit Blossom' },
  { v: 'spirit-blossom-light', label: 'Spirit Blossom Light' },
]

// Family (data) colors come from the real blkColor(), not theme tokens.
const AMBER = blkColor({ type: 'For Time' })
const BLUE  = blkColor({ type: 'Força' })
const RED   = blkColor({ type: 'WOD' })
const GREEN = blkColor({ type: 'Aquecimento' })

// ── Mock fixtures — the exercise state matrix (data-shape variants) ──
const exStandard = { id: 'e1', name: 'Thruster', sets: 5, reps: '5', intensity: { mode: 'pct', pct: 75 }, note: 'Quebrar cedo nos thrusters.' }
const exScheme   = { id: 'e2', name: 'Wall Ball', reps: '21,15,9', intensity: { mode: 'gender', Masculino_RX: '9', Masculino_Inter: '7', Feminino_RX: '6', Feminino_Inter: '5', Masculino_unit: 'kg', Feminino_unit: 'kg' } }
const exProg     = { id: 'e3', name: 'Back Squat', sets: 5, reps: '3', intensity: { mode: 'progression', steps: [{ reps: '3', load: '70' }, { reps: '3', load: '80' }, { reps: '3', load: '90' }] } }
const exComplex  = { id: 'e4', isComplex: true, name: '', sets: 4, complexMovements: [{ id: 'm1', name: 'Clean Pull', reps: '2' }, { id: 'm2', name: 'Power Clean', reps: '1' }, { id: 'm3', name: 'Push Jerk', reps: '1' }], intensity: { mode: 'pct', pct: 70 } }
const exDist     = { id: 'e5', name: 'Row', dist: '500', distUnit: 'm' }
const exCal      = { id: 'e6', name: 'Assault Bike', dist: '15', distUnit: 'cal' }
const exCardio   = { id: 'e7', name: 'Corrida', intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' } }
const exLong     = { id: 'e8', name: 'Dumbbell Devil Press Alternating Bare-Hand', sets: 3, reps: '10', intensity: { mode: 'pct', pct: 60 } }
const exNoteOnly = { id: 'e9', name: 'Alongamento', note: '2 min cada lado' }

const FULL_LIST = [exStandard, exScheme, exProg, exComplex, exDist, exCal, exCardio, exLong, exNoteOnly]

function Case({ label, children }) {
  return (
    <div className={s.case}>
      <div className={s.caseLbl}>{label}</div>
      <div className={s.caseStage}>{children}</div>
    </div>
  )
}

function Section({ title, sub, children }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHdr}>
        <h2 className={s.sectionTitle}>{title}</h2>
        {sub && <span className={s.sectionSub}>{sub}</span>}
      </div>
      {children}
    </section>
  )
}

export default function Gallery() {
  const [theme, setTheme] = useState(() => localStorage.getItem('cone_theme') || 'totk-dark')
  const [w, setW] = useState('full')

  function changeTheme(v) {
    setTheme(v)
    document.documentElement.className = 'theme-' + v
    try { localStorage.setItem('cone_theme', v) } catch { /* ignore */ }
  }

  return (
    <div className={s.root}>
      <header className={s.bar}>
        <div className={s.barTitle}>Galeria de componentes <span className={s.barDev}>dev</span></div>
        <div className={s.barCtrls}>
          <label className={s.ctrl}>
            <span className={s.ctrlLbl}>Tema</span>
            <select className={s.select} value={theme} onChange={e => changeTheme(e.target.value)}>
              {THEMES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </label>
          <div className={s.wToggle} role="group" aria-label="Largura do palco">
            <button className={`${s.wBtn}${w === 'mobile' ? ' ' + s.wBtnOn : ''}`} onClick={() => setW('mobile')}>390</button>
            <button className={`${s.wBtn}${w === 'full' ? ' ' + s.wBtnOn : ''}`} onClick={() => setW('full')}>Full</button>
          </div>
        </div>
      </header>

      <main className={`${s.stage}${w === 'mobile' ? ' ' + s.stageMobile : ''}`}>
        <Section title="ExerciseList" sub="src/public/shared/ExerciseList.jsx — read-only, compartilhado (TV + schedule)">
          <Case label="Matriz completa · compact"><ExerciseList exercises={FULL_LIST} color={AMBER} /></Case>
          <Case label="Padrão · pct"><ExerciseList exercises={[exStandard]} color={BLUE} /></Case>
          <Case label="Esquema 21-15-9 · gender"><ExerciseList exercises={[exScheme]} color={RED} /></Case>
          <Case label="Progressão"><ExerciseList exercises={[exProg]} color={BLUE} /></Case>
          <Case label="Complexo"><ExerciseList exercises={[exComplex]} color={BLUE} /></Case>
          <Case label="Distância m / cal + cardio legado"><ExerciseList exercises={[exDist, exCal, exCardio]} color={GREEN} /></Case>
          <Case label="Nome longo (overflow)"><ExerciseList exercises={[exLong]} color={AMBER} /></Case>
          <Case label="Só nota (sem volume)"><ExerciseList exercises={[exNoteOnly]} color={GREEN} /></Case>
          <Case label="Vazio"><ExerciseList exercises={[]} color={AMBER} /></Case>
          <Case label="size='large' (TV)"><ExerciseList exercises={[exStandard, exComplex]} color={AMBER} size="large" /></Case>
        </Section>

        <Section title="Nav" sub="src/public/Nav.jsx — chrome fixo; a forma muda por viewport (barra ≤767 / sidebar ≥768). Redimensione o navegador para ver a sidebar.">
          <Case label="active='schedule' — contido num quadro (fixed→relativo via transform)">
            <div className={s.navFrame}><Nav active="schedule" gymName="Team Medrado" /></div>
          </Case>
        </Section>
      </main>
    </div>
  )
}
