import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { useVMStore, useNotificationStore } from '../store'
import { vmService } from '../services/api'
import { Button, VMStatus, LoadingSpinner } from '../components/Common'
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Plus,
  Monitor,
  Zap,
  AlertCircle,
} from 'lucide-react'

export default function VMManagementPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const instances = useVMStore((state) => state.instances)
  const flavors = useVMStore((state) => state.flavors)
  const images = useVMStore((state) => state.images)
  const networks = useVMStore((state) => state.networks)
  const keypairs = useVMStore((state) => state.keypairs)
  const selectedProject = localStorage.getItem('openstack_project') || import.meta.env.VITE_OPENSTACK_PROJECT_NAME || 'admin'

  const sortedNetworks = [...networks].sort((a, b) => {
    if (a.private === b.private) return 0
    return a.private ? -1 : 1
  })

  const setInstances = useVMStore((state) => state.setInstances)
  const setFlavors = useVMStore((state) => state.setFlavors)
  const setImages = useVMStore((state) => state.setImages)
  const setNetworks = useVMStore((state) => state.setNetworks)
  const setKeypairs = useVMStore((state) => state.setKeypairs)
  const setLoading = useVMStore((state) => state.setLoading)
  const isLoading = useVMStore((state) => state.isLoading)

  const addNotification = useNotificationStore((state) => state.addNotification)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    flavor_id: '',
    image_id: '',
    network_ids: [],
    key_name: '',
    count: 1,
    assign_floating_ip: false,
  })
  const [operatingInstance, setOperatingInstance] = useState(null)

  useEffect(() => {
    fetchData()
    fetchKeypairs()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [instancesRes, flavorsRes, imagesRes, networksRes] = await Promise.allSettled([
        vmService.listInstances(),
        vmService.listFlavors(),
        vmService.listImages(),
        vmService.listNetworks(),
      ])

      if (instancesRes.status === 'fulfilled') {
        setInstances(instancesRes.value.data.instances || [])
      } else {
        console.error('Error fetching instances:', instancesRes.reason)
        addNotification({
          type: 'error',
          message: 'Failed to load instances',
        })
      }

      if (flavorsRes.status === 'fulfilled') {
        setFlavors(flavorsRes.value.data.flavors || [])
      } else {
        console.error('Error fetching flavors:', flavorsRes.reason)
        addNotification({
          type: 'error',
          message: 'Failed to load flavors',
        })
      }

      if (imagesRes.status === 'fulfilled') {
        setImages(imagesRes.value.data.images || [])
      } else {
        console.error('Error fetching images:', imagesRes.reason)
        addNotification({
          type: 'error',
          message: 'Failed to load images',
        })
      }

      if (networksRes.status === 'fulfilled') {
        setNetworks(networksRes.value.data.networks || [])
      } else {
        const errMsg = networksRes.reason?.response?.data?.message || networksRes.reason?.message || String(networksRes.reason)
        console.error('Error fetching networks:', networksRes.reason)
        addNotification({
          type: 'error',
          message: `Failed to load networks: ${errMsg}`,
        })
      }
    } catch (error) {
      const errMsg = error?.response?.data?.message || error?.message || String(error)
      console.error('Unexpected error fetching data:', error)
      addNotification({
        type: 'error',
        message: `Failed to load data: ${errMsg}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchKeypairs = async () => {
    try {
      const keypairsRes = await vmService.listKeypairs()
      setKeypairs(keypairsRes.data.keypairs || [])

      if (keypairsRes.data.keypairs?.length === 1 && !formData.key_name) {
        setFormData((current) => ({ ...current, key_name: keypairsRes.data.keypairs[0].name }))
      }
    } catch (error) {
      const errMsg = error?.response?.data?.message || error?.message || String(error)
      console.error('Error fetching keypairs:', error)
      addNotification({
        type: 'error',
        message: `Failed to load keypairs: ${errMsg}`,
      })
      setKeypairs([])
    }
  }

  const handleCreateInstance = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.flavor_id || !formData.image_id) {
      addNotification({
        type: 'error',
        message: 'Please fill in all required fields',
      })
      return
    }

    if (formData.count < 1) {
      addNotification({
        type: 'error',
        message: 'Instance count must be at least 1',
      })
      return
    }

    try {
      setLoading(true)
      await vmService.createInstance(formData)
      addNotification({
        type: 'success',
        message: `Instance "${formData.name}" created successfully`,
      })
      setFormData({
        name: '',
        flavor_id: '',
        image_id: '',
        network_ids: [],
        key_name: '',
        count: 1,
        assign_floating_ip: false,
      })
      setShowCreateForm(false)
      await fetchData()
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create instance',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVMAction = async (instanceId, action) => {
    try {
      setOperatingInstance(`${instanceId}-${action}`)
      let message = ''

      switch (action) {
        case 'start':
          await vmService.startInstance(instanceId)
          message = 'Instance started successfully'
          break
        case 'stop':
          await vmService.stopInstance(instanceId)
          message = 'Instance stopped successfully'
          break
        case 'reboot':
          await vmService.rebootInstance(instanceId)
          message = 'Instance rebooted successfully'
          break
        case 'delete':
          if (window.confirm('Are you sure you want to delete this instance?')) {
            await vmService.deleteInstance(instanceId)
            message = 'Instance deleted successfully'
          } else {
            return
          }
          break
        default:
          break
      }

      addNotification({
        type: 'success',
        message,
      })
      await fetchData()
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || `Failed to ${action} instance`,
      })
    } finally {
      setOperatingInstance(null)
    }
  }

  const handleConsole = async (instanceId) => {
    try {
      const response = await vmService.getConsole(instanceId)
      const url = response.data?.console_url || response.data?.vnc_url || import.meta.env.VITE_NO_VNC_URL || `http://${window.location.hostname}:6080`
      window.open(url, '_blank')
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to open console',
      })
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
              <h1 className="text-2xl font-bold text-white">VM Management</h1>
              <p className="text-slate-400 text-sm">Manage your virtual machines</p>
              <p className="text-slate-500 text-xs mt-1">OpenStack project: <span className="font-semibold text-slate-200">{selectedProject}</span></p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchData}
                variant="secondary"
                size="md"
              >
                Refresh
              </Button>
              <Button
                onClick={() => {
                  const nextOpen = !showCreateForm
                  setShowCreateForm(nextOpen)
                  if (nextOpen) {
                    fetchKeypairs()
                  }
                }}
                variant="primary"
                size="md"
              >
                <Plus className="w-4 h-4" />
                Create Instance
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Create Form */}
          {showCreateForm && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Create New Instance</h2>
              <form onSubmit={handleCreateInstance} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Instance Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Instance Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., web-server-1"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Flavor */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Flavor (Size) *
                    </label>
                    <select
                      value={formData.flavor_id}
                      onChange={(e) => setFormData({ ...formData, flavor_id: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select a flavor</option>
                      {flavors.map((flavor) => (
                        <option key={flavor.id} value={flavor.id}>
                          {flavor.name} ({flavor.vcpus} vCPU, {flavor.ram}MB RAM)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Image */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Image (OS) *
                    </label>
                    <select
                      value={formData.image_id}
                      onChange={(e) => setFormData({ ...formData, image_id: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select an image</option>
                      {images.map((image) => (
                        <option key={image.id} value={image.id}>
                          {image.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Network selection */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Network Interfaces
                    </label>
                    <div className="grid gap-2">
                      {sortedNetworks.length > 0 ? (
                        sortedNetworks.map((network) => (
                          <label key={network.id} className="flex flex-col gap-2 px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={formData.network_ids.includes(network.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked
                                  setFormData((current) => {
                                    const ids = new Set(current.network_ids)
                                    if (checked) {
                                      ids.add(network.id)
                                    } else {
                                      ids.delete(network.id)
                                    }
                                    return { ...current, network_ids: Array.from(ids) }
                                  })
                                }}
                                className="mt-1 h-4 w-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
                              />
                              <div>
                                <div className="text-sm font-medium text-slate-200">
                                  {network.name}{' '}
                                  <span className="text-xs text-slate-400">
                                    {network.private ? 'private network' : network.external ? 'public/external network' : 'shared network'}
                                  </span>
                                  {network.source === 'admin' && (
                                    <span className="text-xs text-amber-300 ml-2">(from admin)</span>
                                  )}
                                </div>
                                {network.subnets?.length > 0 && (
                                  <div className="text-xs text-slate-400 mt-1">
                                    {network.subnets.map((subnet) => (
                                      <span key={subnet.id} className="block">
                                        {subnet.name || subnet.cidr} ({subnet.cidr})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        ))
                      ) : (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                          No networks are available for the current OpenStack project. Verify your project selection or OpenStack permissions.
                        </div>
                      )}
                      <p className="text-xs text-slate-500">
                        If you do not select any network, the portal will choose a default private network.
                      </p>
                    </div>
                  </div>

                  {/* Keypair */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      SSH Keypair
                    </label>
                    <select
                      value={formData.key_name}
                      onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select a keypair (optional)</option>
                      {keypairs.map((keypair) => (
                        <option key={keypair.name} value={keypair.name}>
                          {keypair.name}{keypair.source === 'admin' ? ' (from admin)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      If only one keypair exists, it will be selected automatically.
                    </p>
                    {keypairs.length === 0 && (
                      <p className="text-xs text-amber-300 mt-1">
                        No keypairs found for the current OpenStack project.
                      </p>
                    )}
                  </div>

                  {/* Count */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Instance Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.count}
                      onChange={(e) => setFormData({ ...formData, count: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Floating IP */}
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      id="assign_floating_ip"
                      type="checkbox"
                      checked={formData.assign_floating_ip}
                      onChange={(e) => setFormData({ ...formData, assign_floating_ip: e.target.checked })}
                      className="h-4 w-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
                    />
                    <label htmlFor="assign_floating_ip" className="text-sm text-slate-300">
                      Assign floating IP
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isLoading}
                  >
                    Create Instance
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Instances Table */}
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner />
            </div>
          ) : instances.length > 0 ? (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr
                      key={instance.id}
                      className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-white">{instance.name}</td>
                      <td className="px-4 py-3">
                        <VMStatus status={instance.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {new Date(instance.created).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {instance.status !== 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleVMAction(instance.id, 'start')}
                              loading={operatingInstance === `${instance.id}-start`}
                              disabled={isLoading}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          {instance.status === 'ACTIVE' && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleVMAction(instance.id, 'stop')}
                                loading={operatingInstance === `${instance.id}-stop`}
                                disabled={isLoading}
                              >
                                <Square className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleVMAction(instance.id, 'reboot')}
                                loading={operatingInstance === `${instance.id}-reboot`}
                                disabled={isLoading}
                              >
                                <RotateCw className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleConsole(instance.id)}
                              >
                                <Monitor className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleVMAction(instance.id, 'delete')}
                            loading={operatingInstance === `${instance.id}-delete`}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
              <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
              <p>No instances found</p>
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="primary"
                className="mt-4"
              >
                Create your first instance
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
