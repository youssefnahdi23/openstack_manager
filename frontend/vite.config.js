import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
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
      '/ttyd': {
        target: 'http://ttyd:7681',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ttyd/, ''),
      },
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
