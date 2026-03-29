import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://localhost:3080",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "https://localhost:3080",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          // Proxy event handling
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.url)
          })
        }
      }
    }
  }
})
