import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToastStore } from '../../state/toastStore'
import {
  BigNumber,
  Gauge,
  IconButton,
  MiniPlayer,
  Panel,
  SegmentedControl,
  Slider,
  ToastHost,
  fmtTime,
} from '.'

describe('ui components', () => {
  it('Panel renders title and active state', () => {
    const { container } = render(
      <Panel title="Specs" active>
        x
      </Panel>,
    )
    expect(screen.getByText('Specs')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('is-active')
  })

  it('SegmentedControl is a radiogroup and fires onChange', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        label="Respuesta"
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Respuesta' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'B' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('Slider exposes label, value and reports changes', () => {
    const onChange = vi.fn()
    render(<Slider label="Volumen" value={0.5} onChange={onChange} />)
    const input = screen.getByLabelText('Volumen') as HTMLInputElement
    expect(input.value).toBe('0.5')
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('IconButton has an accessible name and click handler', async () => {
    const fn = vi.fn()
    render(<IconButton icon={<span />} label="Play" onClick={fn} />)
    await userEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(fn).toHaveBeenCalled()
  })

  it('Gauge shows the rounded value and an accessible label', () => {
    render(<Gauge value={3199.6} max={7000} redline={6200} label="RPM" unit="rpm" />)
    expect(screen.getByRole('img', { name: 'RPM 3200 rpm' })).toBeInTheDocument()
    expect(screen.getByText('3200')).toBeInTheDocument()
  })

  it('BigNumber renders value and unit', () => {
    render(<BigNumber value={68} unit="km/h" />)
    expect(screen.getByText('68')).toBeInTheDocument()
    expect(screen.getByText('km/h')).toBeInTheDocument()
  })

  it('MiniPlayer shows pause when playing and formats time', async () => {
    const onToggle = vi.fn()
    const noop = () => {}
    render(
      <MiniPlayer
        title="T"
        subtitle="S"
        playing
        shuffle={false}
        repeat={false}
        positionS={61}
        durationS={236}
        onToggle={onToggle}
        onNext={noop}
        onPrev={noop}
        onShuffle={noop}
        onRepeat={noop}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(onToggle).toHaveBeenCalled()
    expect(screen.getByText('01:01')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '26')
    expect(fmtTime(-3)).toBe('00:00')
  })

  it('Toast shows and dismisses', async () => {
    render(<ToastHost />)
    act(() => useToastStore.getState().push('Hola', 'info', 0))
    await userEvent.click(screen.getByText('Hola'))
    expect(screen.queryByText('Hola')).toBeNull()
  })
})
