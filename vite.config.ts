import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // App icons are added in Stage 6 (PWA polish). The manifest below is enough
      // to make the app installable in development.
      manifest: {
        name: 'Bank of Mum & Dad',
        short_name: 'BoMaD',
        description: 'Track pocket money and transactions for your children.',
        theme_color: '#1e3a8a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
})
