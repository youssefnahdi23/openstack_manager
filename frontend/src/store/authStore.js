import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: null,
  role: null,

  login: (token, role) => set({ token, role }),

  logout: () => set({ token: null, role: null })
}))

export default useAuthStore