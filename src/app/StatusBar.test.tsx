import { act, render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'
import { useTelemetryStore } from '../state/telemetryStore'

describe('StatusBar', () => {
  beforeEach(() => useTelemetryStore.getState().reset())

  it('infers P when stopped and D when moving', () => {
    render(<StatusBar />)
    expect(screen.getByLabelText(/parado/)).toBeInTheDocument()
    act(() => useTelemetryStore.getState().setEstimate(10, 0))
    expect(screen.getByLabelText(/marcha/)).toBeInTheDocument()
  })

  it('shows GPS warnings for stale and lost signal', () => {
    render(<StatusBar />)
    act(() => {
      useTelemetryStore.getState().setRunning(true)
      useTelemetryStore.getState().setRaw(10, 'stale', 'gps')
    })
    expect(screen.getByText(/GPS: Sin señal/)).toBeInTheDocument()
    act(() => useTelemetryStore.getState().setRaw(10, 'lost', 'gps'))
    expect(screen.getByText(/GPS: Perdido/)).toBeInTheDocument()
  })
})
