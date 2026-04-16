import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { Toaster } from '@/components/layout/Toaster'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ItemsPage } from '@/pages/ItemsPage'
import { ItemDetailPage } from '@/pages/ItemDetailPage'
import { OutfitsPage } from '@/pages/OutfitsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { SharedPage } from '@/pages/SharedPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    // TODO: LoginPage must validate that `next` starts with '/' before
    // navigating, to prevent an open-redirect attack (e.g. //evil.com/).
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  return <Outlet />
}

function AuthRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

function App() {
  const { isHydrating, hydrateFromStorage } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    hydrateFromStorage()
    initTheme()
  }, [hydrateFromStorage, initTheme])

  if (isHydrating) {
    return <div data-testid="loading-spinner">Loading…</div>
  }

  return (
    <>
      <Toaster />
      <Routes>
        <Route element={<AuthRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/outfits" element={<OutfitsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/shared" element={<SharedPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
