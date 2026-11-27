import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// La base coincide con el nombre del repositorio en GitHub Pages.
// Con dominio propio o app nativa (Capacitor), se compila con VITE_BASE=/
const base = process.env.VITE_BASE ?? '/valverde-cuenta/'

export default defineConfig({
  base,
  // En local, la app pide la agenda al servidor de desarrollo (npm run dev:servidor).
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'iconos/apple-touch-icon.png'],
      manifest: {
        name: 'Valverde Cuenta',
        short_name: 'Valverde Cuenta',
        description: 'La agenda cultural de Valverde del Camino y su yincana por el casco urbano.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF8F3',
        theme_color: '#FAF8F3',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // La agenda nunca se sirve desde la caché del service worker: la app guarda su propia copia.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
