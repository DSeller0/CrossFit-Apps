import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../fonts.js'
import Results from './Results.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Results />
  </StrictMode>
)
