import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Netlify sets COMMIT_REF during build — surfaced in Admin so you can confirm the live bundle.
const commitRef = process.env.COMMIT_REF || ''

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_COMMIT_REF': JSON.stringify(commitRef),
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
