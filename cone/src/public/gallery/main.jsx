import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../fonts.js'
import Gallery from './Gallery.jsx'

// Dev-only component gallery — see cone/docs/WORKFLOW.md ("Design / component
// gallery"). NOT in vite.public.config.js rollupOptions.input, so it is served
// by `npm run dev:public` at /CrossFit-Apps/gallery.html but never built/deployed.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
)
