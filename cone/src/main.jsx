import { createRoot } from 'react-dom/client'
import '../../themes.css'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { SyncProvider } from './context/SyncContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <SyncProvider>
      <App />
    </SyncProvider>
  </AuthProvider>
)
