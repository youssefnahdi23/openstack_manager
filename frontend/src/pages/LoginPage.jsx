import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useNotificationStore } from '../store'
import { Button } from '../components/Common'
import { Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const addNotification = useNotificationStore((state) => state.addNotification)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/dashboard')
    }
  }, [auth.isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!username || !password) {
      addNotification({
        type: 'error',
        message: 'Please enter username and password',
      })
      return
    }

    setIsLoading(true)
    const result = await auth.login(username, password)

    if (result.success) {
      addNotification({
        type: 'success',
        message: `Welcome back, ${result.user.username}!`,
      })
      navigate('/dashboard')
    } else {
      addNotification({
        type: 'error',
        message: result.error || 'Login failed',
      })
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">VM Portal</h1>
          <p className="text-slate-400 mt-2">Cloud Management Dashboard</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg text-sm text-blue-400">
            <p className="font-semibold mb-1">Demo Credentials:</p>
            <p>Username: <code className="bg-slate-900/50 px-2 py-0.5 rounded">admin</code></p>
            <p>Password: <code className="bg-slate-900/50 px-2 py-0.5 rounded">admin123</code></p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isLoading}
            className="w-full justify-center"
          >
            Sign In
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          © 2024 PFE VM Management Portal. All rights reserved.
        </p>
      </div>
    </div>
  )
}

import { Cloud } from 'lucide-react'
