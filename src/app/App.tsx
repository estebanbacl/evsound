import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { VehicleScreen } from '../screens/Vehicle'
import { CollectionDetail, ListenHome } from '../screens/Listen'
import { DynamicsScreen } from '../screens/Dynamics'
import { AudioDevScreen } from '../screens/Dev/AudioDevScreen'
import { UiCatalogScreen } from '../screens/Dev/UiCatalogScreen'
import { TelemetryDevScreen } from '../screens/Dev/TelemetryDevScreen'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/vehicle" element={<VehicleScreen />} />
        <Route path="/listen" element={<ListenHome />} />
        <Route path="/listen/:id" element={<CollectionDetail />} />
        <Route path="/dynamics" element={<DynamicsScreen />} />
        <Route path="/dev/telemetry" element={<TelemetryDevScreen />} />
        <Route path="/dev/audio" element={<AudioDevScreen />} />
        <Route path="/dev/ui" element={<UiCatalogScreen />} />
        <Route path="*" element={<Navigate to="/vehicle" replace />} />
      </Route>
    </Routes>
  )
}
