import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { LoadingSpinner } from '../components/Common'
import { monitoringService } from '../services/api'
import { Activity, AlertCircle, CheckCircle, Clock, BarChart3, Gauge, Server } from 'lucide-react'

// Monitoring service URLs
const MONITORING_URLS = {
  prometheus: 'http://192.168.91.128:9090',
  grafana: 'http://192.168.91.128:3000',
  nodeExporter: 'http://192.168.91.128:9100/metrics',
  openstackExporter: 'http://192.168.91.128:9180/metrics',
  grafanaDashboards: {
    nodeExporter: 1860,
    openstackOverview: 13747
  }
}

export default function MonitoringPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [placementUsage, setPlacementUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [placementLoading, setPlacementLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('grafana')

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
      const response = await fetch(MONITORING_URLS.prometheus)
      // Just test if Prometheus is accessible
      setMetrics('Prometheus accessible')
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
              <p className="text-slate-400 text-sm">Prometheus, Grafana, and OpenStack monitoring dashboard</p>
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

        {/* Service Status Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <a href={MONITORING_URLS.prometheus} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
                <Gauge className="w-4 h-4" />
                <span>Prometheus</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <a href={MONITORING_URLS.grafana} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-400 hover:text-purple-300">
                <BarChart3 className="w-4 h-4" />
                <span>Grafana</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <a href={MONITORING_URLS.nodeExporter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-400 hover:text-green-300">
                <Server className="w-4 h-4" />
                <span>Node Exporter</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <a href={MONITORING_URLS.openstackExporter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-orange-400 hover:text-orange-300">
                <Activity className="w-4 h-4" />
                <span>OpenStack Exporter</span>
              </a>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex gap-4">
          <button
            onClick={() => setActiveTab('grafana')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'grafana'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            Grafana Dashboards
          </button>
          <button
            onClick={() => setActiveTab('prometheus')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'prometheus'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            Prometheus
          </button>
          <button
            onClick={() => setActiveTab('placement')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'placement'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            Placement Usage
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Grafana Dashboards Tab */}
          {activeTab === 'grafana' && (
            <div className="space-y-6">
              {/* Dashboard Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Node Exporter Dashboard
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Dashboard ID: <span className="text-slate-300 font-mono">1860</span>
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={`${MONITORING_URLS.grafana}/d/1860`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Open Dashboard
                    </a>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    OpenStack Overview Dashboard
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Dashboard ID: <span className="text-slate-300 font-mono">13747</span>
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={`${MONITORING_URLS.grafana}/d/13747`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Open Dashboard
                    </a>
                  </div>
                </div>
              </div>

              {/* Embedded Node Exporter Dashboard */}
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-green-400" />
                  Node Exporter Full Metrics
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Embedded Grafana dashboard showing node metrics (CPU, Memory, Disk, Network)
                </p>
                <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                  <iframe
                    src={`${MONITORING_URLS.grafana}/d/1860?kiosk=tv`}
                    title="Node Exporter Dashboard"
                    className="w-full h-[700px] bg-slate-900 border-0"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                    allowFullScreen={true}
                  />
                </div>
              </div>

              {/* Embedded OpenStack Overview Dashboard */}
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  OpenStack Overview Metrics
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Embedded Grafana dashboard showing OpenStack-specific metrics and resource utilization
                </p>
                <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                  <iframe
                    src={`${MONITORING_URLS.grafana}/d/13747?kiosk=tv`}
                    title="OpenStack Overview Dashboard"
                    className="w-full h-[700px] bg-slate-900 border-0"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                    allowFullScreen={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Prometheus Tab */}
          {activeTab === 'prometheus' && (
            <div className="space-y-6">
              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-blue-400" />
                    Prometheus Interface
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Access the full Prometheus graph UI for metric exploration and querying
                  </p>
                  <a
                    href={`${MONITORING_URLS.prometheus}/graph`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-block"
                  >
                    Open Prometheus
                  </a>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-green-400" />
                    Node Exporter Metrics
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    View raw metrics from Node Exporter (CPU, Memory, Disk, Network stats)
                  </p>
                  <a
                    href={MONITORING_URLS.nodeExporter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors inline-block"
                  >
                    View Metrics
                  </a>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    OpenStack Exporter Metrics
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    View raw metrics from OpenStack Exporter (Nova, Glance, Neutron stats)
                  </p>
                  <a
                    href={MONITORING_URLS.openstackExporter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors inline-block"
                  >
                    View Metrics
                  </a>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    Prometheus Targets
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Check Prometheus targets and scrape configurations
                  </p>
                  <a
                    href={`${MONITORING_URLS.prometheus}/targets`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-block"
                  >
                    View Targets
                  </a>
                </div>
              </div>

              {/* Embedded Prometheus Graph */}
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-400" />
                  Prometheus Graph Explorer
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Embedded Prometheus interface for querying metrics. Open in new tab for better experience.
                </p>
                <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                  <iframe
                    src={`${MONITORING_URLS.prometheus}/graph`}
                    title="Prometheus Graph"
                    className="w-full h-[700px] bg-slate-900 border-0"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Placement Usage Tab */}
          {activeTab === 'placement' && (
            <div className="space-y-6">
              <div className="card">
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
                    {renderUsageBar('Disk', placementUsage.totals.disk.used, placementUsage.totals.disk.total, 'GB')}
                    {placementUsage.providers && placementUsage.providers.length > 0 && (
                      <div className="rounded-lg bg-slate-900 p-4 border border-slate-700 mt-6">
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
