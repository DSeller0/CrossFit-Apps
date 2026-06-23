import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Me from './Me.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Me />
  </StrictMode>
)
