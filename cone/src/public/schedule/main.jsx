import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Schedule from './Schedule.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Schedule />
  </StrictMode>
)
