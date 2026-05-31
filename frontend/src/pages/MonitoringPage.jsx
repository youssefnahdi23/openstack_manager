import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { LoadingSpinner } from '../components/Common'
import { monitoringService } from '../services/api'
import { Activity, CheckCircle, BarChart3, Gauge, Server } from 'lucide-react'

// Monitoring service URLs for the DevStack environment.
const MONITORING_URLS = {
  prometheus: 'http://192.168.91.128:9090',
  grafana: 'http://192.168.91.128:3000',
  nodeExporter: 'http://192.168.91.128:9100/metrics',
  openstackExporter: 'http://192.168.91.128:9180/metrics',
  grafanaDashboards: {
    nodeExporter: {
      id: 1860,
      uid: 'rYdddlPWk',
      slug: 'node-exporter-full',
      url: 'http://192.168.91.128:3000/d/rYdddlPWk/node-exporter-full?orgId=1&from=now-24h&to=now&timezone=browser&var-ds_prometheus=ffnfspc11u328b&var-job=node_exporter&var-nodename=devstack&var-node=localhost:9100&refresh=1m'
    },
    openstackOverview: {
      id: 21085,
      uid: 'openstack-overview',
      slug: 'openstack-overview',
      url: 'http://192.168.91.128:3000/d/openstack-overview/openstack-overview?orgId=1&from=now-30m&to=now&timezone=browser&var-job=openstack_exporter&var-instance=$__all'
    }
  }
}

export default function MonitoringPage() {
  // Enforce authentication before rendering the monitoring page.
  const auth = useRequireAuth()

  // UI state.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [placementUsage, setPlacementUsage] = useState(null)
  const [timeSeries, setTimeSeries] = useState({ cpu: [], ram: [], disk: [] })
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [streamError, setStreamError] = useState('')
  const [directMetrics, setDirectMetrics] = useState([])
  const [directMetricsLoading, setDirectMetricsLoading] = useState(true)
  const [directMetricsError, setDirectMetricsError] = useState('')
  const [placementLoading, setPlacementLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('prometheus')

  // Load monitoring data when the page mounts and refresh every 30 seconds.
  useEffect(() => {
    fetchPlacementUsage()
    fetchTimeSeries()
    fetchDirectMetrics()
    const interval = setInterval(() => {
      fetchPlacementUsage()
      fetchTimeSeries()
      fetchDirectMetrics()
    }, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Query the backend for OpenStack placement usage data.
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

  // Retrieve Prometheus time-series data for the charts.
  const fetchTimeSeries = async () => {
    try {
      setSeriesLoading(true)
      setStreamError('')
      const apiBase = MONITORING_URLS.prometheus
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

      const [cpuUsage, ramUsage, diskUsage] = await Promise.all([
        fetchSeries('100 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100'),
        fetchSeries('100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)'),
        fetchSeries('100 * (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes)'),
      ])

      setTimeSeries({
        cpu: cpuUsage,
        ram: ramUsage,
        disk: diskUsage,
      })
    } catch (error) {
      console.error('Failed to fetch Prometheus series:', error)
      setStreamError('Unable to load time-series data from Prometheus. Check that Prometheus is reachable and scraping backend metrics.')
      setTimeSeries({ cpu: [], ram: [], disk: [] })
    } finally {
      setSeriesLoading(false)
    }
  }

  // Fetch single-value Prometheus queries for high-level status cards.
  const fetchDirectMetrics = async () => {
    try {
      setDirectMetricsLoading(true)
      setDirectMetricsError('')
      const apiBase = MONITORING_URLS.prometheus
      const directQueries = [
        {
          key: 'node_up',
          label: 'Node Exporter Status',
          query: 'up{job="node_exporter"}',
          isStatus: true,
        },
        {
          key: 'openstack_up',
          label: 'OpenStack Exporter Status',
          query: 'up{job="openstack_exporter"}',
          isStatus: true,
        },
        {
          key: 'cpu_usage',
          label: 'CPU Usage (%)',
          query: '100 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100',
          unit: '%',
          decimals: 1,
        },
        {
          key: 'ram_usage',
          label: 'RAM Usage (%)',
          query: '100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)',
          unit: '%',
          decimals: 1,
        },
        {
          key: 'uptime',
          label: 'Uptime',
          query: 'time() - node_boot_time_seconds',
          isDuration: true,
        },
      ]

      const promises = directQueries.map(async (item) => {
        const response = await fetch(`${apiBase}/api/v1/query?query=${encodeURIComponent(item.query)}`)
        const body = await response.json()
        if (body.status !== 'success') {
          throw new Error(body.error || 'Query failed')
        }

        const value = body.data.result?.[0]?.value
        return {
          ...item,
          value: value ? Number(value[1]) : null,
        }
      })

      const results = await Promise.all(promises)
      setDirectMetrics(results)
    } catch (error) {
      console.error('Failed to fetch direct Prometheus metrics:', error)
      setDirectMetricsError('Unable to retrieve Prometheus metrics. Check whether Prometheus is reachable and the exporters are active.')
      setDirectMetrics([])
    } finally {
      setDirectMetricsLoading(false)
    }
  }

  // Format Prometheus uptime seconds into a human-readable duration.
  const formatDuration = (seconds) => {
    if (seconds == null || Number.isNaN(seconds)) {
      return 'N/A'
    }

    const rounded = Math.max(0, Math.floor(seconds))
    const days = Math.floor(rounded / 86400)
    const hours = Math.floor((rounded % 86400) / 3600)
    const minutes = Math.floor((rounded % 3600) / 60)
    const parts = []

    if (days) parts.push(`${days}d`)
    if (hours) parts.push(`${hours}h`)
    if (minutes || parts.length === 0) parts.push(`${minutes}m`)

    return parts.join(' ')
  }

  // Render a simple horizontal usage bar for placement resources.
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

  // Render a lightweight inline chart from Prometheus samples.
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

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
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
                fetchPlacementUsage()
                fetchTimeSeries()
                fetchDirectMetrics()
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
                    <br />
                    UID: <span className="text-slate-300 font-mono">{MONITORING_URLS.grafanaDashboards.nodeExporter.uid}</span>
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={MONITORING_URLS.grafanaDashboards.nodeExporter.url}
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
                    Dashboard ID: <span className="text-slate-300 font-mono">21085</span>
                    <br />
                    UID: <span className="text-slate-300 font-mono">{MONITORING_URLS.grafanaDashboards.openstackOverview.uid}</span>
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={MONITORING_URLS.grafanaDashboards.openstackOverview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Open Dashboard
                    </a>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Grafana Dashboards
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Grafana dashboards are available via external links. Embedded Grafana panels have been removed because browser iframe blocking is unreliable.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
                    <p className="text-sm text-slate-400 mb-3">Node Exporter Dashboard</p>
                    <a
                      href={MONITORING_URLS.grafanaDashboards.nodeExporter.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-block"
                    >
                      Open Node Exporter Dashboard
                    </a>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
                    <p className="text-sm text-slate-400 mb-3">OpenStack Overview Dashboard</p>
                    <a
                      href={MONITORING_URLS.grafanaDashboards.openstackOverview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-block"
                    >
                      Open OpenStack Overview Dashboard
                    </a>
                  </div>
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
              <div className="space-y-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-blue-400" />
                    Direct Prometheus Metrics
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    These values are queried directly from Prometheus so you can monitor exporter health even when Grafana embeds are blocked.
                  </p>
                  {directMetricsLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <LoadingSpinner />
                    </div>
                  ) : directMetricsError ? (
                    <div className="text-sm text-red-300">{directMetricsError}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {directMetrics.map((metric) => (
                        <div key={metric.key} className="rounded-lg bg-slate-800 p-4 border border-slate-700">
                          <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
                            <span>{metric.label}</span>
                            <span className="font-semibold text-white">
                              {metric.isStatus
                                ? (metric.value === 1 ? 'OK' : metric.value === 0 ? 'DOWN' : 'N/A')
                                : metric.isDuration
                                ? formatDuration(metric.value)
                                : metric.value !== null
                                ? `${metric.value.toFixed(metric.decimals ?? 1)}${metric.unit || ''}`
                                : 'N/A'}
                            </span>
                          </div>
                          {metric.query && (
                            <p className="text-xs text-slate-500">Query: {metric.query}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {renderTimeSeriesChart('CPU Usage (%)', timeSeries.cpu, '#38bdf8')}
                  {renderTimeSeriesChart('RAM Usage (%)', timeSeries.ram, '#60a5fa')}
                  {renderTimeSeriesChart('Disk Usage (%)', timeSeries.disk, '#f97316')}
                </div>
                {streamError && (
                  <div className="text-sm text-red-300">{streamError}</div>
                )}
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
