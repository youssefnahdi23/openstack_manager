import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { useNotificationStore } from '../store'
import { vmService } from '../services/api'
import { LoadingSpinner, VMStatus } from '../components/Common'
import { ArrowLeft, ExternalLink, AlertCircle } from 'lucide-react'

function formatInterfaces(interfaces) {
  if (!interfaces || interfaces.length === 0) return '-'
  return interfaces.map((iface) => {
    const type = iface.type ? ` (${iface.type})` : ''
    return `${iface.network}: ${iface.address || '-'}${type}`
  }).join(', ')
}

export default function VMDetailsPage() {
  const auth = useRequireAuth()
  const { instanceId } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [instance, setInstance] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const addNotification = useNotificationStore((state) => state.addNotification)

  useEffect(() => {
    const fetchInstance = async () => {
      setIsLoading(true)
      try {
        const response = await vmService.getInstance(instanceId)
        setInstance(response.data.instance)
      } catch (error) {
        console.error('Error loading instance details:', error)
        addNotification({
          type: 'error',
          message: error.response?.data?.message || 'Failed to load VM details',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (instanceId) {
      fetchInstance()
    }
  }, [instanceId, addNotification])

  const renderMetadata = (metadata) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return <span className="text-slate-400">No metadata</span>
    }
    return (
      <div className="space-y-2">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} className="text-sm text-slate-200">
            <span className="font-medium text-slate-300">{key}:</span> {String(value)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">VM Details</h1>
              <p className="text-slate-400 text-sm">View the full instance details for this OpenStack VM.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/vms" className="text-blue-400 hover:text-blue-200 text-sm font-medium">
                <ArrowLeft className="inline-block w-4 h-4 mr-1" /> Back to VM management
              </Link>
              <Link
                to="/terminal"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
              >
                <ExternalLink className="w-4 h-4" /> Terminal Access
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : !instance ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <AlertCircle className="w-14 h-14 mb-4 opacity-50" />
              <p className="text-lg">Instance details are unavailable.</p>
              <Link
                to="/vms"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Return to VM list
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{instance.name || 'Unnamed VM'}</h2>
                    <p className="text-slate-400 text-sm">Instance ID: {instance.id}</p>
                  </div>
                  <VMStatus status={instance.status} />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4">Instance Summary</h3>
                  <div className="space-y-3 text-slate-200 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Flavor</span>
                      <span>{instance.flavor_name || instance.flavor || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Image</span>
                      <span>{instance.image_name || instance.image || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Created</span>
                      <span>{instance.created ? new Date(instance.created).toLocaleString() : '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Updated</span>
                      <span>{instance.updated ? new Date(instance.updated).toLocaleString() : '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Floating IP</span>
                      <span>{instance.floating_ip || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Interfaces</span>
                      <span className="text-right">{formatInterfaces(instance.interfaces)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Security Groups</span>
                      <span>{instance.security_groups?.map((sg) => sg.name || sg.id).join(', ') || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4">Additional Details</h3>
                  <div className="space-y-3 text-sm text-slate-200">
                    <div>
                      <p className="text-slate-400 mb-2">Raw Addresses</p>
                      <pre className="whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-300 overflow-x-auto">{JSON.stringify(instance.addresses || {}, null, 2)}</pre>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-2">Metadata</p>
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">{renderMetadata(instance.metadata)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
