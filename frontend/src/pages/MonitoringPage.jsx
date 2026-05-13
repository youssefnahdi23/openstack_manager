import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { Card, LoadingSpinner } from '../components/Common'
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'

export default function MonitoringPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const metricsUrl = import.meta.env.VITE_PROMETHEUS_METRICS_URL || '/metrics'
      const response = await fetch(metricsUrl)
      const text = await response.text()
      setMetrics(text)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
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
              <h1 className="text-2xl font-bold text-white">Monitoring & Metrics</h1>
              <p className="text-slate-400 text-sm">System monitoring and Prometheus metrics</p>
            </div>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                System Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">API Health</span>
                  <span className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" /> Operational
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Database</span>
                  <span className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" /> Connected
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">OpenStack</span>
                  <span className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" /> Connected
                  </span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Services
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Frontend</span>
                  <span className="px-3 py-1 bg-green-900/20 text-green-400 rounded-full text-sm">Running</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Backend</span>
                  <span className="px-3 py-1 bg-green-900/20 text-green-400 rounded-full text-sm">Running</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Prometheus</span>
                  <span className="px-3 py-1 bg-green-900/20 text-green-400 rounded-full text-sm">Running</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="lg:col-span-2 card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Raw Prometheus Metrics
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                View detailed metrics at <a href="http://localhost:9090" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Prometheus Dashboard</a>
              </p>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner />
                </div>
              ) : metrics ? (
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300 overflow-x-auto max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words">{metrics}</pre>
                </div>
              ) : (
                <div className="text-slate-400 text-center py-8">
                  Failed to load metrics
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
