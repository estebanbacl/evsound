import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CollectionDetail, ConnectedMiniPlayer, ListenHome } from '.'
import { usePlayerStore } from '../../state/playerStore'
import { fmtDuration } from './CollectionDetail'
import { resetCatalogCache } from '../../audio/ambientCatalog'

const catalog = {
  version: 1,
  collections: [
    {
      id: 'orbita',
      title: 'Órbita',
      artist: 'EV Sound Studio',
      genre: 'Ambiental',
      year: 2026,
      cover: { style: 'orbit', hue: 2, seed: 7 },
      tracks: [
        { id: 'orbita-1', title: 'Perigeo', file: '01.wav', durationS: 32 },
        { id: 'orbita-2', title: 'Horizonte lento', file: '02.wav', durationS: 34 },
      ],
    },
    {
      id: 'lluvia',
      title: 'Lluvia en cabina',
      artist: 'EV Sound Studio',
      genre: 'Naturaleza',
      year: 2026,
      cover: { style: 'rain', hue: 355, seed: 21 },
      tracks: [{ id: 'lluvia-1', title: 'Gotas', file: '01.wav', durationS: 31 }],
    },
  ],
}

const tree = (initial: string) => (
  <MemoryRouter initialEntries={[initial]}>
    <Routes>
      <Route path="/listen" element={<ListenHome />} />
      <Route path="/listen/:id" element={<CollectionDetail />} />
    </Routes>
    <ConnectedMiniPlayer />
  </MemoryRouter>
)

beforeEach(async () => {
  resetCatalogCache()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => catalog }) as Response),
  )
  usePlayerStore.setState({
    queue: [],
    order: [],
    pos: 0,
    playing: false,
    positionS: 0,
    durationS: 0,
    recent: [],
    lastTrackId: null,
    lastCollectionId: null,
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('Listen', () => {
  it('home shows the three shelves and empty states', async () => {
    render(tree('/listen'))
    expect(await screen.findByText('Último escuchado')).toBeInTheDocument()
    expect(screen.getByText('Reproducido recientemente')).toBeInTheDocument()
    expect(screen.getByText('Para ti')).toBeInTheDocument()
    expect(screen.getAllByText('Aún no has escuchado nada.')).toHaveLength(2)
    expect(screen.getByLabelText('Abrir Órbita')).toBeInTheDocument()
  })

  it('quick play from a card fills the mini player and "recent"', async () => {
    render(tree('/listen'))
    await userEvent.click(await screen.findByRole('button', { name: 'Reproducir Órbita' }))
    const mini = await screen.findByRole('group', { name: 'Reproductor' })
    expect(mini).toHaveTextContent('Perigeo')
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument()
    expect(usePlayerStore.getState().recent).toEqual(['orbita'])
  })

  it('detail lists tracks, highlights the active one and handles clicks', async () => {
    render(tree('/listen/orbita'))
    const second = await screen.findByRole('button', { name: /Horizonte lento/ })
    expect(document.querySelectorAll('.tracklist li')).toHaveLength(2)
    await userEvent.click(second)
    expect(second).toHaveAttribute('aria-current', 'true')
    expect(usePlayerStore.getState().playing).toBe(true)
    await userEvent.click(second) // active track toggles pause
    expect(usePlayerStore.getState().playing).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Reproducir colección' }))
    expect(usePlayerStore.getState().playing).toBe(true)
  })

  it('mini player controls drive the store', async () => {
    render(tree('/listen/orbita'))
    await userEvent.click(await screen.findByRole('button', { name: /Perigeo/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Reproductor' })).toHaveTextContent(
        'Horizonte lento',
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Aleatorio' }))
    expect(usePlayerStore.getState().shuffle).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Repetir' }))
    expect(usePlayerStore.getState().repeat).toBe(true)
  })

  it('shows a retryable error when the catalog fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    )
    render(tree('/listen'))
    expect(await screen.findByText(/No se pudo cargar/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('unknown collection id shows a not-found message', async () => {
    render(tree('/listen/nope'))
    expect(await screen.findByText('Colección no encontrada.')).toBeInTheDocument()
  })

  it('formats durations as m:ss', () => {
    expect(fmtDuration(236)).toBe('3:56')
    expect(fmtDuration(32)).toBe('0:32')
  })
})
