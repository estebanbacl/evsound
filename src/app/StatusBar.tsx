import { useEffect, useState } from 'react'
import { es } from '../i18n/es'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function StatusBar() {
  const now = useClock()
  return (
    <header className="status-bar" role="banner">
      <div className="status-left">
        <span className="gear" aria-label="Modo inferido">
          P<i>R</i>
          <i>N</i>
          <i>D</i>
        </span>
        <span>{es.status.gps}: --</span>
        <span>{es.status.audio}: --</span>
      </div>
      <time>{now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</time>
    </header>
  )
}
