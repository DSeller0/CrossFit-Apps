import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from '../registerSW.js'
import Leaderboard from './Leaderboard.jsx'

registerSW()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Leaderboard />
  </StrictMode>
)
