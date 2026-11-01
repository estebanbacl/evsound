import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CategoryDetail, ConnectedMiniPlayer, ListenHome } from '.'
import { resetCatalogCache } from '../../audio/ambientCatalog'
import { usePlayerStore } from '../../state/playerStore'
import { useSettingsStore } from '../../state/settingsStore'

vi.mock('../../app/PacksPanel', () => ({ PacksPanel: () => null }))

const sound = (categoryId: string, title: string, slug: string, featured = false) => ({
  id: `${categoryId}/${slug}`,
  categoryId,
  title,
  file: `${slug}.wav`,
  durationS: 24,
  ...(featured ? { featured: true } : {}),
})

const catalog = {
  version: 2,
  categories: [
    {
      id: 'naturaleza',
      title: 'Naturaleza',
      description: 'Bosques.',
      cover: { style: 'forest', hue: 140, seed: 1 },
    },
    {
      id: 'lluvia',
      title: 'Lluvia',
      description: 'Lluvia suave.',
      cover: { style: 'rain', hue: 355, seed: 2 },
    },
  ],
  sounds: [
    sound('naturaleza', 'Bosque tranquilo', 'bosque-tranquilo', true),
    sound('naturaleza', 'Río en el bosque', 'rio'),
    sound('lluvia', 'Lluvia ligera', 'ligera'),
  ],
}

const tree = (initial: string) => (
  <MemoryRouter initialEntries={[initial]}>
    <Routes>
      <Route path="/listen" element={<ListenHome />} />
      <Route path="/listen/:id" element={<CategoryDetail />} />
      <Route path="/vehicle" element={<ConnectedMiniPlayer />} />
    </Routes>
  </MemoryRouter>
)

beforeEach(() => {
  resetCatalogCache()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => catalog }) as Response),
  )
  usePlayerStore.setState({
    soundId: null,
    playing: false,
    volume: 0.5,
    timerMin: 0,
    endsAt: null,
    favorites: [],
    recent: [],
  })
  useSettingsStore.setState({ ambientMode: 'pause' })
})
afterEach(() => vi.unstubAllGlobals())

describe('Listen', () => {
  it('shows the categories, the idle player and never autoplays', async () => {
    render(tree('/listen'))
    expect(await screen.findByRole('link', { name: 'Abrir Naturaleza' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir Lluvia' })).toBeInTheDocument()
    expect(screen.getByText('Nada en reproducción')).toBeInTheDocument()
    expect(usePlayerStore.getState().playing).toBe(false)
    expect(screen.getByText(/no usan GPS/)).toBeInTheDocument()
  })

  it('plays a sound from a category and the panel follows; pause / stop / volume / timer', async () => {
    render(tree('/listen/naturaleza'))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reproducir Bosque tranquilo' }),
    )
    const panel = screen.getByRole('complementary', { name: 'Reproduciendo ahora' })
    expect(within(panel).getByText('Bosque tranquilo')).toBeInTheDocument()
    expect(within(panel).getByText(/Naturaleza · Sonido ambiental/)).toBeInTheDocument()
    expect(usePlayerStore.getState()).toMatchObject({
      playing: true,
      soundId: 'naturaleza/bosque-tranquilo',
    })

    await userEvent.click(within(panel).getByRole('button', { name: 'Pausar' }))
    expect(usePlayerStore.getState().playing).toBe(false)
    await userEvent.click(within(panel).getByRole('button', { name: 'Reproducir' }))
    expect(usePlayerStore.getState().playing).toBe(true)

    await userEvent.click(within(panel).getByRole('radio', { name: '30' }))
    expect(usePlayerStore.getState().timerMin).toBe(30)
    expect(usePlayerStore.getState().endsAt).not.toBeNull()
    await userEvent.click(within(panel).getByRole('radio', { name: '∞' }))
    expect(usePlayerStore.getState().endsAt).toBeNull()

    await userEvent.click(within(panel).getByRole('button', { name: 'Detener' }))
    expect(usePlayerStore.getState().playing).toBe(false)
  })

  it('favourites and recents show on the home; selecting a sound does not touch the vehicle', async () => {
    render(tree('/listen/naturaleza'))
    await userEvent.click(
      await screen.findByRole('button', { name: /Añadir a favoritos: Río en el bosque/ }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reproducir Río en el bosque' }))
    expect(usePlayerStore.getState().favorites).toEqual(['naturaleza/rio'])
    expect(usePlayerStore.getState().recent[0]).toBe('naturaleza/rio')
    expect(localStorage.getItem('ev-vehicle')).toBeNull()
  })

  it('lets the user choose whether sounds replace or mix with the engine', async () => {
    render(tree('/listen'))
    const panel = await screen.findByRole('complementary', { name: 'Reproduciendo ahora' })
    expect(within(panel).getByRole('radio', { name: 'Pausar' })).toBeChecked()
    await userEvent.click(within(panel).getByRole('radio', { name: 'Mezclar' }))
    expect(useSettingsStore.getState().ambientMode).toBe('mix')
  })

  it('shows a retry when the library fails to load', async () => {
    resetCatalogCache()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    )
    render(tree('/listen'))
    expect(await screen.findByText(/No se pudo cargar la biblioteca/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('mini player appears on other tabs once something plays', async () => {
    usePlayerStore.setState({ soundId: 'lluvia/ligera', playing: true })
    render(tree('/vehicle'))
    const mini = await screen.findByRole('group', { name: 'Reproductor' })
    expect(mini).toHaveTextContent('Lluvia ligera')
    await userEvent.click(within(mini).getByRole('button', { name: 'Detener' }))
    await waitFor(() => expect(usePlayerStore.getState().playing).toBe(false))
  })
})
