import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { audioEngine } from '../audio/AudioEngine'
import { engineDriver } from '../audio/EngineDriver'
import { useAudioStore } from '../state/audioStore'
import { useSettingsStore } from '../state/settingsStore'
import { useTelemetryStore } from '../state/telemetryStore'
import { Background } from '../ui/components/Background'
import { ToastHost } from '../ui/components/Toast'
import { BottomNav } from './BottomNav'
import { StatusBar } from './StatusBar'

/** Keeps stores and the audio singletons in sync. */
function useAudioSync() {
  const { volume, intensity, character } = useSettingsStore()
  useEffect(() => audioEngine.setVolume(volume), [volume])
  useEffect(() => engineDriver.setSettings({ intensity, character }), [intensity, character])
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
  return (
    <div className="shell">
      <StatusBar />
      <main className="shell-main">
        <Background speedMs={speedMs} />
        <Outlet />
      </main>
      <div className="bottom-bar">
        <BottomNav />
      </div>
      <ToastHost />
    </div>
  )
}
