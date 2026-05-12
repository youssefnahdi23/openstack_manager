import { create } from 'zustand'
import { authService } from '../services/api'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
    set({ token })
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
    set({ user })
  },

  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.login(username, password)
      const { token, user } = response.data

      set({ token, user, isAuthenticated: true })
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

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
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))

export const useVMStore = create((set) => ({
  instances: [],
  flavors: [],
  images: [],
  networks: [],
  stats: null,
  isLoading: false,
  error: null,

  setInstances: (instances) => set({ instances }),
  setFlavors: (flavors) => set({ flavors }),
  setImages: (images) => set({ images }),
  setNetworks: (networks) => set({ networks }),
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
