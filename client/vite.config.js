import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: ["uninclusive-unpatronizable-ossie.ngrok-free.dev", "localhost"],
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://server:4000',
        changeOrigin: true,
      }
    }
  },
})
