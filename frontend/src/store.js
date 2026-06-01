import { create } from 'zustand'
import { authService } from './services/api'

const TOKEN_REFRESH_INTERVAL = 60 * 1000 // Refresh every 60 seconds while active
let refreshTimer = null
let lastActivityTime = Date.now()
const ACTIVITY_TIMEOUT = 60 * 60 * 1000 // Consider inactive after 1 hour

export const useAuthStore = create((set, get) => ({

  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  selectedProject: localStorage.getItem('openstack_project') || import.meta.env.VITE_OPENSTACK_PROJECT_NAME || 'admin',
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  sessionExpireTime: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
      // Token expires in 2 hours (7200 seconds)
      const expireTime = Date.now() + (7200 * 1000)
      set({ sessionExpireTime: expireTime })
    } else {
      localStorage.removeItem('token')
      set({ sessionExpireTime: null })
    }
    set({ token })
  },

  setSelectedProject: (project) => {
    if (project) {
      localStorage.setItem('openstack_project', project)
    } else {
      localStorage.removeItem('openstack_project')
    }
    set({ selectedProject: project })
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
    set({ user })
  },

  refreshToken: async () => {
    try {
      const response = await authService.refreshToken()
      const { token } = response.data
      get().setToken(token)
      lastActivityTime = Date.now()
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      get().logout()
      return false
    }
  },

  startSessionKeepAlive: () => {
    // Cancel existing timer if any
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
    
    // Refresh token every 60 seconds if user is authenticated
    refreshTimer = setInterval(() => {
      const store = get()
      if (store.isAuthenticated) {
        store.refreshToken()
      }
    }, TOKEN_REFRESH_INTERVAL)
  },

  stopSessionKeepAlive: () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  },

  login: async (username, password, project) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.login(username, password)
      const { token, user } = response.data

      if (project) {
        localStorage.setItem('openstack_project', project)
        set({ selectedProject: project })
      }

      set({ token, user, isAuthenticated: true })
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      // Set session expiration time (2 hours from now)
      const expireTime = Date.now() + (7200 * 1000)
      set({ sessionExpireTime: expireTime })

      // Start session keep-alive
      get().startSessionKeepAlive()
      lastActivityTime = Date.now()

      return { success: true, user }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      set({ error: message, isAuthenticated: false })
      return { success: false, error: message }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    get().stopSessionKeepAlive()
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null,
      sessionExpireTime: null,
    })
  },

  clearError: () => set({ error: null }),
}))

export const useAuth = useAuthStore

export const useVMStore = create((set) => ({
  instances: [],
  flavors: [],
  images: [],
  networks: [],
  keypairs: [],
  stats: null,
  isLoading: false,
  error: null,

  setInstances: (instances) => set((state) => ({
    instances: typeof instances === 'function' ? instances(state.instances) : instances,
  })),
  setFlavors: (flavors) => set({ flavors }),
  setImages: (images) => set({ images }),
  setNetworks: (networks) => set({ networks }),
  setKeypairs: (keypairs) => set({ keypairs }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))

export const useNotificationStore = create((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Math.random()
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }))

    // Auto remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))
    }, 5000)

    return id
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  success: (message) => {
    return useNotificationStore.getState().addNotification({
      type: 'success',
      message,
    })
  },

  error: (message) => {
    return useNotificationStore.getState().addNotification({
      type: 'error',
      message,
    })
  },

  warning: (message) => {
    return useNotificationStore.getState().addNotification({
      type: 'warning',
      message,
    })
  },

  info: (message) => {
    return useNotificationStore.getState().addNotification({
      type: 'info',
      message,
    })
  },
}))
