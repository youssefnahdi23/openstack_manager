import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite development server configuration. Proxy rules allow the frontend to
// call backend and monitoring services by path during local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['stackmanager.local', 'stackmanager.local:80', '127.0.0.1', 'localhost', '0.0.0.0'],
    origin: 'http://stackmanager.local',
    hmr: {
      host: 'stackmanager.local',
      protocol: 'ws',
      port: 80,
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/metrics': {
        target: 'http://prometheus:9090',
        changeOrigin: true,
        secure: false,
      },
      '/prometheus': {
        target: 'http://prometheus:9090',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/prometheus/, ''),
      },
      // '/ttyd' proxy removed because ttyd is no longer included in the deployment.
      '/novnc': {
        target: 'http://novnc:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/novnc/, ''),
      },
      '/grafana': {
        target: 'http://192.168.91.128:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/grafana/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
