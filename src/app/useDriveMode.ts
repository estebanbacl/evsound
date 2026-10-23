import { useEffect } from 'react'
import { useDriveStore } from '../state/driveStore'
import { useTelemetryStore } from '../state/telemetryStore'
import { DriveModeDetector } from './DriveModeDetector'

/** Feeds the detector with the estimated speed and mirrors its state into `driveStore`. */
export function useDriveMode(intervalMs = 250) {
  useEffect(() => {
    const detector = new DriveModeDetector()
    const set = useDriveStore.getState().setActive
    const id = setInterval(() => {
      const { speedMs, running } = useTelemetryStore.getState()
      // Without a speed source there is nothing to drive on: leave Drive Mode right away.
      if (!running) {
        detector.reset()
        set(false)
        return
      }
      set(detector.update(speedMs * 3.6, Date.now()))
    }, intervalMs)
    return () => {
      clearInterval(id)
      set(false)
    }
  }, [intervalMs])
}
