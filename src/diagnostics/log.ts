export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  t: string
  level: LogLevel
  message: string
  data?: unknown
}

const MAX = 500
const entries: LogEntry[] = []

/** In-memory ring buffer; exported with the diagnostics panel. Nothing leaves the device. */
export function log(level: LogLevel, message: string, data?: unknown) {
  entries.push({ t: new Date().toISOString(), level, message, data })
  if (entries.length > MAX) entries.shift()
}

export const getLog = (): readonly LogEntry[] => entries
export const clearLog = () => void (entries.length = 0)

const text = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e))

let installed = false

/** Captures uncaught errors, unhandled rejections and console.warn/error into the log. */
export function installGlobalHandlers(onError?: (message: string) => void) {
  if (installed) return
  installed = true
  window.addEventListener('error', (ev) => {
    log('error', `Uncaught: ${ev.message}`, { source: ev.filename, line: ev.lineno })
    onError?.('Ocurrió un error inesperado.')
  })
  window.addEventListener('unhandledrejection', (ev) => {
    log('error', `Unhandled rejection: ${text(ev.reason)}`)
    onError?.('Ocurrió un error inesperado.')
  })
  for (const level of ['warn', 'error'] as const) {
    const orig = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      log(level, args.map(text).join(' '))
      orig(...args)
    }
  }
}
