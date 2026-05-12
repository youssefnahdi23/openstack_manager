import React from 'react'
import { useNotificationStore } from '../store'
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

export function Notification({ notification }) {
  const removeNotification = useNotificationStore((state) => state.removeNotification)

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  }

  const colors = {
    success: 'bg-green-900/20 border-green-700 text-green-400',
    error: 'bg-red-900/20 border-red-700 text-red-400',
    warning: 'bg-yellow-900/20 border-yellow-700 text-yellow-400',
    info: 'bg-blue-900/20 border-blue-700 text-blue-400',
  }

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border ${colors[notification.type]} animate-fade-in`}>
      {icons[notification.type]}
      <span className="flex-1">{notification.message}</span>
      <button
        onClick={() => removeNotification(notification.id)}
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function NotificationContainer() {
  const notifications = useNotificationStore((state) => state.notifications)

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-md">
      {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} />
      ))}
    </div>
  )
}
