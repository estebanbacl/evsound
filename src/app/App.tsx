import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { VehicleScreen } from '../screens/Vehicle'
import { ListenScreen } from '../screens/Listen'
import { DynamicsScreen } from '../screens/Dynamics'
import { TelemetryDevScreen } from '../screens/Dev/TelemetryDevScreen'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/vehicle" element={<VehicleScreen />} />
        <Route path="/listen" element={<ListenScreen />} />
        <Route path="/dynamics" element={<DynamicsScreen />} />
        <Route path="/dev/telemetry" element={<TelemetryDevScreen />} />
        <Route path="*" element={<Navigate to="/vehicle" replace />} />
      </Route>
    </Routes>
  )
}
