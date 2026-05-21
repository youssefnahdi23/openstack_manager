import React, { useState } from 'react'
import { useRequireAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { Terminal, ExternalLink, Download } from 'lucide-react'

export default function TerminalPage() {
  const auth = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Terminal Access</h1>
              <p className="text-slate-400 text-sm">Use your local SSH client, such as PuTTY or OpenSSH.</p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg">
              <Terminal className="w-5 h-5" />
              <span>External SSH client</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="card">
              <h2 className="text-lg font-semibold text-white mb-3">Why this page?</h2>
              <p className="text-slate-300 leading-7">
                This portal no longer opens direct shell sessions through embedded ttyd. Instead, use a local SSH client for secure access to your virtual machines.
              </p>
              <p className="text-slate-300 leading-7 mt-4">
                If you need a Windows-ready SSH client, PuTTY is a supported option. On macOS or Linux, use the built-in <code className="rounded bg-slate-800 px-1 py-0.5">ssh</code> command.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <a
                  href="https://www.putty.org/"
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
              <h2 className="text-lg font-semibold text-white mb-3">Connection example</h2>
              <p className="text-slate-300 leading-7">
                Use your VM floating IP or public IP with your SSH username. For example:
              </p>
              <pre className="mt-4 rounded-lg bg-slate-900 border border-slate-700 p-4 text-sm text-slate-200 overflow-x-auto">
                <span className="text-green-400">ssh</span> <span className="text-slate-100">ubuntu@&lt;floating-ip&gt;</span>
              </pre>
              <p className="text-slate-400 text-sm mt-4">
                On Windows, enter the host and username in PuTTY and connect with your configured key or password.
              </p>
            </section>
          </div>

          <section className="card mt-6">
            <h2 className="text-lg font-semibold text-white mb-3">Next steps</h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="mt-1 text-blue-400">•</span>
                Use the VM management page to view instance details and floating IPs.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-blue-400">•</span>
                Run PuTTY locally or use your terminal shell to connect to the instance.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-blue-400">•</span>
                If you want browser-based terminal access again, configure a supported terminal backend separately instead of ttyd.
              </li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  )
}
