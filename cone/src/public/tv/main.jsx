import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TV from './TV.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode><TV /></StrictMode>
)
