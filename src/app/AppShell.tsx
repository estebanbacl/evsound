import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ConnectedMiniPlayer } from '../screens/Listen'
import { UpdatePrompt } from './UpdatePrompt'
import { initAmbient } from './ambientController'
import { DriveModeOverlay } from '../screens/DriveMode'
import { Onboarding } from '../screens/Onboarding'
import { useDriveStore } from '../state/driveStore'
import { useSessionStore } from '../state/sessionStore'
import { applyProfileChange } from './engineSession'
import { useDriveMode } from './useDriveMode'
import { useVehicle, useVehicleStore } from '../state/vehicleStore'
import { audioEngine } from '../audio/AudioEngine'
import { engineDriver } from '../audio/EngineDriver'
import { useAudioStore } from '../state/audioStore'
import { useSettingsStore } from '../state/settingsStore'
import { useTelemetryStore } from '../state/telemetryStore'
import { Background } from '../ui/components/Background'
import { ToastHost } from '../ui/components/Toast'
import { BottomNav } from './BottomNav'
import { StatusBar } from './StatusBar'

function skipIntro() {
  try {
    return sessionStorage.getItem('ev-skip-intro') === '1'
  } catch {
    return false
  }
}

/** Keeps stores and the audio singletons in sync. */
function useAudioSync() {
  const { volume, intensity, character, shiftBias } = useSettingsStore()
  useEffect(() => audioEngine.setVolume(volume), [volume])
  useEffect(
    () => engineDriver.setSettings({ intensity, character, shiftBias }),
    [intensity, character, shiftBias],
  )
  const profileId = useSettingsStore((s) => s.profileId)
  useEffect(() => {
    if (useSessionStore.getState().running) void applyProfileChange()
  }, [profileId])
  const vehicle = useVehicle()
  useEffect(() => engineDriver.setCalibration(vehicle.calibration), [vehicle])
  useEffect(() => {
    const { setStatus, setNeedsGesture } = useAudioStore.getState()
    const sync = () => {
      setStatus(audioEngine.state as never)
      setNeedsGesture(audioEngine.needsGesture)
    }
    const offs = [audioEngine.on('statechange', sync), audioEngine.on('needsGesture', sync)]
    sync()
    return () => offs.forEach((o) => o())
  }, [])
}

export function AppShell() {
  useAudioSync()
  const speedMs = useTelemetryStore((s) => s.speedMs)
  const onboarded = useVehicleStore((s) => s.onboarded)
  // every visit opens with the instructions; 'Go' dismisses them (sessionStorage flag is a test hook)
  const [intro, setIntro] = useState(() => !skipIntro() && useVehicleStore.getState().onboarded)
  const driving = useDriveStore((s) => s.active)
  useDriveMode()
  useEffect(() => initAmbient(), [])
  return (
    <div className="shell">
      <StatusBar />
      <main className="shell-main">
        <Background speedMs={speedMs} paused={driving} />
        {driving ? <DriveModeOverlay /> : <Outlet />}
      </main>
      {!driving && (
        <div className="bottom-bar">
          <ConnectedMiniPlayer />
          <BottomNav />
        </div>
      )}
      <ToastHost />
      <UpdatePrompt />
      {!onboarded ? <Onboarding /> : intro && <Onboarding onClose={() => setIntro(false)} />}
    </div>
  )
}
