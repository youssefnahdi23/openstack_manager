import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { useVMStore, useNotificationStore } from '../store'
import { vmService, healthService } from '../services/api'
import { StatCard, LoadingSpinner } from '../components/Common'
import { Server, HardDrive, Image as ImageIcon, Network, AlertCircle, CheckCircle, Terminal, Monitor } from 'lucide-react'

export default function DashboardPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [health, setHealth] = useState({
    status: 'unknown',
    openstack_connected: null,
    database_connected: null,
  })
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState('')
  const [statsError, setStatsError] = useState('')

  const stats = useVMStore((state) => state.stats)
  const setStats = useVMStore((state) => state.setStats)
  const setLoading = useVMStore((state) => state.setLoading)
  const isLoading = useVMStore((state) => state.isLoading)
  const addNotification = useNotificationStore((state) => state.addNotification)

  useEffect(() => {
    fetchStats()
    fetchHealth()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setStatsError('')
      const response = await vmService.getStats()
      setStats(response.data.stats)
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to load statistics'
      console.error('Error fetching stats:', message, error)
      setStatsError(message)
      addNotification({
        type: 'error',
        message,
      })
      if (error.response?.status === 401) {
        auth.logout()
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchHealth = async () => {
    try {
      setHealthLoading(true)
      setHealthError('')
      const response = await healthService.check()
      setHealth(response.data)
    } catch (error) {
      console.error('Error fetching health:', error)
      setHealth({
        status: 'unhealthy',
        openstack_connected: false,
        database_connected: false,
      })
      setHealthError(error?.response?.data?.error || error.message || 'Unable to fetch health status')
    } finally {
      setHealthLoading(false)
    }
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400 text-sm">Welcome back, {auth.user?.username}!</p>
            </div>
            <button
              onClick={() => {
                fetchStats()
                fetchHealth()
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                icon={Server}
                label="Total Instances"
                value={stats.total_instances || 0}
              />
              <StatCard
                icon={CheckCircle}
                label="Running Instances"
                value={stats.running_instances || 0}
              />
              <StatCard
                icon={AlertCircle}
                label="Stopped Instances"
                value={stats.stopped_instances || 0}
              />
              <StatCard
                icon={HardDrive}
                label="Available Flavors"
                value={stats.total_flavors || 0}
              />
              <StatCard
                icon={ImageIcon}
                label="Available Images"
                value={stats.total_images || 0}
              />
              <StatCard
                icon={Network}
                label="Available Networks"
                value={stats.total_networks || 0}
              />

              {/* System Status */}
              <div className="col-span-full card">
                <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${healthLoading ? 'bg-slate-800 border border-slate-600' : health.openstack_connected ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'}`}>
                    <p className={`font-medium ${healthLoading ? 'text-slate-300' : health.openstack_connected ? 'text-green-400' : 'text-red-400'}`}>OpenStack Connection</p>
                    <p className={`text-sm mt-1 ${healthLoading ? 'text-slate-400' : health.openstack_connected ? 'text-green-300' : 'text-red-300'}`}>
                      {healthLoading ? 'Checking connection…' : health.openstack_connected ? '✓ Connected and operational' : '✕ Disconnected or degraded'}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${healthLoading ? 'bg-slate-800 border border-slate-600' : health.database_connected ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'}`}>
                    <p className={`font-medium ${healthLoading ? 'text-slate-300' : health.database_connected ? 'text-green-400' : 'text-red-400'}`}>Database</p>
                    <p className={`text-sm mt-1 ${healthLoading ? 'text-slate-400' : health.database_connected ? 'text-green-300' : 'text-red-300'}`}>
                      {healthLoading ? 'Checking database…' : health.database_connected ? '✓ Connected and healthy' : '✕ Database not reachable'}
                    </p>
                  </div>
                </div>
                {healthError && (
                  <div className="mt-3 text-sm text-red-300">{healthError}</div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="col-span-full card">
                <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a
                    href="/vms"
                    className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-center transition-colors"
                  >
                    <Server className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                    <p className="text-white font-medium">Manage VMs</p>
                  </a>
                  <Link
                    to="/terminal"
                    className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-center transition-colors"
                  >
                    <Terminal className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                    <p className="text-white font-medium">Open PuTTY</p>
                  </Link>
                  <a
                    href={import.meta.env.VITE_NO_VNC_URL || `http://${window.location.hostname}:6080`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-center transition-colors"
                  >
                    <Monitor className="w-6 h-6 mx-auto mb-2 text-green-400" />
                    <p className="text-white font-medium">noVNC Console</p>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <div>Failed to load statistics.</div>
              {statsError && (
                <div className="text-sm text-red-300 max-w-xl text-center">{statsError}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
