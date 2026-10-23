import { useState } from 'react'
import {
  BigNumber,
  Gauge,
  IconButton,
  MiniPlayer,
  Panel,
  SegmentedControl,
  Slider,
} from '../../ui/components'
import { IconNext, IconPlay } from '../../ui/icons'
import { toast } from '../../state/toastStore'
import './dev.css'

export function UiCatalogScreen() {
  const [accel, setAccel] = useState<'chill' | 'standard' | 'sport'>('standard')
  const [v, setV] = useState(0.6)
  const [rpm, setRpm] = useState(3200)
  const [playing, setPlaying] = useState(true)
  return (
    <section className="dev ui-catalog" aria-label="UI catalog">
      <h1>/dev/ui</h1>
      <div className="ui-grid">
        <Panel title="Panel" active>
          Superficie activa con glow
        </Panel>
        <Panel title="Panel">Superficie normal</Panel>
        <div className="ui-col">
          <SegmentedControl
            label="Respuesta de sonido"
            value={accel}
            onChange={setAccel}
            options={[
              { value: 'chill', label: 'Suave' },
              { value: 'standard', label: 'Estándar' },
              { value: 'sport', label: 'Sport' },
            ]}
          />
          <Slider label="Intensidad" value={v} onChange={setV} />
          <Slider
            label="RPM"
            value={rpm}
            min={800}
            max={7000}
            step={10}
            onChange={setRpm}
            format={(x) => `${x}`}
          />
        </div>
        <Gauge value={rpm} max={7000} redline={6200} label="RPM" unit="rpm" />
        <div className="ui-col">
          <BigNumber value={68} unit="km/h" size="lg" />
          <div className="dev-row">
            <IconButton icon={<IconPlay />} label="Play" />
            <IconButton icon={<IconNext />} label="Next" size="lg" />
            <IconButton icon={<IconNext />} label="Active" active />
          </div>
          <button onClick={() => toast('Perfil actualizado')}>Mostrar toast</button>
        </div>
      </div>
      <MiniPlayer
        title="To The Stars"
        subtitle="Horizon One"
        playing={playing}
        shuffle
        repeat={false}
        positionS={1}
        durationS={236}
        onToggle={() => setPlaying((p) => !p)}
        onNext={() => {}}
        onPrev={() => {}}
        onShuffle={() => {}}
        onRepeat={() => {}}
      />
    </section>
  )
}
