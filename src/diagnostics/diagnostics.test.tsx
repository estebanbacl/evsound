import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusBar } from '../app/StatusBar'
import { ErrorBoundary } from './ErrorBoundary'
import { clearLog, getLog, installGlobalHandlers, log } from './log'
import { computeGpsHz, featureSupport } from './metrics'
import { useTapSequence } from './useTapSequence'

describe('log', () => {
  beforeEach(clearLog)

  it('keeps a bounded ring buffer', () => {
    for (let i = 0; i < 600; i++) log('info', `m${i}`)
    expect(getLog()).toHaveLength(500)
    expect(getLog()[0].message).toBe('m100')
  })

  it('captures uncaught errors, rejections and console.error, and tells the UI', () => {
    const onError = vi.fn()
    installGlobalHandlers(onError)
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }))
    const rej = new Event('unhandledrejection') as Event & { reason: unknown }
    rej.reason = new Error('nope')
    window.dispatchEvent(rej)
    console.warn('careful')
    expect(getLog().map((e) => e.message)).toEqual([
      'Uncaught: boom',
      'Unhandled rejection: Error: nope',
      'careful',
    ])
    expect(onError).toHaveBeenCalledTimes(2)
  })
})

describe('metrics', () => {
  it('computes the mean GPS rate', () => {
    const pts = Array.from({ length: 6 }, (_, i) => ({ t: i * 1000, v: 1 }))
    expect(computeGpsHz(pts)).toBeCloseTo(1)
    expect(computeGpsHz(pts.map((p) => ({ ...p, t: p.t / 2 })))).toBeCloseTo(2)
    expect(computeGpsHz([{ t: 0, v: 0 }])).toBeNull()
  })

  it('lists the eight feature checks of the field-test page', () => {
    expect(featureSupport().map((f) => f.name)).toEqual([
      'Geolocation',
      'DeviceMotion',
      'Service Worker',
      'Cache Storage',
      'storage.estimate',
      'Media Session',
      'Wake Lock',
      'WebGL2',
    ])
  })
})

describe('useTapSequence', () => {
  it('fires on the 5th tap within the window, not when taps are too slow', () => {
    let t = 0
    const fire = vi.fn()
    const { result } = renderHook(() => useTapSequence(5, 3000, fire, () => t))
    for (let i = 0; i < 4; i++) {
      result.current()
      t += 500
    }
    expect(fire).not.toHaveBeenCalled()
    result.current()
    expect(fire).toHaveBeenCalledTimes(1)
    for (let i = 0; i < 5; i++) {
      result.current()
      t += 1500 // too slow: only 2 taps fit in the window
    }
    expect(fire).toHaveBeenCalledTimes(1)
  })
})

describe('hidden diagnostics panel', () => {
  it('opens after 5 taps on the clock and closes again', async () => {
    render(<StatusBar />)
    const time = document.querySelector('time')!
    for (let i = 0; i < 5; i++) await userEvent.click(time)
    expect(screen.getByRole('dialog', { name: 'Diagnóstico' })).toBeInTheDocument()
    expect(screen.getByText('FPS de UI')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ErrorBoundary', () => {
  it('shows a recoverable fallback and logs the error', () => {
    clearLog()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Bomb = () => {
      throw new Error('render failed')
    }
    act(() => {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      )
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal')
    expect(screen.getByRole('button', { name: 'Exportar log' })).toBeInTheDocument()
    expect(getLog().some((e) => e.message.includes('render failed'))).toBe(true)
    spy.mockRestore()
  })
})
