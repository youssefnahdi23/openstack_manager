import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VMManagementPage from './pages/VMManagementPage'
import VMDetailsPage from './pages/VMDetailsPage'
import MonitoringPage from './pages/MonitoringPage'
import { NotificationContainer } from './components/Notification'
import './index.css'

function ProtectedRoute({ element }) {
  const token = localStorage.getItem('token')
  return token ? element : <Navigate to="/login" />
}

function App() {
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
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        <NotificationContainer />
      </div>
    </Router>
  )
}

export default App
