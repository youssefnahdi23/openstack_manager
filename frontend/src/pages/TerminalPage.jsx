import React, { useState } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { Download, ExternalLink } from 'lucide-react'

export default function TerminalPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Terminal Access</h1>
              <p className="text-slate-400 text-sm">Download and use PuTTY or another local SSH client to connect to your VMs.</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="card">
              <h2 className="text-lg font-semibold text-white mb-3">Download PuTTY</h2>
              <p className="text-slate-300 leading-7">
                This page no longer opens terminals directly from the browser. Install and run PuTTY locally, then connect using your VM address.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <a
                  href="https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PuTTY
                </a>
                <a
                  href="https://www.ssh.com/academy/ssh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  SSH Usage Guide
                </a>
              </div>
            </section>

            <section className="card">
              <h2 className="text-lg font-semibold text-white mb-3">How to connect</h2>
              <p className="text-slate-300 leading-7">
                After installing PuTTY, open it and enter your VM hostname or floating IP, then connect with your SSH key or password.
              </p>
              <pre className="mt-4 rounded-lg bg-slate-900 border border-slate-700 p-4 text-sm text-slate-200 overflow-x-auto">
                <span className="text-green-400">ssh</span> <span className="text-slate-100">ubuntu@&lt;floating-ip&gt;</span>
              </pre>
              <p className="text-slate-400 text-sm mt-4">
                If you want browser-based access in the future, use a supported terminal backend instead of a local SSH client.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
