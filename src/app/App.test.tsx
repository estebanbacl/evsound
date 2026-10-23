import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { useVehicleStore } from '../state/vehicleStore'

describe('App shell', () => {
  beforeEach(() => useVehicleStore.setState({ vehicleId: 'model-y-juniper-dm', onboarded: true }))

  it('navigates between the three tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('region', { name: 'Vehículo' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Escuchar' }))
    expect(screen.getByRole('region', { name: 'Escuchar' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Dinámica' }))
    expect(screen.getByRole('region', { name: 'Dinámica' })).toBeInTheDocument()
  })
})
