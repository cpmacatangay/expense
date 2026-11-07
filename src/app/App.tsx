import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout'
import { AppProviders } from './providers'
import { AuthCallback } from '../features/auth/AuthCallback'
import { SignInPage } from '../features/auth/SignInPage'
import { useCurrentMemberId } from '../features/auth/useCurrentMember'

const HomePage = lazy(() =>
  import('../features/home/HomePage').then((module) => ({ default: module.HomePage }))
)
const StudentsPage = lazy(() =>
  import('../features/students/StudentsPage').then((module) => ({ default: module.StudentsPage }))
)
const NewOutingPage = lazy(() =>
  import('../features/outings/NewOutingPage').then((module) => ({ default: module.NewOutingPage }))
)
const OutingDetailPage = lazy(() =>
  import('../features/outings/OutingDetailPage').then((module) => ({
    default: module.OutingDetailPage
  }))
)
const LedgerPage = lazy(() =>
  import('../features/ledger/LedgerPage').then((module) => ({ default: module.LedgerPage }))
)
const ReportsPage = lazy(() =>
  import('../features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage }))
)
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage }))
)

function PageFallback() {
  return (
    <div className="flex min-h-48 items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  )
}

function AuthenticatedApp() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/outings/new" element={<NewOutingPage />} />
          <Route path="/outings/:id" element={<OutingDetailPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function Shell() {
  const currentMemberId = useCurrentMemberId()

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={currentMemberId ? <AuthenticatedApp /> : <SignInPage />} />
    </Routes>
  )
}

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AppProviders>
  )
}
