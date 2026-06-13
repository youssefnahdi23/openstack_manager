import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000')
})

// Add token and OpenStack project to request headers
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  const project = localStorage.getItem('openstack_project') || import.meta.env.VITE_OPENSTACK_PROJECT_NAME || 'admin'

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (project) {
    config.headers['X-OpenStack-Project'] = project
  }

  return config
}, error => {
  return Promise.reject(error)
})

// Handle response errors
api.interceptors.response.use(response => {
  return response
}, error => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  return Promise.reject(error)
})

export const authService = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/current-user'),
  verifyToken: () => api.get('/auth/verify-token'),
  refreshToken: () => api.post('/auth/refresh-token'),
  changePassword: (current_password, new_password) => api.post('/auth/change-password', { current_password, new_password }),
}

export const vmService = {
  listInstances: () => api.get('/vms/instances'),
  getInstance: (id) => api.get(`/vms/instances/${id}`),
  createInstance: (data) => api.post('/vms/instances', data),
  deleteInstance: (id) => api.delete(`/vms/instances/${id}`),
  startInstance: (id) => api.post(`/vms/instances/${id}/start`),
  stopInstance: (id) => api.post(`/vms/instances/${id}/stop`),
  rebootInstance: (id, hard = false) => api.post(`/vms/instances/${id}/reboot`, { hard }),
  listFlavors: () => api.get('/vms/flavors'),
  listImages: () => api.get('/vms/images'),
  listNetworks: () => api.get('/vms/networks'),
  listKeypairs: () => api.get('/vms/keypairs'),
  listProjects: () => api.get('/vms/projects'),
  getConsole: (id) => api.get(`/vms/instances/${id}/console`),
  getStats: () => api.get('/vms/stats'),
  unrescueInstance: (id) => api.post(`/vms/instances/${id}/unrescue`),
  createSnapshot: (id, name) => api.post(`/vms/instances/${id}/snapshot`, { name }),
  importImageFromUrl: (url, name) => api.post('/vms/images/from-url', { url, name }),
  exportDevstackCSV: () => api.get('/vms/export/devstack-csv', { responseType: 'blob' }),
  sendInstanceEmail: (id, student_ids) => api.post(`/vms/instances/${id}/email`, { student_ids }),
}

export const monitoringService = {
  getPlacementUsage: () => api.get('/placement/usage'),
}

export const healthService = {
  check: () => api.get('/health'),
}

export const studentService = {
  listStudents: () => api.get('/students/'),
  createStudent: (data) => api.post('/students/', data),
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/students/${id}`),
}

export default api
