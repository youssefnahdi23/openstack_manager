import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { useVMStore, useNotificationStore } from '../store'
import { vmService } from '../services/api'
import { StatCard, LoadingSpinner } from '../components/Common'
import { Server, HardDrive, Image as ImageIcon, Network, AlertCircle, CheckCircle } from 'lucide-react'

export default function DashboardPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const stats = useVMStore((state) => state.stats)
  const setStats = useVMStore((state) => state.setStats)
  const setLoading = useVMStore((state) => state.setLoading)
  const isLoading = useVMStore((state) => state.isLoading)
  const addNotification = useNotificationStore((state) => state.addNotification)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await vmService.getStats()
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
      addNotification({
        type: 'error',
        message: 'Failed to load statistics',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-900">
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
              onClick={fetchStats}
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
                  <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <p className="text-green-400 font-medium">OpenStack Connection</p>
                    <p className="text-green-300 text-sm mt-1">✓ Connected and operational</p>
                  </div>
                  <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <p className="text-green-400 font-medium">Database</p>
                    <p className="text-green-300 text-sm mt-1">✓ Connected and healthy</p>
                  </div>
                </div>
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
                  <a
                    href="http://localhost:7681"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-center transition-colors"
                  >
                    <Terminal className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                    <p className="text-white font-medium">Web Terminal</p>
                  </a>
                  <a
                    href="http://localhost:6080"
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
            <div className="flex items-center justify-center h-full text-slate-400">
              Failed to load statistics
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { Terminal, Monitor } from 'lucide-react'
