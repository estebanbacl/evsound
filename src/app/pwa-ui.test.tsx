import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdatePrompt } from './UpdatePrompt'
import { StatusBar } from './StatusBar'
import { useDriveStore } from '../state/driveStore'
import { usePwaStore } from '../state/pwaStore'

describe('PWA UI', () => {
  beforeEach(() => {
    usePwaStore.setState({ needRefresh: false, applyUpdate: null, online: true })
    useDriveStore.setState({ active: false })
  })

  it('shows the update banner and applies the update on request', async () => {
    const apply = vi.fn(async () => {})
    render(<UpdatePrompt />)
    expect(screen.queryByRole('alert')).toBeNull()
    act(() => usePwaStore.getState().setNeedRefresh(true, apply))
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(apply).toHaveBeenCalled()
  })

  it('"Después" dismisses it', async () => {
    render(<UpdatePrompt />)
    act(() => usePwaStore.getState().setNeedRefresh(true, async () => {}))
    await userEvent.click(screen.getByRole('button', { name: 'Después' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('never shows the banner while driving', () => {
    render(<UpdatePrompt />)
    act(() => {
      usePwaStore.getState().setNeedRefresh(true, async () => {})
      useDriveStore.getState().setActive(true)
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('status bar shows an offline chip', () => {
    render(<StatusBar />)
    expect(screen.queryByText('Sin conexión')).toBeNull()
    act(() => usePwaStore.getState().setOnline(false))
    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
  })
})
