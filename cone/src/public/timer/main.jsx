import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../fonts.js'
import Timer from './Timer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Timer />
  </StrictMode>
)
