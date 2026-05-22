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
import './index.css'

function ProtectedRoute({ element }) {
  const token = localStorage.getItem('token')
  return token ? element : <Navigate to="/login" />
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system')

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
      <div className="min-h-screen bg-slate-900">
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
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        <NotificationContainer />
      </div>
    </Router>
  )
}

export default App
