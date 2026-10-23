import { Component, type ErrorInfo, type ReactNode } from 'react'
import { downloadJson } from './download'
import { getLog, log } from './log'

interface State {
  error: Error | null
}

/** Last-resort UI: the app never ends on a blank screen. Keeps the log exportable. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log('error', `React: ${error.message}`, { stack: error.stack, component: info.componentStack })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        role="alert"
        style={{
          display: 'grid',
          placeItems: 'center',
          height: '100%',
          textAlign: 'center',
          padding: 32,
        }}
      >
        <div>
          <h1 style={{ color: 'var(--accent)', fontWeight: 400 }}>Algo salió mal</h1>
          <p>La app encontró un error. Tus ajustes se conservan.</p>
          <p style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="big-btn" onClick={() => location.reload()}>
              Reiniciar
            </button>
            <button
              className="big-btn is-ghost"
              onClick={() =>
                downloadJson(`ev-error-${Date.now()}.json`, JSON.stringify(getLog(), null, 2))
              }
            >
              Exportar log
            </button>
          </p>
        </div>
      </div>
    )
  }
}
