import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

describe('App shell', () => {
  it('navigates between the three tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'VEHICLE' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Escuchar' }))
    expect(screen.getByRole('heading', { name: 'LISTEN' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Dinámica' }))
    expect(screen.getByRole('heading', { name: 'DYNAMICS' })).toBeInTheDocument()
  })
})
