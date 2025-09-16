import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production' 
          ? 'https://your-app-name.vercel.app' // Replace with your Vercel domain
          : 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})