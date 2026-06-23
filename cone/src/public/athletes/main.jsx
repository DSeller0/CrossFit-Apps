import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Athletes from './Athletes.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Athletes />
  </StrictMode>
)
