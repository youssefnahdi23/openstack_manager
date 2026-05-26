import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { LoadingSpinner } from '../components/Common'
import { monitoringService } from '../services/api'
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'

export default function MonitoringPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [placementUsage, setPlacementUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [placementLoading, setPlacementLoading] = useState(true)
  const [timeSeries, setTimeSeries] = useState({ cpu: [], ram: [], disk: [] })
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [streamError, setStreamError] = useState('')
  const prometheusBase = import.meta.env.VITE_PROMETHEUS_URL
    ? import.meta.env.VITE_PROMETHEUS_URL.replace(/\/+$/, '')
    : '/prometheus'

  const normalizeDiskUsage = () => {
    if (!placementUsage) {
      return { used: 0, total: 0 }
    }

    const diskTotals = {
      used: Number(placementUsage.totals?.disk?.used || 0),
      total: Number(placementUsage.totals?.disk?.total || 0),
    }

    const providerTotals = placementUsage.providers?.reduce(
      (acc, provider) => ({
        used: acc.used + Number(provider.disk_used_gb || 0),
        total: acc.total + Number(provider.disk_total_gb || 0),
      }),
      { used: 0, total: 0 }
    ) || { used: 0, total: 0 }

    if (providerTotals.total > 0 && providerTotals.total !== diskTotals.total) {
      return providerTotals
    }

    return diskTotals
  }

  useEffect(() => {
    fetchMetrics()
    fetchPlacementUsage()
    fetchTimeSeries()
    const interval = setInterval(() => {
      fetchMetrics()
      fetchPlacementUsage()
      fetchTimeSeries()
    }, 30000) // Refresh every 30 seconds
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

  const fetchPlacementUsage = async () => {
    try {
      setPlacementLoading(true)
      const response = await monitoringService.getPlacementUsage()
      setPlacementUsage(response.data)
    } catch (error) {
      console.error('Failed to fetch placement usage:', error)
    } finally {
      setPlacementLoading(false)
    }
  }

  const fetchTimeSeries = async () => {
    try {
      setSeriesLoading(true)
      setStreamError('')
      const apiBase = prometheusBase
      const end = Math.floor(Date.now() / 1000)
      const start = end - 3600
      const step = 30

      const fetchSeries = async (query) => {
        const url = `${apiBase}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${end}&step=${step}`
        const response = await fetch(url)
        const body = await response.json()
        if (body.status !== 'success') {
          throw new Error(body.error || 'Query failed')
        }
        const result = body.data.result[0]
        return (result?.values || []).map(([ts, value]) => ({ x: Number(ts) * 1000, y: Number(value) }))
      }

      const [cpuUsed, cpuTotal, ramUsed, ramTotal, diskUsed, diskTotal] = await Promise.all([
        fetchSeries('placement_cpu_used'),
        fetchSeries('placement_cpu_total'),
        fetchSeries('placement_ram_used_mb'),
        fetchSeries('placement_ram_total_mb'),
        fetchSeries('placement_disk_used_gb'),
        fetchSeries('placement_disk_total_gb'),
      ])

      setTimeSeries({
        cpu: cpuUsed.map((point, index) => ({
          ...point,
          total: cpuTotal[index]?.y || 0,
        })),
        ram: ramUsed.map((point, index) => ({
          ...point,
          total: ramTotal[index]?.y || 0,
        })),
        disk: diskUsed.map((point, index) => ({
          ...point,
          total: diskTotal[index]?.y || 0,
        })),
      })
    } catch (error) {
      console.error('Failed to fetch Prometheus series:', error)
      setStreamError('Unable to load time-series data from Prometheus. Check that Prometheus is reachable and scraping backend metrics.')
      setTimeSeries({ cpu: [], ram: [], disk: [] })
    } finally {
      setSeriesLoading(false)
    }
  }

  const renderUsageBar = (label, used, total, unit) => {
    const usedVal = Number(used || 0)
    const totalVal = Number(total || 0)
    const percentage = totalVal > 0 ? Math.round((usedVal / totalVal) * 100) : 0

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>{label}</span>
          <span>{usedVal} / {totalVal} {unit} ({percentage}%)</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    )
  }

  const renderTimeSeriesChart = (title, series, color) => {
    if (!series || series.length === 0) {
      return (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-slate-400">
          No time-series data available for {title}.
        </div>
      )
    }

    const values = series.map((point) => point.y)
    const maxValue = Math.max(...values, 1)
    const minValue = Math.min(...values, 0)
    const points = series
      .map((point, index) => {
        const x = (index / (series.length - 1)) * 100
        const y = 100 - ((point.y - minValue) / (maxValue - minValue || 1)) * 100
        return `${x},${y}`
      })
      .join(' ')

    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-slate-400 text-xs">Latest: {series[series.length - 1].y.toFixed(1)}</p>
          </div>
          <div className="text-xs text-slate-500">{series.length} points</div>
        </div>
        <svg viewBox="0 0 100 100" className="w-full h-32">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="0.5" />
        </svg>
      </div>
    )
  }

  const renderPrometheusGraphImage = (query, title) => {
    const end = Math.floor(Date.now() / 1000)
    const start = end - 3600
    const chartUrl = `${prometheusBase}/render?g0.expr=${encodeURIComponent(query)}&g0.tab=0&from=${start}&to=${end}&width=700&height=220`

    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-slate-400 text-xs">Rendered by Prometheus</p>
          </div>
          <a href={`${prometheusBase}/graph?g0.expr=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:text-blue-300">
            Open in Graph UI
          </a>
        </div>
        <img src={chartUrl} alt={`${title} graph`} className="w-full rounded-lg border border-slate-700 bg-slate-950" loading="lazy" />
      </div>
    )
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
              onClick={() => {
                fetchMetrics()
                fetchPlacementUsage()
                fetchTimeSeries()
              }}
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

            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-white">Resource Usage Over Time</h2>
                    <p className="text-slate-400 text-sm">Live Prometheus range data updated every 30 seconds.</p>
                  </div>
                </div>
                <span className="text-slate-400 text-sm">Streaming metrics</span>
              </div>
              {seriesLoading ? (
                <div className="flex items-center justify-center h-48">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {renderTimeSeriesChart('CPU Used (cores)', timeSeries.cpu, '#60a5fa')}
                  {renderTimeSeriesChart('RAM Used (MB)', timeSeries.ram, '#38bdf8')}
                  {renderTimeSeriesChart('Disk Used (GB)', timeSeries.disk, '#fbbf24')}
                </div>
              )}
              {streamError ? (
                <div className="mt-4 rounded-lg border border-amber-500 bg-amber-900/80 p-4 text-sm text-amber-100">
                  {streamError}
                </div>
              ) : null}

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3">Prometheus snapshot graphs</h3>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {renderPrometheusGraphImage('placement_cpu_used', 'CPU Used (cores)')}
                  {renderPrometheusGraphImage('placement_ram_used_mb', 'RAM Used (MB)')}
                  {renderPrometheusGraphImage('placement_disk_used_gb', 'Disk Used (GB)')}
                </div>
              </div>
            </div>

            {/* Placement Usage */}
            <div className="lg:col-span-2 card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                DevStack Placement Usage
              </h2>
              {placementLoading ? (
                <div className="flex items-center justify-center h-48">
                  <LoadingSpinner />
                </div>
              ) : placementUsage && (placementUsage.totals.cpu.total > 0 || placementUsage.totals.ram.total > 0 || placementUsage.totals.disk.total > 0) ? (
                <div className="space-y-5">
                  {renderUsageBar('CPU cores', placementUsage.totals.cpu.used, placementUsage.totals.cpu.total, 'cores')}
                  {renderUsageBar('RAM', placementUsage.totals.ram.used, placementUsage.totals.ram.total, 'MB')}
                  {(() => {
                    const diskUsage = normalizeDiskUsage()
                    return renderUsageBar('Disk', diskUsage.used, diskUsage.total, 'GB')
                  })()}
                  {placementUsage.providers && placementUsage.providers.length > 0 && (
                    <div className="rounded-lg bg-slate-900 p-4 border border-slate-700">
                      <h3 className="text-sm font-semibold text-white mb-3">Resource Providers</h3>
                      <div className="space-y-3">
                        {placementUsage.providers.map((provider) => (
                          <div key={provider.id} className="rounded-lg bg-slate-800 p-3">
                            <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
                              <span>{provider.name}</span>
                              <span className="text-slate-400">{provider.id}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-200 text-sm">
                              <div className="space-y-1">
                                <div className="text-slate-400">CPU</div>
                                <div>{provider.cpu_used} / {provider.cpu_total} cores</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-slate-400">RAM</div>
                                <div>{provider.ram_used_mb} / {provider.ram_total_mb} MB</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-slate-400">Disk</div>
                                <div>{provider.disk_used_gb} / {provider.disk_total_gb} GB</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 text-center py-8">
                  No placement data available. Ensure OpenStack Placement service is running and configured.
                </div>
              )}
            </div>

            {/* Prometheus Visualization */}
            <div className="lg:col-span-2 card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Prometheus Visualization
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Embedded Prometheus graph UI for backend and placement metrics. <a href={`${prometheusBase}/graph`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Open in new tab</a> if the embedded view is not displaying correctly.
              </p>
              <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                <iframe
                  src={`${prometheusBase}/graph`}
                  title="Prometheus Graph"
                  className="w-full h-[680px] bg-slate-900 border-0"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Metrics */}
            <div className="lg:col-span-2 card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Raw Prometheus Metrics
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                View detailed metrics at <a href={prometheusBase} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Prometheus Dashboard</a>
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
