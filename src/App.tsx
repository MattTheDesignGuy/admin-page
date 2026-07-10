import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ToastProvider } from '@/components/Toast'
import { NavShell } from '@/components/NavShell'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { IncomeUpload } from '@/pages/IncomeUpload'
import { ExpenseUpload } from '@/pages/ExpenseUpload'
import { Ledger } from '@/pages/Ledger'
import { InvoiceBuilder } from '@/pages/InvoiceBuilder'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-sunken text-ink-muted">
        Loading…
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <NavShell>{children}</NavShell>
}

function LoginRoute() {
  const { status } = useAuth()
  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }
  return <Login />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/income/new"
        element={
          <ProtectedRoute>
            <IncomeUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/new"
        element={
          <ProtectedRoute>
            <ExpenseUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/new"
        element={
          <ProtectedRoute>
            <InvoiceBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ledger"
        element={
          <ProtectedRoute>
            <Ledger />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
