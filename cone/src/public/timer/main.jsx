import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Timer from './Timer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Timer />
  </StrictMode>
)
