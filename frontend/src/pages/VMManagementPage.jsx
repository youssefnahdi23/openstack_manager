import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
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

  const formatInterfaces = (interfaces) => {
    if (!interfaces || interfaces.length === 0) return '-'
    return interfaces
      .map((iface) => {
        const address = iface.address || '-'
        const type = iface.type ? ` (${iface.type})` : ''
        return `${iface.network}: ${address}${type}`
      })
      .join(', ')
  }

  const getFloatingIp = (instance) => {
    if (instance.floating_ip) return instance.floating_ip
    if (instance.interfaces) {
      const floating = instance.interfaces.find((iface) => iface.type === 'floating')
      return floating?.address || '-'
    }
    return '-'
  }

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
  const [pendingStarts, setPendingStarts] = useState([])
  const [pendingStops, setPendingStops] = useState([])
  const [pendingDeletes, setPendingDeletes] = useState([])
  const [deletedInstances, setDeletedInstances] = useState([])

  const addPendingStart = (instanceId) => {
    setPendingStarts((current) => (current.includes(instanceId) ? current : [...current, instanceId]))
  }

  const removePendingStart = (instanceId) => {
    setPendingStarts((current) => current.filter((id) => id !== instanceId))
  }

  const addPendingStop = (instanceId) => {
    setPendingStops((current) => (current.includes(instanceId) ? current : [...current, instanceId]))
  }

  const removePendingStop = (instanceId) => {
    setPendingStops((current) => current.filter((id) => id !== instanceId))
  }

  const addPendingDelete = (instanceId) => {
    setPendingDeletes((current) => (current.includes(instanceId) ? current : [...current, instanceId]))
  }

  const removePendingDelete = (instanceId) => {
    setPendingDeletes((current) => current.filter((id) => id !== instanceId))
  }

  const addDeletedInstance = (instanceId) => {
    setDeletedInstances((current) => (current.includes(instanceId) ? current : [...current, instanceId]))
  }

  const waitForInstanceActive = async (instanceId) => {
    const maxAttempts = 6
    let attempt = 0

    while (attempt < maxAttempts) {
      attempt += 1
      try {
        const response = await vmService.getInstance(instanceId)
        const status = response.data?.instance?.status?.toString().toUpperCase()

        setInstances((current) => current.map((instance) => {
          if (instance.id !== instanceId) return instance
          return {
            ...instance,
            status: status === 'ACTIVE' ? 'ACTIVE' : 'STARTING',
          }
        }))

        if (status === 'ACTIVE') {
          removePendingStart(instanceId)
          return
        }
      } catch (error) {
        console.error('Error polling instance status:', error)
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    removePendingStart(instanceId)
  }

  const waitForInstanceStopped = async (instanceId) => {
    const maxAttempts = 6
    let attempt = 0

    while (attempt < maxAttempts) {
      attempt += 1
      try {
        const response = await vmService.getInstance(instanceId)
        const status = response.data?.instance?.status?.toString().toUpperCase()

        setInstances((current) => current.map((instance) => {
          if (instance.id !== instanceId) return instance
          return {
            ...instance,
            status: ['STOPPED', 'SHUTOFF'].includes(status) ? status : 'STOPPING',
          }
        }))

        if (['STOPPED', 'SHUTOFF'].includes(status)) {
          removePendingStop(instanceId)
          return
        }
      } catch (error) {
        console.error('Error polling instance status:', error)
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    removePendingStop(instanceId)
  }

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
        const fetchedInstances = instancesRes.value.data.instances || []
        const updatedInstances = fetchedInstances.map((instance) => {
          const status = instance.status?.toString().toUpperCase()
          if (pendingStarts.includes(instance.id) && status !== 'ACTIVE') {
            return { ...instance, status: 'STARTING' }
          }
          if (pendingStops.includes(instance.id) && !['STOPPED', 'SHUTOFF'].includes(status)) {
            return { ...instance, status: 'STOPPING' }
          }
          return instance
        })

        setInstances(updatedInstances)

        const completedStartIds = fetchedInstances
          .filter((instance) => pendingStarts.includes(instance.id) && instance.status?.toString().toUpperCase() === 'ACTIVE')
          .map((instance) => instance.id)
        if (completedStartIds.length > 0) {
          setPendingStarts((current) => current.filter((id) => !completedStartIds.includes(id)))
        }

        const completedStopIds = fetchedInstances
          .filter((instance) => pendingStops.includes(instance.id) && ['STOPPED', 'SHUTOFF'].includes(instance.status?.toString().toUpperCase()))
          .map((instance) => instance.id)
        if (completedStopIds.length > 0) {
          setPendingStops((current) => current.filter((id) => !completedStopIds.includes(id)))
        }
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
    const originalInstances = instances
    const oldStatus = instances.find((instance) => instance.id === instanceId)?.status

    try {
      setOperatingInstance(`${instanceId}-${action}`)
      let message = ''

      if (action === 'start') {
        addPendingStart(instanceId)
        setInstances((current) => current.map((instance) => instance.id === instanceId ? { ...instance, status: 'STARTING' } : instance))
      }
      if (action === 'stop') {
        addPendingStop(instanceId)
        setInstances((current) => current.map((instance) => instance.id === instanceId ? { ...instance, status: 'STOPPING' } : instance))
      }
      if (action === 'delete') {
        addPendingDelete(instanceId)
        setInstances((current) => current.map((instance) => instance.id === instanceId ? { ...instance, status: 'DELETING' } : instance))
      }

      switch (action) {
        case 'unrescue':
          await vmService.unrescueInstance(instanceId)
          message = 'Instance unrescued successfully'
          break
        case 'start':
          await vmService.startInstance(instanceId)
          message = 'Instance started successfully'
          await waitForInstanceActive(instanceId)
          break
        case 'stop':
          await vmService.stopInstance(instanceId)
          message = 'Instance stopped successfully'
          await waitForInstanceStopped(instanceId)
          break
        case 'reboot':
          await vmService.rebootInstance(instanceId)
          message = 'Instance rebooted successfully'
          break
        case 'delete':
          if (window.confirm('Are you sure you want to delete this instance?')) {
            await vmService.deleteInstance(instanceId)
            message = 'Instance deleted successfully'
            addDeletedInstance(instanceId)
            // Show deleted state for 1.5 seconds before removing
            await new Promise(resolve => setTimeout(resolve, 1500))
          } else {
            removePendingDelete(instanceId)
            setInstances((current) => current.map((instance) => instance.id === instanceId ? { ...instance, status: oldStatus } : instance))
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
      if (['start', 'stop'].includes(action) && oldStatus) {
        setInstances(originalInstances)
      }
      if (action === 'start') {
        removePendingStart(instanceId)
      }
      if (action === 'stop') {
        removePendingStop(instanceId)
      }
      if (action === 'delete') {
        removePendingDelete(instanceId)
      }
      addNotification({
        type: 'error',
        message: error.response?.data?.message || `Failed to ${action} instance`,
      })
    } finally {
      setOperatingInstance(null)
      // For delete action, fetchData will be called after the deletion confirmation shows
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
                      Flavor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                      Floating IP
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
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {instance.flavor || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {getFloatingIp(instance)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {new Date(instance.created).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(() => {
                            const status = (instance.status || '').toString().toLowerCase()
                            const isRescued = status.includes('rescue')
                            const isStarting = pendingStarts.includes(instance.id) || status === 'starting' || status.includes('build') || status.includes('reboot') || status.includes('rebuild')
                            const isStopping = pendingStops.includes(instance.id) || status === 'stopping'
                            const isDeleting = pendingDeletes.includes(instance.id) || status === 'deleting'
                            const isDeleted = deletedInstances.includes(instance.id)

                            if (isRescued) {
                              return (
                                <Button
                                  size="sm"
                                  variant="warning"
                                  title="Unrescue instance"
                                  onClick={() => handleVMAction(instance.id, 'unrescue')}
                                  loading={operatingInstance === `${instance.id}-unrescue`}
                                  disabled={isLoading}
                                >
                                  Unrescue
                                </Button>
                              )
                            }

                            if (isDeleted) {
                              return (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled
                                >
                                  (vm deleted)
                                </Button>
                              )
                            }

                            if (isStarting || isStopping || isDeleting) {
                              return (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled
                                >
                                  {isDeleting ? 'Deleting...' : isStopping ? 'Stopping...' : 'Starting...'}
                                </Button>
                              )
                            }

                            return instance.status !== 'ACTIVE' ? (
                              <Button
                                size="sm"
                                variant="success"
                                title="Start instance"
                                onClick={() => handleVMAction(instance.id, 'start')}
                                loading={operatingInstance === `${instance.id}-start`}
                                disabled={isLoading}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            ) : null
                          })()}
                          {instance.status === 'ACTIVE' && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                title="Stop instance"
                                onClick={() => handleVMAction(instance.id, 'stop')}
                                loading={operatingInstance === `${instance.id}-stop`}
                                disabled={isLoading}
                              >
                                <Square className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                title="Reboot instance"
                                onClick={() => handleVMAction(instance.id, 'reboot')}
                                loading={operatingInstance === `${instance.id}-reboot`}
                                disabled={isLoading}
                              >
                                <RotateCw className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                title="Open console"
                                onClick={() => handleConsole(instance.id)}
                              >
                                <Monitor className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            title="Delete instance"
                            onClick={() => handleVMAction(instance.id, 'delete')}
                            loading={operatingInstance === `${instance.id}-delete`}
                            disabled={isLoading || pendingDeletes.includes(instance.id) || deletedInstances.includes(instance.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Link
                            to={`/vms/${instance.id}`}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-blue-100 transition-colors"
                          >
                            VM Details
                          </Link>
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
