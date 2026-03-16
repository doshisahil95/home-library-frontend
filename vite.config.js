import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev, all /api/* calls are proxied to localhost:3000
      // stripping the /api prefix so routes match the backend as-is.
      // e.g. fetch("/api/login") → http://localhost:3000/login
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})