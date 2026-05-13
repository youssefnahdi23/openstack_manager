import React from 'react'
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

export function VMStatus({ status }) {
  const statusConfig = {
    ACTIVE: {
      label: 'Running',
      color: 'bg-green-900/20 text-green-400 border-green-700',
      icon: CheckCircle,
    },
    STOPPED: {
      label: 'Stopped',
      color: 'bg-red-900/20 text-red-400 border-red-700',
      icon: AlertCircle,
    },
    PAUSED: {
      label: 'Paused',
      color: 'bg-yellow-900/20 text-yellow-400 border-yellow-700',
      icon: Clock,
    },
    ERROR: {
      label: 'Error',
      color: 'bg-red-900/20 text-red-400 border-red-700',
      icon: AlertTriangle,
    },
    BUILDING: {
      label: 'Building',
      color: 'bg-blue-900/20 text-blue-400 border-blue-700',
      icon: Clock,
    },
  }

  const config = statusConfig[status] || {
    label: status,
    color: 'bg-slate-900/20 text-slate-400 border-slate-700',
    icon: AlertCircle,
  }

  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${config.color} text-sm font-medium`}>
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
    </div>
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, loading = false }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
      </div>
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const baseStyles = 'font-medium rounded-lg transition-colors inline-flex items-center gap-2'

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-600',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white disabled:bg-slate-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-600',
    success: 'bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-600',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:text-slate-600',
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  )
}
