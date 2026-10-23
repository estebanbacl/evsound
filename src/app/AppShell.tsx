import { Outlet } from 'react-router-dom'
import { StatusBar } from './StatusBar'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="shell">
      <StatusBar />
      <main className="shell-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
