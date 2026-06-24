import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../fonts.js'
import Recover from './Recover.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Recover />
  </StrictMode>
)
