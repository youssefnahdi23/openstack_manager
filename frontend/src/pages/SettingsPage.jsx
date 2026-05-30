import React, { useState } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { ExternalLink } from 'lucide-react'

// Theme options supported by the portal settings page.
const themeOptions = [
  { value: 'system', label: 'System Default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function SettingsPage({ theme, setTheme }) {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Default Horizon URL points to the DevStack IP.
  // Override with VITE_OPENSTACK_HORIZON_URL if needed.
  const horizonUrl = import.meta.env.VITE_OPENSTACK_HORIZON_URL || 'http://192.168.91.128/'
  const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api'
  const projectName = localStorage.getItem('openstack_project') || import.meta.env.VITE_OPENSTACK_PROJECT_NAME || 'admin'

  // The Settings page is intentionally lightweight and static; it provides
  // easy access to the portal theme and the Horizon dashboard link.

  return (
    // Top-level page layout: sidebar + main content area.
    <div className="flex h-screen bg-slate-900">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Server Info</h1>
              <p className="text-slate-400 text-sm">OpenStack server details and Horizon access.</p>
            </div>
            <a
              href={horizonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Open Horizon Dashboard
            </a>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="card">
              <h2 className="text-lg font-semibold text-white mb-3">Server Info</h2>
              <div className="space-y-4 text-slate-300">
                <div>
                  <div className="text-sm text-slate-500">OpenStack Horizon URL</div>
                  <div className="mt-1 break-words text-white">{horizonUrl}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">API Base URL</div>
                  <div className="mt-1 break-words text-white">{apiUrl}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">OpenStack Project</div>
                  <div className="mt-1 text-white">{projectName}</div>
                </div>
              </div>
            </section>

            <section className="card">
              <h2 className="text-lg font-semibold text-white mb-3">Theme</h2>
              <p className="text-slate-400 text-sm mb-4">
                Pick your preferred UI theme for the portal.
              </p>
              <div className="space-y-3">
                {themeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 bg-slate-900"
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={option.value}
                      checked={theme === option.value}
                      onChange={() => setTheme(option.value)}
                      className="accent-blue-500"
                    />
                    <span className="text-slate-200">{option.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
