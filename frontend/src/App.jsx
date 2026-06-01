import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VMManagementPage from './pages/VMManagementPage'
import VMDetailsPage from './pages/VMDetailsPage'
import MonitoringPage from './pages/MonitoringPage'
import TerminalPage from './pages/TerminalPage'
import SettingsPage from './pages/SettingsPage'
import { NotificationContainer } from './components/Notification'
import { useInitializeAuth, useAuth } from './hooks/useAuth'
import './index.css'

function ProtectedRoute({ element }) {
  const auth = useAuth()
  return auth.isAuthenticated ? element : <Navigate to="/login" replace />
}

function AppContent({ theme, setTheme }) {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={<ProtectedRoute element={<DashboardPage />} />}
      />
      <Route
        path="/vms"
        element={<ProtectedRoute element={<VMManagementPage />} />}
      />
      <Route
        path="/vms/:instanceId"
        element={<ProtectedRoute element={<VMDetailsPage />} />}
      />
      <Route
        path="/monitoring"
        element={<ProtectedRoute element={<MonitoringPage />} />}
      />
      <Route
        path="/terminal"
        element={<ProtectedRoute element={<TerminalPage />} />}
      />
      <Route
        path="/settings"
        element={<ProtectedRoute element={<SettingsPage theme={theme} setTheme={setTheme} />} />}
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system')
  
  // Initialize auth and session keep-alive
  useInitializeAuth()

  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (value) => {
      if (value === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.dataset.theme = systemPrefersDark ? 'dark' : 'light'
      } else {
        root.dataset.theme = value
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event) => {
      if (theme === 'system') {
        root.dataset.theme = event.matches ? 'dark' : 'light'
      }
    }

    mediaQuery.addEventListener?.('change', handleChange)
    return () => mediaQuery.removeEventListener?.('change', handleChange)
  }, [theme])

  return (
    <Router>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
        <AppContent theme={theme} setTheme={setTheme} />
        <NotificationContainer />
      </div>
    </Router>
  )
}

export default App
