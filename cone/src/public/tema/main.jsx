import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../fonts.js'
import Tema from './Tema.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Tema />
  </StrictMode>,
)
