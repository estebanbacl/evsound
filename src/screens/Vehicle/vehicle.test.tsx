import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Onboarding } from '../Onboarding'
import { SpecsPanel } from './SpecsPanel'
import { highlightedSpecs, specRows } from './specs'
import { vehicleCatalog } from '../../vehicles/catalog'
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

describe('Onboarding + vehicleStore', () => {
  beforeEach(() => useVehicleStore.setState({ vehicleId: null, onboarded: false }))

  it('shows safety first, then lets the user pick and persists the choice', async () => {
    render(<Onboarding />)
    expect(screen.getByText(/Configura la app con el vehículo en Park/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.getByRole('heading', { name: 'Model Y' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Vehículo siguiente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Vehículo siguiente' }))
    expect(screen.getByRole('heading', { name: 'iCAR 03' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Usar este vehículo' }))
    expect(useVehicleStore.getState()).toMatchObject({ vehicleId: 'icar-03-4x4', onboarded: true })
  })
})
