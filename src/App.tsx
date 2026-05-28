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
import { CreateItemPage } from '@/pages/CreateItemPage'
import { ItemDetailPage } from '@/pages/ItemDetailPage'
import { EditItemPage } from '@/pages/EditItemPage'
import { LocationsPage } from '@/pages/LocationsPage'
import { OutfitsPage } from '@/pages/OutfitsPage'
import { CreateOutfitPage } from '@/pages/CreateOutfitPage'
import { OutfitDetailPage } from '@/pages/OutfitDetailPage'
import { EditOutfitPage } from '@/pages/EditOutfitPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { SharedPage } from '@/pages/SharedPage'
import { SharedItemDetailPage } from '@/pages/SharedItemDetailPage'
import { SharedOutfitDetailPage } from '@/pages/SharedOutfitDetailPage'
import { SharedLocationDetailPage } from '@/pages/SharedLocationDetailPage'
import { OutgoingSharesPage } from '@/pages/OutgoingSharesPage'
import { TransfersPage } from '@/pages/TransfersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    )
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
            <Route path="/items/new" element={<CreateItemPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/items/:id/edit" element={<EditItemPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/outfits" element={<OutfitsPage />} />
            <Route path="/outfits/new" element={<CreateOutfitPage />} />
            <Route path="/outfits/:id" element={<OutfitDetailPage />} />
            <Route path="/outfits/:id/edit" element={<EditOutfitPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/shared" element={<SharedPage />} />
            <Route
              path="/shared/items/:id"
              element={<SharedItemDetailPage />}
            />
            <Route
              path="/shared/outfits/:id"
              element={<SharedOutfitDetailPage />}
            />
            <Route
              path="/shared/locations/:id"
              element={<SharedLocationDetailPage />}
            />
            <Route path="/shares" element={<OutgoingSharesPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
