import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './app/App'
import { registerPwa } from './pwa/register'
import { ErrorBoundary } from './diagnostics/ErrorBoundary'
import { installGlobalHandlers } from './diagnostics/log'
import { toast } from './state/toastStore'
import './ui/tokens.css'
import './ui/components/components.css'
import './app/app.css'

installGlobalHandlers((m) => toast(m, 'error'))
registerPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
