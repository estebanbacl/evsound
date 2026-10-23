import { audioEngine } from '../audio/AudioEngine'
import { engineDriver } from '../audio/EngineDriver'
import { getProfile } from '../audio/profiles'
import { useSessionStore } from '../state/sessionStore'
import { useSettingsStore } from '../state/settingsStore'
import { useToastStore } from '../state/toastStore'
import { useVehicleStore } from '../state/vehicleStore'
import { getVehicle } from '../vehicles/catalog'
import {
  GeolocationSource,
  SimulatedSource,
  TraceReplaySource,
  loadTrace,
  telemetry,
  type SpeedSource,
} from '../telemetry'

/** Virtual throttle/brake of the current simulator source (null unless source = sim). */
let simulator: SimulatedSource | null = null
export const getSimulator = () => simulator

const currentVehicle = () => getVehicle(useVehicleStore.getState().vehicleId)

async function buildSource(): Promise<SpeedSource> {
  const { source, trace, traceRate } = useSessionStore.getState()
  simulator = null
  if (source === 'gps') return new GeolocationSource()
  if (source === 'trace') {
    return new TraceReplaySource(await loadTrace(trace), traceRate, undefined, () => stopEngine())
  }
  const v = currentVehicle()
  simulator = new SimulatedSource({
    zeroTo100s: v.specs.zeroTo100s,
    maxSpeedKmh: v.calibration.maxSpeedKmh,
  })
  return simulator
}

/** Must be called from a user gesture (it unlocks the AudioContext). */
export async function startEngine() {
  const session = useSessionStore.getState()
  if (session.running) return
  try {
    await audioEngine.unlock()
    const { profileId, volume } = useSettingsStore.getState()
    audioEngine.setVolume(volume)
    const v = currentVehicle()
    await engineDriver.start(getProfile(profileId), v.calibration)
    telemetry.start(await buildSource())
    session.setRunning(true)
  } catch (e) {
    engineDriver.stop()
    telemetry.stop()
    useToastStore.getState().push(`No se pudo arrancar el motor: ${String(e)}`, 'error')
  }
}

export function stopEngine() {
  telemetry.stop()
  engineDriver.stop()
  simulator = null
  useSessionStore.getState().setRunning(false)
}

/** Park-only preview: ~2 s of revs with the virtual throttle, then back to silence. */
export async function previewSound() {
  if (useSessionStore.getState().running) return
  const prev = useSessionStore.getState().source
  useSessionStore.getState().setSource('sim')
  await startEngine()
  simulator?.setThrottle(1)
  setTimeout(() => simulator?.setThrottle(0), 1400)
  setTimeout(() => {
    stopEngine()
    useSessionStore.getState().setSource(prev)
  }, 2400)
}

/** Changing the sound profile live swaps the voice without stopping telemetry. */
export async function applyProfileChange() {
  if (!useSessionStore.getState().running) return
  await engineDriver.start(
    getProfile(useSettingsStore.getState().profileId),
    currentVehicle().calibration,
  )
}
