import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { Menu, LogOut, Home, Cloud, Settings, Terminal, Monitor, Users } from 'lucide-react'

export function Sidebar({ isOpen, setIsOpen }) {
  const auth = useAuth()

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'VM Management', href: '/vms', icon: Cloud },
    { label: 'Students', href: '/students', icon: Users },
    { label: 'Monitoring', href: '/monitoring', icon: Monitor },
    { label: 'Terminal Access', href: '/terminal', icon: Terminal },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  const handleLogout = () => {
    auth.logout()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 text-slate-400 hover:text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-700 z-40 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo/Header */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">VM Portal</h1>
          <p className="text-sm text-slate-400 mt-1">Cloud Management</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target={item.external ? '_blank' : '_self'}
                  rel={item.external ? 'noopener noreferrer' : ''}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  onClick={() => !item.external && setIsOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t border-slate-700">
          {auth.user && (
            <div className="mb-4 pb-4 border-b border-slate-700">
              <p className="text-sm text-slate-400">Logged in as</p>
              <p className="font-semibold text-white">{auth.user.username}</p>
              <p className="text-xs text-slate-500 capitalize">{auth.user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}
