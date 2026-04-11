import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy ALL backend routes — add new ones here as needed
      '/auth':     { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/upload':   { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ask':      { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/documents':{ target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/document': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/chat':     { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/health':   { target: 'http://127.0.0.1:8000', changeOrigin: true },
    }
  }
})
