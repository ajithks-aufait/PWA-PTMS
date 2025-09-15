import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: '/',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        sourcemap: true,
      },
      injectRegister: false, // Disable automatic service worker registration
      // Disable manifest generation since we're using public/manifest.json
      manifest: false,
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true
    // Note: Vite automatically handles history API fallback for client-side routing
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
