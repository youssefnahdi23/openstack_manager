import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.91.128:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  verify: () => api.get('/auth/verify'),
};

export const instancesAPI = {
  list: () => api.get('/instances/'),
  get: (id) => api.get(`/instances/${id}`),
  create: (data) => api.post('/instances/', data),
  delete: (id) => api.delete(`/instances/${id}`),
  action: (id, action) => api.post(`/instances/${id}/${action}`),
  listImages: () => api.get('/instances/images'),
  listFlavors: () => api.get('/instances/flavors'),
  listNetworks: () => api.get('/instances/networks'),
};

export const monitoringAPI = {
  getSystemMetrics: () => api.get('/monitoring/system'),
  getServices: () => api.get('/monitoring/services'),
  getInstanceMetrics: (ip) => api.get(`/monitoring/instance/${ip}`),
};

export default api;
