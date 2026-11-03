import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// La base coincide con el nombre del repositorio en GitHub Pages.
// Con dominio propio o app nativa (Capacitor), se compila con VITE_BASE=/
const base = process.env.VITE_BASE ?? '/valverde-cuenta/'

export default defineConfig({
  base,
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
        background_color: '#FBF6EE',
        theme_color: '#FBF6EE',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
