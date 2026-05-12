import {
  BrowserRouter,
  Routes,
  Route
} from 'react-router-dom'

import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import AdminDashboard from '../pages/AdminDashboard'

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}