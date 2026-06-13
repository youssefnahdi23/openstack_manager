import React, { useEffect, useState } from 'react'
import { vmService } from '../services/api'
import { LoadingSpinner, Button, Card } from './Common'
import { X } from 'lucide-react'

export default function NoVNCModal({ isOpen, onClose }) {
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    fetchInstances()
  }, [isOpen])

  const fetchInstances = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await vmService.listInstances()
      setInstances(res.data.instances || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch instances')
    } finally {
      setLoading(false)
    }
  }

  const openConsole = async (instanceId) => {
    try {
      const res = await vmService.getConsole(instanceId)
      const url = res.data.console_url
      if (url) {
        window.open(url, '_blank', 'noopener')
      } else {
        setError('Console URL not returned by server')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to open console')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl mx-4">
        <Card>
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-white">noVNC Consoles</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-red-300">{error}</div>
            ) : instances.length === 0 ? (
              <div className="text-slate-400">No instances found.</div>
            ) : (
              <div className="space-y-3">
                {instances.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{inst.name || inst.id}</div>
                      <div className="text-slate-400 text-sm">Status: {inst.status || inst.vm_state || 'unknown'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => openConsole(inst.id)}
                        disabled={inst.status && inst.status.toLowerCase() !== 'active' && inst.vm_state && inst.vm_state.toLowerCase() !== 'active'}
                      >
                        Open Console
                      </Button>
                      <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(inst.id)}>
                        Copy ID
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
