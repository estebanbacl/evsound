import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Onboarding } from '../Onboarding'
import { SpecsPanel } from './SpecsPanel'
import { highlightedSpecs, specRows } from './specs'
import { fullName, vehicleCatalog } from '../../vehicles/catalog'
import { VehicleChangeModal } from './VehicleChangeModal'
import { useVehicleStore } from '../../state/vehicleStore'

describe('specs', () => {
  it('formats rows in Spanish (comma decimals, cycle in label)', () => {
    const rows = specRows(vehicleCatalog[0])
    expect(rows.find((r) => r.key === 'zeroTo100')?.value).toBe('4,3 s')
    expect(rows.find((r) => r.key === 'range')?.label).toContain('WLTP')
    expect(specRows(vehicleCatalog[2]).find((r) => r.key === 'battery')?.value).toBe('69,8 kWh')
  })
  it('maps 3D parts to spec rows', () => {
    expect(highlightedSpecs('battery')).toContain('battery')
    expect(highlightedSpecs('motor')).toContain('power')
    expect(highlightedSpecs(null)).toEqual([])
  })
})

describe('SpecsPanel', () => {
  it('shows the unverified note and the non-affiliation disclaimer', () => {
    render(<SpecsPanel vehicle={vehicleCatalog[1]} part="battery" />)
    expect(screen.getByText(/sin verificar/)).toBeInTheDocument()
    expect(screen.getByText(/no afiliado a Tesla/)).toBeInTheDocument()
    expect(screen.getByText('75 kWh').closest('li')).toHaveClass('is-hi')
  })
})

vi.mock('../../app/engineSession', () => ({ previewSound: vi.fn(async () => undefined) }))

describe('Onboarding v2 + vehicleStore', () => {
  beforeEach(() => useVehicleStore.setState({ vehicleId: null, onboarded: false }))
  const renderOb = () =>
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    )

  it('walks welcome → vehicle → validation, keeps progress when going back, then persists', async () => {
    renderOb()
    expect(screen.getByRole('heading', { name: 'Tu vehículo. Tu sonido.' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(5)
    await userEvent.click(screen.getByRole('button', { name: /Continuar a selección de vehículo/ }))

    expect(screen.getByRole('radio', { name: /Tesla Model Y/ })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: /iCAR 03/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    // validation: nothing is reported as available by default
    expect(screen.getByText('iCAR 03', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Sin comprobar')).toBeInTheDocument()
    expect(screen.getByText('Sin confirmar')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Configuración pendiente')

    // going back keeps the selection
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.getByRole('radio', { name: /iCAR 03/ })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    // nothing persisted before finishing
    expect(useVehicleStore.getState().onboarded).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Explorar experiencia de sonido' }))
    expect(useVehicleStore.getState()).toMatchObject({ vehicleId: 'icar-03', onboarded: true })
  })

  it('does not request location until the user asks, and confirms audio only on their answer', async () => {
    const getCurrentPosition = vi.fn((ok: () => void) => ok())
    vi.stubGlobal('AudioContext', function () {})
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    renderOb()
    await userEvent.click(screen.getByRole('button', { name: /Continuar a selección/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(getCurrentPosition).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Comprobar GPS' }))
    expect(getCurrentPosition).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, se escuchó' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('¡Todo listo para escuchar!'),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Listo')
    vi.unstubAllGlobals()
  })

  it('the help mode shows the instructions only and closes with Escape', async () => {
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <Onboarding onClose={onClose} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /Continuar/ })).toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('VehicleChangeModal', () => {
  it('preselects the active vehicle, disables confirm until it differs, and Escape cancels', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      <VehicleChangeModal currentId="tesla-model-3" onCancel={onCancel} onConfirm={onConfirm} />,
    )
    expect(screen.getByRole('radio', { name: /Tesla Model 3/ })).toBeChecked()
    const confirm = screen.getByRole('button', { name: 'Confirmar cambio' })
    expect(confirm).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: /iCAR 03/ }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith('icar-03')
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })

  it('moves the selection with arrow keys', async () => {
    render(<VehicleChangeModal currentId="tesla-model-y" onCancel={vi.fn()} onConfirm={vi.fn()} />)
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: /Tesla Model 3/ })).toBeChecked()
  })
})

describe('naming', () => {
  it('shows maker + model only', () => {
    expect(vehicleCatalog.map(fullName)).toEqual(['Tesla Model Y', 'Tesla Model 3', 'iCAR 03'])
    expect(JSON.stringify(vehicleCatalog)).not.toMatch(/Juniper|Highland|Dual Motor|Pure Electric/)
  })
})

describe('vehicleStore migration', () => {
  it('maps legacy ids', async () => {
    localStorage.setItem(
      'ev-vehicle',
      JSON.stringify({ state: { vehicleId: 'model-3-highland-dm', onboarded: true }, version: 1 }),
    )
    await useVehicleStore.persist.rehydrate()
    expect(useVehicleStore.getState().vehicleId).toBe('tesla-model-3')
  })
})
